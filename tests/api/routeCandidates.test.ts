import { describe, expect, test, vi } from "vitest";

import {
  LiveApiError,
  createRouteCandidatesClient,
  requireApiBaseUrl,
} from "../../src/api/routeCandidates";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
    ...init,
  });
}

describe("route candidate browser API client", () => {
  test("requires a configured API base URL", () => {
    expect(() => requireApiBaseUrl(undefined)).toThrow(
      "NEXT_PUBLIC_API_URL is required for live API mode."
    );
    expect(() => requireApiBaseUrl("")).toThrow(
      "NEXT_PUBLIC_API_URL is required for live API mode."
    );
    expect(requireApiBaseUrl(" http://localhost:8000/v1/ ")).toBe(
      "http://localhost:8000/v1"
    );
  });

  test("loads nearby route candidates with credentials omitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        routes: [
          {
            routeId: "route-330",
            routeVersionId: "version-330",
            routeCode: "330",
            routeName: "TILAG - Centro",
            distanceMeters: 420,
            directionHints: ["TILAG", "Centro"],
          },
          {
            routeId: "route-124",
            routeVersionId: "version-124",
            routeCode: "124",
            routeName: "TICEN - Lagoa",
          },
        ],
      })
    );
    const client = createRouteCandidatesClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    const result = await client.listNearbyRouteCandidates({
      lat: -27.5969,
      lng: -48.5488,
      radiusMeters: 1200,
      limit: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/route-candidates/nearby?lat=-27.5969&lng=-48.5488&radiusMeters=1200&limit=5",
      { credentials: "omit", method: "GET" }
    );
    expect(result.routes.map((route) => route.routeId)).toEqual([
      "route-330",
      "route-124",
    ]);
  });

  test("searches manual route candidates with credentials omitted and encoded query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        routes: [
          {
            routeId: "route-124",
            routeVersionId: "version-124",
            routeCode: "124",
            routeName: "TICEN - Lagoa",
            directionHints: ["TICEN", "Lagoa"],
          },
        ],
      })
    );
    const client = createRouteCandidatesClient({
      baseUrl: "http://localhost:8000/v1/",
      fetchImpl: fetchMock,
    });

    const result = await client.searchRouteCandidates({
      query: "TICEN Lagoa",
      limit: 8,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/route-candidates/search?query=TICEN+Lagoa&limit=8",
      { credentials: "omit", method: "GET" }
    );
    expect(result.routes[0]).toMatchObject({
      routeId: "route-124",
      routeVersionId: "version-124",
      routeCode: "124",
      routeName: "TICEN - Lagoa",
    });
  });

  test("forwards abort signals to nearby and manual fetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ routes: [] }))
      .mockResolvedValueOnce(jsonResponse({ routes: [] }));
    const nearbyController = new AbortController();
    const manualController = new AbortController();
    const client = createRouteCandidatesClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await client.listNearbyRouteCandidates(
      { lat: -27.5969, lng: -48.5488, radiusMeters: 1200, limit: 5 },
      { signal: nearbyController.signal }
    );
    await client.searchRouteCandidates(
      { query: "TICEN", limit: 8 },
      { signal: manualController.signal }
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/v1/route-candidates/nearby?lat=-27.5969&lng=-48.5488&radiusMeters=1200&limit=5",
      { credentials: "omit", method: "GET", signal: nearbyController.signal }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8000/v1/route-candidates/search?query=TICEN&limit=8",
      { credentials: "omit", method: "GET", signal: manualController.signal }
    );
  });

  test("normalizes malformed route candidate responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ routes: [{ routeId: 42 }] }));
    const client = createRouteCandidatesClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(
      client.searchRouteCandidates({ query: "124", limit: 8 })
    ).rejects.toMatchObject({
      kind: "malformedResponse",
      message: "A resposta da API de linhas veio em um formato inesperado.",
    } satisfies Partial<LiveApiError>);
  });
});
