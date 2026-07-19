import { describe, expect, test, vi } from "vitest";

import {
  LiveRiderFlowClientError,
  createLiveRiderFlowClient,
  createMockRiderFlowClient,
} from "../../src/api/riderFlowClient";
import type { RouteGeometry } from "../../src/domain/types";
import { fixtureIds } from "../../src/mocks/fixtures";
import { createMockApi } from "../../src/mocks/mockApi";

const geometryInput = {
  routeId: fixtureIds.routes.lagoa,
  routeVersionId: fixtureIds.routeVersions.lagoaCurrent,
  routeDirectionId: fixtureIds.routeDirections.lagoaOutbound,
};

const validGeometry: RouteGeometry = {
  ...geometryInput,
  polyline: [
    { lat: -27.5969, lng: -48.5488 },
    { lat: -27.5961, lng: -48.5363 },
  ],
};

const adviceInput = {
  routeId: "route-124",
  routeVersionId: "version-124",
  routeDirectionId: "direction-124",
  mode: "onboard",
  horizon: "upcoming",
  observedAt: "2026-06-23T12:00:00.000Z",
  fallbackToPreview: true,
  location: {
    lat: -27.5969,
    lng: -48.5488,
    accuracyMeters: 40,
    observedAt: "2026-06-23T11:59:59.000Z",
  },
} as const;

const validAdvice = {
  status: "advice",
  mode: "onboard",
  horizon: "upcoming",
  routeId: "route-124",
  routeVersionId: "version-124",
  routeDirectionId: "direction-124",
  directSunExposure: "right",
  recommendedSeatArea: "front",
  sunCondition: "daylight",
  computedAt: "2026-06-23T12:00:01.000Z",
} as const;

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
    } satisfies Partial<LiveRiderFlowClientError>);
  });

  test("maps live directions into domain state while preserving service order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          directions: [
            {
              routeDirectionId: "direction-second",
              sequence: 2,
              name: "Lagoa para TICEN",
              directionKind: "volta",
              departureLabels: ["Lagoa", "TICEN"],
            },
            {
              routeDirectionId: "direction-first",
              sequence: 1,
              name: "TICEN para Lagoa",
              directionKind: null,
              departureLabels: ["TICEN", "Lagoa"],
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

    const result = await client.listRouteDirections({
      routeId: "route-124",
      routeVersionId: "version-124",
    });

    expect(result.map((item) => item.routeDirectionId)).toEqual([
      "direction-second",
      "direction-first",
    ]);
    expect(result.map((item) => item.directionKind)).toEqual(["volta", null]);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "routeVersionId=version-124"
    );
  });

  test("normalizes stale route versions distinctly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "routeVersionStale",
            message: "internal diagnostic",
          },
        }),
        { headers: { "content-type": "application/json" }, status: 409 }
      )
    );
    const client = createLiveRiderFlowClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(
      client.listRouteDirections({
        routeId: "route-124",
        routeVersionId: "version-124",
      })
    ).rejects.toMatchObject({
      flowError: {
        kind: "routeVersionStale",
        message: "As opções desta linha foram atualizadas.",
      },
    } satisfies Partial<LiveRiderFlowClientError>);
  });

  test("returns canonical live geometry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(validGeometry)));
    const client = createLiveRiderFlowClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(client.getRouteGeometry(geometryInput)).resolves.toEqual(
      validGeometry
    );
  });

  test("returns live advice without deriving backend recommendation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(validAdvice)));
    const client = createLiveRiderFlowClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(client.requestAdvice(adviceInput)).resolves.toEqual(
      validAdvice
    );
  });

  test("normalizes malformed live geometry for flow errors", async () => {
    const client = createLiveRiderFlowClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ ...validGeometry, routeDirectionId: "wrong" })
          )
        ),
    });

    await expect(client.getRouteGeometry(geometryInput)).rejects.toMatchObject({
      flowError: {
        kind: "api",
        message: "Não consegui carregar as linhas agora.",
      },
    } satisfies Partial<LiveRiderFlowClientError>);
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

  test("keeps prototype mock directions behind the same route-version operation", async () => {
    const api = createMockApi();
    const getRouteDirections = vi.spyOn(api, "getRouteDirections");
    const client = createMockRiderFlowClient(api);

    const directions = await client.listRouteDirections({
      routeId: "00000000-0000-0000-0000-000000000124",
      routeVersionId: "00000000-0000-0000-0000-000000001124",
    });

    expect(getRouteDirections).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000124",
      "00000000-0000-0000-0000-000000001124"
    );
    expect(directions.map((direction) => direction.directionKind)).toEqual([
      "ida",
      "volta",
    ]);
  });

  test("keeps mock geometry behind the same route context operation", async () => {
    const api = createMockApi();
    const getRouteGeometry = vi.spyOn(api, "getRouteGeometry");
    const client = createMockRiderFlowClient(api);

    await client.getRouteGeometry(geometryInput);

    expect(getRouteGeometry).toHaveBeenCalledWith(
      geometryInput.routeId,
      geometryInput.routeDirectionId,
      geometryInput.routeVersionId
    );
  });

  test("keeps mock advice behind the same route context operation", async () => {
    const client = createMockRiderFlowClient(createMockApi());

    const advice = await client.requestAdvice(adviceInput);

    expect(advice.routeId).toBe(adviceInput.routeId);
    expect(advice.routeVersionId).toBe(adviceInput.routeVersionId);
    expect(advice.routeDirectionId).toBe(adviceInput.routeDirectionId);
  });
});
