# Live API Transport Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Sombreado Floripa's main route use the live `sombreado-service` browser API for the existing one-shot route-to-advice flow, while preserving fixture-driven prototype scenarios at `/prototype`.

**Architecture:** Add a typed transport boundary with Zod schemas and a rider-flow API client, then inject that client into the existing reducer-driven flow. Keep the reducer and UI domain-oriented, adapt camelCase transport responses into domain state, and keep mocks as an explicit implementation of the same client interface. This is Plan 05a: it excludes `watchPosition()`, automatic background refresh, pause/resume live controls, and full freshness UI, which belong to Plan 05b.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zod, Vitest, Testing Library, browser `fetch`, browser `navigator.geolocation`, Python FastAPI backend preflight with Ruff and pytest.

---

## Scope

This plan starts from:

- `sombreado-floripa/docs/api-contract.md`
- `sombreado-floripa/docs/plans/05-api-integration.md`
- `sombreado-floripa/src/hooks/useOnboardingFlow.ts`
- `sombreado-floripa/src/domain/flow.ts`
- `sombreado-floripa/src/domain/adapters.ts`
- `sombreado-floripa/src/mocks/mockApi.ts`
- `sombreado-service/app/config.py`

This plan implements:

- backend local CORS preflight for `http://localhost:3000`
- `zod` as the API transport validation dependency
- camelCase transport schemas for the browser contract
- live API client using `NEXT_PUBLIC_API_URL`
- explicit mock client implementing the same interface
- `/` as live product runtime
- `/prototype` as fixture-driven scenario runtime
- one-shot geolocation for nearby route discovery and route confirmation
- recent fallback location with visible warning copy
- preview advice when no usable location exists
- stale route version recovery without silent reselection
- order preservation for nearby and manual route candidates

This plan does not implement:

- `navigator.geolocation.watchPosition()`
- automatic background advice refresh
- pause/resume live update controls
- full last-updated/freshness timestamp UI
- Mapbox integration
- backend route/advice computation changes beyond CORS defaults

## File Structure

- Modify `/home/jackson/sombreado/sombreado-service/app/config.py`: include `http://localhost:3000` in default CORS origins.
- Modify `/home/jackson/sombreado/sombreado-service/tests/test_config_logging.py`: assert local Next and existing local origin defaults.
- Modify `/home/jackson/sombreado/sombreado-floripa/package.json`: add `zod`.
- Modify `/home/jackson/sombreado/sombreado-floripa/package-lock.json`: lock `zod`.
- Create `/home/jackson/sombreado/sombreado-floripa/src/api/schemas.ts`: Zod schemas and inferred transport types for the browser contract.
- Create `/home/jackson/sombreado/sombreado-floripa/src/api/client.ts`: live API client, client interface, API error normalization, missing config check.
- Create `/home/jackson/sombreado/sombreado-floripa/src/location/browserLocation.ts`: one-shot browser geolocation provider and freshness thresholds.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/domain/types.ts`: replace old service-shaped transport types with advice, geometry, route candidate, and location freshness domain types.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/domain/adapters.ts`: adapt validated transport responses into domain state and use backend-provided `recommendedSeatArea`.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/domain/flow.ts`: preserve backend candidate order, track recent fallback location warnings, and add stale-version recovery events.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/mocks/fixtures.ts`: migrate mock payloads to the camelCase browser contract.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/mocks/mockApi.ts`: implement the shared rider-flow client interface.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/mocks/scenarioStates.ts`: update seeded states for new advice and geometry shapes.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/hooks/useOnboardingFlow.ts`: accept injected client/location providers, use live defaults, and build `AdviceRequest` by mode.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/app/HomePageApp.tsx`: accept client/provider injection and default to live runtime.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/app/PrototypeHomePage.tsx`: keep mock runtime for scenarios.
- Modify `/home/jackson/sombreado/sombreado-floripa/app/page.tsx`: render live runtime.
- Create `/home/jackson/sombreado/sombreado-floripa/app/prototype/page.tsx`: render prototype runtime.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/content/copy.ts`: add minimal Portuguese copy for missing config, stale route recovery, last-known location warning, malformed API response, and preview due to no usable location.
- Modify `/home/jackson/sombreado/sombreado-floripa/src/screens/OnboardingFlowScreen.tsx`: render new warning/recovery copy without adding full live update controls.
- Modify frontend tests under `/home/jackson/sombreado/sombreado-floripa/tests`: update adapter, flow, mock API, and screen tests; add API client and location provider tests.
- Modify `/home/jackson/sombreado/sombreado-floripa/docs/qa/05-api-integration.md`: record the 05a smoke checklist section and backend CORS preflight.

---

### Task 1: Backend Local CORS Preflight

**Files:**

- Modify: `/home/jackson/sombreado/sombreado-service/app/config.py`
- Modify: `/home/jackson/sombreado/sombreado-service/tests/test_config_logging.py`

- [ ] **Step 1: Write the failing backend CORS test**

In `/home/jackson/sombreado/sombreado-service/tests/test_config_logging.py`, extend the existing settings defaults test with these assertions:

```python
def test_settings_defaults():
    settings = Settings()

    assert "http://localhost:3000" in settings.cors_origins
    assert "http://localhost:5173" in settings.cors_origins
    assert settings.nearby_radius_meters == 100
    assert settings.nearby_limit == 10
    assert settings.route_candidate_nearby_radius_meters == 1200
    assert settings.route_candidate_nearby_limit == 5
    assert settings.route_candidate_search_limit == 8
```

- [ ] **Step 2: Run the backend CORS test to verify it fails**

Run from `/home/jackson/sombreado/sombreado-service`:

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run pytest tests/test_config_logging.py::test_settings_defaults -q
```

Expected: FAIL because `http://localhost:3000` is not in `settings.cors_origins`.

- [ ] **Step 3: Add the local Next origin**

In `/home/jackson/sombreado/sombreado-service/app/config.py`, change the default `cors_origins` line to:

```python
cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"])
```

- [ ] **Step 4: Run backend verification**

Run from `/home/jackson/sombreado/sombreado-service`:

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run ruff format --check .
UV_CACHE_DIR=/tmp/uv-cache uv run ruff check .
UV_CACHE_DIR=/tmp/uv-cache uv run pytest tests/test_config_logging.py tests/test_api.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit backend preflight**

Run from `/home/jackson/sombreado/sombreado-service`:

```bash
git add app/config.py tests/test_config_logging.py
git commit -m "fix(config): allow local Next frontend origin"
```

### Task 2: Add Zod and Transport Schemas

**Files:**

- Modify: `/home/jackson/sombreado/sombreado-floripa/package.json`
- Modify: `/home/jackson/sombreado/sombreado-floripa/package-lock.json`
- Create: `/home/jackson/sombreado/sombreado-floripa/src/api/schemas.ts`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/api/schemas.test.ts`

- [ ] **Step 1: Add Zod**

Run from `/home/jackson/sombreado/sombreado-floripa`:

```bash
npm install zod
```

Expected: `package.json` and `package-lock.json` include `zod`.

- [ ] **Step 2: Write schema tests first**

Create `/home/jackson/sombreado/sombreado-floripa/tests/api/schemas.test.ts`:

```ts
import { describe, expect, test } from "vitest";

import {
  adviceResponseSchema,
  apiErrorSchema,
  directionChoicesResponseSchema,
  routeCandidatesResponseSchema,
  routeGeometryResponseSchema,
} from "../../src/api/schemas";

describe("browser API transport schemas", () => {
  test("parses route candidates and preserves backend order", () => {
    const parsed = routeCandidatesResponseSchema.parse({
      routes: [
        {
          routeId: "route-b",
          routeVersionId: "version-b",
          routeCode: "330",
          routeName: "TILAG - Centro",
          directionHints: ["Centro"],
        },
        {
          routeId: "route-a",
          routeVersionId: "version-a",
          routeCode: "124",
          routeName: "TICEN - Lagoa",
          distanceMeters: 320,
          directionHints: ["TICEN", "Lagoa"],
        },
      ],
    });

    expect(parsed.routes.map((route) => route.routeId)).toEqual([
      "route-b",
      "route-a",
    ]);
  });

  test("parses direction choices", () => {
    expect(
      directionChoicesResponseSchema.parse({
        directions: [
          {
            routeDirectionId: "direction-1",
            sequence: 1,
            name: "TICEN para Lagoa",
            departureLabels: ["TICEN", "UFSC"],
          },
        ],
      }).directions[0]?.departureLabels
    ).toEqual(["TICEN", "UFSC"]);
  });

  test("parses frontend-ready route geometry", () => {
    expect(
      routeGeometryResponseSchema.parse({
        routeId: "route-1",
        routeVersionId: "version-1",
        routeDirectionId: "direction-1",
        polyline: [{ lat: -27.5969, lng: -48.5488 }],
      }).polyline
    ).toEqual([{ lat: -27.5969, lng: -48.5488 }]);
  });

  test("parses successful onboard advice with backend recommendation", () => {
    const parsed = adviceResponseSchema.parse({
      status: "advice",
      mode: "onboard",
      horizon: "upcoming",
      routeId: "route-1",
      routeVersionId: "version-1",
      routeDirectionId: "direction-1",
      directSunExposure: "right",
      recommendedSeatArea: "left",
      sunCondition: "daylight",
      computedAt: "2026-06-15T12:00:00.000Z",
      position: {
        lat: -27.5969,
        lng: -48.5488,
        source: "liveLocation",
        distanceFromRouteMeters: 8,
      },
    });

    expect(parsed.recommendedSeatArea).toBe("left");
  });

  test("parses withheld advice and API error envelopes", () => {
    expect(
      adviceResponseSchema.parse({
        status: "withheld",
        mode: "preview",
        horizon: "remainingRoute",
        routeId: "route-1",
        routeVersionId: "version-1",
        routeDirectionId: "direction-1",
        reasonCode: "missingRouteGeometry",
        computedAt: "2026-06-15T12:00:00.000Z",
      }).status
    ).toBe("withheld");

    expect(
      apiErrorSchema.parse({
        error: {
          code: "routeVersionStale",
          message: "Selected route version is no longer current.",
        },
      }).error.code
    ).toBe("routeVersionStale");
  });
});
```

- [ ] **Step 3: Run schema tests to verify they fail**

Run:

```bash
npm test -- tests/api/schemas.test.ts
```

Expected: FAIL because `src/api/schemas.ts` does not exist.

- [ ] **Step 4: Add transport schemas**

Create `/home/jackson/sombreado/sombreado-floripa/src/api/schemas.ts`:

```ts
import { z } from "zod";

export const routeCandidateSchema = z.object({
  routeId: z.string(),
  routeVersionId: z.string(),
  routeCode: z.string(),
  routeName: z.string(),
  distanceMeters: z.number().optional(),
  directionHints: z.array(z.string()).default([]),
});

export const routeCandidatesResponseSchema = z.object({
  routes: z.array(routeCandidateSchema),
});

export const directionChoiceSchema = z.object({
  routeDirectionId: z.string(),
  sequence: z.number(),
  name: z.string(),
  departureLabels: z.array(z.string()).default([]),
});

export const directionChoicesResponseSchema = z.object({
  directions: z.array(directionChoiceSchema),
});

export const latLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const routeGeometryResponseSchema = z.object({
  routeId: z.string(),
  routeVersionId: z.string(),
  routeDirectionId: z.string(),
  polyline: z.array(latLngSchema),
});

export const directSunExposureSchema = z.enum([
  "left",
  "right",
  "front",
  "back",
  "overhead",
  "none",
]);
export const recommendedSeatAreaSchema = z.enum([
  "left",
  "right",
  "front",
  "back",
  "neutral",
]);
export const sunConditionSchema = z.enum([
  "daylight",
  "night",
  "lowSun",
  "overhead",
]);
export const adviceModeSchema = z.enum(["onboard", "preview"]);
export const adviceHorizonSchema = z.enum(["upcoming", "remainingRoute"]);

export const adviceLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracyMeters: z.number().optional(),
  observedAt: z.string(),
});

export const adviceRequestSchema = z.object({
  routeId: z.string(),
  routeVersionId: z.string(),
  routeDirectionId: z.string(),
  mode: adviceModeSchema,
  horizon: adviceHorizonSchema,
  observedAt: z.string(),
  location: adviceLocationSchema.optional(),
  fallbackToPreview: z.boolean().optional(),
});

export const advicePositionSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  source: z.enum(["liveLocation", "directionStart"]),
  distanceFromRouteMeters: z.number().optional(),
});

export const adviceSuccessSchema = z.object({
  status: z.literal("advice"),
  mode: adviceModeSchema,
  horizon: adviceHorizonSchema,
  routeId: z.string(),
  routeVersionId: z.string(),
  routeDirectionId: z.string(),
  directSunExposure: directSunExposureSchema,
  recommendedSeatArea: recommendedSeatAreaSchema,
  sunCondition: sunConditionSchema,
  computedAt: z.string(),
  position: advicePositionSchema.optional(),
});

export const withheldReasonCodeSchema = z.enum([
  "missingRouteGeometry",
  "insufficientSunSignal",
  "unsupportedDirection",
  "noAdviceForSelectedHorizon",
  "locationOffRoute",
]);

export const adviceWithheldSchema = z.object({
  status: z.literal("withheld"),
  mode: z.enum(["onboard", "preview", "unavailable"]),
  horizon: adviceHorizonSchema.optional(),
  routeId: z.string(),
  routeVersionId: z.string(),
  routeDirectionId: z.string(),
  reasonCode: withheldReasonCodeSchema,
  computedAt: z.string(),
});

export const adviceResponseSchema = z.discriminatedUnion("status", [
  adviceSuccessSchema,
  adviceWithheldSchema,
]);

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    requestId: z.string().optional(),
  }),
});

export type RouteCandidateTransport = z.infer<typeof routeCandidateSchema>;
export type RouteCandidatesResponseTransport = z.infer<
  typeof routeCandidatesResponseSchema
>;
export type DirectionChoiceTransport = z.infer<typeof directionChoiceSchema>;
export type DirectionChoicesResponseTransport = z.infer<
  typeof directionChoicesResponseSchema
>;
export type RouteGeometryResponseTransport = z.infer<
  typeof routeGeometryResponseSchema
>;
export type AdviceRequestTransport = z.infer<typeof adviceRequestSchema>;
export type AdviceResponseTransport = z.infer<typeof adviceResponseSchema>;
export type ApiErrorTransport = z.infer<typeof apiErrorSchema>;
```

- [ ] **Step 5: Run schema tests**

Run:

```bash
npm test -- tests/api/schemas.test.ts
```

Expected: PASS.

### Task 3: Add Live API Client and Error Normalization

**Files:**

- Create: `/home/jackson/sombreado/sombreado-floripa/src/api/client.ts`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/api/client.test.ts`

- [ ] **Step 1: Write API client tests first**

Create `/home/jackson/sombreado/sombreado-floripa/tests/api/client.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  ApiClientError,
  createBrowserApiClient,
  requireApiBaseUrl,
} from "../../src/api/client";

describe("browser API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("fails clearly when API base URL is missing", () => {
    expect(() => requireApiBaseUrl(undefined)).toThrow(
      "NEXT_PUBLIC_API_URL is required for live API mode."
    );
    expect(() => requireApiBaseUrl("")).toThrow(
      "NEXT_PUBLIC_API_URL is required for live API mode."
    );
  });

  test("calls nearby route candidates with credentials omitted and preserves order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        routes: [
          {
            routeId: "route-b",
            routeVersionId: "version-b",
            routeCode: "330",
            routeName: "B",
            directionHints: [],
          },
          {
            routeId: "route-a",
            routeVersionId: "version-a",
            routeCode: "124",
            routeName: "A",
            distanceMeters: 10,
            directionHints: [],
          },
        ],
      })
    );
    const client = createBrowserApiClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    const response = await client.listNearbyRouteCandidates({
      lat: -27.6,
      lng: -48.5,
      radiusMeters: 1200,
      limit: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/route-candidates/nearby?lat=-27.6&lng=-48.5&radiusMeters=1200&limit=5",
      expect.objectContaining({ credentials: "omit", method: "GET" })
    );
    expect(response.routes.map((route) => route.routeId)).toEqual([
      "route-b",
      "route-a",
    ]);
  });

  test("normalizes public API error envelopes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "routeVersionStale",
            message: "Selected route version is no longer current.",
          },
        },
        { status: 409 }
      )
    );
    const client = createBrowserApiClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(
      client.listDirectionChoices({
        routeId: "route-a",
        routeVersionId: "old-version",
      })
    ).rejects.toMatchObject({
      code: "routeVersionStale",
      status: 409,
    });
  });

  test("normalizes malformed success responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ routes: [{ routeId: 42 }] }));
    const client = createBrowserApiClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    await expect(
      client.searchRouteCandidates({ query: "330", limit: 8 })
    ).rejects.toMatchObject({
      code: "invalidApiResponse",
    });
  });
});

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Run API client tests to verify they fail**

Run:

```bash
npm test -- tests/api/client.test.ts
```

Expected: FAIL because `src/api/client.ts` does not exist.

- [ ] **Step 3: Add the client interface and implementation**

Create `/home/jackson/sombreado/sombreado-floripa/src/api/client.ts`:

```ts
import { ZodError, type ZodSchema } from "zod";

import {
  adviceResponseSchema,
  apiErrorSchema,
  directionChoicesResponseSchema,
  routeCandidatesResponseSchema,
  routeGeometryResponseSchema,
  type AdviceRequestTransport,
  type AdviceResponseTransport,
  type DirectionChoicesResponseTransport,
  type RouteCandidatesResponseTransport,
  type RouteGeometryResponseTransport,
} from "./schemas";

export type RiderFlowApiClient = {
  listNearbyRouteCandidates(input: {
    lat: number;
    lng: number;
    radiusMeters: number;
    limit: number;
    signal?: AbortSignal;
  }): Promise<RouteCandidatesResponseTransport>;
  searchRouteCandidates(input: {
    query: string;
    limit: number;
    signal?: AbortSignal;
  }): Promise<RouteCandidatesResponseTransport>;
  listDirectionChoices(input: {
    routeId: string;
    routeVersionId: string;
    signal?: AbortSignal;
  }): Promise<DirectionChoicesResponseTransport>;
  getRouteGeometry(input: {
    routeId: string;
    routeVersionId: string;
    routeDirectionId: string;
    signal?: AbortSignal;
  }): Promise<RouteGeometryResponseTransport>;
  createAdvice(input: {
    request: AdviceRequestTransport;
    signal?: AbortSignal;
  }): Promise<AdviceResponseTransport>;
};

export class ApiClientError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly requestId?: string;

  constructor(input: {
    code: string;
    message: string;
    status?: number;
    requestId?: string;
  }) {
    super(input.message);
    this.name = "ApiClientError";
    this.code = input.code;
    this.status = input.status;
    this.requestId = input.requestId;
  }
}

export function requireApiBaseUrl(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new ApiClientError({
      code: "missingApiBaseUrl",
      message: "NEXT_PUBLIC_API_URL is required for live API mode.",
    });
  }
  return value.replace(/\/+$/, "");
}

export function createBrowserApiClient(input: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): RiderFlowApiClient {
  const baseUrl = requireApiBaseUrl(input.baseUrl);
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    listNearbyRouteCandidates(params) {
      const url = withQuery(`${baseUrl}/route-candidates/nearby`, {
        lat: String(params.lat),
        lng: String(params.lng),
        radiusMeters: String(params.radiusMeters),
        limit: String(params.limit),
      });
      return requestJson(fetchImpl, url, routeCandidatesResponseSchema, {
        method: "GET",
        signal: params.signal,
      });
    },

    searchRouteCandidates(params) {
      const url = withQuery(`${baseUrl}/route-candidates/search`, {
        query: params.query,
        limit: String(params.limit),
      });
      return requestJson(fetchImpl, url, routeCandidatesResponseSchema, {
        method: "GET",
        signal: params.signal,
      });
    },

    listDirectionChoices(params) {
      const url = withQuery(
        `${baseUrl}/routes/${encodeURIComponent(params.routeId)}/directions`,
        {
          routeVersionId: params.routeVersionId,
        }
      );
      return requestJson(fetchImpl, url, directionChoicesResponseSchema, {
        method: "GET",
        signal: params.signal,
      });
    },

    getRouteGeometry(params) {
      const url = withQuery(
        `${baseUrl}/routes/${encodeURIComponent(params.routeId)}/directions/${encodeURIComponent(params.routeDirectionId)}/geometry`,
        { routeVersionId: params.routeVersionId }
      );
      return requestJson(fetchImpl, url, routeGeometryResponseSchema, {
        method: "GET",
        signal: params.signal,
      });
    },

    createAdvice(params) {
      return requestJson(fetchImpl, `${baseUrl}/advice`, adviceResponseSchema, {
        method: "POST",
        signal: params.signal,
        body: JSON.stringify(params.request),
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}

async function requestJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  schema: ZodSchema<T>,
  init: RequestInit
): Promise<T> {
  const response = await fetchImpl(url, {
    ...init,
    credentials: "omit",
  });
  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    if (parsed.success) {
      throw new ApiClientError({
        code: parsed.data.error.code,
        message: parsed.data.error.message ?? "API request failed.",
        requestId: parsed.data.error.requestId,
        status: response.status,
      });
    }
    throw new ApiClientError({
      code: "invalidApiError",
      message: "API request failed with an invalid error response.",
      status: response.status,
    });
  }

  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiClientError({
        code: "invalidApiResponse",
        message: "API response did not match the browser contract.",
      });
    }
    throw error;
  }
}

function withQuery(url: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${url}?${query.toString()}`;
}
```

- [ ] **Step 4: Run API client tests**

Run:

```bash
npm test -- tests/api/client.test.ts tests/api/schemas.test.ts
```

Expected: PASS.

### Task 4: Add One-Shot Browser Location Provider

**Files:**

- Create: `/home/jackson/sombreado/sombreado-floripa/src/location/browserLocation.ts`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/location/browserLocation.test.ts`

- [ ] **Step 1: Write location provider tests first**

Create `/home/jackson/sombreado/sombreado-floripa/tests/location/browserLocation.test.ts`:

```ts
import { describe, expect, test } from "vitest";

import {
  classifyLocationFix,
  RECENT_FALLBACK_LOCATION_MAX_AGE_MS,
  FRESH_LOCATION_MAX_AGE_MS,
} from "../../src/location/browserLocation";

describe("browser location freshness", () => {
  test("classifies fresh, recent fallback, stale, and inaccurate fixes", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");

    expect(
      classifyLocationFix({
        fix: {
          kind: "granted",
          lat: -27.6,
          lng: -48.5,
          accuracyMeters: 50,
          observedAt: "2026-06-15T11:59:45.000Z",
        },
        now,
      })
    ).toBe("fresh");

    expect(
      classifyLocationFix({
        fix: {
          kind: "granted",
          lat: -27.6,
          lng: -48.5,
          accuracyMeters: 50,
          observedAt: "2026-06-15T11:58:30.000Z",
        },
        now,
      })
    ).toBe("recentFallback");

    expect(
      classifyLocationFix({
        fix: {
          kind: "granted",
          lat: -27.6,
          lng: -48.5,
          accuracyMeters: 50,
          observedAt: "2026-06-15T11:57:30.000Z",
        },
        now,
      })
    ).toBe("unusable");

    expect(
      classifyLocationFix({
        fix: {
          kind: "granted",
          lat: -27.6,
          lng: -48.5,
          accuracyMeters: 120,
          observedAt: "2026-06-15T11:59:45.000Z",
        },
        now,
      })
    ).toBe("unusable");

    expect(FRESH_LOCATION_MAX_AGE_MS).toBe(30_000);
    expect(RECENT_FALLBACK_LOCATION_MAX_AGE_MS).toBe(120_000);
  });
});
```

- [ ] **Step 2: Run location tests to verify they fail**

Run:

```bash
npm test -- tests/location/browserLocation.test.ts
```

Expected: FAIL because `src/location/browserLocation.ts` does not exist.

- [ ] **Step 3: Add location provider and freshness classifier**

Create `/home/jackson/sombreado/sombreado-floripa/src/location/browserLocation.ts`:

```ts
export const ACCEPTABLE_ACCURACY_METERS = 100;
export const FRESH_LOCATION_MAX_AGE_MS = 30_000;
export const RECENT_FALLBACK_LOCATION_MAX_AGE_MS = 120_000;

export type LocationFix =
  | {
      kind: "granted";
      lat: number;
      lng: number;
      accuracyMeters?: number;
      observedAt: string;
    }
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "timeout" };

export type LocationFreshness = "fresh" | "recentFallback" | "unusable";

export type LocationProvider = {
  getCurrentLocation(): Promise<LocationFix>;
};

export function createBrowserLocationProvider(): LocationProvider {
  return {
    getCurrentLocation() {
      if (!("geolocation" in navigator)) {
        return Promise.resolve({ kind: "unavailable" });
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              kind: "granted",
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
              observedAt: new Date(position.timestamp).toISOString(),
            });
          },
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
            maximumAge: 0,
            timeout: 10_000,
          }
        );
      });
    },
  };
}

export function classifyLocationFix(input: {
  fix: LocationFix;
  now?: Date;
}): LocationFreshness {
  if (input.fix.kind !== "granted") {
    return "unusable";
  }
  if (
    input.fix.accuracyMeters !== undefined &&
    input.fix.accuracyMeters > ACCEPTABLE_ACCURACY_METERS
  ) {
    return "unusable";
  }

  const observedAtMs = Date.parse(input.fix.observedAt);
  if (Number.isNaN(observedAtMs)) {
    return "unusable";
  }

  const ageMs = (input.now ?? new Date()).getTime() - observedAtMs;
  if (ageMs < 0) {
    return "fresh";
  }
  if (ageMs <= FRESH_LOCATION_MAX_AGE_MS) {
    return "fresh";
  }
  if (ageMs <= RECENT_FALLBACK_LOCATION_MAX_AGE_MS) {
    return "recentFallback";
  }
  return "unusable";
}
```

- [ ] **Step 4: Run location tests**

Run:

```bash
npm test -- tests/location/browserLocation.test.ts
```

Expected: PASS.

### Task 5: Migrate Domain Types and Adapters to Browser Contract

**Files:**

- Modify: `/home/jackson/sombreado/sombreado-floripa/src/domain/types.ts`
- Modify: `/home/jackson/sombreado/sombreado-floripa/src/domain/adapters.ts`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/domain/adapters.test.ts`

- [ ] **Step 1: Rewrite adapter tests for camelCase transport**

In `/home/jackson/sombreado/sombreado-floripa/tests/domain/adapters.test.ts`, replace snake_case route/advisory fixtures with camelCase browser contract payloads. The critical expectations are:

```ts
test("maps route candidates without reordering backend relevance", () => {
  expect(
    toRouteCandidates({
      routes: [
        {
          routeId: "route-b",
          routeVersionId: "version-b",
          routeCode: "330",
          routeName: "B",
          directionHints: [],
        },
        {
          routeId: "route-a",
          routeVersionId: "version-a",
          routeCode: "124",
          routeName: "A",
          distanceMeters: 10,
          directionHints: [],
        },
      ],
    }).map((route) => route.routeId)
  ).toEqual(["route-b", "route-a"]);
});

test("maps route geometry polyline directly", () => {
  expect(
    toRoutePolyline({
      routeId: "route-a",
      routeVersionId: "version-a",
      routeDirectionId: "direction-a",
      polyline: [{ lat: -27.6, lng: -48.5 }],
    })
  ).toEqual([{ lat: -27.6, lng: -48.5 }]);
});

test("uses backend-provided seat-area recommendation", () => {
  expect(
    toUiAdvice({
      status: "advice",
      mode: "onboard",
      horizon: "upcoming",
      routeId: "route-a",
      routeVersionId: "version-a",
      routeDirectionId: "direction-a",
      directSunExposure: "right",
      recommendedSeatArea: "front",
      sunCondition: "daylight",
      computedAt: "2026-06-15T12:00:00.000Z",
    })
  ).toMatchObject({
    mode: "onboard",
    directSunExposure: "right",
    recommendedSeatArea: "front",
  });
});
```

- [ ] **Step 2: Run adapter tests to verify they fail**

Run:

```bash
npm test -- tests/domain/adapters.test.ts
```

Expected: FAIL because adapters still read old snake_case service-shaped payloads and invert exposure locally.

- [ ] **Step 3: Update domain transport types**

In `/home/jackson/sombreado/sombreado-floripa/src/domain/types.ts`:

- remove `ServiceCoordinate`, `RouteSummary`, `RoutesResponse`, `RouteSegment`, `TargetAdvisoryRequest`, `TargetAdvisoryResponse`, and snake_case advisory context types
- add browser contract-aligned names:

```ts
export type AdviceMode = "onboard" | "preview";
export type AdviceHorizon = "upcoming" | "remainingRoute";
export type RecommendedSeatArea =
  | "left"
  | "right"
  | "front"
  | "back"
  | "neutral";
export type SunCondition = "daylight" | "night" | "lowSun" | "overhead";
export type WithheldReasonCode =
  | "missingRouteGeometry"
  | "insufficientSunSignal"
  | "unsupportedDirection"
  | "noAdviceForSelectedHorizon"
  | "locationOffRoute";

export type AdviceRequest = {
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
  mode: AdviceMode;
  horizon: AdviceHorizon;
  observedAt: string;
  location?: {
    lat: number;
    lng: number;
    accuracyMeters?: number;
    observedAt: string;
  };
  fallbackToPreview?: boolean;
};

export type AdviceResponse =
  | {
      status: "advice";
      mode: AdviceMode;
      horizon: AdviceHorizon;
      routeId: string;
      routeVersionId: string;
      routeDirectionId: string;
      directSunExposure: ExposureDirection;
      recommendedSeatArea: RecommendedSeatArea;
      sunCondition: SunCondition;
      computedAt: string;
      position?: {
        lat: number;
        lng: number;
        source: "liveLocation" | "directionStart";
        distanceFromRouteMeters?: number;
      };
    }
  | {
      status: "withheld";
      mode: AdviceMode | "unavailable";
      horizon?: AdviceHorizon;
      routeId: string;
      routeVersionId: string;
      routeDirectionId: string;
      reasonCode: WithheldReasonCode;
      computedAt: string;
    };

export type RouteGeometryResponse = {
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
  polyline: LatLng[];
};
```

Update `RetryTarget` so advice uses `AdviceRequest`, not the retired advisory request.

- [ ] **Step 4: Update adapters**

In `/home/jackson/sombreado/sombreado-floripa/src/domain/adapters.ts`:

- import transport types from `src/api/schemas`
- map `routeCode` to domain `code`
- map `routeName` to domain `name`
- return `routeGeometryResponse.polyline` directly
- map advice based on `response.mode`, `response.recommendedSeatArea`, `response.sunCondition`, and `response.reasonCode`
- delete local `invertExposure`

The core functions should have this shape:

```ts
export function toRouteCandidates(
  routesResponse: RouteCandidatesResponseTransport
): RouteCandidate[] {
  return routesResponse.routes.map((route) => ({
    routeId: route.routeId,
    routeVersionId: route.routeVersionId,
    code: route.routeCode,
    name: route.routeName,
    ...(route.distanceMeters === undefined
      ? {}
      : { distanceMeters: route.distanceMeters }),
    directionHints: [...route.directionHints],
  }));
}

export function toDirectionChoices(
  routeDirectionsResponse: DirectionChoicesResponseTransport
): DirectionChoice[] {
  return routeDirectionsResponse.directions.map((direction) => ({
    routeDirectionId: direction.routeDirectionId,
    sequence: direction.sequence,
    name: direction.name,
    departureLabels: [...direction.departureLabels],
  }));
}

export function toRoutePolyline(
  routeGeometryResponse: RouteGeometryResponseTransport
): LatLng[] {
  return routeGeometryResponse.polyline.map((point) => ({ ...point }));
}
```

For advice:

```ts
if (adviceResponse.status === "withheld") {
  return { mode: "withheld", reasonCode: adviceResponse.reasonCode };
}
if (adviceResponse.recommendedSeatArea === "neutral") {
  return {
    mode: "neutralComputed",
    directSunExposure:
      adviceResponse.directSunExposure === "overhead" ||
      adviceResponse.directSunExposure === "none"
        ? adviceResponse.directSunExposure
        : "none",
    sunCondition: adviceResponse.sunCondition,
  };
}
if (adviceResponse.mode === "preview") {
  return {
    mode: "preview",
    directSunExposure: adviceResponse.directSunExposure,
    recommendedSeatArea: adviceResponse.recommendedSeatArea,
    previewSource: "estimated_route_point",
    ...(adviceResponse.position?.distanceFromRouteMeters === undefined
      ? {}
      : {
          distanceFromRouteMeters:
            adviceResponse.position.distanceFromRouteMeters,
        }),
  };
}
return {
  mode: "onboard",
  directSunExposure: adviceResponse.directSunExposure,
  recommendedSeatArea: adviceResponse.recommendedSeatArea,
};
```

Adjust `UiAdviceState` so `recommendedSeatArea` accepts `RecommendedSeatArea` excluding `neutral`, and `neutralComputed` may include `sunCondition`.

- [ ] **Step 5: Run adapter tests**

Run:

```bash
npm test -- tests/domain/adapters.test.ts
```

Expected: PASS.

### Task 6: Convert Mock API and Fixtures to Shared Client Interface

**Files:**

- Modify: `/home/jackson/sombreado/sombreado-floripa/src/mocks/fixtures.ts`
- Modify: `/home/jackson/sombreado/sombreado-floripa/src/mocks/mockApi.ts`
- Modify: `/home/jackson/sombreado/sombreado-floripa/src/mocks/scenarioStates.ts`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/mocks/mockApi.test.ts`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/prototype-scenarios.test.tsx`

- [ ] **Step 1: Rewrite mock API tests around `RiderFlowApiClient`**

In `/home/jackson/sombreado/sombreado-floripa/tests/mocks/mockApi.test.ts`, update expectations:

- `createMockApi().listNearbyRouteCandidates(...)` returns camelCase route candidates
- `createMockApi().searchRouteCandidates(...)` preserves fixture order
- `createMockApi().listDirectionChoices(...)` requires `routeId` and `routeVersionId`
- `createMockApi().getRouteGeometry(...)` returns `polyline`
- `createMockApi().createAdvice(...)` returns `status: "advice"` and `recommendedSeatArea`
- mock errors still become `MockApiError` with a `FlowError`

Use this representative assertion:

```ts
const api = createMockApi({
  scenarioId: "advice-exposure-right-recommends-left",
});
await expect(
  api.createAdvice({
    request: {
      routeId: fixtureIds.routes.default,
      routeVersionId: fixtureIds.versions.default,
      routeDirectionId: fixtureIds.directions.default,
      mode: "onboard",
      horizon: "upcoming",
      observedAt: "2026-06-15T12:00:00.000Z",
      fallbackToPreview: true,
      location: {
        lat: -27.5969,
        lng: -48.5488,
        accuracyMeters: 42,
        observedAt: "2026-06-15T12:00:00.000Z",
      },
    },
  })
).resolves.toMatchObject({
  status: "advice",
  mode: "onboard",
  directSunExposure: "right",
  recommendedSeatArea: "left",
});
```

- [ ] **Step 2: Run mock tests to verify they fail**

Run:

```bash
npm test -- tests/mocks/mockApi.test.ts
```

Expected: FAIL because mock API still exposes old method names and old payload shapes.

- [ ] **Step 3: Update fixtures**

In `/home/jackson/sombreado/sombreado-floripa/src/mocks/fixtures.ts`:

- route candidate payloads use `routeId`, `routeVersionId`, `routeCode`, `routeName`, `distanceMeters`, `directionHints`
- direction payloads use `routeDirectionId`, `sequence`, `name`, `departureLabels`
- geometry payloads use `routeId`, `routeVersionId`, `routeDirectionId`, `polyline`
- advice payloads use `status: "advice"`, `mode`, `horizon`, `directSunExposure`, `recommendedSeatArea`, `sunCondition`, `computedAt`
- withheld payloads use `reasonCode`, not `reason_code`

- [ ] **Step 4: Update mock API implementation**

In `/home/jackson/sombreado/sombreado-floripa/src/mocks/mockApi.ts`:

- import `RiderFlowApiClient` from `../api/client`
- make `MockApi` equal `RiderFlowApiClient`
- replace `listRoutes` with `listNearbyRouteCandidates` and `searchRouteCandidates`
- replace `getRouteDirections` with `listDirectionChoices`
- replace `createOnboardAdvisory` with `createAdvice`
- keep `createMockLocationProvider`, but return `accuracyMeters` and `observedAt` on granted fixes

The mock client signature should start like this:

```ts
export type MockApi = RiderFlowApiClient;

export function createMockApi(
  options: { scenarioId?: MockScenarioId; delays?: MockApiDelays } = {}
): MockApi {
  const scenarioId = options.scenarioId ?? "nearby-routes";
  const delays = options.delays ?? {};

  return {
    async listNearbyRouteCandidates(params) {
      await delay(delays.nearbyMs);
      rejectIfApiError(scenarioId, "nearbyRoutes");
      const routes = scenarioId === "nearby-empty" ? [] : nearbyRoutes();
      return { routes: routes.slice(0, params.limit) };
    },
    async searchRouteCandidates(params) {
      await delay(delays.manualSearchMs);
      rejectIfApiError(scenarioId, "manualSearch");
      const routes =
        scenarioId === "manual-empty" ? [] : manualRoutes(params.query);
      return { routes: routes.slice(0, params.limit) };
    },
    async listDirectionChoices(params) {
      await delay(delays.directionsMs);
      rejectIfApiError(scenarioId, "directions");
      if (
        scenarioId === "route-no-directions" ||
        params.routeId === fixtureIds.routes.noDirections
      ) {
        return { directions: [] };
      }
      return routeDirectionsByRouteId[params.routeId] ?? { directions: [] };
    },
    async getRouteGeometry(params) {
      await delay(delays.geometryMs);
      rejectIfApiError(scenarioId, "geometry");
      return (
        routeGeometryByDirectionId[params.routeDirectionId] ?? {
          routeId: params.routeId,
          routeVersionId: params.routeVersionId,
          routeDirectionId: params.routeDirectionId,
          polyline: [],
        }
      );
    },
    async createAdvice() {
      await delay(delays.advisoryMs);
      rejectIfApiError(scenarioId, "advisory");
      return adviceForScenario(scenarioId);
    },
  };
}
```

- [ ] **Step 5: Update scenario states**

In `/home/jackson/sombreado/sombreado-floripa/src/mocks/scenarioStates.ts`:

- update `buildTargetAdvisoryRequest` references to `buildAdviceRequest`
- update seeded `advisoryRequest` property to `adviceRequest`
- update `toUiAdvice` calls to pass the new advice response shape
- update retry target shape from `{ kind: "advisory" }` to `{ kind: "advice" }` if Task 7 renames it

- [ ] **Step 6: Run mock and prototype tests**

Run:

```bash
npm test -- tests/mocks/mockApi.test.ts tests/prototype-scenarios.test.tsx
```

Expected: PASS.

### Task 7: Inject Live Client and Location Providers into Flow Hook

**Files:**

- Modify: `/home/jackson/sombreado/sombreado-floripa/src/hooks/useOnboardingFlow.ts`
- Modify: `/home/jackson/sombreado/sombreado-floripa/src/domain/flow.ts`
- Modify: `/home/jackson/sombreado/sombreado-floripa/src/domain/types.ts`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/domain/flow.test.ts`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/home-screen.test.tsx`

- [ ] **Step 1: Add flow tests for recent fallback and stale recovery**

In `/home/jackson/sombreado/sombreado-floripa/tests/domain/flow.test.ts`, add tests that assert:

- recent fallback location warning is stored when advice starts with a recent fallback location
- `routeVersionStale` clears selected direction and does not silently reselect
- stale manual-origin recovery returns to manual search with previous query
- stale nearby-origin recovery can re-enter nearby lookup through retry target

Representative expectation:

```ts
expect(state.selectedDirection).toBeUndefined();
expect(state.error).toMatchObject({
  kind: "api",
  code: "routeVersionStale",
});
```

If `FlowError` does not yet include `code`, add `code?: string` to the type and normalize `ApiClientError.code` into it.

- [ ] **Step 2: Run flow tests to verify they fail**

Run:

```bash
npm test -- tests/domain/flow.test.ts
```

Expected: FAIL because the reducer does not track fallback-location warning or route-version-stale recovery yet.

- [ ] **Step 3: Update flow types**

In `/home/jackson/sombreado/sombreado-floripa/src/domain/types.ts`:

- rename `advisoryRequest` to `adviceRequest`
- rename pending request key `advisory` to `advice`
- add `lastKnownLocationWarning?: boolean`
- add `lastManualSearchQuery?: string`
- add `FlowError.code?: string`
- make `MockLocationResult` match `LocationFix` or import `LocationFix`
- update `RetryTarget`:

```ts
export type RetryTarget =
  | {
      kind: "nearbyRoutes";
      lat: number;
      lng: number;
      radiusMeters?: number;
      limit?: number;
    }
  | { kind: "manualSearch"; query: string; limit?: number }
  | { kind: "directions"; routeId: string; routeVersionId: string }
  | {
      kind: "geometry";
      routeId: string;
      routeDirectionId: string;
      routeVersionId: string;
    }
  | { kind: "advice"; request: AdviceRequest };
```

- [ ] **Step 4: Update advice request builder**

In `/home/jackson/sombreado/sombreado-floripa/src/domain/adapters.ts`, replace `buildTargetAdvisoryRequest` with:

```ts
export function buildAdviceRequest(input: {
  routeId: string;
  routeVersionId: string;
  routeDirectionId: string;
  mode: AdviceMode;
  horizon: AdviceHorizon;
  now?: () => Date;
  location?: {
    lat: number;
    lng: number;
    accuracyMeters?: number;
    observedAt: string;
  };
  fallbackToPreview?: boolean;
}): AdviceRequest {
  return {
    routeId: input.routeId,
    routeVersionId: input.routeVersionId,
    routeDirectionId: input.routeDirectionId,
    mode: input.mode,
    horizon: input.horizon,
    observedAt: (input.now ?? (() => new Date()))().toISOString(),
    ...(input.location === undefined ? {} : { location: input.location }),
    ...(input.fallbackToPreview === undefined
      ? {}
      : { fallbackToPreview: input.fallbackToPreview }),
  };
}
```

- [ ] **Step 5: Inject client and location provider into hook**

In `/home/jackson/sombreado/sombreado-floripa/src/hooks/useOnboardingFlow.ts`:

- add `apiClient?: RiderFlowApiClient`
- add `locationProvider?: LocationProvider`
- default live mode to `createBrowserApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_URL })`
- use mock API only when mock/prototype options are present
- call `api.listNearbyRouteCandidates`
- call `api.searchRouteCandidates`
- call `api.listDirectionChoices({ routeId, routeVersionId })`
- call `api.getRouteGeometry({ routeId, routeVersionId, routeDirectionId })`
- call `api.createAdvice({ request })`
- use `classifyLocationFix` for route confirmation
- use recent fallback location for onboard advice only when the current refresh fails and the stored fix is recent
- use preview advice when no usable location exists

The confirmation decision should follow:

```ts
const freshLocation = await locationProvider.getCurrentLocation();
const freshClass = classifyLocationFix({ fix: freshLocation });
const fallbackClass =
  state.latestLocationFix === undefined
    ? "unusable"
    : classifyLocationFix({ fix: state.latestLocationFix });

if (freshLocation.kind === "granted" && freshClass === "fresh") {
  request = buildAdviceRequest({
    mode: "onboard",
    horizon: "upcoming",
    location: freshLocation,
    fallbackToPreview: true,
    ...ids,
  });
} else if (
  state.latestLocationFix?.kind === "granted" &&
  fallbackClass === "recentFallback"
) {
  request = buildAdviceRequest({
    mode: "onboard",
    horizon: "upcoming",
    location: state.latestLocationFix,
    fallbackToPreview: true,
    ...ids,
  });
  lastKnownLocationWarning = true;
} else {
  request = buildAdviceRequest({
    mode: "preview",
    horizon: "remainingRoute",
    ...ids,
  });
}
```

- [ ] **Step 6: Normalize `ApiClientError` into `FlowError`**

In `useOnboardingFlow.ts`, update `failOperation` so:

```ts
const normalized =
  error instanceof MockApiError
    ? error.flowError
    : error instanceof ApiClientError
      ? { kind: "api" as const, code: error.code, message: error.message }
      : normalizeFlowError(error);
```

Route version stale should preserve `code: "routeVersionStale"`.

- [ ] **Step 7: Run flow and screen tests**

Run:

```bash
npm test -- tests/domain/flow.test.ts tests/home-screen.test.tsx
```

Expected: PASS.

### Task 8: Route Live Runtime and Prototype Runtime Separately

**Files:**

- Modify: `/home/jackson/sombreado/sombreado-floripa/app/page.tsx`
- Create: `/home/jackson/sombreado/sombreado-floripa/app/prototype/page.tsx`
- Modify: `/home/jackson/sombreado/sombreado-floripa/src/app/HomePageApp.tsx`
- Modify: `/home/jackson/sombreado/sombreado-floripa/src/app/PrototypeHomePage.tsx`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/home-screen.test.tsx`

- [ ] **Step 1: Add routing expectations to tests**

In `/home/jackson/sombreado/sombreado-floripa/tests/home-screen.test.tsx`, adjust default app tests to render `HomePageApp` with injected mock client and location provider. Add a test that `PrototypeHomePage` renders the scenario switcher. Add a test that live `HomePageApp` throws a clear missing API URL error when no client and no `NEXT_PUBLIC_API_URL` are available.

Expected assertion:

```ts
expect(() => render(<HomePageApp />)).toThrow("NEXT_PUBLIC_API_URL is required for live API mode.");
```

- [ ] **Step 2: Run screen tests to verify they fail**

Run:

```bash
npm test -- tests/home-screen.test.tsx
```

Expected: FAIL because `/` still renders the prototype path and live missing-config behavior is not wired.

- [ ] **Step 3: Make `HomePageApp` live by default**

In `/home/jackson/sombreado/sombreado-floripa/src/app/HomePageApp.tsx`:

- remove prototype-specific props from default product usage
- keep optional injected `apiClient` and `locationProvider` for tests
- call `useOnboardingFlow({ apiClient, locationProvider })`

Keep prototype-specific options in `PrototypeHomePage`, not in normal product entry.

- [ ] **Step 4: Move prototype to `/prototype`**

Change `/home/jackson/sombreado/sombreado-floripa/app/page.tsx` to:

```tsx
import { HomePageApp } from "../src/app/HomePageApp";

export default function HomePage() {
  return <HomePageApp />;
}
```

Create `/home/jackson/sombreado/sombreado-floripa/app/prototype/page.tsx`:

```tsx
import { PrototypeHomePage } from "../../src/app/PrototypeHomePage";

export default function PrototypePage() {
  return <PrototypeHomePage />;
}
```

- [ ] **Step 5: Run screen tests**

Run:

```bash
npm test -- tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
```

Expected: PASS.

### Task 9: Add Minimal Runtime Copy and UI States

**Files:**

- Modify: `/home/jackson/sombreado/sombreado-floripa/src/content/copy.ts`
- Modify: `/home/jackson/sombreado/sombreado-floripa/src/screens/OnboardingFlowScreen.tsx`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/home-screen.test.tsx`
- Test: `/home/jackson/sombreado/sombreado-floripa/tests/prototype-scenarios.test.tsx`

- [ ] **Step 1: Add UI tests for required copy**

Add tests that render or drive states for:

- last-known-location warning
- stale route recovery copy
- preview because no usable location exists
- malformed API response generic error

Expected Portuguese copy:

```ts
expect(
  screen.getByText(/usando sua última localização conhecida/i)
).toBeInTheDocument();
expect(screen.getByText(/Essa linha mudou/i)).toBeInTheDocument();
expect(screen.getByText(/prévia da linha/i)).toBeInTheDocument();
expect(
  screen.getByText(/Não consegui ler a resposta do serviço/i)
).toBeInTheDocument();
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run:

```bash
npm test -- tests/home-screen.test.tsx
```

Expected: FAIL because new copy is not rendered.

- [ ] **Step 3: Add minimal copy constants**

In `/home/jackson/sombreado/sombreado-floripa/src/content/copy.ts`, add:

```ts
export const apiCopy = {
  missingApiBaseUrl:
    "Configuração da API ausente. Defina NEXT_PUBLIC_API_URL para usar o modo ao vivo.",
  invalidApiResponse:
    "Não consegui ler a resposta do serviço. Tente novamente em instantes.",
  staleRouteVersion: "Essa linha mudou. Vamos atualizar as opções.",
  lastKnownLocation:
    "Estou usando sua última localização conhecida porque a atualização falhou agora.",
  previewNoUsableLocation:
    "Sem uma localização confiável agora, vou mostrar uma prévia da linha.",
};
```

- [ ] **Step 4: Render warning and recovery copy**

In `/home/jackson/sombreado/sombreado-floripa/src/screens/OnboardingFlowScreen.tsx`:

- show `apiCopy.lastKnownLocation` on advice result when `state.lastKnownLocationWarning` is true
- show `apiCopy.staleRouteVersion` for `error.code === "routeVersionStale"`
- show `apiCopy.invalidApiResponse` for `error.code === "invalidApiResponse"`
- keep backend `error.message` out of rider-facing UI
- do not add pause/resume controls in this slice

- [ ] **Step 5: Run UI tests**

Run:

```bash
npm test -- tests/home-screen.test.tsx tests/prototype-scenarios.test.tsx
```

Expected: PASS.

### Task 10: QA Documentation and Full Frontend Verification

**Files:**

- Modify: `/home/jackson/sombreado/sombreado-floripa/docs/qa/05-api-integration.md`

- [ ] **Step 1: Add a 05a QA section**

In `/home/jackson/sombreado/sombreado-floripa/docs/qa/05-api-integration.md`, add this section before `## Local-Service Smoke Checklist`:

```markdown
## 05a Live API Transport Baseline

This section verifies the first live API integration slice. It covers live API transport, one-shot location use, recent fallback location warning, route/direction/geometry/advice calls, and prototype preservation.

Out of scope for 05a:

- `navigator.geolocation.watchPosition()`
- automatic background advice refresh
- pause/resume live update controls
- full freshness timestamp UI

Backend preflight:

- `sombreado-service` default CORS origins include `http://localhost:3000`.
- Backend API tests pass before browser smoke testing.

Frontend routes:

- `/` uses live API mode and requires `NEXT_PUBLIC_API_URL`.
- `/prototype` uses fixture-driven scenarios and does not require `NEXT_PUBLIC_API_URL`.
```

- [ ] **Step 2: Run frontend verification**

Run from `/home/jackson/sombreado/sombreado-floripa`:

```bash
npm test
npm run lint
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Check frontend-only boundary**

Run:

```bash
rg "FastAPI|APIRouter|scraper|GTFS|CREATE TABLE|INSERT INTO" app src tests
```

Expected: no backend implementation code in `app`, `src`, or `tests`. Mentions in docs are acceptable and are outside this command.

- [ ] **Step 4: Commit frontend baseline**

Run from `/home/jackson/sombreado/sombreado-floripa`:

```bash
git add package.json package-lock.json app/page.tsx app/prototype/page.tsx src tests docs/qa/05-api-integration.md
git commit -m "feat: add live API transport baseline"
```

## Plan Self-Review

- Spec coverage: The plan covers backend CORS preflight, Zod schemas, live API client, explicit mock client, `/` live runtime, `/prototype` fixture runtime, one-shot geolocation, recent fallback location warning, preview fallback, stale-version recovery, backend order preservation, minimal copy, and QA documentation.
- Deliberate deferrals: live watch, background refresh, pause/resume controls, and full freshness timestamp UI are excluded and belong to Plan 05b.
- Type consistency: The public advice language uses `AdviceRequest`, `AdviceResponse`, `AdviceMode`, `AdviceHorizon`, `recommendedSeatArea`, `sunCondition`, and `reasonCode`; retired `TargetAdvisoryRequest`, `TargetAdvisoryResponse`, `advisory_context`, `reason_code`, segment geometry, and frontend exposure inversion should not survive this slice.
- Scope check: This is one frontend integration baseline plus one small backend preflight. It produces testable software independently because `/` can run against the live service and `/prototype` remains fixture-driven.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-15-live-api-transport-baseline.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task and review between tasks.
2. **Inline Execution** - Execute tasks in this session using `superpowers:executing-plans`, with checkpoints after backend preflight, API client, flow integration, and route split.
