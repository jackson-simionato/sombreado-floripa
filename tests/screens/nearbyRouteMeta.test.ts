import { describe, expect, test } from "vitest";

import {
  formatNearbyRouteDistance,
  formatNearbyRouteMeta,
} from "../../src/screens/nearbyRouteMeta";

describe("formatNearbyRouteDistance", () => {
  test.each([
    [0, "a menos de 50 m"],
    [49, "a menos de 50 m"],
    [50, "a cerca de 50 m"],
    [126, "a cerca de 150 m"],
    [999, "a cerca de 1.000 m"],
    [1000, "a cerca de 1,0 km"],
    [2480, "a cerca de 2,5 km"],
  ])("formats %d m as %s", (distanceMeters, expected) => {
    expect(formatNearbyRouteDistance(distanceMeters)).toBe(expected);
  });

  test("uses generic copy when distance is missing", () => {
    expect(formatNearbyRouteMeta()).toBe("perto de você");
  });
});
