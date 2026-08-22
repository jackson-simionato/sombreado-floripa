import { toDirectionChoices, toRouteCandidates } from "../domain/adapters";
import type {
  DirectionChoice,
  FlowError,
  RouteCandidate,
  RouteGeometry,
  TargetAdvisoryRequest,
} from "../domain/types";
import type { MockApi } from "../mocks/mockApi";
import { createAdviceClient } from "./advice";
import type {
  AdviceClient,
  AdviceRequestTransport,
  AdviceResponseTransport,
} from "./advice";
import { LiveApiError } from "./browserApi";
import type { BrowserRequestOptions } from "./browserApi";
import { createRouteCandidatesClient } from "./routeCandidates";
import type {
  RouteCandidateRequestOptions,
  RouteCandidateTransport,
  RouteCandidatesClient,
  RouteCandidatesResponseTransport,
} from "./routeCandidates";
import { createRouteDirectionsClient } from "./routeDirections";
import type {
  DirectionChoicesResponseTransport,
  RouteDirectionsClient,
} from "./routeDirections";
import { createRouteGeometryClient } from "./routeGeometry";
import type {
  RouteGeometryClient,
  RouteGeometryInput,
  RouteGeometryTransport,
} from "./routeGeometry";

export type NearbyRouteCandidateInput = {
  lat: number;
  lng: number;
  radiusMeters: number;
  limit: number;
};

export type ManualRouteCandidateInput = {
  query: string;
  limit: number;
};

export type RiderFlowClient = {
  listNearbyRouteCandidates(
    input: NearbyRouteCandidateInput,
    options?: RouteCandidateRequestOptions
  ): Promise<RouteCandidate[]>;
  searchRouteCandidates(
    input: ManualRouteCandidateInput,
    options?: RouteCandidateRequestOptions
  ): Promise<RouteCandidate[]>;
  listRouteDirections(
    input: { routeId: string; routeVersionId: string },
    options?: BrowserRequestOptions
  ): Promise<DirectionChoice[]>;
  getRouteGeometry(
    input: RouteGeometryInput,
    options?: BrowserRequestOptions
  ): Promise<RouteGeometry>;
  requestAdvice(
    input: AdviceRequestTransport,
    options?: BrowserRequestOptions
  ): Promise<AdviceResponseTransport>;
};

export class LiveRiderFlowClientError extends Error {
  readonly flowError: FlowError;

  constructor(flowError: FlowError) {
    super(flowError.message);
    this.name = "LiveRiderFlowClientError";
    this.flowError = flowError;
  }
}

export function createLiveRiderFlowClient({
  baseUrl,
  fetchImpl,
}: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): RiderFlowClient {
  return createRiderFlowClientFromTransportClients(
    createAdviceClient({ baseUrl, fetchImpl }),
    createRouteCandidatesClient({ baseUrl, fetchImpl }),
    createRouteDirectionsClient({ baseUrl, fetchImpl }),
    createRouteGeometryClient({ baseUrl, fetchImpl })
  );
}

export function createMockRiderFlowClient(api: MockApi): RiderFlowClient {
  return {
    async listNearbyRouteCandidates(input) {
      const response = await api.listRoutes(input);
      return toRouteCandidates(response, { source: "nearby" });
    },
    async searchRouteCandidates(input) {
      const response = await api.listRoutes(input);
      return toRouteCandidates(response, { source: "manual" });
    },
    async listRouteDirections(input) {
      return toDirectionChoices(
        await api.getRouteDirections(input.routeId, input.routeVersionId)
      );
    },
    async getRouteGeometry(input) {
      return api.getRouteGeometry(
        input.routeId,
        input.routeDirectionId,
        input.routeVersionId
      );
    },
    async requestAdvice(input) {
      return toContractAdvice(
        await api.createOnboardAdvisory(toLegacyAdvisoryRequest(input)),
        input
      );
    },
  };
}

function createRiderFlowClientFromTransportClients(
  adviceClient: AdviceClient,
  routeCandidatesClient: RouteCandidatesClient,
  routeDirectionsClient: RouteDirectionsClient,
  routeGeometryClient: RouteGeometryClient
): RiderFlowClient {
  const directionsCache = new Map<string, DirectionChoice[]>();
  const geometryCache = new Map<string, RouteGeometry>();

  return {
    async listNearbyRouteCandidates(input, options) {
      try {
        return toLiveRouteCandidates(
          await routeCandidatesClient.listNearbyRouteCandidates(input, options)
        );
      } catch (error) {
        throw normalizeLiveRiderFlowError(error);
      }
    },
    async searchRouteCandidates(input, options) {
      try {
        return toLiveRouteCandidates(
          await routeCandidatesClient.searchRouteCandidates(input, options)
        );
      } catch (error) {
        throw normalizeLiveRiderFlowError(error);
      }
    },
    async listRouteDirections(input, options) {
      const cacheKey = directionsCacheKey(input);
      const cached = directionsCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      try {
        const directions = toLiveDirectionChoices(
          await routeDirectionsClient.listRouteDirections(input, options)
        );
        directionsCache.set(cacheKey, directions);
        return directions;
      } catch (error) {
        throw normalizeLiveErrorAndInvalidateCaches(
          error,
          directionsCache,
          geometryCache,
          input.routeId,
          input.routeVersionId
        );
      }
    },
    async getRouteGeometry(input, options) {
      const cacheKey = geometryCacheKey(input);
      const cached = geometryCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      try {
        const geometry = toLiveRouteGeometry(
          await routeGeometryClient.getRouteGeometry(input, options)
        );
        geometryCache.set(cacheKey, geometry);
        return geometry;
      } catch (error) {
        throw normalizeLiveErrorAndInvalidateCaches(
          error,
          directionsCache,
          geometryCache,
          input.routeId,
          input.routeVersionId
        );
      }
    },
    async requestAdvice(input, options) {
      try {
        return await adviceClient.requestAdvice(input, options);
      } catch (error) {
        throw normalizeLiveErrorAndInvalidateCaches(
          error,
          directionsCache,
          geometryCache,
          input.routeId,
          input.routeVersionId
        );
      }
    },
  };
}

function directionsCacheKey(input: {
  routeId: string;
  routeVersionId: string;
}): string {
  return `${input.routeId}\0${input.routeVersionId}`;
}

function geometryCacheKey(input: RouteGeometryInput): string {
  return `${input.routeId}\0${input.routeVersionId}\0${input.routeDirectionId}`;
}

function invalidateRouteVersionCaches(
  directionsCache: Map<string, DirectionChoice[]>,
  geometryCache: Map<string, RouteGeometry>,
  routeId: string,
  routeVersionId: string
): void {
  directionsCache.delete(directionsCacheKey({ routeId, routeVersionId }));
  const geometryPrefix = `${routeId}\0${routeVersionId}\0`;
  for (const key of geometryCache.keys()) {
    if (key.startsWith(geometryPrefix)) {
      geometryCache.delete(key);
    }
  }
}

function normalizeLiveErrorAndInvalidateCaches(
  error: unknown,
  directionsCache: Map<string, DirectionChoice[]>,
  geometryCache: Map<string, RouteGeometry>,
  routeId: string,
  routeVersionId: string
): Error {
  const normalized = normalizeLiveRiderFlowError(error);
  if (
    normalized instanceof LiveRiderFlowClientError &&
    normalized.flowError.kind === "routeVersionStale"
  ) {
    invalidateRouteVersionCaches(
      directionsCache,
      geometryCache,
      routeId,
      routeVersionId
    );
  }
  return normalized;
}

function toLiveRouteCandidates(
  response: RouteCandidatesResponseTransport
): RouteCandidate[] {
  return response.routes.map(toLiveRouteCandidate);
}

function toLiveRouteCandidate(route: RouteCandidateTransport): RouteCandidate {
  return {
    routeId: route.routeId,
    routeVersionId: route.routeVersionId,
    code: route.routeCode,
    name: route.routeName,
    ...(route.distanceMeters === undefined
      ? {}
      : { distanceMeters: route.distanceMeters }),
    directionHints: [...(route.directionHints ?? [])],
  };
}

function toLiveDirectionChoices(
  response: DirectionChoicesResponseTransport
): DirectionChoice[] {
  return response.directions.map((direction) => ({
    routeDirectionId: direction.routeDirectionId,
    sequence: direction.sequence,
    name: direction.name,
    directionKind: direction.directionKind,
    departureLabels: [...direction.departureLabels],
  }));
}

function toLiveRouteGeometry(geometry: RouteGeometryTransport): RouteGeometry {
  return {
    ...geometry,
    polyline: geometry.polyline.map(({ lat, lng }) => ({ lat, lng })),
  };
}

function toLegacyAdvisoryRequest(
  input: AdviceRequestTransport
): TargetAdvisoryRequest {
  return {
    lat: input.location?.lat ?? -27.5969,
    lng: input.location?.lng ?? -48.5488,
    route_version_id: input.routeVersionId,
    route_direction_id: input.routeDirectionId,
    datetime: input.observedAt,
    window_minutes: 15,
    include_remaining: input.horizon === "remainingRoute",
  };
}

function toContractAdvice(
  response: Awaited<ReturnType<MockApi["createOnboardAdvisory"]>>,
  input: AdviceRequestTransport
): AdviceResponseTransport {
  const mode =
    response.status === "advisory" &&
    response.advisory_context === "estimated_route_point"
      ? "preview"
      : input.mode;
  const horizon = mode === "preview" ? "remainingRoute" : input.horizon;

  if (response.status === "withheld") {
    return {
      status: "withheld",
      mode,
      horizon,
      routeId: input.routeId,
      routeVersionId: input.routeVersionId,
      routeDirectionId: input.routeDirectionId,
      reasonCode: toContractWithheldReason(response.reason_code),
      computedAt: response.requested_at,
    };
  }

  const window =
    horizon === "remainingRoute"
      ? (response.remaining_route ?? response.upcoming_window)
      : response.upcoming_window;
  const directSunExposure = window?.dominant_direction ?? "none";
  const recommendedSeatArea =
    directSunExposure === "overhead" || directSunExposure === "none"
      ? "neutral"
      : invertMockExposure(directSunExposure);

  return {
    status: "advice",
    mode,
    horizon,
    routeId: input.routeId,
    routeVersionId: input.routeVersionId,
    routeDirectionId: input.routeDirectionId,
    directSunExposure,
    recommendedSeatArea,
    sunCondition:
      directSunExposure === "none"
        ? "night"
        : directSunExposure === "overhead"
          ? "overhead"
          : "daylight",
    computedAt: response.requested_at,
    ...(response.projected_position === undefined
      ? {}
      : {
          position: {
            lat: response.projected_position.lat,
            lng: response.projected_position.lng,
            source:
              mode === "preview"
                ? ("directionStart" as const)
                : ("liveLocation" as const),
            distanceFromRouteMeters:
              response.projected_position.distance_from_route_meters,
          },
        }),
  };
}

function invertMockExposure(
  exposure: Exclude<
    AdviceResponseTransport & { status: "advice" },
    { status: "withheld" }
  >["directSunExposure"]
): Exclude<
  AdviceResponseTransport & { status: "advice" },
  { status: "withheld" }
>["recommendedSeatArea"] {
  switch (exposure) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "front":
      return "back";
    case "back":
      return "front";
    case "overhead":
    case "none":
      return "neutral";
  }
}

function toContractWithheldReason(
  reasonCode: Awaited<
    ReturnType<MockApi["createOnboardAdvisory"]>
  >["reason_code"]
): Extract<AdviceResponseTransport, { status: "withheld" }>["reasonCode"] {
  switch (reasonCode) {
    case "insufficient_sun_signal":
      return "insufficientSunSignal";
    case "direction_unconfirmed":
      return "unsupportedDirection";
    case "off_route_no_preview_point":
      return "locationOffRoute";
    case "missing_route_geometry":
    default:
      return "missingRouteGeometry";
  }
}

function normalizeLiveRiderFlowError(error: unknown): Error {
  if (error instanceof LiveApiError) {
    if (error.kind === "aborted") {
      return error;
    }

    if (error.code === "routeVersionStale") {
      return new LiveRiderFlowClientError({
        kind: "routeVersionStale",
        message: "As opções desta linha foram atualizadas.",
      });
    }

    return new LiveRiderFlowClientError({
      kind: "api",
      message: "Não consegui carregar as linhas agora.",
    });
  }

  return error instanceof Error
    ? error
    : new LiveRiderFlowClientError({
        kind: "unknown",
        message: "Não consegui carregar as linhas agora.",
      });
}
