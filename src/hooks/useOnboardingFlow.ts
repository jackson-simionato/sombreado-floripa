"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { buildTargetAdvisoryRequest } from "../domain/adapters";
import { isAbortedApiError } from "../api/browserApi";
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
  stopAfterDirectionSelection?: boolean;
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
  const stopAfterDirectionSelection =
    options.stopAfterDirectionSelection ?? false;
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
  const manualSearchAbortRef = useRef<AbortController | undefined>(undefined);
  const directionsAbortRef = useRef<AbortController | undefined>(undefined);

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

  const riderFlowClient = useMemo(
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

  const requestNearbyCandidates = useCallback(
    async (location: { lat: number; lng: number }) => {
      const requestId = nextRequestId("nearby");
      dispatch({
        type: "locationResolved",
        requestId,
        result: { kind: "granted", ...location },
        radiusMeters: 1200,
        limit: 5,
      });

      window.setTimeout(() => {
        dispatch({ type: "nearbySlowThresholdReached", requestId });
      }, 500);

      try {
        const candidates = await riderFlowClient.listNearbyRouteCandidates({
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
    },
    [failOperation, nextRequestId, riderFlowClient]
  );

  const requestLocation = useCallback(async () => {
    dispatch({ type: "locationRequested" });

    const location = await locationProvider.getCurrentLocation();
    if (location.kind !== "granted") {
      dispatch({
        type: "locationResolved",
        requestId: nextRequestId("nearby"),
        result: location,
      });
      return;
    }

    await requestNearbyCandidates({ lat: location.lat, lng: location.lng });
  }, [locationProvider, nextRequestId, requestNearbyCandidates]);

  const selectRoute = useCallback(
    async (route: RouteCandidate, source: "nearby" | "manual") => {
      const requestId = nextRequestId("directions");
      directionsAbortRef.current?.abort();
      const controller = new AbortController();
      directionsAbortRef.current = controller;
      dispatch({ type: "routeSelected", route, source, requestId });

      try {
        const directions = await riderFlowClient.listRouteDirections(
          { routeId: route.routeId, routeVersionId: route.routeVersionId },
          { signal: controller.signal }
        );
        dispatch({
          type: "directionsSucceeded",
          requestId,
          directions,
        });
      } catch (error) {
        if (isAbortedApiError(error)) {
          return;
        }

        if (
          error instanceof LiveRiderFlowClientError &&
          error.flowError.kind === "routeVersionStale"
        ) {
          dispatch({ type: "routeVersionStaleDetected" });
          if (source === "manual") {
            setManualSearchEnabled(true);
            return;
          }
          if (state.latestLocation !== undefined) {
            void requestNearbyCandidates(state.latestLocation);
          } else {
            void requestLocation();
          }
          return;
        }

        failOperation(requestId, error, {
          kind: "directions",
          routeId: route.routeId,
          routeVersionId: route.routeVersionId,
        });
      }
    },
    [
      failOperation,
      nextRequestId,
      requestLocation,
      requestNearbyCandidates,
      riderFlowClient,
      state.latestLocation,
    ]
  );

  const selectDirection = useCallback(
    async (direction: DirectionChoice) => {
      if (state.selectedRoute === undefined) {
        return;
      }

      if (stopAfterDirectionSelection) {
        dispatch({ type: "directionSelectionStopped", direction });
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
    [
      api,
      failOperation,
      mapAvailability,
      nextRequestId,
      state.selectedRoute,
      stopAfterDirectionSelection,
    ]
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
      const route = sourceRouteForRetry(
        state,
        retryTarget.routeId,
        retryTarget.routeVersionId
      );
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
      manualSearchAbortRef.current?.abort();
      manualSearchAbortRef.current = undefined;
      dispatch({ type: "manualSearchCleared" });
      return;
    }

    const requestId = nextRequestId("manual");
    let controller: AbortController | undefined;
    const timerId = window.setTimeout(async () => {
      controller = new AbortController();
      manualSearchAbortRef.current = controller;
      dispatch({ type: "manualSearchRequested", requestId, query, limit: 8 });

      try {
        const candidates = await riderFlowClient.searchRouteCandidates(
          { query, limit: 8 },
          { signal: controller.signal }
        );
        dispatch({
          type: "manualSearchSucceeded",
          requestId,
          candidates,
        });
      } catch (error) {
        if (isAbortedApiError(error)) {
          return;
        }
        failOperation(requestId, error, {
          kind: "manualSearch",
          query,
          limit: 8,
        });
      }
    }, 180);

    return () => {
      window.clearTimeout(timerId);
      controller?.abort();
      if (manualSearchAbortRef.current === controller) {
        manualSearchAbortRef.current = undefined;
      }
    };
  }, [
    failOperation,
    manualQueryDraft,
    manualSearchEnabled,
    nextRequestId,
    riderFlowClient,
    state.screen,
  ]);

  useEffect(
    () => () => {
      manualSearchAbortRef.current?.abort();
      directionsAbortRef.current?.abort();
    },
    []
  );

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
  routeId: string,
  routeVersionId: string
): RouteCandidate | undefined {
  return [...state.nearbyCandidates, ...state.manualCandidates].find(
    (route) =>
      route.routeId === routeId && route.routeVersionId === routeVersionId
  );
}
