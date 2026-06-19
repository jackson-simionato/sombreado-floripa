import { toUiAdvice } from "./adapters";
import type {
  DirectionChoice,
  FlowError,
  FlowState,
  MapAvailability,
  MockLocationResult,
  RequestId,
  RetryTarget,
  RouteCandidate,
  RouteGeometryResponse,
  RouteSelectionSource,
  ScreenStateName,
  SelectedDirection,
  SelectedRoute,
  TargetAdvisoryRequest,
  TargetAdvisoryResponse,
} from "./types";

export const initialFlowState: FlowState = {
  screen: "locationRequest",
  requestStatus: "idle",
  manualQuery: "",
  nearbyCandidates: [],
  manualCandidates: [],
  directionChoices: [],
  mapAvailability: "available",
  pendingRequests: {},
};

export type FlowEvent =
  | { type: "locationRequested" }
  | { type: "manualSearchOpened" }
  | {
      type: "locationResolved";
      requestId: RequestId;
      result: MockLocationResult;
      radiusMeters?: number;
      limit?: number;
    }
  | { type: "nearbySlowThresholdReached"; requestId: RequestId }
  | {
      type: "nearbyRoutesSucceeded";
      requestId: RequestId;
      candidates: RouteCandidate[];
    }
  | {
      type: "manualSearchRequested";
      requestId: RequestId;
      query: string;
      limit?: number;
    }
  | {
      type: "manualSearchSucceeded";
      requestId: RequestId;
      candidates: RouteCandidate[];
    }
  | { type: "manualSearchCleared" }
  | { type: "continueWaiting" }
  | {
      type: "routeSelected";
      route: RouteCandidate;
      source: RouteSelectionSource;
      requestId: RequestId;
    }
  | {
      type: "directionsSucceeded";
      requestId: RequestId;
      directions: DirectionChoice[];
    }
  | {
      type: "directionSelected";
      direction: DirectionChoice;
      requestId: RequestId;
    }
  | { type: "directionSelectionStopped"; direction: DirectionChoice }
  | { type: "routeVersionStaleDetected" }
  | {
      type: "geometrySucceeded";
      requestId: RequestId;
      geometry: RouteGeometryResponse;
      mapAvailability: MapAvailability;
    }
  | {
      type: "routeConfirmed";
      requestId: RequestId;
      advisoryRequest: TargetAdvisoryRequest;
      referenceLocation?: { lat: number; lng: number };
    }
  | {
      type: "advisorySucceeded";
      requestId: RequestId;
      advice: TargetAdvisoryResponse;
    }
  | { type: "operationFailed"; requestId: RequestId; error: FlowError }
  | { type: "retryRequested"; requestId: RequestId; retryTarget: RetryTarget }
  | { type: "changeRoute" }
  | { type: "changeDirection" };

export function flowReducer(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case "locationRequested":
      return clearError({
        ...state,
        screen: "locationRequest",
        requestStatus: "idle",
        locationIssue: undefined,
      });

    case "manualSearchOpened":
      return clearError({
        ...state,
        screen: "manualRouteSearch",
        requestStatus: "idle",
      });

    case "locationResolved":
      if (event.result.kind !== "granted") {
        return clearError({
          ...state,
          screen: "locationDeniedRecovery",
          requestStatus: "error",
          locationIssue: event.result.kind,
          pendingRequests: {
            ...state.pendingRequests,
            nearbyRoutes: undefined,
          },
        });
      }

      return clearError({
        ...state,
        screen: "findingNearbyRoutes",
        requestStatus: "loading",
        latestLocation: { lat: event.result.lat, lng: event.result.lng },
        locationIssue: undefined,
        pendingRequests: {
          ...state.pendingRequests,
          nearbyRoutes: event.requestId,
        },
      });

    case "nearbySlowThresholdReached":
      if (state.pendingRequests.nearbyRoutes !== event.requestId) {
        return state;
      }
      return compactState({
        ...state,
        screen: "slowLoadingNotice",
      });

    case "nearbyRoutesSucceeded":
      if (state.pendingRequests.nearbyRoutes !== event.requestId) {
        return state;
      }
      return clearError({
        ...state,
        screen:
          event.candidates.length > 0
            ? "routeCandidateSelection"
            : "noNearbyRoutes",
        requestStatus: "success",
        nearbyCandidates: cloneRouteCandidates(event.candidates),
        pendingRequests: {
          ...state.pendingRequests,
          nearbyRoutes: undefined,
        },
      });

    case "manualSearchRequested":
      return clearError({
        ...state,
        screen: "manualRouteSearch",
        requestStatus: "loading",
        manualQuery: event.query,
        manualCandidates: [],
        pendingRequests: {
          ...state.pendingRequests,
          manualSearch: event.requestId,
        },
      });

    case "manualSearchCleared":
      if (
        state.manualQuery.length === 0 &&
        state.manualCandidates.length === 0 &&
        state.pendingRequests.manualSearch === undefined &&
        state.error === undefined
      ) {
        return state;
      }
      return compactState({
        ...state,
        screen: "manualRouteSearch",
        requestStatus: "idle",
        manualQuery: "",
        manualCandidates: [],
        error: undefined,
        pendingRequests: {
          ...state.pendingRequests,
          manualSearch: undefined,
        },
      });

    case "manualSearchSucceeded":
      if (state.pendingRequests.manualSearch !== event.requestId) {
        return state;
      }
      return clearError({
        ...state,
        screen:
          event.candidates.length > 0 ? "manualRouteSearch" : "noManualResults",
        requestStatus: "success",
        manualCandidates: cloneRouteCandidates(event.candidates),
        pendingRequests: {
          ...state.pendingRequests,
          manualSearch: undefined,
        },
      });

    case "continueWaiting":
      if (state.screen !== "slowLoadingNotice") {
        return state;
      }
      return compactState({
        ...state,
        screen: "findingNearbyRoutes",
      });

    case "routeSelected":
      return clearAdviceAndGeometry(
        clearError({
          ...state,
          screen: "loadingDirectionChoices",
          requestStatus: "loading",
          selectedRoute: toSelectedRoute(event.route, event.source),
          selectedDirection: undefined,
          directionChoices: [],
          routeRefreshNotice: undefined,
          pendingRequests: {
            ...state.pendingRequests,
            directions: event.requestId,
          },
        })
      );

    case "directionsSucceeded":
      if (
        state.pendingRequests.directions !== event.requestId ||
        state.selectedRoute === undefined
      ) {
        return state;
      }
      return clearError({
        ...state,
        screen:
          event.directions.length > 0
            ? "directionChoice"
            : "routeWithoutDirections",
        requestStatus: "success",
        directionChoices: cloneDirectionChoices(event.directions),
        pendingRequests: {
          ...state.pendingRequests,
          directions: undefined,
        },
      });

    case "directionSelectionStopped":
      if (state.selectedRoute === undefined) {
        return state;
      }
      return clearAdviceAndGeometry(
        clearError({
          ...state,
          screen: "liveDirectionSelectedUnsupported",
          requestStatus: "success",
          selectedDirection: toSelectedDirection(event.direction),
          pendingRequests: {},
        })
      );

    case "routeVersionStaleDetected": {
      const source = state.selectedRoute?.source;
      return clearAdviceAndGeometry(
        clearError({
          ...state,
          screen:
            source === "manual" ? "manualRouteSearch" : "findingNearbyRoutes",
          requestStatus: "loading",
          manualCandidates: source === "manual" ? [] : state.manualCandidates,
          nearbyCandidates: source === "nearby" ? [] : state.nearbyCandidates,
          selectedRoute: undefined,
          selectedDirection: undefined,
          directionChoices: [],
          routeRefreshNotice: "routeVersionStale",
          pendingRequests: {},
        })
      );
    }

    case "directionSelected":
      if (state.selectedRoute === undefined) {
        return state;
      }
      return clearAdviceAndGeometry(
        clearError({
          ...state,
          screen: "directionChoice",
          requestStatus: "loading",
          selectedDirection: toSelectedDirection(event.direction),
          pendingRequests: {
            ...state.pendingRequests,
            geometry: event.requestId,
          },
        })
      );

    case "geometrySucceeded":
      if (
        state.pendingRequests.geometry !== event.requestId ||
        state.selectedRoute === undefined ||
        state.selectedDirection === undefined
      ) {
        return state;
      }
      return clearError({
        ...state,
        screen: geometryAllowsConfirmation(
          event.geometry,
          event.mapAvailability
        )
          ? "routeConfirmation"
          : "routeConfirmationFallback",
        requestStatus: "success",
        geometry: cloneGeometry(event.geometry),
        mapAvailability: event.mapAvailability,
        pendingRequests: {
          ...state.pendingRequests,
          geometry: undefined,
        },
      });

    case "routeConfirmed":
      if (
        state.selectedRoute === undefined ||
        state.selectedDirection === undefined
      ) {
        return state;
      }
      return clearError({
        ...state,
        screen: "computingAdvice",
        requestStatus: "loading",
        latestLocation: event.referenceLocation ?? state.latestLocation,
        advisoryRequest: { ...event.advisoryRequest },
        pendingRequests: {
          ...state.pendingRequests,
          advisory: event.requestId,
        },
      });

    case "advisorySucceeded":
      if (
        state.pendingRequests.advisory !== event.requestId ||
        state.selectedRoute === undefined ||
        state.selectedDirection === undefined
      ) {
        return state;
      }
      return clearError({
        ...state,
        screen: screenForAdvice(event.advice),
        requestStatus: "success",
        advice: toUiAdvice(event.advice),
        pendingRequests: {
          ...state.pendingRequests,
          advisory: undefined,
        },
      });

    case "operationFailed":
      if (!requestIsPending(state, event.requestId)) {
        return state;
      }
      return compactState({
        ...state,
        screen: "apiError",
        requestStatus: "error",
        error: normalizeFlowError(event.error),
        pendingRequests: clearPendingRequests(
          state.pendingRequests,
          event.requestId
        ),
      });

    case "retryRequested":
      return compactState({
        ...state,
        pendingRetry: {
          requestId: event.requestId,
          retryTarget: cloneRetryTarget(event.retryTarget),
        },
      });

    case "changeRoute":
      return clearAdviceAndGeometry({
        ...state,
        screen:
          state.selectedRoute?.source === "manual"
            ? "manualRouteSearch"
            : "routeCandidateSelection",
        requestStatus: "idle",
        selectedRoute: undefined,
        selectedDirection: undefined,
        directionChoices: [],
        error: undefined,
        advisoryRequest: undefined,
        pendingRequests: {},
      });

    case "changeDirection":
      if (state.selectedRoute === undefined) {
        return state;
      }
      return clearAdviceAndGeometry({
        ...state,
        screen:
          state.directionChoices.length > 0
            ? "directionChoice"
            : "findingNearbyRoutes",
        requestStatus: "idle",
        selectedDirection: undefined,
        error: undefined,
        advisoryRequest: undefined,
        pendingRequests: {},
      });

    default:
      return state;
  }
}

export function normalizeFlowError(
  error: FlowError | Error | unknown
): FlowError {
  if (isFlowError(error)) {
    return {
      ...error,
      retryTarget:
        error.retryTarget === undefined
          ? undefined
          : cloneRetryTarget(error.retryTarget),
    };
  }

  if (error instanceof Error) {
    return {
      kind: "unknown",
      message: error.message,
    };
  }

  return {
    kind: "unknown",
    message: "Unknown flow error",
  };
}

function screenForAdvice(advice: TargetAdvisoryResponse): ScreenStateName {
  if (advice.status === "withheld") {
    return "trueWithheld";
  }
  if (advice.advisory_context === "estimated_route_point") {
    return "routePreviewAdviceResult";
  }
  return "onboardAdviceResult";
}

function geometryAllowsConfirmation(
  geometry: RouteGeometryResponse,
  mapAvailability: MapAvailability
): boolean {
  return mapAvailability === "available" && geometry.segments.length > 0;
}

function requestIsPending(state: FlowState, requestId: RequestId): boolean {
  return Object.values(state.pendingRequests).includes(requestId);
}

function clearPendingRequests(
  pendingRequests: FlowState["pendingRequests"],
  requestId: RequestId
): FlowState["pendingRequests"] {
  return Object.fromEntries(
    Object.entries(pendingRequests).map(([key, value]) => [
      key,
      value === requestId ? undefined : value,
    ])
  ) as FlowState["pendingRequests"];
}

function toSelectedRoute(
  route: RouteCandidate,
  source: RouteSelectionSource
): SelectedRoute {
  return {
    routeId: route.routeId,
    routeVersionId: route.routeVersionId,
    code: route.code,
    name: route.name,
    ...(route.distanceMeters === undefined
      ? {}
      : { distanceMeters: route.distanceMeters }),
    source,
  };
}

function toSelectedDirection(direction: DirectionChoice): SelectedDirection {
  return {
    routeDirectionId: direction.routeDirectionId,
    sequence: direction.sequence,
    name: direction.name,
    departureLabels: [...direction.departureLabels],
  };
}

function clearAdviceAndGeometry(state: FlowState): FlowState {
  return compactState({
    ...state,
    geometry: undefined,
    advice: undefined,
    advisoryRequest: undefined,
  });
}

function clearError(state: FlowState): FlowState {
  return compactState({
    ...state,
    error: undefined,
  });
}

function cloneRouteCandidates(candidates: RouteCandidate[]): RouteCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    directionHints: [...candidate.directionHints],
  }));
}

function cloneDirectionChoices(
  directions: DirectionChoice[]
): DirectionChoice[] {
  return directions.map((direction) => ({
    ...direction,
    departureLabels: [...direction.departureLabels],
  }));
}

function cloneGeometry(geometry: RouteGeometryResponse): RouteGeometryResponse {
  return {
    ...geometry,
    segments: geometry.segments.map((segment) => ({
      ...segment,
      coordinates: segment.coordinates.map(([lng, lat]) => [lng, lat]),
    })),
  };
}

function cloneRetryTarget(retryTarget: RetryTarget): RetryTarget {
  if (retryTarget.kind === "advisory") {
    return {
      kind: "advisory",
      request: { ...retryTarget.request },
    };
  }
  return { ...retryTarget };
}

function isFlowError(error: unknown): error is FlowError {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const maybe = error as Partial<FlowError>;
  return typeof maybe.kind === "string" && typeof maybe.message === "string";
}

function compactState(state: FlowState): FlowState {
  return removeUndefined(state) as FlowState;
}

function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([entryKey, entryValue]) => [entryKey, removeUndefined(entryValue)])
  );
}
