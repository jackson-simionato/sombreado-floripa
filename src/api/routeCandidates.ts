import { z } from "zod";

import {
  requireApiBaseUrl,
  requestBrowserJson,
  type BrowserRequestOptions,
} from "./browserApi";

export { LiveApiError, requireApiBaseUrl } from "./browserApi";

const routeCandidateSchema = z.object({
  routeId: z.string(),
  routeVersionId: z.string(),
  routeCode: z.string(),
  routeName: z.string(),
  distanceMeters: z.number().optional(),
  directionHints: z.array(z.string()).optional(),
});

export const routeCandidatesResponseSchema = z.object({
  routes: z.array(routeCandidateSchema),
});

export type RouteCandidateTransport = z.infer<typeof routeCandidateSchema>;
export type RouteCandidatesResponseTransport = z.infer<
  typeof routeCandidatesResponseSchema
>;

export type RouteCandidateRequestOptions = BrowserRequestOptions;

export type RouteCandidatesClient = {
  listNearbyRouteCandidates(
    input: {
      lat: number;
      lng: number;
      radiusMeters: number;
      limit: number;
    },
    options?: RouteCandidateRequestOptions
  ): Promise<RouteCandidatesResponseTransport>;
  searchRouteCandidates(
    input: {
      query: string;
      limit: number;
    },
    options?: RouteCandidateRequestOptions
  ): Promise<RouteCandidatesResponseTransport>;
};

export function createRouteCandidatesClient({
  baseUrl,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): RouteCandidatesClient {
  const normalizedBaseUrl = requireApiBaseUrl(baseUrl);

  return {
    listNearbyRouteCandidates(input, options) {
      const searchParams = new URLSearchParams({
        lat: input.lat.toString(),
        lng: input.lng.toString(),
        radiusMeters: input.radiusMeters.toString(),
        limit: input.limit.toString(),
      });

      return requestRouteCandidates(
        fetchImpl,
        `${normalizedBaseUrl}/route-candidates/nearby?${searchParams.toString()}`,
        options
      );
    },

    searchRouteCandidates(input, options) {
      const searchParams = new URLSearchParams({
        query: input.query,
        limit: input.limit.toString(),
      });

      return requestRouteCandidates(
        fetchImpl,
        `${normalizedBaseUrl}/route-candidates/search?${searchParams.toString()}`,
        options
      );
    },
  };
}

async function requestRouteCandidates(
  fetchImpl: typeof fetch,
  url: string,
  options?: RouteCandidateRequestOptions
): Promise<RouteCandidatesResponseTransport> {
  return requestBrowserJson({
    fetchImpl,
    url,
    schema: routeCandidatesResponseSchema,
    options,
    requestFailureMessage: "Não consegui carregar as linhas agora.",
    malformedResponseMessage:
      "A resposta da API de linhas veio em um formato inesperado.",
  });
}
