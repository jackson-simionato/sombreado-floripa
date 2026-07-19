import { z } from "zod";

import {
  requestBrowserJson,
  requireApiBaseUrl,
  type BrowserRequestOptions,
} from "./browserApi";

const directionChoiceSchema = z.object({
  routeDirectionId: z.string(),
  sequence: z.number(),
  name: z.string(),
  directionKind: z.enum(["ida", "volta"]).nullable(),
  departureLabels: z.array(z.string()),
});

export const directionChoicesResponseSchema = z.object({
  directions: z.array(directionChoiceSchema),
});

export type DirectionChoiceTransport = z.infer<typeof directionChoiceSchema>;
export type DirectionChoicesResponseTransport = z.infer<
  typeof directionChoicesResponseSchema
>;

export type RouteDirectionsClient = {
  listRouteDirections(
    input: { routeId: string; routeVersionId: string },
    options?: BrowserRequestOptions
  ): Promise<DirectionChoicesResponseTransport>;
};

export function createRouteDirectionsClient({
  baseUrl,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): RouteDirectionsClient {
  const normalizedBaseUrl = requireApiBaseUrl(baseUrl);

  return {
    listRouteDirections(input, options) {
      const searchParams = new URLSearchParams({
        routeVersionId: input.routeVersionId,
      });

      return requestBrowserJson({
        fetchImpl,
        url: `${normalizedBaseUrl}/routes/${encodeURIComponent(input.routeId)}/directions?${searchParams.toString()}`,
        schema: directionChoicesResponseSchema,
        options,
        requestFailureMessage: "Não consegui carregar os sentidos agora.",
        malformedResponseMessage:
          "A resposta da API de sentidos veio em um formato inesperado.",
      });
    },
  };
}
