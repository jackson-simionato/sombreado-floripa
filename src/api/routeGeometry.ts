import { z } from "zod";

import {
  LiveApiError,
  requestBrowserJson,
  requireApiBaseUrl,
  type BrowserRequestOptions,
} from "./browserApi";

const latLngSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

export const routeGeometryResponseSchema = z.object({
  routeId: z.string().min(1),
  routeVersionId: z.string().min(1),
  routeDirectionId: z.string().min(1),
  polyline: z.array(latLngSchema),
});

export type RouteGeometryTransport = z.infer<
  typeof routeGeometryResponseSchema
>;

export type RouteGeometryInput = {
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
};

export type RouteGeometryClient = {
  getRouteGeometry(
    input: RouteGeometryInput,
    options?: BrowserRequestOptions
  ): Promise<RouteGeometryTransport>;
};

export function createRouteGeometryClient({
  baseUrl,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): RouteGeometryClient {
  const normalizedBaseUrl = requireApiBaseUrl(baseUrl);

  return {
    async getRouteGeometry(input, options) {
      const searchParams = new URLSearchParams({
        routeVersionId: input.routeVersionId,
      });
      const geometry = await requestBrowserJson({
        fetchImpl,
        url: `${normalizedBaseUrl}/routes/${encodeURIComponent(input.routeId)}/directions/${encodeURIComponent(input.routeDirectionId)}/geometry?${searchParams.toString()}`,
        schema: routeGeometryResponseSchema,
        options,
        requestFailureMessage: "Não consegui carregar o trajeto agora.",
        malformedResponseMessage:
          "A resposta da API de trajeto veio em um formato inesperado.",
      });

      if (
        geometry.routeId !== input.routeId ||
        geometry.routeVersionId !== input.routeVersionId ||
        geometry.routeDirectionId !== input.routeDirectionId
      ) {
        throw new LiveApiError({
          kind: "malformedResponse",
          message: "A resposta da API de trajeto não corresponde à seleção.",
        });
      }

      return geometry;
    },
  };
}
