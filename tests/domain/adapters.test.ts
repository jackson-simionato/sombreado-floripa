import { describe, expect, test } from "vitest";

import {
  DEFAULT_ADVISORY_WINDOW_MINUTES,
  buildTargetAdvisoryRequest,
  toDirectionChoices,
  toRouteCandidates,
  toUiAdvice,
} from "../../src/domain/adapters";
import type {
  RouteDirectionsResponse,
  RoutesResponse,
  TargetAdvisoryResponse,
} from "../../src/domain/types";

const routeResponse: RoutesResponse = {
  routes: [
    {
      route_id: "route-b",
      route_code: "330",
      route_name: "TILAG - Centro",
      route_version_id: "version-b",
      distance_meters: undefined,
      directions: [],
    },
    {
      route_id: "route-a",
      route_code: "124",
      route_name: "TICEN - Lagoa",
      route_version_id: "version-a",
      distance_meters: 820,
      directions: [
        {
          route_direction_id: "direction-a",
          sequence: 1,
          name: "TICEN para Lagoa",
          departure_labels: ["TICEN", "UFSC"],
        },
      ],
    },
    {
      route_id: "route-c",
      route_code: "111",
      route_name: "Trindade",
      route_version_id: "version-c",
      distance_meters: 300,
      directions: [],
    },
  ],
};

describe("domain adapters", () => {
  test("converts service route summaries to nearby route candidates sorted by distance then label", () => {
    const candidates = toRouteCandidates(routeResponse, { source: "nearby" });

    expect(candidates).toEqual([
      {
        routeId: "route-c",
        routeVersionId: "version-c",
        code: "111",
        name: "Trindade",
        distanceMeters: 300,
        directionHints: [],
      },
      {
        routeId: "route-a",
        routeVersionId: "version-a",
        code: "124",
        name: "TICEN - Lagoa",
        distanceMeters: 820,
        directionHints: ["TICEN para Lagoa", "TICEN", "UFSC"],
      },
      {
        routeId: "route-b",
        routeVersionId: "version-b",
        code: "330",
        name: "TILAG - Centro",
        directionHints: [],
      },
    ]);
  });

  test("preserves manual search relevance order while converting fields", () => {
    const candidates = toRouteCandidates(routeResponse, { source: "manual" });

    expect(candidates.map((candidate) => candidate.routeId)).toEqual([
      "route-b",
      "route-a",
      "route-c",
    ]);
    expect(candidates[0]).toMatchObject({
      routeId: "route-b",
      routeVersionId: "version-b",
      code: "330",
      name: "TILAG - Centro",
    });
  });

  test("converts direction choices in service order without exposing raw IDs as labels", () => {
    const response: RouteDirectionsResponse = {
      directions: [
        {
          route_direction_id: "direction-2",
          sequence: 2,
          name: "Lagoa para TICEN",
          departure_labels: ["Lagoa"],
        },
        {
          route_direction_id: "direction-1",
          sequence: 1,
          name: "TICEN para Lagoa",
          departure_labels: ["TICEN", "UFSC"],
        },
      ],
    };

    expect(toDirectionChoices(response)).toEqual([
      {
        routeDirectionId: "direction-2",
        sequence: 2,
        name: "Lagoa para TICEN",
        departureLabels: ["Lagoa"],
      },
      {
        routeDirectionId: "direction-1",
        sequence: 1,
        name: "TICEN para Lagoa",
        departureLabels: ["TICEN", "UFSC"],
      },
    ]);
  });

  test.each([
    ["left", "right"],
    ["right", "left"],
    ["front", "back"],
    ["back", "front"],
  ] as const)(
    "maps direct sun exposure %s to recommendation %s",
    (exposure, recommendation) => {
      expect(toUiAdvice(advisoryWithExposure(exposure))).toEqual({
        mode: "onboard",
        directSunExposure: exposure,
        recommendedSeatArea: recommendation,
      });
    }
  );

  test.each(["overhead", "none"] as const)(
    "maps %s exposure to neutral computed advice",
    (exposure) => {
      expect(toUiAdvice(advisoryWithExposure(exposure))).toEqual({
        mode: "neutralComputed",
        directSunExposure: exposure,
      });
    }
  );

  test("uses upcoming window for primary UI advice even when remaining route is absent", () => {
    const response = advisoryWithExposure("right");
    response.remaining_route = undefined;

    expect(toUiAdvice(response)).toMatchObject({
      mode: "onboard",
      directSunExposure: "right",
      recommendedSeatArea: "left",
    });
  });

  test("maps estimated route point advisory to preview advice with distance context", () => {
    expect(
      toUiAdvice({
        ...advisoryWithExposure("left"),
        advisory_context: "estimated_route_point",
        projected_position: {
          segment_id: "segment-1",
          segment_sequence: 1,
          lat: -27.6,
          lng: -48.52,
          distance_from_route_meters: 43,
          cumulative_distance_meters: 200,
        },
      })
    ).toEqual({
      mode: "preview",
      directSunExposure: "left",
      recommendedSeatArea: "right",
      previewSource: "estimated_route_point",
      distanceFromRouteMeters: 43,
    });
  });

  test("maps withheld advisory to typed withheld UI state", () => {
    const response: TargetAdvisoryResponse = {
      status: "withheld",
      advisory_context: "unavailable",
      route_version_id: "version-a",
      route_direction_id: "direction-a",
      requested_at: "2026-05-26T12:00:00.000Z",
      reason: "no route geometry",
      reason_code: "missing_route_geometry",
    };

    expect(toUiAdvice(response)).toEqual({
      mode: "withheld",
      reasonCode: "missing_route_geometry",
    });
  });

  test("builds stable service-shaped advisory requests with injected time", () => {
    expect(
      buildTargetAdvisoryRequest({
        lat: -27.6,
        lng: -48.52,
        routeVersionId: "version-a",
        routeDirectionId: "direction-a",
        now: () => new Date("2026-05-26T12:00:00.000Z"),
      })
    ).toEqual({
      lat: -27.6,
      lng: -48.52,
      route_version_id: "version-a",
      route_direction_id: "direction-a",
      datetime: "2026-05-26T12:00:00.000Z",
      window_minutes: DEFAULT_ADVISORY_WINDOW_MINUTES,
      include_remaining: true,
    });
  });
});

function advisoryWithExposure(
  dominantDirection: NonNullable<
    TargetAdvisoryResponse["upcoming_window"]
  >["dominant_direction"]
): TargetAdvisoryResponse {
  return {
    status: "advisory",
    advisory_context: "on_route",
    route_version_id: "version-a",
    route_direction_id: "direction-a",
    requested_at: "2026-05-26T12:00:00.000Z",
    upcoming_window: {
      total_distance_meters: 800,
      dominant_direction: dominantDirection,
      breakdown_meters: {
        left: dominantDirection === "left" ? 800 : 0,
        right: dominantDirection === "right" ? 800 : 0,
        front: dominantDirection === "front" ? 800 : 0,
        back: dominantDirection === "back" ? 800 : 0,
        overhead: dominantDirection === "overhead" ? 800 : 0,
        none: dominantDirection === "none" ? 800 : 0,
      },
    },
  };
}
