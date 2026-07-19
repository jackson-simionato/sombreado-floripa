import type {
  ExposureDirection,
  MockScenarioId,
  RouteDirectionsResponse,
  RouteGeometry,
  RoutesResponse,
  TargetAdvisoryResponse,
} from "../domain/types";

export const fixtureIds = {
  routes: {
    lagoa: "00000000-0000-0000-0000-000000000124",
    tilagCentro: "00000000-0000-0000-0000-000000000330",
    noDirections: "00000000-0000-0000-0000-000000000404",
    missingGeometry: "00000000-0000-0000-0000-000000000888",
  },
  routeVersions: {
    lagoaCurrent: "00000000-0000-0000-0000-000000001124",
    tilagCentroCurrent: "00000000-0000-0000-0000-000000001330",
    noDirectionsCurrent: "00000000-0000-0000-0000-000000001404",
    missingGeometryCurrent: "00000000-0000-0000-0000-000000001888",
  },
  routeDirections: {
    lagoaOutbound: "00000000-0000-0000-0000-000000002124",
    lagoaInbound: "00000000-0000-0000-0000-000000003124",
    tilagCentroOutbound: "00000000-0000-0000-0000-000000002330",
    tilagCentroInbound: "00000000-0000-0000-0000-000000003330",
    missingGeometryOutbound: "00000000-0000-0000-0000-000000002888",
  },
  segments: {
    lagoaA: "00000000-0000-0000-0000-000000004124",
  },
} as const;

export const routesResponse: RoutesResponse = {
  routes: [
    {
      route_id: fixtureIds.routes.lagoa,
      route_code: "124",
      route_name: "TICEN - Lagoa",
      route_version_id: fixtureIds.routeVersions.lagoaCurrent,
      distance_meters: 320,
      directions: [
        {
          route_direction_id: fixtureIds.routeDirections.lagoaOutbound,
          sequence: 1,
          name: "TICEN para Lagoa",
          direction_kind: "ida",
          departure_labels: ["TICEN", "UFSC", "Trindade"],
        },
        {
          route_direction_id: fixtureIds.routeDirections.lagoaInbound,
          sequence: 2,
          name: "Lagoa para TICEN",
          direction_kind: "volta",
          departure_labels: ["Lagoa", "TICEN"],
        },
      ],
    },
    {
      route_id: fixtureIds.routes.tilagCentro,
      route_code: "330",
      route_name: "TILAG - Centro",
      route_version_id: fixtureIds.routeVersions.tilagCentroCurrent,
      distance_meters: 780,
      directions: [
        {
          route_direction_id: fixtureIds.routeDirections.tilagCentroOutbound,
          sequence: 1,
          name: "TILAG para Centro",
          direction_kind: "ida",
          departure_labels: ["TILAG", "Trindade", "Centro"],
        },
        {
          route_direction_id: fixtureIds.routeDirections.tilagCentroInbound,
          sequence: 2,
          name: "Centro para TILAG",
          direction_kind: "volta",
          departure_labels: ["TICEN", "Trindade", "TILAG"],
        },
      ],
    },
    {
      route_id: fixtureIds.routes.noDirections,
      route_code: "404",
      route_name: "UFSC",
      route_version_id: fixtureIds.routeVersions.noDirectionsCurrent,
      distance_meters: 1120,
      directions: [],
    },
    {
      route_id: fixtureIds.routes.missingGeometry,
      route_code: "888",
      route_name: "Lagoa - Trindade",
      route_version_id: fixtureIds.routeVersions.missingGeometryCurrent,
      distance_meters: 1450,
      directions: [
        {
          route_direction_id:
            fixtureIds.routeDirections.missingGeometryOutbound,
          sequence: 1,
          name: "Lagoa para Trindade",
          direction_kind: null,
          departure_labels: ["Lagoa", "Trindade"],
        },
      ],
    },
  ],
};

export const emptyRoutesResponse: RoutesResponse = {
  routes: [],
};

export const routeDirectionsByRouteId: Record<string, RouteDirectionsResponse> =
  {
    [fixtureIds.routes.lagoa]: {
      directions: routesResponse.routes[0]?.directions ?? [],
    },
    [fixtureIds.routes.tilagCentro]: {
      directions: routesResponse.routes[1]?.directions ?? [],
    },
    [fixtureIds.routes.noDirections]: {
      directions: [],
    },
    [fixtureIds.routes.missingGeometry]: {
      directions: routesResponse.routes[3]?.directions ?? [],
    },
  };

export const routeGeometryByDirectionId: Record<string, RouteGeometry> = {
  [fixtureIds.routeDirections.lagoaOutbound]: {
    routeId: fixtureIds.routes.lagoa,
    routeVersionId: fixtureIds.routeVersions.lagoaCurrent,
    routeDirectionId: fixtureIds.routeDirections.lagoaOutbound,
    polyline: [
      { lat: -27.5969, lng: -48.5488 },
      { lat: -27.5961, lng: -48.5363 },
      { lat: -27.5991, lng: -48.5238 },
      { lat: -27.5991, lng: -48.5238 },
      { lat: -27.6023, lng: -48.5052 },
      { lat: -27.6049, lng: -48.4789 },
    ],
  },
  [fixtureIds.routeDirections.tilagCentroOutbound]: {
    routeId: fixtureIds.routes.tilagCentro,
    routeVersionId: fixtureIds.routeVersions.tilagCentroCurrent,
    routeDirectionId: fixtureIds.routeDirections.tilagCentroOutbound,
    polyline: [
      { lat: -27.5907, lng: -48.5156 },
      { lat: -27.5958, lng: -48.5249 },
      { lat: -27.5968, lng: -48.5484 },
    ],
  },
  [fixtureIds.routeDirections.missingGeometryOutbound]: {
    routeId: fixtureIds.routes.missingGeometry,
    routeVersionId: fixtureIds.routeVersions.missingGeometryCurrent,
    routeDirectionId: fixtureIds.routeDirections.missingGeometryOutbound,
    polyline: [],
  },
};

export const mockAdvisories = {
  advisoryExposureRightRecommendsLeft: advisory("right", "on_route"),
  advisoryExposureLeftRecommendsRight: advisory("left", "on_route"),
  advisoryExposureFrontRecommendsBack: advisory("front", "on_route"),
  advisoryExposureBackRecommendsFront: advisory("back", "on_route"),
  advisoryExposureOverheadNeutral: advisory("overhead", "on_route"),
  advisoryExposureNoneNeutral: advisory("none", "on_route"),
  advisoryPreviewLeft: advisory("left", "estimated_route_point"),
  advisoryWithheld: {
    status: "withheld",
    advisory_context: "unavailable",
    route_version_id: fixtureIds.routeVersions.lagoaCurrent,
    route_direction_id: fixtureIds.routeDirections.lagoaOutbound,
    requested_at: "2026-05-26T12:00:00.000Z",
    reason: "mock advisory unavailable",
    reason_code: "missing_route_geometry",
  },
} as const satisfies Record<string, TargetAdvisoryResponse>;

export const mockScenarios: ReadonlyArray<{ id: MockScenarioId }> = [
  { id: "nearby-routes" },
  { id: "nearby-slow" },
  { id: "nearby-empty" },
  { id: "location-denied" },
  { id: "manual-search" },
  { id: "manual-empty" },
  { id: "route-no-directions" },
  { id: "confirmation-fallback-missing-geometry" },
  { id: "confirmation-fallback-map-unavailable" },
  { id: "computing-advice" },
  { id: "advice-exposure-right-recommends-left" },
  { id: "advice-exposure-left-recommends-right" },
  { id: "advice-exposure-front-recommends-back" },
  { id: "advice-exposure-back-recommends-front" },
  { id: "advice-neutral-overhead" },
  { id: "advice-neutral-none" },
  { id: "advice-preview-left" },
  { id: "advice-withheld" },
  { id: "api-error" },
  { id: "api-error-nearby-routes" },
  { id: "api-error-manual-search" },
  { id: "api-error-directions" },
  { id: "api-error-geometry" },
  { id: "api-error-advice" },
];

function advisory(
  dominantDirection: ExposureDirection,
  context: "on_route" | "estimated_route_point"
): TargetAdvisoryResponse {
  return {
    status: "advisory",
    advisory_context: context,
    route_version_id: fixtureIds.routeVersions.lagoaCurrent,
    route_direction_id: fixtureIds.routeDirections.lagoaOutbound,
    requested_at: "2026-05-26T12:00:00.000Z",
    projected_position: {
      segment_id: fixtureIds.segments.lagoaA,
      segment_sequence: 1,
      lat: -27.5969,
      lng: -48.5488,
      distance_from_route_meters: context === "estimated_route_point" ? 64 : 8,
      cumulative_distance_meters: 120,
    },
    upcoming_window: {
      total_distance_meters: 1500,
      dominant_direction: dominantDirection,
      breakdown_meters: {
        left: dominantDirection === "left" ? 1500 : 0,
        right: dominantDirection === "right" ? 1500 : 0,
        front: dominantDirection === "front" ? 1500 : 0,
        back: dominantDirection === "back" ? 1500 : 0,
        overhead: dominantDirection === "overhead" ? 1500 : 0,
        none: dominantDirection === "none" ? 1500 : 0,
      },
    },
    remaining_route: {
      total_distance_meters: 3450,
      dominant_direction: dominantDirection,
      breakdown_meters: {
        left: dominantDirection === "left" ? 3450 : 0,
        right: dominantDirection === "right" ? 3450 : 0,
        front: dominantDirection === "front" ? 3450 : 0,
        back: dominantDirection === "back" ? 3450 : 0,
        overhead: dominantDirection === "overhead" ? 3450 : 0,
        none: dominantDirection === "none" ? 3450 : 0,
      },
    },
  };
}
