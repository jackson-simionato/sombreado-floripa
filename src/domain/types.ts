export type LatLng = {
  lat: number;
  lng: number;
};

export type ExposureDirection =
  | "left"
  | "right"
  | "front"
  | "back"
  | "overhead"
  | "none";

export type DirectionalExposure = Exclude<
  ExposureDirection,
  "overhead" | "none"
>;

export type AdvisoryCalculationContext =
  | "on_route"
  | "estimated_route_point"
  | "unavailable";

export type AdvisoryReasonCode =
  | "missing_route_geometry"
  | "direction_unconfirmed"
  | "off_route_preview_available"
  | "off_route_no_preview_point"
  | "insufficient_sun_signal"
  | "service_unavailable";

export type LightweightRouteDirection = {
  route_direction_id: string;
  sequence: number;
  name: string;
  departure_labels: string[];
};

export type RouteSummary = {
  route_id: string;
  route_code: string;
  route_name: string;
  route_version_id: string;
  directions: LightweightRouteDirection[];
  distance_meters?: number;
};

export type RoutesResponse = {
  routes: RouteSummary[];
};

export type RouteDirectionsResponse = {
  directions: LightweightRouteDirection[];
};

export type RouteGeometry = {
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
  polyline: LatLng[];
};

export type ProjectedRoutePosition = {
  segment_id: string;
  segment_sequence: number;
  lat: number;
  lng: number;
  distance_from_route_meters: number;
  cumulative_distance_meters: number;
};

export type ExposureBreakdownMeters = Record<ExposureDirection, number>;

export type ExposureWindow = {
  total_distance_meters: number;
  dominant_direction: ExposureDirection;
  breakdown_meters: ExposureBreakdownMeters;
};

export type TargetAdvisoryRequest = {
  lat: number;
  lng: number;
  route_version_id: string;
  route_direction_id: string;
  datetime: string;
  window_minutes: number;
  include_remaining: boolean;
};

export type TargetAdvisoryResponse = {
  status: "advisory" | "withheld";
  advisory_context: AdvisoryCalculationContext;
  route_version_id: string;
  route_direction_id: string;
  requested_at: string;
  projected_position?: ProjectedRoutePosition;
  upcoming_window?: ExposureWindow;
  remaining_route?: ExposureWindow;
  reason?: string;
  reason_code?: AdvisoryReasonCode;
};

export type RouteCandidate = {
  routeId: string;
  routeVersionId: string;
  code: string;
  name: string;
  distanceMeters?: number;
  directionHints: string[];
};

export type DirectionChoice = {
  routeDirectionId: string;
  sequence: number;
  name: string;
  departureLabels: string[];
};

export type UiAdviceState =
  | {
      mode: "onboard";
      directSunExposure: DirectionalExposure;
      recommendedSeatArea: DirectionalExposure;
    }
  | {
      mode: "preview";
      directSunExposure: DirectionalExposure;
      recommendedSeatArea: DirectionalExposure;
      previewSource: "estimated_route_point";
      distanceFromRouteMeters?: number;
    }
  | {
      mode: "neutralComputed";
      directSunExposure: "overhead" | "none";
    }
  | {
      mode: "withheld";
      reasonCode: AdvisoryReasonCode;
    };

export type RequestStatus = "idle" | "loading" | "success" | "error";

export type RouteSelectionSource = "nearby" | "manual";

export type MapAvailability = "available" | "unavailable";

export type MockScenarioId =
  | "nearby-routes"
  | "nearby-slow"
  | "nearby-empty"
  | "location-denied"
  | "manual-search"
  | "manual-empty"
  | "route-no-directions"
  | "confirmation-fallback-missing-geometry"
  | "confirmation-fallback-map-unavailable"
  | "computing-advice"
  | "advice-exposure-right-recommends-left"
  | "advice-exposure-left-recommends-right"
  | "advice-exposure-front-recommends-back"
  | "advice-exposure-back-recommends-front"
  | "advice-neutral-overhead"
  | "advice-neutral-none"
  | "advice-preview-left"
  | "advice-withheld"
  | "api-error"
  | "api-error-nearby-routes"
  | "api-error-manual-search"
  | "api-error-directions"
  | "api-error-geometry"
  | "api-error-advice";

export type PrototypeScenarioId =
  | "location-request"
  | "location-finding-nearby"
  | "location-slow-loading"
  | "location-denied"
  | "routes-nearby"
  | "routes-none-nearby"
  | "manual-search"
  | "manual-search-empty"
  | "direction-choice"
  | "direction-unavailable"
  | "confirmation"
  | "confirmation-fallback"
  | "advice-computing"
  | "advice-onboard-left"
  | "advice-onboard-right"
  | "advice-onboard-front"
  | "advice-onboard-back"
  | "advice-neutral-overhead"
  | "advice-neutral-none"
  | "advice-preview"
  | "advice-withheld"
  | "error-nearby-routes"
  | "error-manual-search"
  | "error-directions"
  | "error-geometry"
  | "error-advice";

export type ScreenStateName =
  | "locationRequest"
  | "findingNearbyRoutes"
  | "slowLoadingNotice"
  | "locationDeniedRecovery"
  | "routeCandidateSelection"
  | "noNearbyRoutes"
  | "manualRouteSearch"
  | "noManualResults"
  | "loadingDirectionChoices"
  | "directionChoice"
  | "routeWithoutDirections"
  | "routeConfirmation"
  | "routeConfirmationFallback"
  | "liveRouteConfirmedUnsupported"
  | "computingAdvice"
  | "onboardAdviceResult"
  | "routePreviewAdviceResult"
  | "trueWithheld"
  | "apiError";

export type RequestId = string;

export type RetryTarget =
  | {
      kind: "nearbyRoutes";
      lat: number;
      lng: number;
      radiusMeters?: number;
      limit?: number;
    }
  | { kind: "manualSearch"; query: string; limit?: number }
  | { kind: "directions"; routeId: string; routeVersionId: string }
  | {
      kind: "geometry";
      routeId: string;
      routeDirectionId: string;
      routeVersionId: string;
    }
  | { kind: "advisory"; request: TargetAdvisoryRequest };

export type FlowError = {
  kind:
    | "api"
    | "timeout"
    | "permission"
    | "notFound"
    | "unknown"
    | "routeVersionStale";
  message: string;
  retryTarget?: RetryTarget;
};

export type MockLocationResult =
  | { kind: "granted"; lat: number; lng: number }
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "timeout" };

export type SelectedRoute = {
  routeId: string;
  routeVersionId: string;
  code: string;
  name: string;
  distanceMeters?: number;
  source: RouteSelectionSource;
};

export type SelectedDirection = {
  routeDirectionId: string;
  sequence: number;
  name: string;
  departureLabels: string[];
};

export type PendingRetry = {
  requestId: RequestId;
  retryTarget: RetryTarget;
};

export type RouteRefreshNotice = "routeVersionStale";

export type FlowState = {
  screen: ScreenStateName;
  requestStatus: RequestStatus;
  latestLocation?: LatLng;
  locationIssue?: Exclude<MockLocationResult["kind"], "granted">;
  manualQuery: string;
  nearbyCandidates: RouteCandidate[];
  manualCandidates: RouteCandidate[];
  directionChoices: DirectionChoice[];
  selectedRoute?: SelectedRoute;
  selectedDirection?: SelectedDirection;
  geometry?: RouteGeometry;
  mapAvailability: MapAvailability;
  advice?: UiAdviceState;
  advisoryRequest?: TargetAdvisoryRequest;
  error?: FlowError;
  routeRefreshNotice?: RouteRefreshNotice;
  pendingRetry?: PendingRetry;
  pendingRequests: {
    nearbyRoutes?: RequestId;
    manualSearch?: RequestId;
    directions?: RequestId;
    geometry?: RequestId;
    advisory?: RequestId;
  };
};
