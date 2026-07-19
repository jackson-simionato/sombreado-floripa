import { z } from "zod";

import {
  LiveApiError,
  requestBrowserJson,
  requireApiBaseUrl,
  type BrowserRequestOptions,
} from "./browserApi";

const adviceModeSchema = z.enum(["onboard", "preview"]);
const adviceHorizonSchema = z.enum(["upcoming", "remainingRoute"]);
const directSunExposureSchema = z.enum([
  "left",
  "right",
  "front",
  "back",
  "overhead",
  "none",
]);
const recommendedSeatAreaSchema = z.enum([
  "left",
  "right",
  "front",
  "back",
  "neutral",
]);
const sunConditionSchema = z.enum(["daylight", "night", "lowSun", "overhead"]);
const withheldReasonCodeSchema = z.enum([
  "missingRouteGeometry",
  "insufficientSunSignal",
  "unsupportedDirection",
  "noAdviceForSelectedHorizon",
  "locationOffRoute",
]);

const adviceLocationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracyMeters: z.number().finite().nonnegative().optional(),
  observedAt: z.string().datetime(),
});

const adviceRequestSchema = z.object({
  routeId: z.string().min(1),
  routeVersionId: z.string().min(1),
  routeDirectionId: z.string().min(1),
  mode: adviceModeSchema,
  horizon: adviceHorizonSchema,
  observedAt: z.string().datetime(),
  location: adviceLocationSchema.optional(),
  fallbackToPreview: z.boolean().optional(),
});

const advicePositionSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  source: z.enum(["liveLocation", "directionStart"]),
  distanceFromRouteMeters: z.number().finite().nonnegative().optional(),
});

const adviceSuccessSchema = z.object({
  status: z.literal("advice"),
  mode: adviceModeSchema,
  horizon: adviceHorizonSchema,
  routeId: z.string().min(1),
  routeVersionId: z.string().min(1),
  routeDirectionId: z.string().min(1),
  directSunExposure: directSunExposureSchema,
  recommendedSeatArea: recommendedSeatAreaSchema,
  sunCondition: sunConditionSchema,
  computedAt: z.string().datetime(),
  position: advicePositionSchema.optional(),
});

const adviceWithheldSchema = z.object({
  status: z.literal("withheld"),
  mode: z.enum(["onboard", "preview", "unavailable"]),
  horizon: adviceHorizonSchema.optional(),
  routeId: z.string().min(1),
  routeVersionId: z.string().min(1),
  routeDirectionId: z.string().min(1),
  reasonCode: withheldReasonCodeSchema,
  computedAt: z.string().datetime(),
});

export const adviceResponseSchema = z.discriminatedUnion("status", [
  adviceSuccessSchema,
  adviceWithheldSchema,
]);

export type AdviceRequestTransport = z.infer<typeof adviceRequestSchema>;
export type AdviceResponseTransport = z.infer<typeof adviceResponseSchema>;

export type AdviceClient = {
  requestAdvice(
    input: AdviceRequestTransport,
    options?: BrowserRequestOptions
  ): Promise<AdviceResponseTransport>;
};

export function createAdviceClient({
  baseUrl,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): AdviceClient {
  const normalizedBaseUrl = requireApiBaseUrl(baseUrl);

  return {
    async requestAdvice(input, options) {
      const parsedInput = adviceRequestSchema.parse(input);
      const advice = await requestBrowserJson({
        fetchImpl,
        method: "POST",
        requestBody: parsedInput,
        url: `${normalizedBaseUrl}/advice`,
        schema: adviceResponseSchema,
        options,
        requestFailureMessage: "Não consegui calcular a recomendação agora.",
        malformedResponseMessage:
          "A resposta da API de recomendação veio em um formato inesperado.",
      });

      if (
        advice.routeId !== parsedInput.routeId ||
        advice.routeVersionId !== parsedInput.routeVersionId ||
        advice.routeDirectionId !== parsedInput.routeDirectionId
      ) {
        throw new LiveApiError({
          kind: "malformedResponse",
          message:
            "A resposta da API de recomendação não corresponde à seleção.",
        });
      }

      return advice;
    },
  };
}
