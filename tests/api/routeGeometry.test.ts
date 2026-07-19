import { describe, expect, test, vi } from "vitest";

import { LiveApiError } from "../../src/api/browserApi";
import { createRouteGeometryClient } from "../../src/api/routeGeometry";

const input = {
  routeId: "route/124",
  routeVersionId: "version current",
  routeDirectionId: "direction/outbound",
};

const validGeometry = {
  ...input,
  polyline: [
    { lat: -27.5969, lng: -48.5488 },
    { lat: -27.5961, lng: -48.5363 },
  ],
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
    ...init,
  });
}

function requestBody(body: unknown) {
  return createRouteGeometryClient({
    baseUrl: "http://localhost:8000/v1",
    fetchImpl: vi.fn().mockResolvedValue(jsonResponse(body)),
  }).getRouteGeometry(input);
}

describe("route geometry browser API client", () => {
  test("loads version-pinned geometry for the exact route context", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(validGeometry));
    const controller = new AbortController();
    const client = createRouteGeometryClient({
      baseUrl: "http://localhost:8000/v1/",
      fetchImpl: fetchMock,
    });

    const result = await client.getRouteGeometry(input, {
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/routes/route%2F124/directions/direction%2Foutbound/geometry?routeVersionId=version+current",
      { credentials: "omit", method: "GET", signal: controller.signal }
    );
    expect(result).toEqual(validGeometry);
  });

  test.each([
    ["empty", []],
    ["single-point", [{ lat: -27.5969, lng: -48.5488 }]],
  ])("accepts matching %s geometry for fallback", async (_label, polyline) => {
    await expect(requestBody({ ...validGeometry, polyline })).resolves.toEqual({
      ...validGeometry,
      polyline,
    });
  });

  test.each([
    ["route", { routeId: "wrong-route" }],
    ["version", { routeVersionId: "wrong-version" }],
    ["direction", { routeDirectionId: "wrong-direction" }],
  ])("rejects mismatched %s identity", async (_label, mismatch) => {
    await expect(
      requestBody({ ...validGeometry, ...mismatch })
    ).rejects.toMatchObject({
      kind: "malformedResponse",
    } satisfies Partial<LiveApiError>);
  });

  test.each([
    ["latitude", { lat: 91, lng: -48.5 }],
    ["longitude", { lat: -27.5, lng: -181 }],
    ["non-numeric", { lat: "south", lng: -48.5 }],
  ])("rejects invalid %s coordinates", async (_label, point) => {
    await expect(
      requestBody({ ...validGeometry, polyline: [point] })
    ).rejects.toMatchObject({
      kind: "malformedResponse",
    } satisfies Partial<LiveApiError>);
  });

  test("retains typed stale route-version errors", async () => {
    const client = createRouteGeometryClient({
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

    await expect(client.getRouteGeometry(input)).rejects.toMatchObject({
      kind: "http",
      status: 409,
      code: "routeVersionStale",
    } satisfies Partial<LiveApiError>);
  });
});
