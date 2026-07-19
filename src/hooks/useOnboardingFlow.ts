"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

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
  FlowAdvisoryRequest,
  FlowError,
  FlowState,
  LocationFix,
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

type PrototypeOnboardingFlowOptions = {
  runtime: "prototype";
  locationProvider?: LocationProvider;
  mockScenarioId?: MockScenarioId;
  riderFlowClient?: RiderFlowClient;
  scenarioId?: MockScenarioId;
  stopAfterRouteConfirmation?: boolean;
  prototypeScenarioId?: PrototypeScenarioId;
  locationResult?: MockLocationResult;
  mapAvailabilityOverride?: MapAvailability;
};

type LiveOnboardingFlowOptions = {
  runtime: "live";
  locationProvider: LocationProvider;
  mapAvailabilityOverride?: MapAvailability;
  riderFlowClient: RiderFlowClient;
};

type UseOnboardingFlowOptions =
  | PrototypeOnboardingFlowOptions
  | LiveOnboardingFlowOptions;

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

export function useOnboardingFlow(options: UseOnboardingFlowOptions) {
  if (options.runtime === "live" && options.riderFlowClient === undefined) {
    throw new Error("Live runtime requires a rider flow client.");
  }
  if (options.runtime === "live" && options.locationProvider === undefined) {
    throw new Error("Live runtime requires a location provider.");
  }

  const injectedLocationProvider = options.locationProvider;
  const injectedRiderFlowClient = options.riderFlowClient;
  const stopAfterRouteConfirmation =
    options.runtime === "prototype"
      ? (options.stopAfterRouteConfirmation ?? false)
      : false;
  const seededScenario =
    options.runtime === "live" || options.prototypeScenarioId === undefined
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
  const [manualSearchRequestNonce, setManualSearchRequestNonce] = useState(0);
  const requestSequenceRef = useRef(0);
  const manualSearchAbortRef = useRef<AbortController | undefined>(undefined);
  const directionsAbortRef = useRef<AbortController | undefined>(undefined);
  const geometryAbortRef = useRef<AbortController | undefined>(undefined);
  const advisoryAbortRef = useRef<AbortController | undefined>(undefined);
  const nearbySlowTimeoutRef = useRef<number | undefined>(undefined);

  const scenarioId =
    (options.runtime === "prototype" ? options.mockScenarioId : undefined) ??
    (options.runtime === "prototype" ? options.scenarioId : undefined) ??
    seededScenario?.mockScenarioId ??
    "nearby-routes";
  const mapAvailability =
    options.mapAvailabilityOverride ??
    seededScenario?.mapAvailabilityOverride ??
    mapAvailabilityForScenario(scenarioId);
  const prototypeLocationResult =
    options.runtime === "prototype" ? options.locationResult : undefined;

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
        prototypeLocationResult ??
          seededScenario?.locationResult ??
          (scenarioId === "location-denied"
            ? { kind: "denied" }
            : {
                kind: "granted",
                lat: -27.5969,
                lng: -48.5488,
                accuracyMeters: 25,
                observedAt: new Date().toISOString(),
              })
      ),
    [
      injectedLocationProvider,
      prototypeLocationResult,
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

  const requestNearbyCandidates = useCallback(
    async (location: LocationFix) => {
      const requestId = nextRequestId("nearby");
      if (nearbySlowTimeoutRef.current !== undefined) {
        window.clearTimeout(nearbySlowTimeoutRef.current);
        nearbySlowTimeoutRef.current = undefined;
      }
      dispatch({
        type: "locationResolved",
        requestId,
        result: { kind: "granted", ...location },
        radiusMeters: 1200,
        limit: 5,
      });

      nearbySlowTimeoutRef.current = window.setTimeout(() => {
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
      } finally {
        if (nearbySlowTimeoutRef.current !== undefined) {
          window.clearTimeout(nearbySlowTimeoutRef.current);
          nearbySlowTimeoutRef.current = undefined;
        }
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

    await requestNearbyCandidates(location);
  }, [locationProvider, nextRequestId, requestNearbyCandidates]);

  const recoverStaleRouteVersion = useCallback(
    async (source: "nearby" | "manual") => {
      dispatch({ type: "routeVersionStaleDetected" });

      if (source === "manual") {
        setManualQueryDraft(state.manualQuery);
        setManualSearchEnabled(true);
        setManualSearchRequestNonce((nonce) => nonce + 1);
        return;
      }

      const freshLocation = await locationProvider.getCurrentLocation();
      const recoveryLocation = chooseNearbyRecoveryLocation(freshLocation, {
        fallbackLocation: state.latestLocation,
      });

      if (recoveryLocation !== undefined) {
        await requestNearbyCandidates(recoveryLocation);
        return;
      }

      dispatch({
        type: "locationResolved",
        requestId: nextRequestId("nearby"),
        result:
          freshLocation.kind === "granted"
            ? { kind: "unavailable" }
            : freshLocation,
      });
    },
    [
      locationProvider,
      nextRequestId,
      requestNearbyCandidates,
      state.latestLocation,
      state.manualQuery,
    ]
  );

  const requestAdvisory = useCallback(
    async (input: {
      fallbackLocation?: LocationFix;
      routeId: string;
      routeDirectionId: string;
      routeSource: "nearby" | "manual";
      routeVersionId: string;
    }) => {
      const requestId = nextRequestId("advisory");
      const locationResult = await locationProvider.getCurrentLocation();
      const decision = chooseAdviceLocation(locationResult, {
        fallbackLocation: input.fallbackLocation,
      });
      const observedAt = new Date().toISOString();
      const advisoryRequest =
        decision.location === undefined
          ? {
              routeId: input.routeId,
              routeVersionId: input.routeVersionId,
              routeDirectionId: input.routeDirectionId,
              mode: "preview" as const,
              horizon: "remainingRoute" as const,
              observedAt,
            }
          : {
              routeId: input.routeId,
              routeVersionId: input.routeVersionId,
              routeDirectionId: input.routeDirectionId,
              mode: "onboard" as const,
              horizon: "upcoming" as const,
              observedAt,
              fallbackToPreview: true,
              location: decision.location,
            };

      dispatch({
        type: "routeConfirmed",
        requestId,
        advisoryRequest,
        referenceLocation: decision.location,
        freshnessNotice: decision.freshnessNotice,
      });

      advisoryAbortRef.current?.abort();
      const controller = new AbortController();
      advisoryAbortRef.current = controller;

      try {
        const advice = await riderFlowClient.requestAdvice(advisoryRequest, {
          signal: controller.signal,
        });
        dispatch({
          type: "advisorySucceeded",
          requestId,
          advice,
          freshnessNotice: decision.freshnessNotice,
        });
      } catch (error) {
        if (isAbortedApiError(error)) {
          return;
        }

        if (
          error instanceof LiveRiderFlowClientError &&
          error.flowError.kind === "routeVersionStale"
        ) {
          void recoverStaleRouteVersion(input.routeSource);
          return;
        }

        failOperation(requestId, error, {
          kind: "advisory",
          request: advisoryRequest,
        });
      }
    },
    [
      failOperation,
      locationProvider,
      nextRequestId,
      recoverStaleRouteVersion,
      riderFlowClient,
    ]
  );

  const openManualSearch = useCallback(() => {
    dispatch({ type: "manualSearchOpened" });
  }, []);

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
          void recoverStaleRouteVersion(source);
          return;
        }

        failOperation(requestId, error, {
          kind: "directions",
          routeId: route.routeId,
          routeVersionId: route.routeVersionId,
        });
      }
    },
    [failOperation, nextRequestId, recoverStaleRouteVersion, riderFlowClient]
  );

  const selectDirection = useCallback(
    async (direction: DirectionChoice) => {
      const route = state.selectedRoute;
      if (route === undefined) {
        return;
      }

      geometryAbortRef.current?.abort();
      const controller = new AbortController();
      geometryAbortRef.current = controller;
      const requestId = nextRequestId("geometry");
      dispatch({ type: "directionSelected", direction, requestId });

      try {
        const geometry = await riderFlowClient.getRouteGeometry(
          {
            routeId: route.routeId,
            routeDirectionId: direction.routeDirectionId,
            routeVersionId: route.routeVersionId,
          },
          { signal: controller.signal }
        );
        dispatch({
          type: "geometrySucceeded",
          requestId,
          geometry,
          mapAvailability,
        });
      } catch (error) {
        if (isAbortedApiError(error)) {
          return;
        }

        if (
          error instanceof LiveRiderFlowClientError &&
          error.flowError.kind === "routeVersionStale"
        ) {
          void recoverStaleRouteVersion(route.source);
          return;
        }

        failOperation(requestId, error, {
          kind: "geometry",
          routeId: route.routeId,
          routeDirectionId: direction.routeDirectionId,
          routeVersionId: route.routeVersionId,
        });
      }
    },
    [
      failOperation,
      mapAvailability,
      nextRequestId,
      recoverStaleRouteVersion,
      riderFlowClient,
      state.selectedRoute,
    ]
  );

  const confirmRoute = useCallback(() => {
    if (
      state.selectedRoute === undefined ||
      state.selectedDirection === undefined
    ) {
      return;
    }

    if (stopAfterRouteConfirmation) {
      dispatch({ type: "routeConfirmationStopped" });
      return;
    }

    void requestAdvisory({
      fallbackLocation: state.latestLocation,
      routeId: state.selectedRoute.routeId,
      routeDirectionId: state.selectedDirection.routeDirectionId,
      routeSource: state.selectedRoute.source,
      routeVersionId: state.selectedRoute.routeVersionId,
    });
  }, [
    requestAdvisory,
    state.latestLocation,
    state.selectedDirection,
    state.selectedRoute,
    stopAfterRouteConfirmation,
  ]);

  const refreshAdvice = useCallback(() => {
    if (
      state.selectedRoute === undefined ||
      state.selectedDirection === undefined
    ) {
      return;
    }

    void requestAdvisory({
      fallbackLocation: state.latestLocation,
      routeId: state.selectedRoute.routeId,
      routeDirectionId: state.selectedDirection.routeDirectionId,
      routeSource: state.selectedRoute.source,
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
      setManualSearchRequestNonce((nonce) => nonce + 1);
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
        routeVersionIdForAdviceRequest(retryTarget.request);
      const routeDirectionId =
        state.selectedDirection?.routeDirectionId ??
        routeDirectionIdForAdviceRequest(retryTarget.request);
      void requestAdvisory({
        fallbackLocation: state.latestLocation,
        routeId:
          state.selectedRoute?.routeId ??
          routeIdForAdviceRequest(retryTarget.request),
        routeDirectionId,
        routeSource: state.selectedRoute?.source ?? "manual",
        routeVersionId,
      });
    }
  }, [requestAdvisory, requestLocation, selectDirection, selectRoute, state]);

  const manualSearchScreenActive =
    state.screen === "manualRouteSearch" || state.screen === "noManualResults";

  useEffect(() => {
    if (!manualSearchEnabled) {
      return;
    }

    if (!manualSearchScreenActive) {
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
    manualSearchRequestNonce,
    manualSearchScreenActive,
    nextRequestId,
    riderFlowClient,
  ]);

  useEffect(
    () => () => {
      manualSearchAbortRef.current?.abort();
      directionsAbortRef.current?.abort();
      geometryAbortRef.current?.abort();
      advisoryAbortRef.current?.abort();
      if (nearbySlowTimeoutRef.current !== undefined) {
        window.clearTimeout(nearbySlowTimeoutRef.current);
        nearbySlowTimeoutRef.current = undefined;
      }
    },
    []
  );

  return {
    manualQueryDraft,
    state,
    actions: {
      changeDirection() {
        geometryAbortRef.current?.abort();
        dispatch({ type: "changeDirection" });
      },
      changeRoute() {
        geometryAbortRef.current?.abort();
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

const MAX_USABLE_LOCATION_ACCURACY_METERS = 100;
const FRESH_LOCATION_MAX_AGE_MS = 30_000;
const RECENT_FALLBACK_LOCATION_MAX_AGE_MS = 120_000;

function chooseAdviceLocation(
  result: MockLocationResult,
  options: { fallbackLocation?: LocationFix; now?: () => Date }
): {
  location?: LocationFix & { observedAt: string };
  freshnessNotice?: "recentFallback";
} {
  const now = options.now?.() ?? new Date();
  const freshLocation =
    result.kind === "granted" ? normalizeLocationFix(result) : undefined;

  if (
    freshLocation !== undefined &&
    isUsableLocation(freshLocation, now, FRESH_LOCATION_MAX_AGE_MS)
  ) {
    return { location: freshLocation };
  }

  if (
    options.fallbackLocation !== undefined &&
    isUsableLocation(
      options.fallbackLocation,
      now,
      RECENT_FALLBACK_LOCATION_MAX_AGE_MS
    )
  ) {
    return {
      location: normalizeLocationFix(options.fallbackLocation),
      freshnessNotice: "recentFallback",
    };
  }

  return {};
}

function chooseNearbyRecoveryLocation(
  result: MockLocationResult,
  options: { fallbackLocation?: LocationFix; now?: () => Date }
): LocationFix | undefined {
  const now = options.now?.() ?? new Date();
  const freshLocation =
    result.kind === "granted" ? normalizeLocationFix(result) : undefined;

  if (
    freshLocation !== undefined &&
    isUsableLocation(freshLocation, now, FRESH_LOCATION_MAX_AGE_MS)
  ) {
    return freshLocation;
  }

  if (
    options.fallbackLocation !== undefined &&
    isUsableLocation(
      options.fallbackLocation,
      now,
      RECENT_FALLBACK_LOCATION_MAX_AGE_MS
    )
  ) {
    return normalizeLocationFix(options.fallbackLocation);
  }

  return undefined;
}

function normalizeLocationFix(
  location: LocationFix
): LocationFix & { observedAt: string } {
  return {
    lat: location.lat,
    lng: location.lng,
    ...(location.accuracyMeters === undefined
      ? {}
      : { accuracyMeters: location.accuracyMeters }),
    observedAt: location.observedAt ?? new Date().toISOString(),
  };
}

function isUsableLocation(
  location: LocationFix,
  now: Date,
  maxAgeMs: number
): boolean {
  if (
    location.accuracyMeters !== undefined &&
    location.accuracyMeters > MAX_USABLE_LOCATION_ACCURACY_METERS
  ) {
    return false;
  }

  if (location.observedAt === undefined) {
    return false;
  }

  const observedAtMs = Date.parse(location.observedAt);
  return (
    Number.isFinite(observedAtMs) && now.getTime() - observedAtMs <= maxAgeMs
  );
}

function routeIdForAdviceRequest(request: FlowAdvisoryRequest): string {
  return "routeId" in request ? request.routeId : "";
}

function routeVersionIdForAdviceRequest(request: FlowAdvisoryRequest): string {
  return "routeVersionId" in request
    ? request.routeVersionId
    : request.route_version_id;
}

function routeDirectionIdForAdviceRequest(
  request: FlowAdvisoryRequest
): string {
  return "routeDirectionId" in request
    ? request.routeDirectionId
    : request.route_direction_id;
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
