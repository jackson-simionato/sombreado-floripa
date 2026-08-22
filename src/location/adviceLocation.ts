import type { LocationFix, MockLocationResult } from "../domain/types";

/** Acceptable GPS accuracy for advice / nearby recovery (meters). */
const MAX_USABLE_LOCATION_ACCURACY_METERS = 100;

/**
 * Freshness window for reusing a known location without a second GPS wait
 * before advice (issue #35). Matches the "fresh location" threshold used when
 * a new GPS fix arrives.
 */
export const FRESH_LOCATION_MAX_AGE_MS = 30_000;

/**
 * Wider window for onboard advice from the last known fix when a new GPS
 * attempt fails. Rider-facing copy uses freshnessNotice: "recentFallback".
 */
export const RECENT_FALLBACK_LOCATION_MAX_AGE_MS = 120_000;

export type AdviceLocationDecision = {
  location?: LocationFix & { observedAt: string };
  freshnessNotice?: "recentFallback";
};

export function resolveCachedAdviceLocation(
  cachedLocation: LocationFix | undefined,
  now: Date = new Date()
): AdviceLocationDecision | undefined {
  if (
    cachedLocation !== undefined &&
    isUsableLocation(cachedLocation, now, FRESH_LOCATION_MAX_AGE_MS)
  ) {
    return { location: normalizeLocationFix(cachedLocation) };
  }

  return undefined;
}

export function chooseAdviceLocation(
  result: MockLocationResult,
  options: { fallbackLocation?: LocationFix; now?: () => Date }
): AdviceLocationDecision {
  const now = options.now?.() ?? new Date();
  const freshLocation =
    result.kind === "granted" ? normalizeLocationFix(result) : undefined;

  if (
    freshLocation !== undefined &&
    isUsableLocation(freshLocation, now, FRESH_LOCATION_MAX_AGE_MS)
  ) {
    return { location: freshLocation };
  }

  if (
    options.fallbackLocation !== undefined &&
    isUsableLocation(
      options.fallbackLocation,
      now,
      RECENT_FALLBACK_LOCATION_MAX_AGE_MS
    )
  ) {
    return {
      location: normalizeLocationFix(options.fallbackLocation),
      freshnessNotice: "recentFallback",
    };
  }

  return {};
}

export function chooseNearbyRecoveryLocation(
  result: MockLocationResult,
  options: { fallbackLocation?: LocationFix; now?: () => Date }
): LocationFix | undefined {
  const now = options.now?.() ?? new Date();
  const freshLocation =
    result.kind === "granted" ? normalizeLocationFix(result) : undefined;

  if (
    freshLocation !== undefined &&
    isUsableLocation(freshLocation, now, FRESH_LOCATION_MAX_AGE_MS)
  ) {
    return freshLocation;
  }

  if (
    options.fallbackLocation !== undefined &&
    isUsableLocation(
      options.fallbackLocation,
      now,
      RECENT_FALLBACK_LOCATION_MAX_AGE_MS
    )
  ) {
    return normalizeLocationFix(options.fallbackLocation);
  }

  return undefined;
}

function normalizeLocationFix(
  location: LocationFix
): LocationFix & { observedAt: string } {
  return {
    lat: location.lat,
    lng: location.lng,
    ...(location.accuracyMeters === undefined
      ? {}
      : { accuracyMeters: location.accuracyMeters }),
    observedAt: location.observedAt ?? new Date().toISOString(),
  };
}

function isUsableLocation(
  location: LocationFix,
  now: Date,
  maxAgeMs: number
): boolean {
  if (
    location.accuracyMeters !== undefined &&
    location.accuracyMeters > MAX_USABLE_LOCATION_ACCURACY_METERS
  ) {
    return false;
  }

  if (location.observedAt === undefined) {
    return false;
  }

  const observedAtMs = Date.parse(location.observedAt);
  return (
    Number.isFinite(observedAtMs) && now.getTime() - observedAtMs <= maxAgeMs
  );
}
