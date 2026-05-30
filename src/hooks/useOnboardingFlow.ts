"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { buildTargetAdvisoryRequest, toDirectionChoices, toRouteCandidates } from "../domain/adapters";
import { flowReducer, initialFlowState, normalizeFlowError } from "../domain/flow";
import type {
  DirectionChoice,
  FlowError,
  FlowState,
  MapAvailability,
  MockLocationResult,
  MockScenarioId,
  RequestId,
  RetryTarget,
  RouteCandidate
} from "../domain/types";
import { MockApiError, createMockApi, createMockLocationProvider } from "../mocks/mockApi";

type UseOnboardingFlowOptions = {
  scenarioId?: MockScenarioId;
  locationResult?: MockLocationResult;
  mapAvailabilityOverride?: MapAvailability;
};

export type OnboardingFlowController = {
  manualQueryDraft: string;
  state: FlowState;
  actions: {
    changeDirection(): void;
    changeRoute(): void;
    confirmRoute(): void;
    openManualSearch(): void;
    refreshAdvice(): void;
    retry(): void;
    searchManually(query: string): void;
    selectDirection(direction: DirectionChoice): void;
    selectRoute(route: RouteCandidate, source: "nearby" | "manual"): void;
    useLocation(): void;
  };
};

export function useOnboardingFlow(options: UseOnboardingFlowOptions = {}) {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  const [manualQueryDraft, setManualQueryDraft] = useState(initialFlowState.manualQuery);
  const requestSequenceRef = useRef(0);

  const scenarioId = options.scenarioId ?? "nearby-routes";
  const mapAvailability = options.mapAvailabilityOverride ?? mapAvailabilityForScenario(scenarioId);

  const api = useMemo(
    () =>
      createMockApi({
        scenarioId,
        delays:
          scenarioId === "nearby-slow"
            ? { nearbyMs: 900 }
            : scenarioId === "computing-advice"
              ? { advisoryMs: 900 }
              : undefined
      }),
    [scenarioId]
  );

  const locationProvider = useMemo(
    () =>
      createMockLocationProvider(
        options.locationResult ?? (scenarioId === "location-denied" ? { kind: "denied" } : { kind: "granted", lat: -27.5969, lng: -48.5488 })
      ),
    [options.locationResult, scenarioId]
  );

  const nextRequestId = useCallback((prefix: string): RequestId => {
    requestSequenceRef.current += 1;
    return `${prefix}-${requestSequenceRef.current}`;
  }, []);

  const failOperation = useCallback(
    (requestId: RequestId, error: unknown, retryTarget: RetryTarget) => {
      const normalized = error instanceof MockApiError ? error.flowError : normalizeFlowError(error);
      const flowError: FlowError = {
        ...normalized,
        retryTarget
      };
      dispatch({ type: "operationFailed", requestId, error: flowError });
    },
    []
  );

  const requestAdvisory = useCallback(
    async (input: {
      includeFreshLocation: boolean;
      fallbackLocation?: { lat: number; lng: number };
      routeDirectionId: string;
      routeVersionId: string;
    }) => {
      const requestId = nextRequestId("advisory");
      const locationResult = input.includeFreshLocation ? await locationProvider.getCurrentLocation() : undefined;
      const referenceLocation =
        locationResult?.kind === "granted"
          ? { lat: locationResult.lat, lng: locationResult.lng }
          : (input.fallbackLocation ?? { lat: -27.5969, lng: -48.5488 });

      const advisoryRequest = buildTargetAdvisoryRequest({
        lat: referenceLocation.lat,
        lng: referenceLocation.lng,
        routeVersionId: input.routeVersionId,
        routeDirectionId: input.routeDirectionId
      });

      dispatch({
        type: "routeConfirmed",
        requestId,
        advisoryRequest,
        referenceLocation
      });

      try {
        const advice = await api.createOnboardAdvisory(advisoryRequest);
        dispatch({
          type: "advisorySucceeded",
          requestId,
          advice
        });
      } catch (error) {
        failOperation(requestId, error, {
          kind: "advisory",
          request: advisoryRequest
        });
      }
    },
    [api, failOperation, locationProvider, nextRequestId]
  );

  const openManualSearch = useCallback(() => {
    dispatch({ type: "manualSearchOpened" });
  }, []);

  const useLocation = useCallback(async () => {
    dispatch({ type: "locationRequested" });

    const requestId = nextRequestId("nearby");
    const location = await locationProvider.getCurrentLocation();
    dispatch({ type: "locationResolved", requestId, result: location, radiusMeters: 1200, limit: 5 });

    if (location.kind !== "granted") {
      return;
    }

    window.setTimeout(() => {
      dispatch({ type: "nearbySlowThresholdReached", requestId });
    }, 500);

    try {
      const response = await api.listRoutes({
        lat: location.lat,
        lng: location.lng,
        radiusMeters: 1200,
        limit: 5
      });
      dispatch({
        type: "nearbyRoutesSucceeded",
        requestId,
        candidates: toRouteCandidates(response, { source: "nearby" })
      });
    } catch (error) {
      failOperation(requestId, error, {
        kind: "nearbyRoutes",
        lat: location.lat,
        lng: location.lng,
        radiusMeters: 1200,
        limit: 5
      });
    }
  }, [api, failOperation, locationProvider, nextRequestId]);

  const selectRoute = useCallback(
    async (route: RouteCandidate, source: "nearby" | "manual") => {
      const requestId = nextRequestId("directions");
      dispatch({ type: "routeSelected", route, source, requestId });

      try {
        const response = await api.getRouteDirections(route.routeId);
        dispatch({
          type: "directionsSucceeded",
          requestId,
          directions: toDirectionChoices(response)
        });
      } catch (error) {
        failOperation(requestId, error, { kind: "directions", routeId: route.routeId });
      }
    },
    [api, failOperation, nextRequestId]
  );

  const selectDirection = useCallback(
    async (direction: DirectionChoice) => {
      if (state.selectedRoute === undefined) {
        return;
      }

      const requestId = nextRequestId("geometry");
      dispatch({ type: "directionSelected", direction, requestId });

      try {
        const geometry = await api.getRouteGeometry(direction.routeDirectionId, state.selectedRoute.routeVersionId);
        dispatch({
          type: "geometrySucceeded",
          requestId,
          geometry,
          mapAvailability
        });
      } catch (error) {
        failOperation(requestId, error, {
          kind: "geometry",
          routeId: state.selectedRoute.routeId,
          routeDirectionId: direction.routeDirectionId,
          routeVersionId: state.selectedRoute.routeVersionId
        });
      }
    },
    [api, failOperation, mapAvailability, nextRequestId, state.selectedRoute]
  );

  const confirmRoute = useCallback(() => {
    if (state.selectedRoute === undefined || state.selectedDirection === undefined) {
      return;
    }

    void requestAdvisory({
      includeFreshLocation: false,
      fallbackLocation: state.latestLocation,
      routeDirectionId: state.selectedDirection.routeDirectionId,
      routeVersionId: state.selectedRoute.routeVersionId
    });
  }, [requestAdvisory, state.latestLocation, state.selectedDirection, state.selectedRoute]);

  const refreshAdvice = useCallback(() => {
    if (state.selectedRoute === undefined || state.selectedDirection === undefined) {
      return;
    }

    void requestAdvisory({
      includeFreshLocation: true,
      fallbackLocation: state.latestLocation,
      routeDirectionId: state.selectedDirection.routeDirectionId,
      routeVersionId: state.selectedRoute.routeVersionId
    });
  }, [requestAdvisory, state.latestLocation, state.selectedDirection, state.selectedRoute]);

  const retry = useCallback(() => {
    const retryTarget = state.error?.retryTarget;
    if (retryTarget === undefined) {
      return;
    }

    if (retryTarget.kind === "nearbyRoutes") {
      void useLocation();
      return;
    }

    if (retryTarget.kind === "manualSearch") {
      dispatch({ type: "manualSearchOpened" });
      setManualQueryDraft(retryTarget.query);
      return;
    }

    if (retryTarget.kind === "directions") {
      const route = sourceRouteForRetry(state, retryTarget.routeId);
      if (route !== undefined && state.selectedRoute !== undefined) {
        void selectRoute(route, state.selectedRoute.source);
      }
      return;
    }

    if (retryTarget.kind === "geometry") {
      const direction = state.directionChoices.find((choice) => choice.routeDirectionId === retryTarget.routeDirectionId);
      if (direction !== undefined) {
        void selectDirection(direction);
      }
      return;
    }

    if (retryTarget.kind === "advisory") {
      const routeVersionId = state.selectedRoute?.routeVersionId ?? retryTarget.request.route_version_id;
      const routeDirectionId = state.selectedDirection?.routeDirectionId ?? retryTarget.request.route_direction_id;
      void requestAdvisory({
        includeFreshLocation: false,
        fallbackLocation: { lat: retryTarget.request.lat, lng: retryTarget.request.lng },
        routeDirectionId,
        routeVersionId
      });
    }
  }, [requestAdvisory, selectDirection, selectRoute, state, useLocation]);

  useEffect(() => {
    if (state.screen !== "manualRouteSearch" && state.screen !== "noManualResults") {
      return;
    }

    const query = manualQueryDraft.trim();
    if (query.length === 0) {
      return;
    }

    const requestId = nextRequestId("manual");
    const timerId = window.setTimeout(async () => {
      dispatch({ type: "manualSearchRequested", requestId, query, limit: 8 });

      try {
        const response = await api.listRoutes({ query, limit: 8 });
        dispatch({
          type: "manualSearchSucceeded",
          requestId,
          candidates: toRouteCandidates(response, { source: "manual" })
        });
      } catch (error) {
        failOperation(requestId, error, { kind: "manualSearch", query, limit: 8 });
      }
    }, 180);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [api, failOperation, manualQueryDraft, nextRequestId, state.screen]);

  return {
    manualQueryDraft,
    state,
    actions: {
      changeDirection() {
        dispatch({ type: "changeDirection" });
      },
      changeRoute() {
        dispatch({ type: "changeRoute" });
      },
      confirmRoute,
      openManualSearch,
      refreshAdvice,
      retry,
      searchManually(query: string) {
        if (state.screen !== "manualRouteSearch" && state.screen !== "noManualResults") {
          dispatch({ type: "manualSearchOpened" });
        }
        setManualQueryDraft(query);
      },
      selectDirection(direction: DirectionChoice) {
        void selectDirection(direction);
      },
      selectRoute(route: RouteCandidate, source: "nearby" | "manual") {
        void selectRoute(route, source);
      },
      useLocation() {
        void useLocation();
      }
    }
  };
}

function mapAvailabilityForScenario(scenarioId: MockScenarioId): MapAvailability {
  return scenarioId === "confirmation-fallback-map-unavailable" ? "unavailable" : "available";
}

function sourceRouteForRetry(state: FlowState, routeId: string): RouteCandidate | undefined {
  return [...state.nearbyCandidates, ...state.manualCandidates].find((route) => route.routeId === routeId);
}
