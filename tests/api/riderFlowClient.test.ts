import { describe, expect, test, vi } from "vitest";

import {
  LiveRouteCandidateClientError,
  createLiveRiderFlowClient,
  createMockRiderFlowClient,
} from "../../src/api/riderFlowClient";
import { createMockApi } from "../../src/mocks/mockApi";

describe("rider-flow route candidate client", () => {
  test("maps live nearby candidates into domain state while preserving service order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          routes: [
            {
              routeId: "route-second-by-distance",
              routeVersionId: "version-a",
              routeCode: "222",
              routeName: "Second by distance",
              distanceMeters: 900,
              directionHints: ["Terminal B"],
            },
            {
              routeId: "route-first-by-distance",
              routeVersionId: "version-b",
              routeCode: "111",
              routeName: "First by distance",
              distanceMeters: 100,
              directionHints: ["Terminal A"],
            },
          ],
        }),
        { headers: { "content-type": "application/json" }, status: 200 }
      )
    );
    const client = createLiveRiderFlowClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    const result = await client.listNearbyRouteCandidates({
      lat: -27.5969,
      lng: -48.5488,
      radiusMeters: 1200,
      limit: 5,
    });

    expect(result.map((route) => route.routeId)).toEqual([
      "route-second-by-distance",
      "route-first-by-distance",
    ]);
    expect(result[0]).toMatchObject({
      routeId: "route-second-by-distance",
      routeVersionId: "version-a",
      code: "222",
      name: "Second by distance",
      distanceMeters: 900,
      directionHints: ["Terminal B"],
    });
  });

  test("maps live manual candidates into domain state while preserving service order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          routes: [
            {
              routeId: "route-330",
              routeVersionId: "version-330",
              routeCode: "330",
              routeName: "TILAG - Centro",
            },
            {
              routeId: "route-124",
              routeVersionId: "version-124",
              routeCode: "124",
              routeName: "TICEN - Lagoa",
              directionHints: ["TICEN", "Lagoa"],
            },
          ],
        }),
        { headers: { "content-type": "application/json" }, status: 200 }
      )
    );
    const client = createLiveRiderFlowClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    const result = await client.searchRouteCandidates({
      query: "lagoa",
      limit: 8,
    });

    expect(result.map((route) => route.routeId)).toEqual([
      "route-330",
      "route-124",
    ]);
    expect(result[1]?.directionHints).toEqual(["TICEN", "Lagoa"]);
  });

  test("normalizes malformed live route candidates for flow errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ routes: [{}] })));
    const client = createLiveRiderFlowClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(
      client.searchRouteCandidates({ query: "124", limit: 8 })
    ).rejects.toMatchObject({
      flowError: {
        kind: "api",
        message: "Não consegui carregar as linhas agora.",
      },
    } satisfies Partial<LiveRouteCandidateClientError>);
  });

  test("keeps prototype mock route candidates available", async () => {
    const client = createMockRiderFlowClient(createMockApi());

    const result = await client.listNearbyRouteCandidates({
      lat: -27.5969,
      lng: -48.5488,
      radiusMeters: 1200,
      limit: 5,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("routeId");
    expect(result[0]).toHaveProperty("directionHints");
  });
});
