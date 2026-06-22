import { describe, expect, test } from "vitest";

import {
  flowReducer,
  initialFlowState,
  normalizeFlowError,
} from "../../src/domain/flow";
import type {
  DirectionChoice,
  FlowState,
  RouteCandidate,
  RouteGeometry,
  TargetAdvisoryRequest,
  TargetAdvisoryResponse,
} from "../../src/domain/types";

const location = { lat: -27.6, lng: -48.52 };

const route: RouteCandidate = {
  routeId: "route-a",
  routeVersionId: "version-a",
  code: "124",
  name: "TICEN - Lagoa",
  distanceMeters: 300,
  directionHints: ["TICEN para Lagoa"],
};

const direction: DirectionChoice = {
  routeDirectionId: "direction-a",
  sequence: 1,
  name: "TICEN para Lagoa",
  departureLabels: ["TICEN", "UFSC"],
};

const geometry: RouteGeometry = {
  routeId: "route-a",
  routeVersionId: "version-a",
  routeDirectionId: "direction-a",
  polyline: [
    { lat: -27.601, lng: -48.525 },
    { lat: -27.603, lng: -48.522 },
  ],
};

const advisoryRequest: TargetAdvisoryRequest = {
  lat: -27.6,
  lng: -48.52,
  route_version_id: "version-a",
  route_direction_id: "direction-a",
  datetime: "2026-05-26T12:00:00.000Z",
  window_minutes: 15,
  include_remaining: true,
};

describe("flow reducer", () => {
  test("runs the normal nearby path through onboard advice", () => {
    const requestId = "nearby-1";
    const directionsRequestId = "directions-1";
    const geometryRequestId = "geometry-1";
    const advisoryRequestId = "advisory-1";

    let state = flowReducer(initialFlowState, { type: "locationRequested" });
    state = flowReducer(state, {
      type: "locationResolved",
      requestId,
      result: { kind: "granted", ...location },
      radiusMeters: 1200,
      limit: 5,
    });
    expect(state.screen).toBe("findingNearbyRoutes");
    expect(state.pendingRequests.nearbyRoutes).toBe(requestId);

    state = flowReducer(state, {
      type: "nearbyRoutesSucceeded",
      requestId,
      candidates: [route],
    });
    expect(state.screen).toBe("routeCandidateSelection");

    state = flowReducer(state, {
      type: "routeSelected",
      route,
      source: "nearby",
      requestId: directionsRequestId,
    });
    expect(state.screen).toBe("loadingDirectionChoices");
    expect(state.selectedRoute).toEqual({
      routeId: "route-a",
      routeVersionId: "version-a",
      code: "124",
      name: "TICEN - Lagoa",
      distanceMeters: 300,
      source: "nearby",
    });

    state = flowReducer(state, {
      type: "directionsSucceeded",
      requestId: directionsRequestId,
      directions: [direction],
    });
    expect(state.screen).toBe("directionChoice");

    state = flowReducer(state, {
      type: "directionSelected",
      direction,
      requestId: geometryRequestId,
    });
    state = flowReducer(state, {
      type: "geometrySucceeded",
      requestId: geometryRequestId,
      geometry,
      mapAvailability: "available",
    });
    expect(state.screen).toBe("routeConfirmation");
    expect(state.geometry).not.toBe(geometry);
    expect(state.geometry?.polyline).not.toBe(geometry.polyline);
    expect(state.geometry?.polyline[0]).not.toBe(geometry.polyline[0]);

    state = flowReducer(state, {
      type: "routeConfirmed",
      requestId: advisoryRequestId,
      advisoryRequest,
    });
    expect(state.screen).toBe("computingAdvice");

    state = flowReducer(state, {
      type: "advisorySucceeded",
      requestId: advisoryRequestId,
      advice: advisoryResponse("on_route", "right"),
    });
    expect(state.screen).toBe("onboardAdviceResult");
    expect(state.advice).toEqual({
      mode: "onboard",
      directSunExposure: "right",
      recommendedSeatArea: "left",
    });
  });

  test("runs the normal manual path through route confirmation", () => {
    let state = flowReducer(initialFlowState, {
      type: "manualSearchRequested",
      requestId: "manual-1",
      query: "lagoa",
      limit: 10,
    });
    state = flowReducer(state, {
      type: "manualSearchSucceeded",
      requestId: "manual-1",
      candidates: [route],
    });
    state = flowReducer(state, {
      type: "routeSelected",
      route,
      source: "manual",
      requestId: "directions-1",
    });

    expect(state.screen).toBe("loadingDirectionChoices");
    expect(state.selectedRoute?.source).toBe("manual");
    expect(state.manualQuery).toBe("lagoa");
  });

  test("stops live direction selection before geometry", () => {
    const routeSelected = flowReducer(initialFlowState, {
      type: "routeSelected",
      route,
      source: "nearby",
      requestId: "directions-1",
    });
    const directionsLoaded = flowReducer(routeSelected, {
      type: "directionsSucceeded",
      requestId: "directions-1",
      directions: [direction],
    });
    const state = flowReducer(directionsLoaded, {
      type: "directionSelectionStopped",
      direction,
    });

    expect(state.screen).toBe("liveDirectionSelectedUnsupported");
    expect(state.requestStatus).toBe("success");
    expect(state.selectedRoute).toMatchObject({
      routeId: "route-a",
      routeVersionId: "version-a",
      source: "nearby",
    });
    expect(state.selectedDirection).toMatchObject({
      routeDirectionId: "direction-a",
    });
    expect(state.pendingRequests).toEqual({});
  });

  test("stops live route confirmation before advice", () => {
    const confirmation = flowReducer(selectDirection("geometry-1"), {
      type: "geometrySucceeded",
      requestId: "geometry-1",
      geometry,
      mapAvailability: "available",
    });
    const confirmed = flowReducer(confirmation, {
      type: "routeConfirmationStopped",
    });

    expect(confirmed.screen).toBe("liveRouteConfirmedUnsupported");
    expect(confirmed.requestStatus).toBe("success");
    expect(confirmed.selectedRoute?.routeId).toBe("route-a");
    expect(confirmed.selectedDirection?.routeDirectionId).toBe("direction-a");
    expect(confirmed.pendingRequests).toEqual({});
  });

  test("clears manual results and pending state when the query is cleared", () => {
    const searching = flowReducer(
      {
        ...initialFlowState,
        screen: "manualRouteSearch",
        manualQuery: "lagoa",
        manualCandidates: [route],
        error: { kind: "api", message: "failed" },
        pendingRequests: { manualSearch: "manual-1" },
      },
      { type: "manualSearchCleared" }
    );

    expect(searching).toMatchObject({
      screen: "manualRouteSearch",
      requestStatus: "idle",
      manualQuery: "",
      manualCandidates: [],
      pendingRequests: {},
    });
    expect(searching.error).toBeUndefined();
    expect(flowReducer(searching, { type: "manualSearchCleared" })).toBe(
      searching
    );
  });

  test("clears stale selection and marks candidates for explicit reselection", () => {
    const selected = flowReducer(initialFlowState, {
      type: "routeSelected",
      route,
      source: "manual",
      requestId: "directions-1",
    });
    const state = flowReducer(selected, {
      type: "routeVersionStaleDetected",
    });

    expect(state.screen).toBe("manualRouteSearch");
    expect(state.selectedRoute).toBeUndefined();
    expect(state.selectedDirection).toBeUndefined();
    expect(state.directionChoices).toEqual([]);
    expect(state.routeRefreshNotice).toBe("routeVersionStale");
    expect(state.pendingRequests).toEqual({});
  });

  test("clears previous manual candidates when a new query starts", () => {
    const state = flowReducer(
      { ...initialFlowState, manualCandidates: [route] },
      {
        type: "manualSearchRequested",
        requestId: "manual-2",
        query: "centro",
      }
    );

    expect(state.manualCandidates).toEqual([]);
    expect(state.pendingRequests.manualSearch).toBe("manual-2");
  });

  test.each([["denied"], ["unavailable"], ["timeout"]] as const)(
    "maps %s location result to location denied recovery while preserving reason",
    (kind) => {
      const state = flowReducer(initialFlowState, {
        type: "locationResolved",
        requestId: "nearby-1",
        result: { kind },
      });

      expect(state.screen).toBe("locationDeniedRecovery");
      expect(state.locationIssue).toBe(kind);
    }
  );

  test("handles empty nearby, empty manual, and no direction branches distinctly", () => {
    expect(
      flowReducer(
        flowReducer(initialFlowState, {
          type: "locationResolved",
          requestId: "nearby-1",
          result: { kind: "granted", ...location },
        }),
        { type: "nearbyRoutesSucceeded", requestId: "nearby-1", candidates: [] }
      ).screen
    ).toBe("noNearbyRoutes");

    expect(
      flowReducer(
        flowReducer(initialFlowState, {
          type: "manualSearchRequested",
          requestId: "manual-1",
          query: "xyz",
        }),
        { type: "manualSearchSucceeded", requestId: "manual-1", candidates: [] }
      ).screen
    ).toBe("noManualResults");

    const selected = flowReducer(initialFlowState, {
      type: "routeSelected",
      route,
      source: "nearby",
      requestId: "directions-1",
    });
    expect(
      flowReducer(selected, {
        type: "directionsSucceeded",
        requestId: "directions-1",
        directions: [],
      }).screen
    ).toBe("routeWithoutDirections");
  });

  test("uses fallback when geometry has fewer than two points or map is unavailable", () => {
    const missingGeometryState = selectDirection("geometry-1");
    expect(
      flowReducer(missingGeometryState, {
        type: "geometrySucceeded",
        requestId: "geometry-1",
        geometry: { ...geometry, polyline: [] },
        mapAvailability: "available",
      }).screen
    ).toBe("routeConfirmationFallback");

    const onePointGeometryState = selectDirection("geometry-one-point");
    expect(
      flowReducer(onePointGeometryState, {
        type: "geometrySucceeded",
        requestId: "geometry-one-point",
        geometry: { ...geometry, polyline: [geometry.polyline[0]!] },
        mapAvailability: "available",
      }).screen
    ).toBe("routeConfirmationFallback");

    const unavailableMapState = selectDirection("geometry-2");
    expect(
      flowReducer(unavailableMapState, {
        type: "geometrySucceeded",
        requestId: "geometry-2",
        geometry,
        mapAvailability: "unavailable",
      }).screen
    ).toBe("routeConfirmationFallback");
  });

  test("normalizes geometry errors with exact retry target", () => {
    const state = flowReducer(selectDirection("geometry-1"), {
      type: "operationFailed",
      requestId: "geometry-1",
      error: normalizeFlowError({
        kind: "api",
        message: "geometry failed",
        retryTarget: {
          kind: "geometry",
          routeId: "route-a",
          routeDirectionId: "direction-a",
          routeVersionId: "version-a",
        },
      }),
    });

    expect(state.screen).toBe("apiError");
    expect(state.error?.retryTarget).toEqual({
      kind: "geometry",
      routeId: "route-a",
      routeDirectionId: "direction-a",
      routeVersionId: "version-a",
    });
  });

  test("ignores stale geometry success and failure events", () => {
    const loading = selectDirection("geometry-current");

    expect(
      flowReducer(loading, {
        type: "geometrySucceeded",
        requestId: "geometry-old",
        geometry,
        mapAvailability: "available",
      })
    ).toBe(loading);
    expect(
      flowReducer(loading, {
        type: "operationFailed",
        requestId: "geometry-old",
        error: {
          kind: "api",
          message: "old failure",
          retryTarget: {
            kind: "geometry",
            routeId: "route-a",
            routeVersionId: "version-a",
            routeDirectionId: "direction-a",
          },
        },
      })
    ).toBe(loading);
  });

  test("maps preview, neutral, and withheld advisory results to distinct screens or advice states", () => {
    expect(
      advisoryScreen(advisoryResponse("estimated_route_point", "left"))
    ).toBe("routePreviewAdviceResult");

    const neutralState = advisoryState(
      advisoryResponse("on_route", "overhead")
    );
    expect(neutralState.screen).toBe("onboardAdviceResult");
    expect(neutralState.advice).toEqual({
      mode: "neutralComputed",
      directSunExposure: "overhead",
    });

    const noSunState = advisoryState(advisoryResponse("on_route", "none"));
    expect(noSunState.advice).toEqual({
      mode: "neutralComputed",
      directSunExposure: "none",
    });

    expect(
      advisoryScreen({
        status: "withheld",
        advisory_context: "unavailable",
        route_version_id: "version-a",
        route_direction_id: "direction-a",
        requested_at: "2026-05-26T12:00:00.000Z",
        reason_code: "missing_route_geometry",
      })
    ).toBe("trueWithheld");
  });

  test("ignores stale async responses by request ID", () => {
    const state = flowReducer(
      flowReducer(initialFlowState, {
        type: "locationResolved",
        requestId: "nearby-current",
        result: { kind: "granted", ...location },
      }),
      {
        type: "nearbyRoutesSucceeded",
        requestId: "nearby-old",
        candidates: [route],
      }
    );

    expect(state.screen).toBe("findingNearbyRoutes");
    expect(state.nearbyCandidates).toEqual([]);
  });

  test("retry event preserves the exact retry payload", () => {
    const retryTarget = {
      kind: "manualSearch" as const,
      query: "lagoa",
      limit: 7,
    };
    const state = flowReducer(initialFlowState, {
      type: "retryRequested",
      requestId: "manual-retry",
      retryTarget,
    });

    expect(state.pendingRetry).toEqual({
      requestId: "manual-retry",
      retryTarget,
    });
  });

  test("invalid direction, confirmation, and advisory transitions do not violate route-before-direction invariant", () => {
    let state = flowReducer(initialFlowState, {
      type: "directionSelected",
      direction,
      requestId: "geometry-1",
    });
    expect(state).toBe(initialFlowState);

    state = flowReducer(initialFlowState, {
      type: "routeConfirmed",
      requestId: "advisory-1",
      advisoryRequest,
    });
    expect(state).toBe(initialFlowState);

    state = flowReducer(initialFlowState, {
      type: "advisorySucceeded",
      requestId: "advisory-1",
      advice: advisoryResponse("on_route", "right"),
    });
    expect(state).toBe(initialFlowState);
  });

  test("change route and change direction clear stale state while preserving reusable context", () => {
    const fullState = advisoryState(advisoryResponse("on_route", "right"));

    const changedDirection = flowReducer(fullState, {
      type: "changeDirection",
    });
    expect(changedDirection.screen).toBe("directionChoice");
    expect(changedDirection.selectedRoute).toEqual(fullState.selectedRoute);
    expect(changedDirection.selectedDirection).toBeUndefined();
    expect(changedDirection.geometry).toBeUndefined();
    expect(changedDirection.advice).toBeUndefined();

    const changedRoute = flowReducer(fullState, { type: "changeRoute" });
    expect(changedRoute.screen).toBe("routeCandidateSelection");
    expect(changedRoute.latestLocation).toEqual(location);
    expect(changedRoute.nearbyCandidates).toEqual([route]);
    expect(changedRoute.selectedRoute).toBeUndefined();
    expect(changedRoute.selectedDirection).toBeUndefined();
    expect(changedRoute.advice).toBeUndefined();
  });

  test("change route returns to manual search when the selected route came from manual results", () => {
    const manualState = flowReducer(
      {
        ...initialFlowState,
        screen: "directionChoice",
        manualQuery: "lagoa",
        manualCandidates: [route],
        selectedRoute: { ...route, source: "manual" },
        directionChoices: [direction],
      },
      { type: "changeRoute" }
    );

    expect(manualState.screen).toBe("manualRouteSearch");
    expect(manualState.manualQuery).toBe("lagoa");
    expect(manualState.manualCandidates).toEqual([route]);
  });

  test("route confirmation can refresh latest location before computing advice", () => {
    const state = flowReducer(selectDirection("geometry-1"), {
      type: "routeConfirmed",
      requestId: "advisory-2",
      advisoryRequest,
      referenceLocation: { lat: -27.61, lng: -48.51 },
    });

    expect(state.screen).toBe("computingAdvice");
    expect(state.latestLocation).toEqual({ lat: -27.61, lng: -48.51 });
  });
});

function selectDirection(requestId: string): FlowState {
  return flowReducer(
    {
      ...initialFlowState,
      screen: "directionChoice",
      latestLocation: location,
      nearbyCandidates: [route],
      selectedRoute: { ...route, source: "nearby" },
      directionChoices: [direction],
    },
    { type: "directionSelected", direction, requestId }
  );
}

function advisoryState(advice: TargetAdvisoryResponse): FlowState {
  let state = selectDirection("geometry-1");
  state = flowReducer(state, {
    type: "geometrySucceeded",
    requestId: "geometry-1",
    geometry,
    mapAvailability: "available",
  });
  state = flowReducer(state, {
    type: "routeConfirmed",
    requestId: "advisory-1",
    advisoryRequest,
  });
  return flowReducer(state, {
    type: "advisorySucceeded",
    requestId: "advisory-1",
    advice,
  });
}

function advisoryScreen(advice: TargetAdvisoryResponse): FlowState["screen"] {
  return advisoryState(advice).screen;
}

function advisoryResponse(
  advisoryContext: "on_route" | "estimated_route_point",
  dominantDirection: NonNullable<
    TargetAdvisoryResponse["upcoming_window"]
  >["dominant_direction"]
): TargetAdvisoryResponse {
  return {
    status: "advisory",
    advisory_context: advisoryContext,
    route_version_id: "version-a",
    route_direction_id: "direction-a",
    requested_at: "2026-05-26T12:00:00.000Z",
    projected_position: {
      segment_id: "segment-a",
      segment_sequence: 1,
      lat: -27.6,
      lng: -48.52,
      distance_from_route_meters:
        advisoryContext === "estimated_route_point" ? 55 : 5,
      cumulative_distance_meters: 100,
    },
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
