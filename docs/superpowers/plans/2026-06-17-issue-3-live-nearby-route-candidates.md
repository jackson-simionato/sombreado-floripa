# Issue 3 Live Nearby Route Candidates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move live nearby and manual Route Candidate discovery into the reducer-driven Onboard Flow while keeping `/prototype` fixture-driven and stopping before Direction Choice.

**Architecture:** Keep `src/api/routeCandidates.ts` as the Zod transport client, then add a rider-flow client adapter that returns domain `RouteCandidate` values in service order. Refactor `useOnboardingFlow` so route-candidate lookup and location lookup are injected dependencies; `/` passes live browser dependencies and stops after route selection, while `/prototype` keeps the existing mock dependencies and continues through the full mocked flow.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript, Zod, Vitest, Testing Library, browser `fetch`, browser `navigator.geolocation`.

---

## File Structure

- Modify `src/api/routeCandidates.ts`: add optional `AbortSignal` support to both live route-candidate methods.
- Create `src/api/riderFlowClient.ts`: domain-facing rider-flow client interface plus live and mock route-candidate implementations.
- Create `src/location/locationProvider.ts`: shared location provider interface, browser implementation, and mock adapter.
- Modify `src/hooks/useOnboardingFlow.ts`: inject rider-flow client and location provider; add `stopAfterRouteSelection` for issue #3 live mode.
- Modify `src/domain/types.ts`: add a screen state for the live route-selected stop.
- Modify `src/domain/flow.ts`: add a route-selected stop event that preserves the selected route without loading directions.
- Modify `src/screens/OnboardingFlowScreen.tsx`: render the compact live stop state.
- Create `src/app/ApiConfigurationMissingScreen.tsx`: reusable missing `NEXT_PUBLIC_API_URL` screen.
- Create `src/app/LiveProductHomePage.tsx`: client component that creates live dependencies and renders `HomePageApp`.
- Modify `src/app/HomePageApp.tsx`: pass dependency props into `useOnboardingFlow`.
- Modify `app/page.tsx`: render `LiveProductHomePage`.
- Delete `src/app/LiveHomePage.tsx`: remove the temporary issue #2 local state machine from the product path.
- Modify `tests/api/routeCandidates.test.ts`: prove `AbortSignal` is forwarded.
- Create `tests/api/riderFlowClient.test.ts`: prove live domain mapping preserves order and normalizes live errors.
- Modify `tests/domain/flow.test.ts`: prove route-selected stop and stale request behavior.
- Modify `tests/home-screen.test.tsx`: prove `/` uses reducer-driven live flow, `/prototype` remains mocked, and live selection stops before Direction Choice.

## Task 1: Add Route-Candidate Client Signal Support

**Files:**

- Modify: `src/api/routeCandidates.ts`
- Modify: `tests/api/routeCandidates.test.ts`

- [ ] **Step 1: Write failing signal forwarding tests**

  Add this test to `tests/api/routeCandidates.test.ts`:

  ```ts
  test("forwards abort signals to nearby and manual fetches", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ routes: [] }));
    const nearbyController = new AbortController();
    const manualController = new AbortController();
    const client = createRouteCandidatesClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await client.listNearbyRouteCandidates(
      { lat: -27.5969, lng: -48.5488, radiusMeters: 1200, limit: 5 },
      { signal: nearbyController.signal }
    );
    await client.searchRouteCandidates(
      { query: "TICEN", limit: 8 },
      { signal: manualController.signal }
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/v1/route-candidates/nearby?lat=-27.5969&lng=-48.5488&radiusMeters=1200&limit=5",
      { credentials: "omit", method: "GET", signal: nearbyController.signal }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8000/v1/route-candidates/search?query=TICEN&limit=8",
      { credentials: "omit", method: "GET", signal: manualController.signal }
    );
  });
  ```

- [ ] **Step 2: Run the focused API test and verify RED**

  Run:

  ```bash
  npm test -- tests/api/routeCandidates.test.ts
  ```

  Expected: TypeScript or test failure because `listNearbyRouteCandidates` and `searchRouteCandidates` do not accept a second options argument.

- [ ] **Step 3: Implement signal support**

  Update `src/api/routeCandidates.ts` with:

  ```ts
  export type RouteCandidateRequestOptions = {
    signal?: AbortSignal;
  };

  export type RouteCandidatesClient = {
    listNearbyRouteCandidates(
      input: {
        lat: number;
        lng: number;
        radiusMeters: number;
        limit: number;
      },
      options?: RouteCandidateRequestOptions
    ): Promise<RouteCandidatesResponseTransport>;
    searchRouteCandidates(
      input: {
        query: string;
        limit: number;
      },
      options?: RouteCandidateRequestOptions
    ): Promise<RouteCandidatesResponseTransport>;
  };
  ```

  Pass `options` into `requestRouteCandidates`, and call fetch with:

  ```ts
  response = await fetchImpl(url, {
    method: "GET",
    credentials: "omit",
    ...(options?.signal === undefined ? {} : { signal: options.signal }),
  });
  ```

- [ ] **Step 4: Run the focused API test and verify GREEN**

  Run:

  ```bash
  npm test -- tests/api/routeCandidates.test.ts
  ```

  Expected: all route-candidate API tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/api/routeCandidates.ts tests/api/routeCandidates.test.ts
  git commit -m "feat(api): support abort signals for route candidates"
  ```

## Task 2: Add Rider-Flow Client And Location Provider Boundaries

**Files:**

- Create: `src/api/riderFlowClient.ts`
- Create: `src/location/locationProvider.ts`
- Create: `tests/api/riderFlowClient.test.ts`
- Modify: `src/domain/flow.ts`

- [ ] **Step 1: Write failing rider-flow client tests**

  Create `tests/api/riderFlowClient.test.ts`:

  ```ts
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
  ```

- [ ] **Step 2: Run the rider-flow client tests and verify RED**

  Run:

  ```bash
  npm test -- tests/api/riderFlowClient.test.ts
  ```

  Expected: fail because `src/api/riderFlowClient.ts` does not exist.

- [ ] **Step 3: Implement `src/api/riderFlowClient.ts`**

  Create:

  ```ts
  import { toRouteCandidates } from "../domain/adapters";
  import type { FlowError, RouteCandidate } from "../domain/types";
  import type { MockApi } from "../mocks/mockApi";
  import { LiveApiError, createRouteCandidatesClient } from "./routeCandidates";
  import type {
    RouteCandidatesClient,
    RouteCandidatesResponseTransport,
    RouteCandidateTransport,
    RouteCandidateRequestOptions,
  } from "./routeCandidates";

  export type NearbyRouteCandidateInput = {
    lat: number;
    lng: number;
    radiusMeters: number;
    limit: number;
  };

  export type ManualRouteCandidateInput = {
    query: string;
    limit: number;
  };

  export type RiderFlowClient = {
    listNearbyRouteCandidates(
      input: NearbyRouteCandidateInput,
      options?: RouteCandidateRequestOptions
    ): Promise<RouteCandidate[]>;
    searchRouteCandidates(
      input: ManualRouteCandidateInput,
      options?: RouteCandidateRequestOptions
    ): Promise<RouteCandidate[]>;
  };

  export class LiveRouteCandidateClientError extends Error {
    readonly flowError: FlowError;

    constructor(flowError: FlowError) {
      super(flowError.message);
      this.name = "LiveRouteCandidateClientError";
      this.flowError = flowError;
    }
  }

  export function createLiveRiderFlowClient({
    baseUrl,
    fetchImpl,
  }: {
    baseUrl: string;
    fetchImpl?: typeof fetch;
  }): RiderFlowClient {
    return createRiderFlowClientFromRouteCandidatesClient(
      createRouteCandidatesClient({ baseUrl, fetchImpl })
    );
  }

  export function createMockRiderFlowClient(api: MockApi): RiderFlowClient {
    return {
      async listNearbyRouteCandidates(input) {
        const response = await api.listRoutes(input);
        return toRouteCandidates(response, { source: "nearby" });
      },
      async searchRouteCandidates(input) {
        const response = await api.listRoutes(input);
        return toRouteCandidates(response, { source: "manual" });
      },
    };
  }

  function createRiderFlowClientFromRouteCandidatesClient(
    client: RouteCandidatesClient
  ): RiderFlowClient {
    return {
      async listNearbyRouteCandidates(input, options) {
        try {
          return toLiveRouteCandidates(
            await client.listNearbyRouteCandidates(input, options)
          );
        } catch (error) {
          throw normalizeLiveRouteCandidateError(error);
        }
      },
      async searchRouteCandidates(input, options) {
        try {
          return toLiveRouteCandidates(
            await client.searchRouteCandidates(input, options)
          );
        } catch (error) {
          throw normalizeLiveRouteCandidateError(error);
        }
      },
    };
  }

  function toLiveRouteCandidates(
    response: RouteCandidatesResponseTransport
  ): RouteCandidate[] {
    return response.routes.map(toLiveRouteCandidate);
  }

  function toLiveRouteCandidate(
    route: RouteCandidateTransport
  ): RouteCandidate {
    return {
      routeId: route.routeId,
      routeVersionId: route.routeVersionId,
      code: route.routeCode,
      name: route.routeName,
      ...(route.distanceMeters === undefined
        ? {}
        : { distanceMeters: route.distanceMeters }),
      directionHints: [...(route.directionHints ?? [])],
    };
  }

  function normalizeLiveRouteCandidateError(error: unknown): Error {
    if (error instanceof LiveApiError) {
      return new LiveRouteCandidateClientError({
        kind: "api",
        message: "Não consegui carregar as linhas agora.",
      });
    }

    return error instanceof Error
      ? error
      : new LiveRouteCandidateClientError({
          kind: "unknown",
          message: "Não consegui carregar as linhas agora.",
        });
  }
  ```

- [ ] **Step 4: Implement `src/location/locationProvider.ts`**

  Create:

  ```ts
  import type { MockLocationResult } from "../domain/types";

  export type LocationProvider = {
    getCurrentLocation(): Promise<MockLocationResult>;
  };

  export function createBrowserLocationProvider(): LocationProvider {
    return {
      async getCurrentLocation() {
        return new Promise((resolve) => {
          if (navigator.geolocation === undefined) {
            resolve({ kind: "unavailable" });
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                kind: "granted",
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }),
            (error) => {
              if (error.code === error.PERMISSION_DENIED) {
                resolve({ kind: "denied" });
                return;
              }
              if (error.code === error.TIMEOUT) {
                resolve({ kind: "timeout" });
                return;
              }
              resolve({ kind: "unavailable" });
            },
            {
              enableHighAccuracy: true,
              maximumAge: 30_000,
              timeout: 10_000,
            }
          );
        });
      },
    };
  }
  ```

- [ ] **Step 5: Run the rider-flow client tests and verify GREEN**

  Run:

  ```bash
  npm test -- tests/api/riderFlowClient.test.ts
  ```

  Expected: all rider-flow client tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/api/riderFlowClient.ts src/location/locationProvider.ts tests/api/riderFlowClient.test.ts
  git commit -m "feat(flow): add rider route candidate client"
  ```

## Task 3: Refactor The Onboard Flow To Use Injected Live Dependencies

**Files:**

- Modify: `src/hooks/useOnboardingFlow.ts`
- Modify: `src/domain/types.ts`
- Modify: `src/domain/flow.ts`
- Modify: `src/screens/OnboardingFlowScreen.tsx`
- Modify: `src/app/HomePageApp.tsx`
- Create: `src/app/ApiConfigurationMissingScreen.tsx`
- Create: `src/app/LiveProductHomePage.tsx`
- Modify: `app/page.tsx`
- Delete: `src/app/LiveHomePage.tsx`
- Modify: `tests/domain/flow.test.ts`
- Modify: `tests/home-screen.test.tsx`

- [ ] **Step 1: Write failing reducer tests**

  Add to `tests/domain/flow.test.ts`:

  ```ts
  test("stops live route selection before direction choice", () => {
    const route = {
      routeId: "route-124",
      routeVersionId: "version-124",
      code: "124",
      name: "TICEN - Lagoa",
      directionHints: ["TICEN", "Lagoa"],
    };
    const state = flowReducer(initialFlowState, {
      type: "routeSelectionStopped",
      route,
      source: "nearby",
    });

    expect(state.screen).toBe("liveRouteSelectedUnsupported");
    expect(state.requestStatus).toBe("success");
    expect(state.selectedRoute).toMatchObject({
      routeId: "route-124",
      routeVersionId: "version-124",
      source: "nearby",
    });
    expect(state.pendingRequests).toEqual({});
  });
  ```

- [ ] **Step 2: Write failing screen tests**

  Update `tests/home-screen.test.tsx` so the live manual and nearby tests expect the existing Onboard Flow route-card screen before the unsupported stop:

  ```ts
  expect(
    await screen.findByRole("heading", { name: "Escolha sua linha" })
  ).toBeInTheDocument();
  expect(screen.getByText("1 de 4")).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Escolha o sentido" })
  ).not.toBeInTheDocument();
  ```

  Keep the final post-selection assertion:

  ```ts
  expect(
    await screen.findByRole("heading", { name: "Linha carregada ao vivo" })
  ).toBeInTheDocument();
  ```

  Add an order assertion to the nearby live test using a response intentionally not sorted by `distanceMeters`:

  ```ts
  const routeButtons = await screen.findAllByRole("button", {
    name: /Selecionar linha/i,
  });
  expect(routeButtons.map((button) => button.textContent)).toEqual([
    "330 TILAG - Centro900 m de você",
    "124 TICEN - Lagoa100 m de você",
  ]);
  ```

- [ ] **Step 3: Run focused tests and verify RED**

  Run:

  ```bash
  npm test -- tests/domain/flow.test.ts tests/home-screen.test.tsx
  ```

  Expected: fail because the new stop event and live reducer wiring do not exist.

- [ ] **Step 4: Add the route-selected stop state**

  In `src/domain/types.ts`, add `liveRouteSelectedUnsupported` to `ScreenStateName`.

  In `src/domain/flow.ts`, add this event:

  ```ts
  | {
      type: "routeSelectionStopped";
      route: RouteCandidate;
      source: RouteSelectionSource;
    }
  ```

  Add this reducer case before `routeSelected`:

  ```ts
  case "routeSelectionStopped":
    return clearAdviceAndGeometry(
      clearError({
        ...state,
        screen: "liveRouteSelectedUnsupported",
        requestStatus: "success",
        selectedRoute: toSelectedRoute(event.route, event.source),
        selectedDirection: undefined,
        directionChoices: [],
        pendingRequests: {},
      })
    );
  ```

- [ ] **Step 5: Render the stop state**

  Add this case to `src/screens/OnboardingFlowScreen.tsx`:

  ```tsx
  case "liveRouteSelectedUnsupported":
    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <h1 id="screen-title" className={styles.titleCompact}>
          Linha carregada ao vivo
        </h1>
        <p className={styles.body}>
          Ainda não é possível continuar com dados ao vivo neste ambiente. A
          próxima etapa vai conectar sentido, confirmação e conselho.
        </p>
        <RouteSummary label="Linha" routeLabel={selectedRouteLabel} />
      </section>
    );
    stickyPrimary = (
      <Button onClick={actions.changeRoute}>Voltar para linhas</Button>
    );
    stickySecondary = (
      <Button onClick={actions.openManualSearch} variant="secondary">
        Procurar outra linha
      </Button>
    );
    break;
  ```

- [ ] **Step 6: Inject route-candidate and location dependencies**

  Update `src/hooks/useOnboardingFlow.ts` options:

  ```ts
  import type { RiderFlowClient } from "../api/riderFlowClient";
  import { createMockRiderFlowClient } from "../api/riderFlowClient";
  import type { LocationProvider } from "../location/locationProvider";

  type UseOnboardingFlowOptions = {
    riderFlowClient?: RiderFlowClient;
    locationProvider?: LocationProvider;
    stopAfterRouteSelection?: boolean;
    mockScenarioId?: MockScenarioId;
    scenarioId?: MockScenarioId;
    prototypeScenarioId?: PrototypeScenarioId;
    locationResult?: MockLocationResult;
    mapAvailabilityOverride?: MapAvailability;
  };
  ```

  Keep the existing mock API for downstream prototype operations, but use the injected route-candidate client for nearby/manual:

  ```ts
  const routeCandidateClient = useMemo(
    () => options.riderFlowClient ?? createMockRiderFlowClient(api),
    [api, options.riderFlowClient]
  );

  const locationProvider = useMemo(
    () =>
      options.locationProvider ??
      createMockLocationProvider(
        options.locationResult ??
          seededScenario?.locationResult ??
          (scenarioId === "location-denied"
            ? { kind: "denied" }
            : { kind: "granted", lat: -27.5969, lng: -48.5488 })
      ),
    [
      options.locationProvider,
      options.locationResult,
      scenarioId,
      seededScenario?.locationResult,
    ]
  );
  ```

  Replace nearby calls with:

  ```ts
  const response = await routeCandidateClient.listNearbyRouteCandidates({
    lat: location.lat,
    lng: location.lng,
    radiusMeters: 1200,
    limit: 5,
  });
  dispatch({
    type: "nearbyRoutesSucceeded",
    requestId,
    candidates: response,
  });
  ```

  Replace manual calls with:

  ```ts
  const response = await routeCandidateClient.searchRouteCandidates({
    query,
    limit: 8,
  });
  dispatch({
    type: "manualSearchSucceeded",
    requestId,
    candidates: response,
  });
  ```

  Normalize live client errors in `failOperation`:

  ```ts
  const normalized =
    error instanceof MockApiError
      ? error.flowError
      : error instanceof LiveRouteCandidateClientError
        ? error.flowError
        : normalizeFlowError(error);
  ```

  In `selectRoute`, stop before directions when requested:

  ```ts
  if (options.stopAfterRouteSelection === true) {
    dispatch({ type: "routeSelectionStopped", route, source });
    return;
  }
  ```

- [ ] **Step 7: Wire `/` to live dependencies**

  Create `src/app/ApiConfigurationMissingScreen.tsx`:

  ```tsx
  import { AppShell } from "../components/AppShell";
  import styles from "../screens/OnboardingFlowScreen.module.css";

  export function ApiConfigurationMissingScreen() {
    return (
      <AppShell>
        <div className={styles.screen}>
          <section className={styles.stack} aria-labelledby="screen-title">
            <h1 id="screen-title" className={styles.titleCompact}>
              Configuração da API ausente
            </h1>
            <p className={styles.body}>
              O Sombreado Floripa precisa de NEXT_PUBLIC_API_URL para carregar
              dados ao vivo. Configure a URL pública do sombreado-service e
              recarregue a página.
            </p>
            <p className={styles.metaText}>
              As informações das linhas não estão disponíveis neste ambiente.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }
  ```

  Create `src/app/LiveProductHomePage.tsx`:

  ```tsx
  "use client";

  import { useMemo } from "react";

  import { createLiveRiderFlowClient } from "../api/riderFlowClient";
  import { createBrowserLocationProvider } from "../location/locationProvider";
  import { ApiConfigurationMissingScreen } from "./ApiConfigurationMissingScreen";
  import { HomePageApp } from "./HomePageApp";

  type LiveProductHomePageProps = {
    apiBaseUrl?: string;
  };

  export function LiveProductHomePage({
    apiBaseUrl,
  }: LiveProductHomePageProps) {
    const normalizedApiBaseUrl = apiBaseUrl?.trim();
    const riderFlowClient = useMemo(() => {
      if (
        normalizedApiBaseUrl === undefined ||
        normalizedApiBaseUrl.length === 0
      ) {
        return undefined;
      }

      return createLiveRiderFlowClient({ baseUrl: normalizedApiBaseUrl });
    }, [normalizedApiBaseUrl]);
    const locationProvider = useMemo(() => createBrowserLocationProvider(), []);

    if (riderFlowClient === undefined) {
      return <ApiConfigurationMissingScreen />;
    }

    return (
      <HomePageApp
        locationProvider={locationProvider}
        riderFlowClient={riderFlowClient}
        stopAfterRouteSelection
      />
    );
  }
  ```

  Modify `src/app/HomePageApp.tsx` props:

  ```ts
  import type { RiderFlowClient } from "../api/riderFlowClient";
  import type { LocationProvider } from "../location/locationProvider";

  export type HomePageAppProps = {
    locationProvider?: LocationProvider;
    riderFlowClient?: RiderFlowClient;
    stopAfterRouteSelection?: boolean;
    locationResult?: MockLocationResult;
    mapAvailabilityOverride?: MapAvailability;
    mockScenarioId?: MockScenarioId;
    prototypeScenarioId?: PrototypeScenarioId;
    scenarioId?: MockScenarioId;
  };
  ```

  Modify `app/page.tsx`:

  ```tsx
  import { LiveProductHomePage } from "../src/app/LiveProductHomePage";

  export default function HomePage() {
    return <LiveProductHomePage apiBaseUrl={process.env.NEXT_PUBLIC_API_URL} />;
  }
  ```

  Delete `src/app/LiveHomePage.tsx`.

- [ ] **Step 8: Run focused tests and verify GREEN**

  Run:

  ```bash
  npm test -- tests/api/riderFlowClient.test.ts tests/domain/flow.test.ts tests/home-screen.test.tsx
  ```

  Expected: all focused tests pass.

- [ ] **Step 9: Commit**

  ```bash
  git add app/page.tsx src/app/ApiConfigurationMissingScreen.tsx src/app/HomePageApp.tsx src/app/LiveProductHomePage.tsx src/hooks/useOnboardingFlow.ts src/domain/types.ts src/domain/flow.ts src/screens/OnboardingFlowScreen.tsx tests/domain/flow.test.ts tests/home-screen.test.tsx
  git add -u src/app/LiveHomePage.tsx
  git commit -m "feat(flow): use live candidates in onboard flow"
  ```

## Task 4: Full Verification And Issue Closeout

**Files:**

- All changed files.

- [ ] **Step 1: Run focused tests**

  ```bash
  npm test -- tests/api/routeCandidates.test.ts tests/api/riderFlowClient.test.ts tests/domain/flow.test.ts tests/home-screen.test.tsx
  ```

  Expected: all focused tests pass.

- [ ] **Step 2: Run the completion gate**

  ```bash
  npm run format:check
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  ```

  Expected: every command exits successfully.

- [ ] **Step 3: Confirm frontend-only boundary**

  ```bash
  rg "FastAPI|APIRouter|scraper|GTFS|CREATE TABLE|INSERT INTO" app src tests
  ```

  Expected: no backend implementation code in `app`, `src`, or `tests`.

- [ ] **Step 4: Commit any verification doc updates if implementation changed QA wording**

  If `docs/qa/05-api-integration.md` changed during implementation:

  ```bash
  git add docs/qa/05-api-integration.md
  git commit -m "docs: update issue 3 live smoke evidence"
  ```

  If the file did not change, skip this step.

- [ ] **Step 5: Close GitHub issue #3**

  Use this comment after verification:

  ```bash
  gh issue close 3 --repo jackson-simionato/sombreado-floripa --reason completed --comment $'Completed on feat/3-live-nearby-candidates.\n\nWhat landed:\n- `/` now uses the reducer-driven Onboard Flow for live nearby and manual Route Candidates.\n- `/prototype` remains fixture-driven with the scenario switcher.\n- Nearby lookup is Rider-triggered, uses `radiusMeters: 1200`, `limit: 5`, `credentials: "omit"`, and preserves Sombreado Service order.\n- Manual Route Search remains live and preserves service order.\n- Selecting a live Route Candidate stops before Direction Choice, which remains scoped to #4.\n- Malformed responses, public API errors, network failures, and stale reducer responses are covered by tests.\n\nVerification:\n- `npm run format:check`\n- `npm run lint`\n- `npm run typecheck`\n- `npm run test`\n- `npm run build`'
  ```

## Plan Self-Review

- Spec coverage: the plan covers reducer-driven `/`, preserved `/prototype`, live nearby/manual route candidates, service-order preservation, Zod validation, credentials omission, abort signal seam, minimal browser geolocation, controlled error states, stale reducer protection, and issue #4 Direction Choice deferral.
- Placeholder scan: no `TBD`, `TODO`, or unresolved implementation placeholders remain.
- Type consistency: `RiderFlowClient` returns domain `RouteCandidate[]`; `useOnboardingFlow` dispatches existing `nearbyRoutesSucceeded` and `manualSearchSucceeded` events with those domain candidates; live unsupported selection uses the new `routeSelectionStopped` event and `liveRouteSelectedUnsupported` screen.
