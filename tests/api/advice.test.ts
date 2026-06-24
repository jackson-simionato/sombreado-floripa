import { describe, expect, test, vi } from "vitest";

import { LiveApiError } from "../../src/api/browserApi";
import { createAdviceClient } from "../../src/api/advice";

const input = {
  routeId: "route/124",
  routeVersionId: "version current",
  routeDirectionId: "direction/outbound",
  mode: "onboard",
  horizon: "upcoming",
  observedAt: "2026-06-23T12:00:00.000Z",
  fallbackToPreview: true,
  location: {
    lat: -27.5969,
    lng: -48.5488,
    accuracyMeters: 42,
    observedAt: "2026-06-23T11:59:58.000Z",
  },
} as const;

const validAdvice = {
  status: "advice",
  mode: "onboard",
  horizon: "upcoming",
  routeId: input.routeId,
  routeVersionId: input.routeVersionId,
  routeDirectionId: input.routeDirectionId,
  directSunExposure: "right",
  recommendedSeatArea: "left",
  sunCondition: "daylight",
  computedAt: "2026-06-23T12:00:01.000Z",
  position: {
    lat: -27.5969,
    lng: -48.5488,
    source: "liveLocation",
    distanceFromRouteMeters: 8,
  },
} as const;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
    ...init,
  });
}

describe("advice browser API client", () => {
  test("posts advice requests through the live browser contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(validAdvice));
    const controller = new AbortController();
    const client = createAdviceClient({
      baseUrl: "http://localhost:8000/v1/",
      fetchImpl: fetchMock,
    });

    const result = await client.requestAdvice(input, {
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/advice",
      expect.objectContaining({
        credentials: "omit",
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: controller.signal,
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual(
      input
    );
    expect(result).toEqual(validAdvice);
  });

  test.each([
    ["route", { routeId: "wrong-route" }],
    ["version", { routeVersionId: "wrong-version" }],
    ["direction", { routeDirectionId: "wrong-direction" }],
  ])("rejects mismatched %s identity", async (_label, mismatch) => {
    const client = createAdviceClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: vi
        .fn()
        .mockResolvedValue(jsonResponse({ ...validAdvice, ...mismatch })),
    });

    await expect(client.requestAdvice(input)).rejects.toMatchObject({
      kind: "malformedResponse",
    } satisfies Partial<LiveApiError>);
  });

  test("retains typed stale route-version errors", async () => {
    const client = createAdviceClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "routeVersionStale",
              message: "Selected route version is no longer current.",
            },
          },
          { status: 409 }
        )
      ),
    });

    await expect(client.requestAdvice(input)).rejects.toMatchObject({
      kind: "http",
      status: 409,
      code: "routeVersionStale",
    } satisfies Partial<LiveApiError>);
  });
});
