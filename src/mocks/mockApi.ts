import type {
  FlowError,
  MockLocationResult,
  MockScenarioId,
  RouteDirectionsResponse,
  RouteGeometry,
  RoutesResponse,
  TargetAdvisoryRequest,
  TargetAdvisoryResponse,
} from "../domain/types";
import {
  emptyRoutesResponse,
  fixtureIds,
  mockAdvisories,
  routeDirectionsByRouteId,
  routeGeometryByDirectionId,
  routesResponse,
} from "./fixtures";

export type ListRoutesParams = {
  query?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  limit?: number;
};

export type MockApiDelays = {
  nearbyMs?: number;
  manualSearchMs?: number;
  directionsMs?: number;
  geometryMs?: number;
  advisoryMs?: number;
};

export type MockApi = {
  listRoutes(params: ListRoutesParams): Promise<RoutesResponse>;
  getRouteDirections(
    routeId: string,
    routeVersionId: string
  ): Promise<RouteDirectionsResponse>;
  getRouteGeometry(
    routeId: string,
    routeDirectionId: string,
    routeVersionId: string
  ): Promise<RouteGeometry>;
  createOnboardAdvisory(
    request: TargetAdvisoryRequest
  ): Promise<TargetAdvisoryResponse>;
};

export class MockApiError extends Error {
  readonly flowError: FlowError;

  constructor(flowError: FlowError) {
    super(flowError.message);
    this.name = "MockApiError";
    this.flowError = flowError;
  }
}

export function createMockApi(
  options: { scenarioId?: MockScenarioId; delays?: MockApiDelays } = {}
): MockApi {
  const scenarioId = options.scenarioId ?? "nearby-routes";
  const delays = options.delays ?? {};

  return {
    async listRoutes(params) {
      await delay(
        params.query === undefined ? delays.nearbyMs : delays.manualSearchMs
      );
      rejectIfApiError(
        scenarioId,
        params.query === undefined ? "nearbyRoutes" : "manualSearch"
      );

      if (scenarioId === "nearby-empty" && params.query === undefined) {
        return emptyRoutesResponse;
      }
      if (scenarioId === "manual-empty" && params.query !== undefined) {
        return emptyRoutesResponse;
      }

      const routes =
        params.query === undefined
          ? nearbyRoutes()
          : manualRoutes(params.query);
      return {
        routes: routes.slice(0, params.limit ?? routes.length),
      };
    },

    async getRouteDirections(routeId, routeVersionId) {
      await delay(delays.directionsMs);
      rejectIfApiError(scenarioId, "directions");

      const route = routesResponse.routes.find(
        (candidate) => candidate.route_id === routeId
      );
      if (route !== undefined && route.route_version_id !== routeVersionId) {
        throw new MockApiError({
          kind: "routeVersionStale",
          message: "Mock route version is stale",
        });
      }

      if (
        scenarioId === "route-no-directions" ||
        routeId === fixtureIds.routes.noDirections
      ) {
        return { directions: [] };
      }

      return routeDirectionsByRouteId[routeId] ?? { directions: [] };
    },

    async getRouteGeometry(routeId, routeDirectionId, routeVersionId) {
      await delay(delays.geometryMs);
      rejectIfApiError(scenarioId, "geometry");

      if (scenarioId === "confirmation-fallback-missing-geometry") {
        return {
          routeId,
          routeVersionId,
          routeDirectionId,
          polyline: [],
        };
      }

      const geometry = routeGeometryByDirectionId[routeDirectionId];
      if (
        geometry !== undefined &&
        (geometry.routeId !== routeId ||
          geometry.routeVersionId !== routeVersionId)
      ) {
        throw new MockApiError({
          kind: "routeVersionStale",
          message: "Mock route version is stale",
        });
      }

      return (
        geometry ?? { routeId, routeVersionId, routeDirectionId, polyline: [] }
      );
    },

    async createOnboardAdvisory() {
      await delay(delays.advisoryMs);
      rejectIfApiError(scenarioId, "advisory");

      return advisoryForScenario(scenarioId);
    },
  };
}

export function createMockLocationProvider(
  result: MockLocationResult = { kind: "granted", lat: -27.5969, lng: -48.5488 }
): {
  getCurrentLocation(): Promise<MockLocationResult>;
} {
  return {
    async getCurrentLocation() {
      return result;
    },
  };
}

function nearbyRoutes(): RoutesResponse["routes"] {
  return [...routesResponse.routes]
    .filter((route) => route.route_id !== fixtureIds.routes.missingGeometry)
    .sort((left, right) => {
      if (
        left.distance_meters === undefined &&
        right.distance_meters === undefined
      ) {
        return 0;
      }
      if (left.distance_meters === undefined) {
        return 1;
      }
      if (right.distance_meters === undefined) {
        return -1;
      }
      return left.distance_meters - right.distance_meters;
    });
}

function manualRoutes(query: string): RoutesResponse["routes"] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) {
    return [];
  }

  return routesResponse.routes.filter((route) => {
    const haystack = normalizeSearchText(
      [
        route.route_code,
        route.route_name,
        ...route.directions.flatMap((direction) => [
          direction.name,
          ...direction.departure_labels,
        ]),
      ].join(" ")
    );

    return haystack.includes(normalizedQuery);
  });
}

function advisoryForScenario(
  scenarioId: MockScenarioId
): TargetAdvisoryResponse {
  switch (scenarioId) {
    case "advice-exposure-left-recommends-right":
      return mockAdvisories.advisoryExposureLeftRecommendsRight;
    case "advice-exposure-front-recommends-back":
      return mockAdvisories.advisoryExposureFrontRecommendsBack;
    case "advice-exposure-back-recommends-front":
      return mockAdvisories.advisoryExposureBackRecommendsFront;
    case "advice-neutral-overhead":
      return mockAdvisories.advisoryExposureOverheadNeutral;
    case "advice-neutral-none":
      return mockAdvisories.advisoryExposureNoneNeutral;
    case "advice-preview-left":
      return mockAdvisories.advisoryPreviewLeft;
    case "advice-withheld":
      return mockAdvisories.advisoryWithheld;
    case "advice-exposure-right-recommends-left":
    default:
      return mockAdvisories.advisoryExposureRightRecommendsLeft;
  }
}

function rejectIfApiError(
  scenarioId: MockScenarioId,
  operation:
    | "nearbyRoutes"
    | "manualSearch"
    | "directions"
    | "geometry"
    | "advisory"
): void {
  if (
    scenarioId === "api-error" ||
    (scenarioId === "api-error-nearby-routes" &&
      operation === "nearbyRoutes") ||
    (scenarioId === "api-error-manual-search" &&
      operation === "manualSearch") ||
    (scenarioId === "api-error-directions" && operation === "directions") ||
    (scenarioId === "api-error-geometry" && operation === "geometry") ||
    (scenarioId === "api-error-advice" && operation === "advisory")
  ) {
    throw new MockApiError({
      kind: "api",
      message: "Mock API failure",
    });
  }
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function delay(ms = 0): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
