import { toRouteCandidates } from "../domain/adapters";
import type { FlowError, RouteCandidate } from "../domain/types";
import type { MockApi } from "../mocks/mockApi";
import { LiveApiError, createRouteCandidatesClient } from "./routeCandidates";
import type {
  RouteCandidateRequestOptions,
  RouteCandidateTransport,
  RouteCandidatesClient,
  RouteCandidatesResponseTransport,
} from "./routeCandidates";

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
};

export class LiveRouteCandidateClientError extends Error {
  readonly flowError: FlowError;

  constructor(flowError: FlowError) {
    super(flowError.message);
    this.name = "LiveRouteCandidateClientError";
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
  return createRiderFlowClientFromRouteCandidatesClient(
    createRouteCandidatesClient({ baseUrl, fetchImpl })
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
  };
}

function createRiderFlowClientFromRouteCandidatesClient(
  client: RouteCandidatesClient
): RiderFlowClient {
  return {
    async listNearbyRouteCandidates(input, options) {
      try {
        return toLiveRouteCandidates(
          await client.listNearbyRouteCandidates(input, options)
        );
      } catch (error) {
        throw normalizeLiveRouteCandidateError(error);
      }
    },
    async searchRouteCandidates(input, options) {
      try {
        return toLiveRouteCandidates(
          await client.searchRouteCandidates(input, options)
        );
      } catch (error) {
        throw normalizeLiveRouteCandidateError(error);
      }
    },
  };
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

function normalizeLiveRouteCandidateError(error: unknown): Error {
  if (error instanceof LiveApiError) {
    return new LiveRouteCandidateClientError({
      kind: "api",
      message: "Não consegui carregar as linhas agora.",
    });
  }

  return error instanceof Error
    ? error
    : new LiveRouteCandidateClientError({
        kind: "unknown",
        message: "Não consegui carregar as linhas agora.",
      });
}
