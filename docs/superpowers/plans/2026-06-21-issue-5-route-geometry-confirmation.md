# Issue 5 Route Geometry And Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load version-pinned live Route Geometry after Direction Choice, render confirmation or non-fatal fallback, protect against stale requests, and stop live mode after confirmation without calling mocked Advice.

**Architecture:** Add a focused Zod Route Geometry transport client and expose it through the shared live/mock `RiderFlowClient`. Keep request orchestration, cancellation, and stale-version recovery in `useOnboardingFlow`; keep deterministic request identity and confirmation state in the reducer; render the canonical polyline with the existing schematic component.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zod, Vitest, Testing Library, browser `fetch`, `AbortController`.

---

## File Structure

- Create `src/api/routeGeometry.ts`: Route Geometry schema, exact endpoint construction, coordinate validation, and response/request identity verification.
- Create `tests/api/routeGeometry.test.ts`: focused transport tests for URL construction, success validation, fallback payloads, identity mismatch, invalid coordinates, abort forwarding, and stale errors.
- Modify `src/api/riderFlowClient.ts`: expose `getRouteGeometry` through both live and mock clients and normalize transport failures.
- Modify `src/domain/types.ts`: replace the legacy segment response with canonical `RouteGeometry`, replace the issue #4 boundary with the issue #5 post-confirmation boundary, and retain exact Geometry retry context.
- Modify `src/domain/adapters.ts`: remove the obsolete service-segment-to-polyline adapter.
- Modify `src/domain/flow.ts`: use canonical polylines for confirmation/fallback and add the temporary route-confirmed transition.
- Modify `src/mocks/fixtures.ts`: store canonical route/version/direction/polyline Geometry fixtures.
- Modify `src/mocks/mockApi.ts`: return canonical Geometry with full request context.
- Modify `src/hooks/useOnboardingFlow.ts`: request Geometry through `RiderFlowClient`, cancel obsolete work, recover stale versions, and stop live mode after confirmation.
- Modify `src/app/HomePageApp.tsx`: replace `stopAfterDirectionSelection` with `stopAfterRouteConfirmation`.
- Modify `src/app/LiveProductHomePage.tsx`: allow live Geometry and confirmation, then stop before Advice.
- Modify `src/screens/OnboardingFlowScreen.tsx`: render canonical polylines, contextual Geometry recovery, and the temporary confirmation boundary.
- Modify `tests/api/riderFlowClient.test.ts`: verify live/mock Geometry parity and flow-error normalization.
- Modify `tests/mocks/mockApi.test.ts`: verify canonical Geometry request context and fallback fixtures.
- Modify `tests/domain/adapters.test.ts`: remove legacy segment conversion coverage.
- Modify `tests/domain/flow.test.ts`: cover canonical success/fallback, late events, exact retry, and the temporary confirmation boundary.
- Modify `tests/home-screen.test.tsx`: cover live Geometry success, fallback, failure/retry, stale recovery, aborts, and confirmation behavior.
- Modify `tests/prototype-scenarios.test.tsx`: preserve fixture-backed Geometry and downstream prototype states.
- Modify `docs/qa/05-api-integration.md`: record automated results and local-service smoke status.

## Task 1: Replace Legacy Geometry With The Canonical Polyline Model

**Files:**

- Modify: `src/domain/types.ts`
- Modify: `src/domain/adapters.ts`
- Modify: `src/domain/flow.ts`
- Modify: `src/hooks/useOnboardingFlow.ts`
- Modify: `src/mocks/fixtures.ts`
- Modify: `src/mocks/mockApi.ts`
- Modify: `src/screens/OnboardingFlowScreen.tsx`
- Modify: `tests/domain/adapters.test.ts`
- Modify: `tests/domain/flow.test.ts`
- Modify: `tests/mocks/mockApi.test.ts`

- [ ] **Step 1: Rewrite Geometry fixture expectations first**

  In `tests/mocks/mockApi.test.ts`, replace segment-shape assertions with the
  canonical browser model and require all three selected identifiers:

  ```ts
  test("returns canonical geometry for the selected route context", async () => {
    const api = createMockApi();

    const geometry = await api.getRouteGeometry(
      fixtureIds.routes.lagoa,
      fixtureIds.routeDirections.lagoaOutbound,
      fixtureIds.routeVersions.lagoaCurrent
    );

    expect(geometry).toEqual({
      routeId: fixtureIds.routes.lagoa,
      routeVersionId: fixtureIds.routeVersions.lagoaCurrent,
      routeDirectionId: fixtureIds.routeDirections.lagoaOutbound,
      polyline: [
        { lat: -27.5969, lng: -48.5488 },
        { lat: -27.5961, lng: -48.5363 },
        { lat: -27.5991, lng: -48.5238 },
        { lat: -27.6023, lng: -48.5052 },
        { lat: -27.6049, lng: -48.4789 },
      ],
    });
  });
  ```

  Update the missing-Geometry test to expect the same three identifiers plus
  `polyline: []`.

- [ ] **Step 2: Run the focused test and verify RED**

  Run:

  ```bash
  npm test -- tests/mocks/mockApi.test.ts
  ```

  Expected: FAIL because `MockApi.getRouteGeometry` still accepts two
  arguments and returns snake_case segment data.

- [ ] **Step 3: Define the canonical domain type**

  In `src/domain/types.ts`, delete `ServiceCoordinate`, `RouteSegment`, and
  `RouteGeometryResponse`. Add:

  ```ts
  export type RouteGeometry = {
    routeId: string;
    routeVersionId: string;
    routeDirectionId: string;
    polyline: LatLng[];
  };
  ```

  Change `FlowState.geometry` and later Geometry event references to
  `RouteGeometry`.

- [ ] **Step 4: Convert mock fixtures and API to the canonical model**

  In `src/mocks/fixtures.ts`, make each fixture explicit and frontend-ready:

  ```ts
  export const routeGeometryByDirectionId: Record<string, RouteGeometry> = {
    [fixtureIds.routeDirections.lagoaOutbound]: {
      routeId: fixtureIds.routes.lagoa,
      routeVersionId: fixtureIds.routeVersions.lagoaCurrent,
      routeDirectionId: fixtureIds.routeDirections.lagoaOutbound,
      polyline: [
        { lat: -27.5969, lng: -48.5488 },
        { lat: -27.5961, lng: -48.5363 },
        { lat: -27.5991, lng: -48.5238 },
        { lat: -27.6023, lng: -48.5052 },
        { lat: -27.6049, lng: -48.4789 },
      ],
    },
  };
  ```

  In `src/mocks/mockApi.ts`, change the public method and implementation:

  ```ts
  getRouteGeometry(
    routeId: string,
    routeDirectionId: string,
    routeVersionId: string
  ): Promise<RouteGeometry>;

  async getRouteGeometry(routeId, routeDirectionId, routeVersionId) {
    await delay(delays.geometryMs);
    rejectIfApiError(scenarioId, "geometry");

    const geometry = routeGeometryByDirectionId[routeDirectionId];
    if (
      geometry !== undefined &&
      (geometry.routeId !== routeId || geometry.routeVersionId !== routeVersionId)
    ) {
      throw new MockApiError({
        kind: "routeVersionStale",
        message: "Mock route version is stale",
      });
    }

    return (
      geometry ?? { routeId, routeVersionId, routeDirectionId, polyline: [] }
    );
  }
  ```

  Preserve the `confirmation-fallback-missing-geometry` scenario by returning
  the matching identifiers and `polyline: []`.

- [ ] **Step 5: Remove the obsolete adapter and update canonical consumers**

  Delete `toRoutePolyline` and its `RouteGeometryResponse` import from
  `src/domain/adapters.ts`. Delete the segment-flattening test and obsolete
  imports from `tests/domain/adapters.test.ts`; no replacement adapter is
  needed because the canonical response is already frontend-ready.

  In `src/domain/flow.ts`, update the Geometry event/import, clone the canonical
  polyline, and use `geometry.polyline.length >= 2` for confirmation. In
  `tests/domain/flow.test.ts`, convert the shared Geometry fixture and fallback
  assertions to the canonical shape without changing screen behavior yet.

  In `src/screens/OnboardingFlowScreen.tsx`, remove the adapter import and use:

  ```ts
  const mapPoints = state.geometry?.polyline ?? [];
  ```

  Until Task 4 moves Geometry behind `RiderFlowClient`, update the existing
  mock call in `src/hooks/useOnboardingFlow.ts` to satisfy the new mock API:

  ```ts
  const geometry = await api.getRouteGeometry(
    state.selectedRoute.routeId,
    direction.routeDirectionId,
    state.selectedRoute.routeVersionId
  );
  ```

- [ ] **Step 6: Run focused domain/mock tests and typecheck**

  Run:

  ```bash
  npm test -- tests/mocks/mockApi.test.ts tests/domain/adapters.test.ts tests/domain/flow.test.ts
  npm run typecheck
  ```

  Expected: focused tests and reducer tests PASS; typecheck exits `0` with no
  remaining legacy Geometry references.

- [ ] **Step 7: Commit the canonical model**

  ```bash
  git add src/domain/types.ts src/domain/adapters.ts src/domain/flow.ts src/hooks/useOnboardingFlow.ts src/mocks/fixtures.ts src/mocks/mockApi.ts src/screens/OnboardingFlowScreen.tsx tests/domain/adapters.test.ts tests/domain/flow.test.ts tests/mocks/mockApi.test.ts
  git commit -m "refactor(geometry): use canonical polyline model"
  ```

## Task 2: Add The Route Geometry Transport And Shared Client Operation

**Files:**

- Create: `src/api/routeGeometry.ts`
- Create: `tests/api/routeGeometry.test.ts`
- Modify: `src/api/riderFlowClient.ts`
- Modify: `tests/api/riderFlowClient.test.ts`

- [ ] **Step 1: Write failing transport tests**

  Create `tests/api/routeGeometry.test.ts` with a shared `jsonResponse` helper
  and these core cases:

  ```ts
  test("loads version-pinned geometry for the exact route context", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        routeId: "route/124",
        routeVersionId: "version current",
        routeDirectionId: "direction/outbound",
        polyline: [
          { lat: -27.5969, lng: -48.5488 },
          { lat: -27.5961, lng: -48.5363 },
        ],
      })
    );
    const controller = new AbortController();
    const client = createRouteGeometryClient({
      baseUrl: "http://localhost:8000/v1/",
      fetchImpl: fetchMock,
    });

    const result = await client.getRouteGeometry(
      {
        routeId: "route/124",
        routeVersionId: "version current",
        routeDirectionId: "direction/outbound",
      },
      { signal: controller.signal }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/routes/route%2F124/directions/direction%2Foutbound/geometry?routeVersionId=version+current",
      { credentials: "omit", method: "GET", signal: controller.signal }
    );
    expect(result.polyline).toHaveLength(2);
  });
  ```

  Add separate tests asserting:

  ```ts
  const input = {
    routeId: "route-124",
    routeVersionId: "version-124",
    routeDirectionId: "direction-124",
  };
  const validBody = {
    ...input,
    polyline: [
      { lat: -27.5969, lng: -48.5488 },
      { lat: -27.5961, lng: -48.5363 },
    ],
  };
  function requestBody(body: unknown) {
    return createRouteGeometryClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(body)),
    }).getRouteGeometry(input);
  }

  await expect(
    requestBody({ ...validBody, routeId: "wrong" })
  ).rejects.toMatchObject({ kind: "malformedResponse" });

  await expect(
    requestBody({
      ...validBody,
      polyline: [{ lat: 91, lng: -48.5 }],
    })
  ).rejects.toMatchObject({ kind: "malformedResponse" });
  ```

  Also cover `polyline: []`, a single valid point, longitude outside
  `[-180, 180]`, non-numeric coordinates, and a `409 routeVersionStale`
  envelope.

- [ ] **Step 2: Run the transport test and verify RED**

  Run:

  ```bash
  npm test -- tests/api/routeGeometry.test.ts
  ```

  Expected: FAIL because `src/api/routeGeometry.ts` does not exist.

- [ ] **Step 3: Implement the focused transport client**

  Create `src/api/routeGeometry.ts`:

  ```ts
  import { z } from "zod";

  import {
    LiveApiError,
    requestBrowserJson,
    requireApiBaseUrl,
    type BrowserRequestOptions,
  } from "./browserApi";

  const latLngSchema = z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  });

  export const routeGeometryResponseSchema = z.object({
    routeId: z.string().min(1),
    routeVersionId: z.string().min(1),
    routeDirectionId: z.string().min(1),
    polyline: z.array(latLngSchema),
  });

  export type RouteGeometryTransport = z.infer<
    typeof routeGeometryResponseSchema
  >;

  export type RouteGeometryInput = {
    routeId: string;
    routeVersionId: string;
    routeDirectionId: string;
  };

  export type RouteGeometryClient = {
    getRouteGeometry(
      input: RouteGeometryInput,
      options?: BrowserRequestOptions
    ): Promise<RouteGeometryTransport>;
  };

  export function createRouteGeometryClient({
    baseUrl,
    fetchImpl = fetch,
  }: {
    baseUrl: string;
    fetchImpl?: typeof fetch;
  }): RouteGeometryClient {
    const normalizedBaseUrl = requireApiBaseUrl(baseUrl);

    return {
      async getRouteGeometry(input, options) {
        const searchParams = new URLSearchParams({
          routeVersionId: input.routeVersionId,
        });
        const geometry = await requestBrowserJson({
          fetchImpl,
          url: `${normalizedBaseUrl}/routes/${encodeURIComponent(input.routeId)}/directions/${encodeURIComponent(input.routeDirectionId)}/geometry?${searchParams.toString()}`,
          schema: routeGeometryResponseSchema,
          options,
          requestFailureMessage: "Não consegui carregar o trajeto agora.",
          malformedResponseMessage:
            "A resposta da API de trajeto veio em um formato inesperado.",
        });

        if (
          geometry.routeId !== input.routeId ||
          geometry.routeVersionId !== input.routeVersionId ||
          geometry.routeDirectionId !== input.routeDirectionId
        ) {
          throw new LiveApiError({
            kind: "malformedResponse",
            message: "A resposta da API de trajeto não corresponde à seleção.",
          });
        }

        return geometry;
      },
    };
  }
  ```

- [ ] **Step 4: Verify the transport tests GREEN**

  Run:

  ```bash
  npm test -- tests/api/routeGeometry.test.ts
  ```

  Expected: all Geometry transport tests PASS.

- [ ] **Step 5: Write failing RiderFlowClient parity tests**

  In `tests/api/riderFlowClient.test.ts`, add one live mapping test and one mock
  delegation test:

  ```ts
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

  test("returns canonical live geometry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(validGeometry), { status: 200 })
      );
    const client = createLiveRiderFlowClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(client.getRouteGeometry(geometryInput)).resolves.toEqual(
      validGeometry
    );
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
  ```

- [ ] **Step 6: Extend RiderFlowClient**

  In `src/api/riderFlowClient.ts`, add:

  ```ts
  getRouteGeometry(
    input: RouteGeometryInput,
    options?: BrowserRequestOptions
  ): Promise<RouteGeometry>;
  ```

  Instantiate `createRouteGeometryClient({ baseUrl, fetchImpl })` beside the
  existing transport clients. In the live implementation, call the transport
  client inside the same `normalizeLiveRiderFlowError` boundary and clone the
  polyline. In the mock implementation, delegate to:

  ```ts
  async getRouteGeometry(input) {
    return api.getRouteGeometry(
      input.routeId,
      input.routeDirectionId,
      input.routeVersionId
    );
  }
  ```

- [ ] **Step 7: Run focused client tests and commit**

  Run:

  ```bash
  npm test -- tests/api/routeGeometry.test.ts tests/api/riderFlowClient.test.ts
  ```

  Expected: both files PASS.

  Commit:

  ```bash
  git add src/api/routeGeometry.ts src/api/riderFlowClient.ts tests/api/routeGeometry.test.ts tests/api/riderFlowClient.test.ts
  git commit -m "feat(api): add version-pinned route geometry"
  ```

## Task 3: Model Confirmation, Fallback, And The Temporary Live Boundary

**Files:**

- Modify: `src/domain/types.ts`
- Modify: `src/domain/flow.ts`
- Modify: `tests/domain/flow.test.ts`

- [ ] **Step 1: Convert reducer fixtures and add failing boundary tests**

  In `tests/domain/flow.test.ts`, replace the legacy Geometry fixture with:

  ```ts
  const geometry: RouteGeometry = {
    routeId: "route-a",
    routeVersionId: "version-a",
    routeDirectionId: "direction-a",
    polyline: [
      { lat: -27.601, lng: -48.525 },
      { lat: -27.603, lng: -48.522 },
    ],
  };
  ```

  Replace the issue #4 stop test with:

  ```ts
  test("stops live confirmation before advice", () => {
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
  ```

  Add table-driven fallback coverage for `polyline: []` and one point, plus a
  stale Geometry success using an old request ID that leaves the current state
  unchanged.

- [ ] **Step 2: Run reducer tests and verify RED**

  Run:

  ```bash
  npm test -- tests/domain/flow.test.ts
  ```

  Expected: FAIL because the reducer still reads `segments` and has no
  `routeConfirmationStopped` event or boundary screen.

- [ ] **Step 3: Replace the issue #4 boundary types**

  In `src/domain/types.ts`, add `liveRouteConfirmedUnsupported` after the two
  confirmation states. Retain the issue #4 boundary type until Task 5 removes
  its final hook and screen consumers.

  In `src/domain/flow.ts`, add:

  ```ts
  | { type: "routeConfirmationStopped" }
  ```

- [ ] **Step 4: Update canonical Geometry transitions**

  Change `geometryAllowsConfirmation` and `cloneGeometry` to:

  ```ts
  function geometryAllowsConfirmation(
    geometry: RouteGeometry,
    mapAvailability: MapAvailability
  ): boolean {
    return mapAvailability === "available" && geometry.polyline.length >= 2;
  }

  function cloneGeometry(geometry: RouteGeometry): RouteGeometry {
    return {
      ...geometry,
      polyline: geometry.polyline.map(({ lat, lng }) => ({ lat, lng })),
    };
  }
  ```

  Add the stop transition after `geometrySucceeded`:

  ```ts
  case "routeConfirmationStopped":
    if (
      state.selectedRoute === undefined ||
      state.selectedDirection === undefined ||
      (state.screen !== "routeConfirmation" &&
        state.screen !== "routeConfirmationFallback")
    ) {
      return state;
    }
    return clearError({
      ...state,
      screen: "liveRouteConfirmedUnsupported",
      requestStatus: "success",
      pendingRequests: {},
    });
  ```

- [ ] **Step 5: Run reducer tests and typecheck**

  Run:

  ```bash
  npm test -- tests/domain/flow.test.ts
  npm run typecheck
  ```

  Expected: reducer tests PASS and typecheck exits `0`. The old issue #4 event
  remains temporarily reachable until live wiring moves to the new boundary.

- [ ] **Step 6: Commit reducer state changes**

  ```bash
  git add src/domain/types.ts src/domain/flow.ts tests/domain/flow.test.ts
  git commit -m "feat(flow): model live route confirmation"
  ```

## Task 4: Orchestrate Geometry, Retry, Cancellation, And Stale Recovery

**Files:**

- Modify: `src/hooks/useOnboardingFlow.ts`
- Modify: `src/app/HomePageApp.tsx`
- Modify: `src/app/LiveProductHomePage.tsx`
- Modify: `tests/home-screen.test.tsx`

- [ ] **Step 1: Write failing live orchestration tests**

  In `tests/home-screen.test.tsx`, extend the existing manual live-flow test so
  its fetch mock returns canonical Geometry for URLs containing `/geometry?`,
  then select a direction and assert the exact request:

  ```ts
  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8000/v1/routes/route-124/directions/direction-124-inbound/geometry?routeVersionId=version-124",
    {
      credentials: "omit",
      method: "GET",
      signal: expect.any(AbortSignal),
    }
  );
  expect(
    await screen.findByRole("heading", { name: "Confirme sua linha" })
  ).toBeInTheDocument();
  ```

  Add tests that:

  - return `polyline: []` and expect "Mapa indisponível";
  - return `503 serviceUnavailable`, click "Tentar de novo", and observe the
    same Geometry URL twice;
  - return `409 routeVersionStale` for Geometry, then assert the originating
    route list refreshes and no direction is silently reselected;
  - inspect the first request signal and assert it becomes aborted after
    "Trocar sentido" or unmount.

  Reducer coverage from Task 3 is the stale-response correctness test: dispatch
  success and failure events carrying an old request ID and assert neither can
  replace the current Geometry or error state.

- [ ] **Step 2: Run the focused screen tests and verify RED**

  Run:

  ```bash
  npm test -- tests/home-screen.test.tsx
  ```

  Expected: FAIL because live mode still stops immediately after direction
  selection and Geometry still calls `MockApi`.

- [ ] **Step 3: Replace the boundary option and add Geometry cancellation**

  In `src/app/HomePageApp.tsx` and `UseOnboardingFlowOptions`, replace:

  ```ts
  stopAfterDirectionSelection?: boolean;
  ```

  with:

  ```ts
  stopAfterRouteConfirmation?: boolean;
  ```

  In `useOnboardingFlow`, add:

  ```ts
  const geometryAbortRef = useRef<AbortController | undefined>(undefined);
  ```

  Include `geometryAbortRef.current?.abort()` in unmount cleanup and before
  changing route or direction.

  In `src/app/LiveProductHomePage.tsx`, replace the issue #4 prop with
  `stopAfterRouteConfirmation` so live mode loads Geometry before stopping.

- [ ] **Step 4: Request Geometry through RiderFlowClient**

  Replace the issue #4 stop and direct mock API call in `selectDirection` with:

  ```ts
  const route = state.selectedRoute;
  if (route === undefined) return;

  geometryAbortRef.current?.abort();
  const controller = new AbortController();
  geometryAbortRef.current = controller;
  const requestId = nextRequestId("geometry");
  dispatch({ type: "directionSelected", direction, requestId });

  try {
    const geometry = await riderFlowClient.getRouteGeometry(
      {
        routeId: route.routeId,
        routeVersionId: route.routeVersionId,
        routeDirectionId: direction.routeDirectionId,
      },
      { signal: controller.signal }
    );
    dispatch({
      type: "geometrySucceeded",
      requestId,
      geometry,
      mapAvailability,
    });
  } catch (error) {
    if (isAbortedApiError(error)) return;
    if (
      error instanceof LiveRiderFlowClientError &&
      error.flowError.kind === "routeVersionStale"
    ) {
      recoverStaleRouteVersion(route.source);
      return;
    }
    failOperation(requestId, error, {
      kind: "geometry",
      routeId: route.routeId,
      routeVersionId: route.routeVersionId,
      routeDirectionId: direction.routeDirectionId,
    });
  }
  ```

  Extract the existing manual/nearby stale refresh logic from `selectRoute`
  into one `recoverStaleRouteVersion(source)` callback and reuse it for
  directions and Geometry.

- [ ] **Step 5: Stop confirmation without requesting Advice in live mode**

  At the start of `confirmRoute`, after validating selected route/direction:

  ```ts
  if (stopAfterRouteConfirmation) {
    dispatch({ type: "routeConfirmationStopped" });
    return;
  }
  ```

  Keep the current mock Advice path unchanged for `/prototype`.

- [ ] **Step 6: Preserve exact retry and contextual state**

  Keep the existing Geometry retry lookup by `routeDirectionId`, but ensure it
  calls the new `selectDirection` and therefore resends the full selected route
  context. In `changeDirection` and `changeRoute` actions, abort active Geometry
  before reducer dispatch.

- [ ] **Step 7: Run focused tests and commit orchestration**

  Run:

  ```bash
  npm test -- tests/home-screen.test.tsx tests/domain/flow.test.ts
  ```

  Expected: live success/fallback/retry/stale/cancellation tests PASS.

  Commit:

  ```bash
  git add src/hooks/useOnboardingFlow.ts src/app/HomePageApp.tsx src/app/LiveProductHomePage.tsx tests/home-screen.test.tsx
  git commit -m "feat(flow): load live route geometry"
  ```

## Task 5: Render Live Confirmation And The Issue 6 Boundary

**Files:**

- Modify: `src/screens/OnboardingFlowScreen.tsx`
- Modify: `tests/home-screen.test.tsx`
- Modify: `tests/prototype-scenarios.test.tsx`

- [ ] **Step 1: Write failing screen assertions**

  In `tests/home-screen.test.tsx`, after successful live confirmation click
  "Confirmar esta linha" and assert:

  ```ts
  expect(
    await screen.findByRole("heading", { name: "Linha confirmada" })
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "A linha e o sentido estão prontos para calcular a recomendação."
    )
  ).toBeInTheDocument();
  expect(screen.getByText("124 TICEN - Lagoa")).toBeInTheDocument();
  expect(screen.getByText("Lagoa para TICEN")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Trocar sentido" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Trocar linha" })
  ).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.some(([url]) => String(url).includes("/advice"))
  ).toBe(false);
  ```

  Add an API Error assertion that Geometry failures show "Trocar sentido"
  rather than "Procurar linha manualmente". Keep existing prototype tests that
  confirm mocked Advice still follows confirmation.

- [ ] **Step 2: Run screen tests and verify RED**

  Run:

  ```bash
  npm test -- tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
  ```

  Expected: FAIL because the new boundary and contextual error action are not
  rendered yet.

- [ ] **Step 3: Replace the issue #4 screen with the issue #5 boundary**

  Delete `liveDirectionSelectedUnsupported` rendering, its screen type, its
  reducer event/transition, and the obsolete `stopAfterDirectionSelection`
  hook branch. Add:

  ```tsx
  case "liveRouteConfirmedUnsupported":
    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <h1 id="screen-title" className={styles.titleCompact}>
          Linha confirmada
        </h1>
        <p className={styles.body}>
          A linha e o sentido estão prontos para calcular a recomendação.
        </p>
        <RouteSummary
          directionLabel={state.selectedDirection?.name}
          routeLabel={selectedRouteLabel}
        />
      </section>
    );
    stickyPrimary = (
      <Button onClick={actions.changeDirection}>Trocar sentido</Button>
    );
    stickySecondary = (
      <Button onClick={actions.changeRoute} variant="secondary">
        Trocar linha
      </Button>
    );
    break;
  ```

- [ ] **Step 4: Make Geometry API recovery contextual**

  At the top of `renderApiErrorFallbackAction`, add:

  ```tsx
  if (state.error?.retryTarget?.kind === "geometry") {
    return (
      <Button onClick={actions.changeDirection} variant="secondary">
        Trocar sentido
      </Button>
    );
  }
  ```

  Preserve current manual-search and generic fallback branches for other
  operations.

- [ ] **Step 5: Run UI/prototype tests and commit**

  Run:

  ```bash
  npm test -- tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
  ```

  Expected: live boundary and contextual failure tests PASS; prototype Advice
  and all scenario-switcher cases remain PASS.

  Commit:

  ```bash
  git add src/domain/types.ts src/domain/flow.ts src/hooks/useOnboardingFlow.ts src/screens/OnboardingFlowScreen.tsx tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
  git commit -m "feat(ui): confirm live route geometry"
  ```

## Task 6: Record Evidence And Run The Completion Gate

**Files:**

- Modify: `docs/qa/05-api-integration.md`

- [ ] **Step 1: Run focused regression tests**

  Run:

  ```bash
  npm test -- tests/api/routeGeometry.test.ts tests/api/riderFlowClient.test.ts tests/mocks/mockApi.test.ts tests/domain/flow.test.ts tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
  ```

  Expected: every listed file PASS, covering transport, parity, reducer,
  live-flow, and prototype behavior.

- [ ] **Step 2: Run all repository completion checks**

  Run exactly:

  ```bash
  npm run format:check
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  ```

  Expected: every command exits `0` with no lint warnings, TypeScript errors,
  failing tests, or build errors.

- [ ] **Step 3: Check the frontend-only boundary**

  Run:

  ```bash
  rg "FastAPI|APIRouter|scraper|GTFS|CREATE TABLE|INSERT INTO" app src tests
  ```

  Expected: no newly introduced backend, scraper, ingestion, or database
  implementation.

- [ ] **Step 4: Attempt local-service smoke without expanding scope**

  With a compatible service running, start the frontend with
  `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/v1`, then verify nearby/manual
  selection, Direction Choice, Geometry success, missing-Geometry fallback,
  retryable failure, and the temporary confirmation boundary. If service data,
  CORS, or backend availability blocks a state, record the blocker; do not add
  backend behavior to this repository.

- [ ] **Step 5: Record exact QA evidence**

  Under the Issue #5 section in `docs/qa/05-api-integration.md`, add the command
  results, total passing tests, local-service status, and any blocker. Mark the
  Geometry checklist rows as live, fixture-only, blocked, or not checked based
  on actual evidence; do not pre-mark unverified rows.

- [ ] **Step 6: Commit verification evidence**

  ```bash
  git add docs/qa/05-api-integration.md
  git commit -m "docs(qa): record route geometry verification"
  ```

- [ ] **Step 7: Confirm final repository state**

  Run:

  ```bash
  git status --short --branch
  git log --oneline --decorate -7
  ```

  Expected: clean `feat/5-route-geometry-confirmation` worktree with small,
  coherent commits for model, transport, flow, UI, and QA evidence.
