"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  buildTargetAdvisoryRequest,
  toDirectionChoices,
} from "../domain/adapters";
import {
  LiveRiderFlowClientError,
  createMockRiderFlowClient,
} from "../api/riderFlowClient";
import type { RiderFlowClient } from "../api/riderFlowClient";
import {
  flowReducer,
  initialFlowState,
  normalizeFlowError,
} from "../domain/flow";
import type { LocationProvider } from "../location/locationProvider";
import type {
  DirectionChoice,
  FlowError,
  FlowState,
  MapAvailability,
  MockLocationResult,
  MockScenarioId,
  PrototypeScenarioId,
  RequestId,
  RetryTarget,
  RouteCandidate,
} from "../domain/types";
import {
  MockApiError,
  createMockApi,
  createMockLocationProvider,
} from "../mocks/mockApi";
import { getPrototypeScenario } from "../mocks/scenarioStates";

type UseOnboardingFlowOptions = {
  locationProvider?: LocationProvider;
  mockScenarioId?: MockScenarioId;
  riderFlowClient?: RiderFlowClient;
  scenarioId?: MockScenarioId;
  stopAfterRouteSelection?: boolean;
  prototypeScenarioId?: PrototypeScenarioId;
  locationResult?: MockLocationResult;
  mapAvailabilityOverride?: MapAvailability;
};

export type OnboardingFlowController = {
  manualQueryDraft: string;
  state: FlowState;
  actions: {
    changeDirection(): void;
    changeRoute(): void;
    continueWaiting(): void;
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
  const injectedLocationProvider = options.locationProvider;
  const injectedRiderFlowClient = options.riderFlowClient;
  const stopAfterRouteSelection = options.stopAfterRouteSelection ?? false;
  const seededScenario =
    options.prototypeScenarioId === undefined
      ? undefined
      : getPrototypeScenario(options.prototypeScenarioId).seed;
  const [state, dispatch] = useReducer(
    flowReducer,
    seededScenario?.state ?? initialFlowState
  );
  const [manualQueryDraft, setManualQueryDraft] = useState(
    seededScenario?.manualQueryDraft ?? initialFlowState.manualQuery
  );
  const [manualSearchEnabled, setManualSearchEnabled] = useState(
    seededScenario === undefined
  );
  const requestSequenceRef = useRef(0);

  const scenarioId =
    options.mockScenarioId ??
    options.scenarioId ??
    seededScenario?.mockScenarioId ??
    "nearby-routes";
  const mapAvailability =
    options.mapAvailabilityOverride ??
    seededScenario?.mapAvailabilityOverride ??
    mapAvailabilityForScenario(scenarioId);

  const api = useMemo(
    () =>
      createMockApi({
        scenarioId,
        delays:
          scenarioId === "nearby-slow"
            ? { nearbyMs: 900 }
            : scenarioId === "computing-advice"
              ? { advisoryMs: 900 }
              : undefined,
      }),
    [scenarioId]
  );

  const routeCandidateClient = useMemo(
    () => injectedRiderFlowClient ?? createMockRiderFlowClient(api),
    [api, injectedRiderFlowClient]
  );

  const locationProvider = useMemo(
    () =>
      injectedLocationProvider ??
      createMockLocationProvider(
        options.locationResult ??
          seededScenario?.locationResult ??
          (scenarioId === "location-denied"
            ? { kind: "denied" }
            : { kind: "granted", lat: -27.5969, lng: -48.5488 })
      ),
    [
      injectedLocationProvider,
      options.locationResult,
      scenarioId,
      seededScenario?.locationResult,
    ]
  );

  const nextRequestId = useCallback((prefix: string): RequestId => {
    requestSequenceRef.current += 1;
    return `${prefix}-${requestSequenceRef.current}`;
  }, []);

  const failOperation = useCallback(
    (requestId: RequestId, error: unknown, retryTarget: RetryTarget) => {
      const normalized =
        error instanceof MockApiError
          ? error.flowError
          : error instanceof LiveRiderFlowClientError
            ? error.flowError
            : normalizeFlowError(error);
      const flowError: FlowError = {
        ...normalized,
        retryTarget,
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
      const locationResult = input.includeFreshLocation
        ? await locationProvider.getCurrentLocation()
        : undefined;
      const referenceLocation =
        locationResult?.kind === "granted"
          ? { lat: locationResult.lat, lng: locationResult.lng }
          : (input.fallbackLocation ?? { lat: -27.5969, lng: -48.5488 });

      const advisoryRequest = buildTargetAdvisoryRequest({
        lat: referenceLocation.lat,
        lng: referenceLocation.lng,
        routeVersionId: input.routeVersionId,
        routeDirectionId: input.routeDirectionId,
      });

      dispatch({
        type: "routeConfirmed",
        requestId,
        advisoryRequest,
        referenceLocation,
      });

      try {
        const advice = await api.createOnboardAdvisory(advisoryRequest);
        dispatch({
          type: "advisorySucceeded",
          requestId,
          advice,
        });
      } catch (error) {
        failOperation(requestId, error, {
          kind: "advisory",
          request: advisoryRequest,
        });
      }
    },
    [api, failOperation, locationProvider, nextRequestId]
  );

  const openManualSearch = useCallback(() => {
    dispatch({ type: "manualSearchOpened" });
  }, []);

  const requestLocation = useCallback(async () => {
    dispatch({ type: "locationRequested" });

    const requestId = nextRequestId("nearby");
    const location = await locationProvider.getCurrentLocation();
    dispatch({
      type: "locationResolved",
      requestId,
      result: location,
      radiusMeters: 1200,
      limit: 5,
    });

    if (location.kind !== "granted") {
      return;
    }

    window.setTimeout(() => {
      dispatch({ type: "nearbySlowThresholdReached", requestId });
    }, 500);

    try {
      const candidates = await routeCandidateClient.listNearbyRouteCandidates({
        lat: location.lat,
        lng: location.lng,
        radiusMeters: 1200,
        limit: 5,
      });
      dispatch({
        type: "nearbyRoutesSucceeded",
        requestId,
        candidates,
      });
    } catch (error) {
      failOperation(requestId, error, {
        kind: "nearbyRoutes",
        lat: location.lat,
        lng: location.lng,
        radiusMeters: 1200,
        limit: 5,
      });
    }
  }, [failOperation, locationProvider, nextRequestId, routeCandidateClient]);

  const selectRoute = useCallback(
    async (route: RouteCandidate, source: "nearby" | "manual") => {
      if (stopAfterRouteSelection) {
        dispatch({ type: "routeSelectionStopped", route, source });
        return;
      }

      const requestId = nextRequestId("directions");
      dispatch({ type: "routeSelected", route, source, requestId });

      try {
        const response = await api.getRouteDirections(
          route.routeId,
          route.routeVersionId
        );
        dispatch({
          type: "directionsSucceeded",
          requestId,
          directions: toDirectionChoices(response),
        });
      } catch (error) {
        failOperation(requestId, error, {
          kind: "directions",
          routeId: route.routeId,
        });
      }
    },
    [api, failOperation, nextRequestId, stopAfterRouteSelection]
  );

  const selectDirection = useCallback(
    async (direction: DirectionChoice) => {
      if (state.selectedRoute === undefined) {
        return;
      }

      const requestId = nextRequestId("geometry");
      dispatch({ type: "directionSelected", direction, requestId });

      try {
        const geometry = await api.getRouteGeometry(
          direction.routeDirectionId,
          state.selectedRoute.routeVersionId
        );
        dispatch({
          type: "geometrySucceeded",
          requestId,
          geometry,
          mapAvailability,
        });
      } catch (error) {
        failOperation(requestId, error, {
          kind: "geometry",
          routeId: state.selectedRoute.routeId,
          routeDirectionId: direction.routeDirectionId,
          routeVersionId: state.selectedRoute.routeVersionId,
        });
      }
    },
    [api, failOperation, mapAvailability, nextRequestId, state.selectedRoute]
  );

  const confirmRoute = useCallback(() => {
    if (
      state.selectedRoute === undefined ||
      state.selectedDirection === undefined
    ) {
      return;
    }

    void requestAdvisory({
      includeFreshLocation: false,
      fallbackLocation: state.latestLocation,
      routeDirectionId: state.selectedDirection.routeDirectionId,
      routeVersionId: state.selectedRoute.routeVersionId,
    });
  }, [
    requestAdvisory,
    state.latestLocation,
    state.selectedDirection,
    state.selectedRoute,
  ]);

  const refreshAdvice = useCallback(() => {
    if (
      state.selectedRoute === undefined ||
      state.selectedDirection === undefined
    ) {
      return;
    }

    void requestAdvisory({
      includeFreshLocation: true,
      fallbackLocation: state.latestLocation,
      routeDirectionId: state.selectedDirection.routeDirectionId,
      routeVersionId: state.selectedRoute.routeVersionId,
    });
  }, [
    requestAdvisory,
    state.latestLocation,
    state.selectedDirection,
    state.selectedRoute,
  ]);

  const retry = useCallback(() => {
    const retryTarget = state.error?.retryTarget;
    if (retryTarget === undefined) {
      return;
    }

    if (retryTarget.kind === "nearbyRoutes") {
      void requestLocation();
      return;
    }

    if (retryTarget.kind === "manualSearch") {
      dispatch({ type: "manualSearchOpened" });
      setManualQueryDraft(retryTarget.query);
      setManualSearchEnabled(true);
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
      const direction = state.directionChoices.find(
        (choice) => choice.routeDirectionId === retryTarget.routeDirectionId
      );
      if (direction !== undefined) {
        void selectDirection(direction);
      }
      return;
    }

    if (retryTarget.kind === "advisory") {
      const routeVersionId =
        state.selectedRoute?.routeVersionId ??
        retryTarget.request.route_version_id;
      const routeDirectionId =
        state.selectedDirection?.routeDirectionId ??
        retryTarget.request.route_direction_id;
      void requestAdvisory({
        includeFreshLocation: false,
        fallbackLocation: {
          lat: retryTarget.request.lat,
          lng: retryTarget.request.lng,
        },
        routeDirectionId,
        routeVersionId,
      });
    }
  }, [requestAdvisory, requestLocation, selectDirection, selectRoute, state]);

  useEffect(() => {
    if (!manualSearchEnabled) {
      return;
    }

    if (
      state.screen !== "manualRouteSearch" &&
      state.screen !== "noManualResults"
    ) {
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
        const candidates = await routeCandidateClient.searchRouteCandidates({
          query,
          limit: 8,
        });
        dispatch({
          type: "manualSearchSucceeded",
          requestId,
          candidates,
        });
      } catch (error) {
        failOperation(requestId, error, {
          kind: "manualSearch",
          query,
          limit: 8,
        });
      }
    }, 180);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    failOperation,
    manualQueryDraft,
    manualSearchEnabled,
    nextRequestId,
    routeCandidateClient,
    state.screen,
  ]);

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
      continueWaiting() {
        dispatch({ type: "continueWaiting" });
      },
      confirmRoute,
      openManualSearch,
      refreshAdvice,
      retry,
      searchManually(query: string) {
        if (
          state.screen !== "manualRouteSearch" &&
          state.screen !== "noManualResults"
        ) {
          dispatch({ type: "manualSearchOpened" });
        }
        setManualSearchEnabled(true);
        setManualQueryDraft(query);
      },
      selectDirection(direction: DirectionChoice) {
        void selectDirection(direction);
      },
      selectRoute(route: RouteCandidate, source: "nearby" | "manual") {
        void selectRoute(route, source);
      },
      useLocation() {
        void requestLocation();
      },
    },
  };
}

function mapAvailabilityForScenario(
  scenarioId: MockScenarioId
): MapAvailability {
  return scenarioId === "confirmation-fallback-map-unavailable"
    ? "unavailable"
    : "available";
}

function sourceRouteForRetry(
  state: FlowState,
  routeId: string
): RouteCandidate | undefined {
  return [...state.nearbyCandidates, ...state.manualCandidates].find(
    (route) => route.routeId === routeId
  );
}
