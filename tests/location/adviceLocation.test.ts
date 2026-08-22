import { describe, expect, test } from "vitest";

import {
  FRESH_LOCATION_MAX_AGE_MS,
  RECENT_FALLBACK_LOCATION_MAX_AGE_MS,
  chooseAdviceLocation,
  resolveCachedAdviceLocation,
} from "../../src/location/adviceLocation";

const NOW = new Date("2026-08-22T15:00:00.000Z");

describe("resolveCachedAdviceLocation", () => {
  test("reuses a fresh cached location without requiring a GPS result", () => {
    const cached = {
      lat: -27.5969,
      lng: -48.5488,
      accuracyMeters: 25,
      observedAt: new Date(NOW.getTime() - 10_000).toISOString(),
    };

    expect(resolveCachedAdviceLocation(cached, NOW)).toEqual({
      location: {
        lat: -27.5969,
        lng: -48.5488,
        accuracyMeters: 25,
        observedAt: cached.observedAt,
      },
    });
  });

  test("does not reuse a stale cached location", () => {
    const cached = {
      lat: -27.5969,
      lng: -48.5488,
      accuracyMeters: 25,
      observedAt: new Date(
        NOW.getTime() - (FRESH_LOCATION_MAX_AGE_MS + 1)
      ).toISOString(),
    };

    expect(resolveCachedAdviceLocation(cached, NOW)).toBeUndefined();
  });

  test("does not reuse a missing or inaccurate cached location", () => {
    expect(resolveCachedAdviceLocation(undefined, NOW)).toBeUndefined();
    expect(
      resolveCachedAdviceLocation(
        {
          lat: -27.5969,
          lng: -48.5488,
          accuracyMeters: 150,
          observedAt: NOW.toISOString(),
        },
        NOW
      )
    ).toBeUndefined();
  });
});

describe("chooseAdviceLocation", () => {
  test("prefers a fresh GPS fix over the cached fallback", () => {
    const gpsObservedAt = NOW.toISOString();
    const decision = chooseAdviceLocation(
      {
        kind: "granted",
        lat: -27.6012,
        lng: -48.5421,
        accuracyMeters: 20,
        observedAt: gpsObservedAt,
      },
      {
        fallbackLocation: {
          lat: -27.5969,
          lng: -48.5488,
          accuracyMeters: 25,
          observedAt: new Date(NOW.getTime() - 40_000).toISOString(),
        },
        now: () => NOW,
      }
    );

    expect(decision).toEqual({
      location: {
        lat: -27.6012,
        lng: -48.5421,
        accuracyMeters: 20,
        observedAt: gpsObservedAt,
      },
    });
  });

  test("uses a recent fallback when GPS is unusable", () => {
    const fallbackObservedAt = new Date(
      NOW.getTime() - (FRESH_LOCATION_MAX_AGE_MS + 5_000)
    ).toISOString();

    expect(
      chooseAdviceLocation(
        { kind: "timeout" },
        {
          fallbackLocation: {
            lat: -27.5969,
            lng: -48.5488,
            accuracyMeters: 25,
            observedAt: fallbackObservedAt,
          },
          now: () => NOW,
        }
      )
    ).toEqual({
      location: {
        lat: -27.5969,
        lng: -48.5488,
        accuracyMeters: 25,
        observedAt: fallbackObservedAt,
      },
      freshnessNotice: "recentFallback",
    });
  });

  test("returns no location when GPS and fallback are both unusable", () => {
    expect(
      chooseAdviceLocation(
        { kind: "denied" },
        {
          fallbackLocation: {
            lat: -27.5969,
            lng: -48.5488,
            accuracyMeters: 25,
            observedAt: new Date(
              NOW.getTime() - (RECENT_FALLBACK_LOCATION_MAX_AGE_MS + 1)
            ).toISOString(),
          },
          now: () => NOW,
        }
      )
    ).toEqual({});
  });
});
