import { describe, expect, test } from "vitest";

import {
  fixtureIds,
  mockAdvisories,
  mockScenarios,
} from "../../src/mocks/fixtures";
import {
  MockApiError,
  createMockApi,
  createMockLocationProvider,
} from "../../src/mocks/mockApi";

describe("mock fixtures and API", () => {
  test("exposes stable fixture IDs and scenario IDs for later UI scenarios", () => {
    expect(fixtureIds.routes.lagoa).toBe(
      "00000000-0000-0000-0000-000000000124"
    );
    expect(mockScenarios.map((scenario) => scenario.id)).toEqual(
      expect.arrayContaining([
        "nearby-routes",
        "nearby-empty",
        "confirmation-fallback-map-unavailable",
        "advice-exposure-right-recommends-left",
        "advice-preview-left",
        "advice-withheld",
        "api-error",
        "api-error-manual-search",
        "api-error-advice",
      ])
    );
  });

  test("lists nearby routes asynchronously with route-level choices sorted by distance", async () => {
    const api = createMockApi({ scenarioId: "nearby-routes" });
    const promise = api.listRoutes({
      lat: -27.6,
      lng: -48.52,
      radiusMeters: 1200,
      limit: 2,
    });

    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).resolves.toMatchObject({
      routes: [
        { route_code: "124", route_name: "TICEN - Lagoa" },
        { route_code: "330", route_name: "TILAG - Centro" },
      ],
    });
  });

  test("manual search is case-insensitive and accent-insensitive across route and direction labels", async () => {
    const api = createMockApi({ scenarioId: "manual-search" });

    await expect(
      api.listRoutes({ query: "tilág", limit: 5 })
    ).resolves.toMatchObject({
      routes: [{ route_code: "330", route_name: "TILAG - Centro" }],
    });
    await expect(
      api.listRoutes({ query: "lagoa", limit: 5 })
    ).resolves.toMatchObject({
      routes: expect.arrayContaining([
        expect.objectContaining({
          route_code: "124",
          route_name: "TICEN - Lagoa",
        }),
      ]),
    });
  });

  test("returns direction, canonical geometry, and advisory payloads", async () => {
    const api = createMockApi({
      scenarioId: "advice-exposure-right-recommends-left",
    });

    await expect(
      api.getRouteDirections(
        fixtureIds.routes.lagoa,
        fixtureIds.routeVersions.lagoaCurrent
      )
    ).resolves.toMatchObject({
      directions: expect.arrayContaining([
        expect.objectContaining({
          route_direction_id: fixtureIds.routeDirections.lagoaOutbound,
          departure_labels: ["TICEN", "UFSC", "Trindade"],
        }),
      ]),
    });

    await expect(
      api.getRouteGeometry(
        fixtureIds.routes.lagoa,
        fixtureIds.routeDirections.lagoaOutbound,
        fixtureIds.routeVersions.lagoaCurrent
      )
    ).resolves.toEqual({
      routeId: fixtureIds.routes.lagoa,
      routeVersionId: fixtureIds.routeVersions.lagoaCurrent,
      routeDirectionId: fixtureIds.routeDirections.lagoaOutbound,
      polyline: [
        { lat: -27.5969, lng: -48.5488 },
        { lat: -27.5961, lng: -48.5363 },
        { lat: -27.5991, lng: -48.5238 },
        { lat: -27.5991, lng: -48.5238 },
        { lat: -27.6023, lng: -48.5052 },
        { lat: -27.6049, lng: -48.4789 },
      ],
    });

    await expect(
      api.createOnboardAdvisory({
        lat: -27.6,
        lng: -48.52,
        route_version_id: fixtureIds.routeVersions.lagoaCurrent,
        route_direction_id: fixtureIds.routeDirections.lagoaOutbound,
        datetime: "2026-05-26T12:00:00.000Z",
        window_minutes: 15,
        include_remaining: true,
      })
    ).resolves.toMatchObject({
      status: "advisory",
      advisory_context: "on_route",
      upcoming_window: { dominant_direction: "right" },
    });
  });

  test("supports explicit edge-case scenarios without hidden global state", async () => {
    await expect(
      createMockApi({ scenarioId: "nearby-empty" }).listRoutes({
        lat: -27.6,
        lng: -48.52,
      })
    ).resolves.toEqual({
      routes: [],
    });

    await expect(
      createMockApi({ scenarioId: "manual-empty" }).listRoutes({
        query: "xpto",
      })
    ).resolves.toEqual({
      routes: [],
    });

    await expect(
      createMockApi({ scenarioId: "route-no-directions" }).getRouteDirections(
        fixtureIds.routes.noDirections,
        fixtureIds.routeVersions.noDirectionsCurrent
      )
    ).resolves.toEqual({
      directions: [],
    });

    await expect(
      createMockApi({
        scenarioId: "confirmation-fallback-missing-geometry",
      }).getRouteGeometry(
        fixtureIds.routes.missingGeometry,
        fixtureIds.routeDirections.missingGeometryOutbound,
        fixtureIds.routeVersions.missingGeometryCurrent
      )
    ).resolves.toEqual({
      routeId: fixtureIds.routes.missingGeometry,
      routeVersionId: fixtureIds.routeVersions.missingGeometryCurrent,
      routeDirectionId: fixtureIds.routeDirections.missingGeometryOutbound,
      polyline: [],
    });
  });

  test("rejects failures with typed mock errors", async () => {
    const api = createMockApi({ scenarioId: "api-error" });

    await expect(
      api.listRoutes({ lat: -27.6, lng: -48.52 })
    ).rejects.toBeInstanceOf(MockApiError);
    await expect(
      api.listRoutes({ lat: -27.6, lng: -48.52 })
    ).rejects.toMatchObject({
      flowError: {
        kind: "api",
        message: "Mock API failure",
      },
    });
  });

  test("rejects direction lookup against a stale route version", async () => {
    await expect(
      createMockApi().getRouteDirections(
        fixtureIds.routes.lagoa,
        "stale-version"
      )
    ).rejects.toMatchObject({
      flowError: {
        kind: "routeVersionStale",
      },
    });
  });

  test("provides deterministic mock location results for denied, unavailable, and timeout", async () => {
    await expect(
      createMockLocationProvider({ kind: "denied" }).getCurrentLocation()
    ).resolves.toEqual({ kind: "denied" });
    await expect(
      createMockLocationProvider({ kind: "unavailable" }).getCurrentLocation()
    ).resolves.toEqual({
      kind: "unavailable",
    });
    await expect(
      createMockLocationProvider({ kind: "timeout" }).getCurrentLocation()
    ).resolves.toEqual({ kind: "timeout" });
  });

  test("includes named advisory fixtures for every exposure mapping and withheld state", () => {
    expect(
      mockAdvisories.advisoryExposureRightRecommendsLeft.upcoming_window
        ?.dominant_direction
    ).toBe("right");
    expect(
      mockAdvisories.advisoryExposureLeftRecommendsRight.upcoming_window
        ?.dominant_direction
    ).toBe("left");
    expect(
      mockAdvisories.advisoryExposureFrontRecommendsBack.upcoming_window
        ?.dominant_direction
    ).toBe("front");
    expect(
      mockAdvisories.advisoryExposureBackRecommendsFront.upcoming_window
        ?.dominant_direction
    ).toBe("back");
    expect(
      mockAdvisories.advisoryExposureOverheadNeutral.upcoming_window
        ?.dominant_direction
    ).toBe("overhead");
    expect(
      mockAdvisories.advisoryExposureNoneNeutral.upcoming_window
        ?.dominant_direction
    ).toBe("none");
    expect(mockAdvisories.advisoryWithheld.reason_code).toBe(
      "missing_route_geometry"
    );
  });
});
