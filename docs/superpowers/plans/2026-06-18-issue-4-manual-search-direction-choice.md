# Issue 4 Manual Search And Direction Choice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete live Manual Route Search and version-pinned Direction Choice while preserving service order, preventing stale async state, and stopping live mode before issue #5 Geometry work.

**Architecture:** Add a shared Zod browser-request boundary, build a focused Direction Choice transport client, and extend the live/mock `RiderFlowClient` interface. Keep async cancellation and recovery orchestration in `useOnboardingFlow`, deterministic request identity and recovery state in the reducer, and render dedicated loading, stale-recovery, and post-direction boundary states through the existing screen component.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zod, Vitest, Testing Library, browser `fetch`, `AbortController`.

---

## File Structure

- Create `src/api/browserApi.ts`: shared base URL normalization, request options, public error parsing, abort classification, and Zod JSON request helper.
- Create `src/api/routeDirections.ts`: Direction Choice transport schema and version-pinned endpoint client.
- Modify `src/api/routeCandidates.ts`: use the shared browser request helper without changing Route Candidate behavior.
- Modify `src/api/riderFlowClient.ts`: add live/mock `listRouteDirections`, preserve direction order, and normalize typed flow errors.
- Modify `src/domain/adapters.ts`: stop sorting Direction Choices so service order remains authoritative.
- Modify `src/mocks/mockApi.ts`: accept the same route/version pair for fixture-backed Direction Choice lookup.
- Modify `src/domain/types.ts`: add direction loading/boundary states, typed stale error and recovery notice, and exact direction retry context.
- Modify `src/domain/flow.ts`: clear manual results on new/empty queries, track Direction Choice loading, stop after live direction selection, and enforce no-silent-reselection recovery.
- Modify `src/hooks/useOnboardingFlow.ts`: cancel manual/direction requests, call the shared client for directions, and orchestrate manual/nearby stale-version refresh.
- Modify `src/app/HomePageApp.tsx`: replace `stopAfterRouteSelection` with the issue #4 `stopAfterDirectionSelection` boundary option.
- Modify `src/app/LiveProductHomePage.tsx`: allow live route selection to load directions, then stop before Geometry.
- Modify `src/screens/OnboardingFlowScreen.tsx`: render manual loading, direction loading, stale notice, and selected-direction boundary copy.
- Modify `tests/api/routeCandidates.test.ts`: preserve existing transport coverage through the shared request boundary.
- Create `tests/api/routeDirections.test.ts`: cover exact request construction, order, schema errors, aborts, and typed stale errors.
- Modify `tests/api/riderFlowClient.test.ts`: cover live/mock Direction Choice adaptation and error normalization.
- Modify `tests/domain/adapters.test.ts`: prove Direction Choices preserve input order.
- Modify `tests/domain/flow.test.ts`: cover new reducer states, retry context, recovery notice, and stale request rejection.
- Modify `tests/home-screen.test.tsx`: cover complete live manual/nearby Direction Choice flows, cancellation, recovery, and boundary UI.
- Modify `docs/qa/05-api-integration.md`: record issue #4 expectations and live smoke status.

## Task 1: Add The Shared Browser API Error Boundary

**Files:**

- Create: `src/api/browserApi.ts`
- Modify: `src/api/routeCandidates.ts`
- Modify: `tests/api/routeCandidates.test.ts`

- [ ] **Step 1: Write failing shared error-boundary tests**

  Extend `tests/api/routeCandidates.test.ts` with tests proving a documented
  error envelope is retained as a typed code, malformed error JSON remains a
  generic HTTP error, and an aborted fetch is classified separately:

  ```ts
  test("parses public API error codes without exposing backend messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "routeVersionStale",
            message: "internal diagnostic",
            requestId: "req-1",
          },
        },
        { status: 409 }
      )
    );
    const client = createRouteCandidatesClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(
      client.searchRouteCandidates({ query: "124", limit: 8 })
    ).rejects.toMatchObject({
      kind: "http",
      status: 409,
      code: "routeVersionStale",
    });
  });

  test("classifies aborted requests without turning them into network errors", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(
        new DOMException("The operation was aborted", "AbortError")
      );
    const client = createRouteCandidatesClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(
      client.searchRouteCandidates({ query: "124", limit: 8 })
    ).rejects.toMatchObject({ kind: "aborted" });
  });
  ```

- [ ] **Step 2: Run the focused test and verify RED**

  Run:

  ```bash
  npm test -- tests/api/routeCandidates.test.ts
  ```

  Expected: FAIL because `LiveApiError` does not retain public error codes and
  currently classifies aborts as network failures.

- [ ] **Step 3: Create the shared browser request module**

  Create `src/api/browserApi.ts` with these public types and behavior:

  ```ts
  import { z } from "zod";

  export const publicApiErrorEnvelopeSchema = z.object({
    error: z.object({
      code: z.string(),
      message: z.string().optional(),
      requestId: z.string().optional(),
    }),
  });

  export type BrowserRequestOptions = { signal?: AbortSignal };
  export type LiveApiErrorKind =
    | "configuration"
    | "network"
    | "http"
    | "malformedResponse"
    | "aborted";

  export class LiveApiError extends Error {
    readonly kind: LiveApiErrorKind;
    readonly status?: number;
    readonly code?: string;

    constructor(input: {
      kind: LiveApiErrorKind;
      message: string;
      status?: number;
      code?: string;
    }) {
      super(input.message);
      this.name = "LiveApiError";
      this.kind = input.kind;
      this.status = input.status;
      this.code = input.code;
    }
  }

  export function requireApiBaseUrl(value: string | undefined): string {
    const trimmed = value?.trim().replace(/\/+$/, "");
    if (trimmed === undefined || trimmed.length === 0) {
      throw new LiveApiError({
        kind: "configuration",
        message: "NEXT_PUBLIC_API_URL is required for live API mode.",
      });
    }
    return trimmed;
  }

  export function isAbortedApiError(error: unknown): boolean {
    return error instanceof LiveApiError && error.kind === "aborted";
  }

  export async function requestBrowserJson<T>(input: {
    fetchImpl: typeof fetch;
    url: string;
    schema: z.ZodType<T>;
    options?: BrowserRequestOptions;
    requestFailureMessage: string;
    malformedResponseMessage: string;
  }): Promise<T> {
    let response: Response;
    try {
      response = await input.fetchImpl(input.url, {
        method: "GET",
        credentials: "omit",
        ...(input.options?.signal === undefined
          ? {}
          : { signal: input.options.signal }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new LiveApiError({ kind: "aborted", message: "Request aborted" });
      }
      throw new LiveApiError({
        kind: "network",
        message:
          error instanceof Error ? error.message : input.requestFailureMessage,
      });
    }

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => undefined);
      const parsedError = publicApiErrorEnvelopeSchema.safeParse(body);
      throw new LiveApiError({
        kind: "http",
        status: response.status,
        message: input.requestFailureMessage,
        ...(parsedError.success ? { code: parsedError.data.error.code } : {}),
      });
    }

    const body: unknown = await response.json().catch(() => undefined);
    const parsed = input.schema.safeParse(body);
    if (!parsed.success) {
      throw new LiveApiError({
        kind: "malformedResponse",
        message: input.malformedResponseMessage,
      });
    }
    return parsed.data;
  }
  ```

- [ ] **Step 4: Migrate Route Candidate requests to the shared helper**

  In `src/api/routeCandidates.ts`, remove the local error types and request
  implementation, re-export `LiveApiError` and `requireApiBaseUrl` for current
  imports, alias `BrowserRequestOptions` as the existing request option type,
  and call:

  ```ts
  return requestBrowserJson({
    fetchImpl,
    url,
    schema: routeCandidatesResponseSchema,
    options,
    requestFailureMessage: "Não consegui carregar as linhas agora.",
    malformedResponseMessage:
      "A resposta da API de linhas veio em um formato inesperado.",
  });
  ```

- [ ] **Step 5: Run focused API tests and verify GREEN**

  Run:

  ```bash
  npm test -- tests/api/routeCandidates.test.ts
  ```

  Expected: all Route Candidate transport tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/api/browserApi.ts src/api/routeCandidates.ts tests/api/routeCandidates.test.ts
  git commit -m "refactor(api): share browser error handling"
  ```

## Task 2: Add Version-Pinned Direction Choice Transport

**Files:**

- Create: `src/api/routeDirections.ts`
- Create: `tests/api/routeDirections.test.ts`
- Modify: `src/api/riderFlowClient.ts`
- Modify: `src/domain/adapters.ts`
- Modify: `src/mocks/mockApi.ts`
- Modify: `tests/api/riderFlowClient.test.ts`
- Modify: `tests/domain/adapters.test.ts`
- Modify: `tests/mocks/mockApi.test.ts`

- [ ] **Step 1: Write failing Direction Choice transport tests**

  Create `tests/api/routeDirections.test.ts` covering the exact encoded URL,
  service order, signal forwarding, malformed success data, and typed stale
  error:

  ```ts
  test("loads version-pinned directions in service order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        directions: [
          {
            routeDirectionId: "direction-second",
            sequence: 2,
            name: "Lagoa para TICEN",
            departureLabels: ["Lagoa", "TICEN"],
          },
          {
            routeDirectionId: "direction-first",
            sequence: 1,
            name: "TICEN para Lagoa",
            departureLabels: ["TICEN", "Lagoa"],
          },
        ],
      })
    );
    const controller = new AbortController();
    const client = createRouteDirectionsClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    const response = await client.listRouteDirections(
      { routeId: "route/124", routeVersionId: "version current" },
      { signal: controller.signal }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/routes/route%2F124/directions?routeVersionId=version+current",
      { credentials: "omit", method: "GET", signal: controller.signal }
    );
    expect(response.directions.map((item) => item.routeDirectionId)).toEqual([
      "direction-second",
      "direction-first",
    ]);
  });
  ```

  Add separate assertions that `{ directions: [{}] }` throws
  `malformedResponse` and a `409` public envelope throws `{ code:
"routeVersionStale" }`.

- [ ] **Step 2: Run the transport test and verify RED**

  Run:

  ```bash
  npm test -- tests/api/routeDirections.test.ts
  ```

  Expected: FAIL because `src/api/routeDirections.ts` does not exist.

- [ ] **Step 3: Implement the focused Direction Choice client**

  Create `src/api/routeDirections.ts`:

  ```ts
  import { z } from "zod";
  import { requestBrowserJson, requireApiBaseUrl } from "./browserApi";
  import type { BrowserRequestOptions } from "./browserApi";

  const directionChoiceSchema = z.object({
    routeDirectionId: z.string(),
    sequence: z.number(),
    name: z.string(),
    departureLabels: z.array(z.string()),
  });

  export const directionChoicesResponseSchema = z.object({
    directions: z.array(directionChoiceSchema),
  });

  export type DirectionChoiceTransport = z.infer<typeof directionChoiceSchema>;
  export type DirectionChoicesResponseTransport = z.infer<
    typeof directionChoicesResponseSchema
  >;

  export type RouteDirectionsClient = {
    listRouteDirections(
      input: { routeId: string; routeVersionId: string },
      options?: BrowserRequestOptions
    ): Promise<DirectionChoicesResponseTransport>;
  };

  export function createRouteDirectionsClient({
    baseUrl,
    fetchImpl = fetch,
  }: {
    baseUrl: string;
    fetchImpl?: typeof fetch;
  }): RouteDirectionsClient {
    const normalizedBaseUrl = requireApiBaseUrl(baseUrl);
    return {
      listRouteDirections(input, options) {
        const params = new URLSearchParams({
          routeVersionId: input.routeVersionId,
        });
        return requestBrowserJson({
          fetchImpl,
          url: `${normalizedBaseUrl}/routes/${encodeURIComponent(input.routeId)}/directions?${params.toString()}`,
          schema: directionChoicesResponseSchema,
          options,
          requestFailureMessage: "Não consegui carregar os sentidos agora.",
          malformedResponseMessage:
            "A resposta da API de sentidos veio em um formato inesperado.",
        });
      },
    };
  }
  ```

- [ ] **Step 4: Write failing rider-flow parity and order tests**

  Extend `tests/api/riderFlowClient.test.ts` so the live client returns domain
  `DirectionChoice[]` in response order, passes both IDs, maps stale errors to
  `flowError.kind === "routeVersionStale"`, and the mock client accepts the same
  route/version operation:

  ```ts
  const result = await client.listRouteDirections({
    routeId: "route-124",
    routeVersionId: "version-124",
  });
  expect(result.map((item) => item.routeDirectionId)).toEqual([
    "direction-second",
    "direction-first",
  ]);
  ```

  Extend `tests/domain/adapters.test.ts` with an intentionally reversed
  `sequence` fixture and assert `toDirectionChoices` preserves input order.
  Extend `tests/mocks/mockApi.test.ts` to call
  `getRouteDirections("route-124", "version-124")` so the mock seam cannot
  silently omit version pinning.

- [ ] **Step 5: Run rider-flow and adapter tests and verify RED**

  Run:

  ```bash
  npm test -- tests/api/riderFlowClient.test.ts tests/domain/adapters.test.ts
  ```

  Expected: FAIL because `RiderFlowClient` has no Direction Choice operation
  and `toDirectionChoices` sorts by `sequence`.

- [ ] **Step 6: Extend live and mock RiderFlowClient implementations**

  Add this operation to `RiderFlowClient`:

  ```ts
  listRouteDirections(
    input: { routeId: string; routeVersionId: string },
    options?: BrowserRequestOptions
  ): Promise<DirectionChoice[]>;
  ```

  Construct both transport clients in `createLiveRiderFlowClient`. Map live
  values directly in response order. In `createMockRiderFlowClient`, call
  `api.getRouteDirections(input.routeId, input.routeVersionId)` and adapt
  through `toDirectionChoices`. Update the `MockApi` signature and fixture
  implementation to accept both values. Rename `LiveRouteCandidateClientError` to
  `LiveRiderFlowClientError`, and normalize errors with:

  ```ts
  if (error instanceof LiveApiError && error.code === "routeVersionStale") {
    return new LiveRiderFlowClientError({
      kind: "routeVersionStale",
      message: "As opções desta linha foram atualizadas.",
    });
  }
  ```

  Keep abort errors distinguishable so the hook can ignore them: normalization
  must rethrow `LiveApiError` when `kind === "aborted"` rather than wrapping it.
  Change `toDirectionChoices` to map without sorting:

  ```ts
  return routeDirectionsResponse.directions.map((direction) => ({
    routeDirectionId: direction.route_direction_id,
    sequence: direction.sequence,
    name: direction.name,
    departureLabels: [...direction.departure_labels],
  }));
  ```

- [ ] **Step 7: Run transport, rider-flow, and adapter tests and verify GREEN**

  Run:

  ```bash
  npm test -- tests/api/routeDirections.test.ts tests/api/riderFlowClient.test.ts tests/domain/adapters.test.ts tests/mocks/mockApi.test.ts
  ```

  Expected: all focused API and adapter tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add src/api/routeDirections.ts src/api/riderFlowClient.ts src/domain/adapters.ts src/mocks/mockApi.ts tests/api/routeDirections.test.ts tests/api/riderFlowClient.test.ts tests/domain/adapters.test.ts tests/mocks/mockApi.test.ts
  git commit -m "feat(api): add version-pinned direction choices"
  ```

## Task 3: Model Direction Loading And Stale Recovery In The Reducer

**Files:**

- Modify: `src/domain/types.ts`
- Modify: `src/domain/flow.ts`
- Modify: `tests/domain/flow.test.ts`

- [ ] **Step 1: Write failing reducer tests for the new state model**

  Add tests covering:

  ```ts
  test("loads directions with exact retry context", () => {
    const state = flowReducer(initialFlowState, {
      type: "routeSelected",
      route,
      source: "manual",
      requestId: "directions-1",
    });

    expect(state.screen).toBe("loadingDirectionChoices");
    expect(state.pendingRequests.directions).toBe("directions-1");
    expect(state.selectedRoute?.routeVersionId).toBe("version-a");
  });

  test("stops live mode after direction selection without starting geometry", () => {
    const state = flowReducer(directionChoiceState, {
      type: "directionSelectionStopped",
      direction,
    });
    expect(state.screen).toBe("liveDirectionSelectedUnsupported");
    expect(state.selectedDirection?.routeDirectionId).toBe("direction-a");
    expect(state.pendingRequests.geometry).toBeUndefined();
  });

  test("clears selection and marks refreshed candidates after a stale version", () => {
    const state = flowReducer(directionLoadingState, {
      type: "routeVersionStaleDetected",
    });
    expect(state.selectedRoute).toBeUndefined();
    expect(state.selectedDirection).toBeUndefined();
    expect(state.routeRefreshNotice).toBe("routeVersionStale");
  });
  ```

  Also assert:

  - `manualSearchRequested` clears prior candidates;
  - `manualSearchCleared` clears query, results, pending request, and error;
  - stale `directionsSucceeded` and `operationFailed` events do not mutate
    newer state;
  - an empty directions response still reaches `routeWithoutDirections`;
  - a direction retry target contains both `routeId` and `routeVersionId`.

- [ ] **Step 2: Run reducer tests and verify RED**

  Run:

  ```bash
  npm test -- tests/domain/flow.test.ts
  ```

  Expected: FAIL because the new states, events, notice, and retry context do
  not exist.

- [ ] **Step 3: Extend domain types**

  Make these exact model changes in `src/domain/types.ts`:

  ```ts
  export type ScreenStateName =
    | "locationRequest"
    // existing states
    | "loadingDirectionChoices"
    | "directionChoice"
    | "liveDirectionSelectedUnsupported";

  export type FlowError = {
    kind:
      | "api"
      | "timeout"
      | "permission"
      | "notFound"
      | "unknown"
      | "routeVersionStale";
    message: string;
    retryTarget?: RetryTarget;
  };

  export type RetryTarget =
    // existing variants
    {
      kind: "directions";
      routeId: string;
      routeVersionId: string;
    };

  export type RouteRefreshNotice = "routeVersionStale";
  ```

  Add `routeRefreshNotice?: RouteRefreshNotice` to `FlowState`. Remove
  `liveRouteSelectedUnsupported` from `ScreenStateName`.

- [ ] **Step 4: Add explicit reducer events and transitions**

  In `src/domain/flow.ts`:

  - remove `routeSelectionStopped`;
  - add `{ type: "manualSearchCleared" }`;
  - add `{ type: "directionSelectionStopped"; direction: DirectionChoice }`;
  - add `{ type: "routeVersionStaleDetected" }`;
  - make `routeSelected` enter `loadingDirectionChoices`;
  - make `manualSearchRequested` set `manualCandidates: []`;
  - make `manualSearchCleared` return to an idle `manualRouteSearch` state;
  - make `manualSearchCleared` idempotent by returning the current state when
    query, candidates, pending request, and error are already empty;
  - make `directionSelectionStopped` retain route/direction and clear all
    pending requests without setting Geometry;
  - make stale recovery clear selected route, selected direction, direction
    choices, geometry, advice, and pending requests while preserving
    `manualQuery`, candidate source context, and latest location;
  - preserve `routeRefreshNotice` through the next candidate success, then
    clear it only after the Rider selects a new route.

- [ ] **Step 5: Run reducer tests and verify GREEN**

  Run:

  ```bash
  npm test -- tests/domain/flow.test.ts
  ```

  Expected: all reducer tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/domain/types.ts src/domain/flow.ts tests/domain/flow.test.ts
  git commit -m "feat(flow): model live direction selection"
  ```

## Task 4: Orchestrate Cancellation, Directions, And Stale Recovery

**Files:**

- Modify: `src/hooks/useOnboardingFlow.ts`
- Modify: `tests/home-screen.test.tsx`

- [ ] **Step 1: Write failing hook-through-screen tests**

  Add focused tests using deferred promises and injected `RiderFlowClient`
  spies to prove:

  - manual search remains 180 ms debounced and passes `limit: 8`;
  - changing the query aborts the first signal;
  - clearing the query aborts and clears visible results without a new call;
  - selecting a route calls `listRouteDirections` with its exact
    `routeVersionId`;
  - selecting a second route aborts the first directions signal;
  - rejecting with an aborted API error does not render "Algo deu errado";
  - a stale response resolving after a new request cannot replace current
    results;
  - a generic directions retry repeats the exact route/version pair;
  - stale manual recovery reruns the previous query and requires reselection;
  - stale nearby recovery reruns nearby with `latestLocation` and requires
    reselection.

  Use a complete injected client shape:

  ```ts
  const riderFlowClient: RiderFlowClient = {
    listNearbyRouteCandidates: vi.fn(),
    searchRouteCandidates: vi.fn(),
    listRouteDirections: vi.fn(),
  };
  ```

- [ ] **Step 2: Run the focused screen tests and verify RED**

  Run:

  ```bash
  npm test -- tests/home-screen.test.tsx
  ```

  Expected: FAIL because the hook still calls `api.getRouteDirections`, does
  not cancel requests, and stops before directions in live mode.

- [ ] **Step 3: Add request controllers and silent abort handling**

  In `useOnboardingFlow`, add:

  ```ts
  const manualSearchAbortRef = useRef<AbortController | undefined>(undefined);
  const directionsAbortRef = useRef<AbortController | undefined>(undefined);
  ```

  In the manual search effect, create a controller after the 180 ms debounce,
  pass `{ signal: controller.signal }`, and abort it from effect cleanup. If the
  trimmed query is empty, dispatch `manualSearchCleared` and do not call the
  client. In catches, return immediately when `isAbortedApiError(error)`.

  Add an unmount cleanup effect that aborts both current controllers.

- [ ] **Step 4: Replace direct mock Direction Choice calls**

  In `selectRoute`:

  ```ts
  const requestId = nextRequestId("directions");
  directionsAbortRef.current?.abort();
  const controller = new AbortController();
  directionsAbortRef.current = controller;
  dispatch({ type: "routeSelected", route, source, requestId });

  try {
    const directions = await routeCandidateClient.listRouteDirections(
      { routeId: route.routeId, routeVersionId: route.routeVersionId },
      { signal: controller.signal }
    );
    dispatch({ type: "directionsSucceeded", requestId, directions });
  } catch (error) {
    if (isAbortedApiError(error)) return;
    // typed stale recovery in the next step; generic failure otherwise
  }
  ```

  Rename the local client variable to `riderFlowClient` because it now owns
  more than Route Candidates.

- [ ] **Step 5: Implement source-aware stale-version recovery**

  Extract `requestNearbyCandidates({ lat, lng })` from `requestLocation` so a
  stale nearby recovery can reuse `state.latestLocation` without triggering a
  new permission prompt. Add a `recoverFromStaleRouteVersion` callback that:

  1. captures `selectedRoute.source`, `manualQuery`, and `latestLocation`;
  2. dispatches `routeVersionStaleDetected`;
  3. for manual source, restores the draft and enables the existing debounced
     search effect;
  4. for nearby source with a location, calls `requestNearbyCandidates`;
  5. falls back to `requestLocation` only when no usable location exists.

  Generic direction failures call `failOperation` with:

  ```ts
  {
    kind: "directions",
    routeId: route.routeId,
    routeVersionId: route.routeVersionId,
  }
  ```

  Update retry to find the preserved route and call `selectRoute` only when
  both route and route version match the retry target.

- [ ] **Step 6: Add the issue #4 direction-selection stop option**

  Replace `stopAfterRouteSelection` with `stopAfterDirectionSelection` in
  `UseOnboardingFlowOptions`. In `selectDirection`, dispatch
  `directionSelectionStopped` and return before Geometry only when that option
  is true. Leave prototype Geometry behavior unchanged when it is false.

- [ ] **Step 7: Run focused tests and verify GREEN**

  Run:

  ```bash
  npm test -- tests/home-screen.test.tsx tests/domain/flow.test.ts
  ```

  Expected: all flow and screen orchestration tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add src/hooks/useOnboardingFlow.ts tests/home-screen.test.tsx
  git commit -m "feat(flow): load live direction choices"
  ```

## Task 5: Render The Issue 4 Live States

**Files:**

- Modify: `src/app/HomePageApp.tsx`
- Modify: `src/app/LiveProductHomePage.tsx`
- Modify: `src/screens/OnboardingFlowScreen.tsx`
- Modify: `src/screens/OnboardingFlowScreen.module.css`
- Modify: `tests/home-screen.test.tsx`

- [ ] **Step 1: Write failing end-to-end screen assertions**

  Add screen tests proving:

  - live manual and nearby Route Candidates display no selectable direction
    IDs before selection;
  - route selection shows "Carregando sentidos desta linha..." and the route
    summary;
  - Direction Choices render in service order;
  - an empty array renders "Não é possível confirmar o sentido";
  - stale recovery shows the agreed inline notice on refreshed candidates;
  - direction selection shows route and direction summaries with "Trocar
    sentido" and "Trocar linha";
  - the temporary "Linha carregada ao vivo" state is absent;
  - `/prototype` still reaches its existing fixture-backed Route Confirmation.

- [ ] **Step 2: Run focused UI tests and verify RED**

  Run:

  ```bash
  npm test -- tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
  ```

  Expected: FAIL because the temporary issue #3 stop and copy still render.

- [ ] **Step 3: Wire the new live boundary option**

  In `HomePageAppProps`, remove `stopAfterRouteSelection` and add
  `stopAfterDirectionSelection?: boolean`. In `LiveProductHomePage`, render:

  ```tsx
  <HomePageApp
    locationProvider={locationProvider}
    riderFlowClient={riderFlowClient}
    stopAfterDirectionSelection
  />
  ```

- [ ] **Step 4: Render dedicated loading, recovery, and boundary states**

  Replace `liveRouteSelectedUnsupported` rendering with:

  ```tsx
  case "loadingDirectionChoices":
    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <p className={styles.progress}>2 de 4</p>
        <h1 id="screen-title" className={styles.titleCompact}>
          Carregando sentidos desta linha...
        </h1>
        <RouteSummary label="Linha escolhida" routeLabel={selectedRouteLabel} />
      </section>
    );
    break;

  case "liveDirectionSelectedUnsupported":
    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <h1 id="screen-title" className={styles.titleCompact}>
          Sentido escolhido
        </h1>
        <p className={styles.body}>
          Confira a linha e o sentido antes da próxima etapa.
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

  Show `Buscando linhas...` while `requestStatus === "loading"` on Manual
  Route Search. Render the stale notice above both manual and nearby candidate
  lists when `routeRefreshNotice === "routeVersionStale"`:

  ```tsx
  <p className={styles.notice} role="status">
    As opções desta linha foram atualizadas. Escolha a linha e o sentido
    novamente.
  </p>
  ```

  Add only the minimal `.notice` styling needed for readable contrast and
  spacing; reuse existing color tokens and do not introduce a new visual
  system.

- [ ] **Step 5: Run UI and prototype tests and verify GREEN**

  Run:

  ```bash
  npm test -- tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
  ```

  Expected: all live and prototype screen tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/HomePageApp.tsx src/app/LiveProductHomePage.tsx src/screens/OnboardingFlowScreen.tsx src/screens/OnboardingFlowScreen.module.css tests/home-screen.test.tsx
  git commit -m "feat(ui): complete live direction choice"
  ```

## Task 6: Document QA And Run Completion Gates

**Files:**

- Modify: `docs/qa/05-api-integration.md`

- [ ] **Step 1: Add the Issue #4 QA section**

  Add a section after Issue #3 recording:

  ```md
  ## Issue #4 Manual Search And Direction Choice

  Expected issue #4 behavior:

  - Manual Route Search remains debounced and preserves service relevance order.
  - Clearing or replacing a query cancels obsolete requests and stale results.
  - Nearby and manual Route Candidates remain route-only.
  - Selecting either candidate source loads Direction Choices through the shared rider-flow client.
  - Direction requests include the selected `routeVersionId` and preserve service order.
  - Empty Direction Choices render Route Without Directions.
  - `routeVersionStale` refreshes candidates and requires explicit route/direction reselection.
  - Generic Direction Choice failures retry the exact route/version request.
  - Live direction selection stops before Geometry, which remains issue #5.
  - `/prototype` keeps fixture-backed Direction Choice and downstream states.
  ```

  Record whether local-service smoke passed. If backend or CORS is unavailable,
  name that blocker without adding backend code to this repository.

- [ ] **Step 2: Run formatting and inspect the diff**

  Run:

  ```bash
  npm run format
  git diff --check
  git diff --stat
  ```

  Expected: Prettier completes, `git diff --check` prints nothing, and the stat
  contains only issue #4 frontend/tests/docs files.

- [ ] **Step 3: Run the full completion gate**

  Run:

  ```bash
  npm run format:check
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  ```

  Expected: every command exits 0.

- [ ] **Step 4: Attempt local browser smoke when the service is available**

  Run:

  ```bash
  NEXT_PUBLIC_API_URL=http://localhost:8000/v1 npm run dev
  ```

  Verify manual and nearby selection, version-pinned Direction Choices, empty
  directions when test data permits, and the post-direction boundary. Stop the
  dev server after recording results. If the service or CORS is unavailable,
  record the exact blocker in `docs/qa/05-api-integration.md`.

- [ ] **Step 5: Commit QA evidence**

  ```bash
  git add docs/qa/05-api-integration.md
  git commit -m "docs(qa): record issue 4 direction checks"
  ```

## Final Scope Check

Before handoff, confirm:

- `rg "stopAfterRouteSelection|liveRouteSelectedUnsupported" src tests`
  returns no matches.
- No Geometry transport or Advice transport was added in this issue.
- No backend, scraper, route-data processing, or database behavior was added.
- Route Candidates remain route-only and Direction Choices only load after
  explicit candidate selection.
- Manual and Direction Choice order matches service response order.
- Every direction request and retry carries the selected `routeVersionId`.
- Stale recovery clears route and direction selection before refreshing.
- Abort errors never render Rider-facing API failures.
