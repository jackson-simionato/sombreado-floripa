# 04b - Mock Contract, Fixtures, and Flow State

## Goal

Add the typed mocked data layer and explicit frontend flow model that the rest of the prototype will use.

This plan is the contract boundary for Plans 04c, 04d, 04e, and later API integration. It should keep the prototype frontend-only while making the backend contract gaps visible.

## Dependencies

- `docs/plans/04a-app-scaffold-and-design-foundation.md`
- Adjacent `../sombreado-service` schemas/routes as current contract reference only
- `docs/wireframes-v1.md`
- `docs/product-decisions.md`
- `docs/brand-guide.md`
- `CONTEXT.md`

## Target Structure

Add stable import targets for later plans:

```text
src/domain/types.ts
src/domain/adapters.ts
src/domain/flow.ts
src/mocks/fixtures.ts
src/mocks/mockApi.ts
tests/domain/
tests/mocks/
```

Keep service-shaped mock payloads in backend-style snake_case. Convert to UI/domain camelCase only through adapters.

## Work

- Add domain types for route candidates, direction choices, route geometry, advisory responses, UI advice states, retry targets, errors, request status, route selection source, mock scenario IDs, and screen state names.
- Add a closed `ScreenStateName` union matching `docs/wireframes-v1.md` in code-friendly casing:

  ```ts
  type ScreenStateName =
    | "locationRequest"
    | "findingNearbyRoutes"
    | "slowLoadingNotice"
    | "locationDeniedRecovery"
    | "routeCandidateSelection"
    | "noNearbyRoutes"
    | "manualRouteSearch"
    | "noManualResults"
    | "directionChoice"
    | "routeWithoutDirections"
    | "routeConfirmation"
    | "routeConfirmationFallback"
    | "computingAdvice"
    | "onboardAdviceResult"
    | "routePreviewAdviceResult"
    | "trueWithheld"
    | "apiError";
  ```

- Implement a UI-level advice union that separates backend exposure from rider recommendation:

  ```ts
  type UiAdviceState =
    | {
        mode: "onboard";
        directSunExposure: "left" | "right" | "front" | "back";
        recommendedSeatArea: "left" | "right" | "front" | "back";
      }
    | {
        mode: "preview";
        directSunExposure: "left" | "right" | "front" | "back";
        recommendedSeatArea: "left" | "right" | "front" | "back";
        previewSource: "estimated_route_point";
        distanceFromRouteMeters?: number;
      }
    | {
        mode: "neutralComputed";
        directSunExposure: "overhead" | "none";
      }
    | {
        mode: "withheld";
        reasonCode: AdvisoryReasonCode;
      };
  ```

- Add service-shaped mock API functions aligned with `sombreado-service` names and payloads where possible:

  ```ts
  listRoutes({ query, lat, lng, radiusMeters, limit }): Promise<RoutesResponse>
  getRouteDirections(routeId): Promise<RouteDirectionsResponse>
  getRouteGeometry(routeDirectionId, routeVersionId): Promise<RouteGeometryResponse>
  createOnboardAdvisory(request): Promise<TargetAdvisoryResponse>
  ```

- Keep every public mock API function asynchronous, even instant fixtures. Mock API failures should reject with a typed mock error; flow state stores normalized `FlowError`.
- Keep mock API and domain modules free of browser APIs, live services, Mapbox, `fetch`, `window`, `navigator.geolocation`, and `NEXT_PUBLIC_API_URL`.
- Add a separate mock location provider:

  ```ts
  type MockLocationResult =
    | { kind: "granted"; lat: number; lng: number }
    | { kind: "denied" }
    | { kind: "unavailable" }
    | { kind: "timeout" };
  ```

  Denied, unavailable, and timeout all render through `locationDeniedRecovery` for v1, while preserving the internal issue reason.

- Add adapters where rider-facing product state differs from service-shaped payloads:

  ```ts
  toRouteCandidates(routesResponse): RouteCandidate[]
  toDirectionChoices(routeDirectionsResponse): DirectionChoice[]
  toRoutePolyline(routeGeometryResponse): LatLng[]
  toUiAdvice(advisoryResponse, context): UiAdviceState
  ```

- Add an advisory request helper that uses an injected `now()` value for stable tests and a named default:

  ```ts
  const DEFAULT_ADVISORY_WINDOW_MINUTES = 15;
  ```

  Default mock advisory requests should set `include_remaining: true`, but primary UI advice must use `upcoming_window.dominant_direction`.

## Backend Contract Notes

Current `sombreado-service` is a reference, not a complete frontend-ready contract.

The frontend prototype should model these target backend needs:

- Advisory responses need typed context for onboard advice, preview advice, and unavailable/withheld advice.
- Route preview advice requires service support for an automatic estimated point on or near the selected route. V1 must not ask riders to choose a stop, segment, or map point.
- Backend free-text `reason` is diagnostic only. Frontend needs stable `reason_code` values for copy and recovery actions.
- Direction labels must be rider-facing destinations or neighborhoods. Raw IDs, bearings, shape IDs, or debug terms must stay internal.

Target advisory shape may use UI-facing `mode` terms or service-facing context terms. Prefer service-facing terms if the backend owns the contract:

```ts
type AdvisoryCalculationContext =
  | "on_route"
  | "estimated_route_point"
  | "unavailable";

type AdvisoryReasonCode =
  | "missing_route_geometry"
  | "direction_unconfirmed"
  | "off_route_preview_available"
  | "off_route_no_preview_point"
  | "insufficient_sun_signal"
  | "service_unavailable";
```

Adapter mapping:

- `on_route` -> onboard result
- `estimated_route_point` -> route preview result
- `unavailable` with withheld status -> true withheld

Important semantic boundary: backend `upcoming_window.dominant_direction` describes the direction with more direct sun exposure. UI recommendation must invert it:

| Backend direct sun exposure | UI recommendation |
| --- | --- |
| `right` | sit `left` |
| `left` | sit `right` |
| `front` | sit farther `back` |
| `back` | sit farther `front` |
| `overhead` | neutral computed result |
| `none` | neutral computed result |

`left` and `right` are passenger-facing bus sides, not compass directions and not map screen directions.

## Route And Direction Contract

- Nearby lookup and manual search both use `/v1/routes`-shaped fixtures through `listRoutes`.
- Nearby lookup calls `listRoutes({ lat, lng, radiusMeters, limit })`.
- Manual search calls `listRoutes({ query, limit })`.
- Both return route-level choices.
- Direction-level information may appear inline on route summaries as hints/search metadata only.
- Selecting a route must not select a direction.
- After route selection, call `getRouteDirections(routeId)` or normalize through the same direction adapter. Prefer calling `getRouteDirections(routeId)` in the mock flow so empty/error direction branches are exercised.
- Empty directions from a successful direction response transition to `routeWithoutDirections`.
- Direction request failure transitions to `apiError` with retry target `{ kind: "directions", routeId }`.

Rider-facing fields:

- Route labels: `route_code`, `route_name`
- Direction labels: `name`, `departure_labels`

Internal-only fields:

- `route_id`
- `route_version_id`
- `route_direction_id`
- segment IDs
- sequence except for sorting

Direction choices sort by `sequence` ascending. Route candidates sort as follows:

- Nearby: `distance_meters` ascending, then route code/name. Routes without distance sort after routes with distance.
- Manual: preserve mock API relevance order if implemented; otherwise route code/name.

Manual search matching should be case-insensitive and, if cheap, accent-insensitive. Match route code, route name, terminal/destination words, direction names, and departure labels. Results remain route-level.

## Geometry Contract

- Mock geometry payloads stay service-shaped as `RouteGeometryResponse` with ordered `segments`.
- Service coordinates use `[lng, lat]`.
- UI helpers convert to named points:

  ```ts
  type ServiceCoordinate = [lng: number, lat: number];
  type LatLng = { lat: number; lng: number };
  ```

- `toRoutePolyline` flattens ordered segment coordinates for the placeholder map.
- Geometry adapters must not use Mapbox types, GeoJSON dependencies, token values, style URLs, or map objects.
- Geometry loading happens after direction selection, before route confirmation:
  1. route selected
  2. directions loaded
  3. direction selected
  4. geometry requested
  5. `routeConfirmation` if geometry and map placeholder are available
  6. `routeConfirmationFallback` if geometry is missing or map availability is disabled
  7. `apiError` if geometry request fails

Map availability is a scenario/fixture switch independent of geometry:

```ts
type MapAvailability = "available" | "unavailable";
```

`routeConfirmationFallback` still allows the rider to confirm and continue to advice computation. If advisory computation later cannot proceed, that later result maps to `trueWithheld` or `apiError`.

## Flow State

Implement explicit frontend flow state with a reducer or equivalent deterministic transition module.

Reducer state must be serializable JSON only: strings, numbers, booleans, arrays, and plain objects. Use ISO strings for datetimes. Do not store `Date`, `Error`, functions, classes, fixture object references, or browser objects.

Reducer must not throw for runtime invalid events. Invalid events should no-op or transition to a typed error only where that is part of the flow.

Use selected snapshots, not fixture references:

```ts
type RouteSelectionSource = "nearby" | "manual";

type SelectedRoute = {
  routeId: string;
  routeVersionId: string;
  code: string;
  name: string;
  distanceMeters?: number;
  source: RouteSelectionSource;
};

type SelectedDirection = {
  routeDirectionId: string;
  sequence: number;
  name: string;
  departureLabels: string[];
};
```

Preserve selected route, selected direction, latest known location, advice mode, retry target, manual query, nearby candidates, geometry state, and error context where relevant.

Track operation state separately:

```ts
type FlowError = {
  kind: "api" | "timeout" | "permission" | "notFound" | "unknown";
  message: string;
  retryTarget?: RetryTarget;
};

type RetryTarget =
  | { kind: "nearbyRoutes"; lat: number; lng: number; radiusMeters?: number; limit?: number }
  | { kind: "manualSearch"; query: string; limit?: number }
  | { kind: "directions"; routeId: string }
  | { kind: "geometry"; routeId: string; routeDirectionId: string; routeVersionId: string }
  | { kind: "advisory"; request: TargetAdvisoryRequest };
```

Use request IDs for async transitions so stale responses are ignored:

```ts
type RequestId = string;
```

Timers live outside the reducer. The reducer handles events such as `nearbySlowThresholdReached(requestId)`.

Main transition rules:

- `locationRequested` -> locate through mock location provider
- location granted -> `findingNearbyRoutes`, then `listRoutes`
- location denied/unavailable/timeout -> `locationDeniedRecovery`
- nearby success with routes -> `routeCandidateSelection`
- nearby success empty -> `noNearbyRoutes`
- nearby slow threshold -> `slowLoadingNotice`
- manual search success with routes -> `manualRouteSearch` with results
- manual search success empty -> `noManualResults`
- route selected -> load directions
- direction success empty -> `routeWithoutDirections`
- direction success with choices -> `directionChoice`
- direction selected -> load geometry
- geometry success with map available -> `routeConfirmation`
- geometry missing or map unavailable -> `routeConfirmationFallback`
- route confirmed or fallback confirmed -> `computingAdvice`
- advisory onboard success -> `onboardAdviceResult`
- advisory preview success -> `routePreviewAdviceResult`
- advisory neutral success -> neutral computed UI state under the appropriate result mode
- advisory withheld success -> `trueWithheld`
- failed async operations -> `apiError` with retry target

Reducer invariants:

- Direction cannot be selected before route.
- Route cannot be confirmed before direction.
- Advisory computation cannot start without route and direction.
- `Trocar linha` clears selected direction, geometry, advice, advisory errors, and selected route. Preserve latest known location and reusable route candidates where appropriate.
- `Trocar sentido` preserves selected route and latest known location. Clear selected direction, geometry, advice, and advisory errors. Return to `directionChoice`, reloading directions if needed.
- Retry reuses the exact payload stored in `RetryTarget`.

## Fixtures And Scenarios

Use stable named UUID fixture IDs. Do not use random/generated IDs inside fixtures or tests.

```ts
export const fixtureIds = {
  routes: {
    lagoa: "00000000-0000-0000-0000-000000000124",
  },
  routeVersions: {
    lagoaCurrent: "00000000-0000-0000-0000-000000001124",
  },
  routeDirections: {
    lagoaOutbound: "00000000-0000-0000-0000-000000002124",
    lagoaInbound: "00000000-0000-0000-0000-000000003124",
  },
} as const;
```

Fixtures should use realistic local-style labels such as `124 TICEN - Lagoa`, `330 TILAG - Centro`, `UFSC`, `Trindade`, `Lagoa`, and `TICEN`, but they are curated prototype data, not authoritative transit data.

Fixture coordinates should be plausible Florianopolis-area coordinates, but not authoritative route geometry.

Add curated fixtures with explicit edge cases:

- at least two normal routes with direction choices
- route with no directions
- route with geometry for the placeholder map
- route with missing geometry for confirmation fallback
- map unavailable despite geometry
- advisory fixtures for exposed `left`, `right`, `front`, `back`, `overhead`, and `none`
- off-route preview result using target preview context
- true withheld result
- API error
- slow loading
- no nearby candidates
- denied/unavailable/timeout location
- no manual results

Name advisory fixtures to avoid exposure/recommendation ambiguity:

```ts
advisoryExposureRightRecommendsLeft
advisoryExposureLeftRecommendsRight
advisoryExposureFrontRecommendsBack
advisoryExposureBackRecommendsFront
advisoryExposureOverheadNeutral
advisoryExposureNoneNeutral
```

Define stable scenario IDs for Plan 04e:

```ts
type MockScenarioId =
  | "location-request"
  | "finding-nearby-routes"
  | "nearby-routes"
  | "nearby-empty"
  | "nearby-slow"
  | "location-denied"
  | "manual-search"
  | "manual-empty"
  | "direction-choice"
  | "route-no-directions"
  | "confirmation-map"
  | "confirmation-fallback-missing-geometry"
  | "confirmation-fallback-map-unavailable"
  | "computing-advice"
  | "advice-exposure-right-recommends-left"
  | "advice-exposure-left-recommends-right"
  | "advice-exposure-front-recommends-back"
  | "advice-exposure-back-recommends-front"
  | "advice-neutral-overhead"
  | "advice-neutral-none"
  | "advice-preview-left"
  | "advice-withheld"
  | "api-error";
```

Fixture selection should be deterministic from scenario ID or explicit mock API options. Avoid hidden mutable global scenario state.

Mock async delays should be configurable and zero by default in tests:

```ts
createMockApi({
  scenarioId,
  delays?: {
    nearbyMs?: number;
    manualSearchMs?: number;
    directionsMs?: number;
    geometryMs?: number;
    advisoryMs?: number;
  },
});
```

## Copy Boundary

Do not put rider-facing Portuguese UI copy in domain types, adapters, reducer state, or mock API payloads.

Allowed in fixtures:

- route names
- route codes
- direction names
- departure labels

Not allowed in fixtures/domain:

- screen headings
- button labels
- explanatory notices
- rider-facing error body copy

Semantic states such as `reasonCode: "missing_route_geometry"` should be mapped to Portuguese copy in `src/content/copy.ts` or screen components.

## Tests

Add unit tests for adapters, fixture selection, mock API behavior, and reducer transitions.

Adapter tests should cover:

- service snake_case -> UI camelCase conversion
- route candidate labels use route code/name, not UUIDs
- direction labels use names/departure labels, not raw IDs
- direction sorting by `sequence`
- nearby/manual candidate sorting
- coordinate order conversion from `[lng, lat]` to `{ lat, lng }`
- `toRoutePolyline`
- `upcoming_window.dominant_direction` drives primary UI advice
- `remaining_route` may be absent without breaking UI advice
- all exposure-to-recommendation mappings:
  - `left` -> `right`
  - `right` -> `left`
  - `front` -> `back`
  - `back` -> `front`
  - `overhead` -> neutral
  - `none` -> neutral
- preview maps directly to route preview result
- withheld maps to true withheld with typed reason code

Flow tests should cover:

- normal nearby path
- normal manual path
- empty nearby -> `noNearbyRoutes`
- empty manual -> `noManualResults`
- denied/unavailable/timeout location -> `locationDeniedRecovery`
- no directions -> `routeWithoutDirections`
- missing geometry -> `routeConfirmationFallback`
- map unavailable -> `routeConfirmationFallback`
- geometry request failure -> `apiError`
- advisory preview, neutral, and withheld cases
- stale async responses ignored by request ID
- retry reuses exact request payload
- invalid direction/confirmation/advisory transitions do not violate route-before-direction invariant
- `Trocar linha` and `Trocar sentido` clear stale state correctly

Contract tests should include canonical fixture objects satisfying:

- `RoutesResponse`
- `RouteDirectionsResponse`
- `RouteGeometryResponse`
- target advisory response/request shapes

Do not mirror backend tests here. Test frontend contract and adapter behavior only.

## Deliverable

- A typed mock contract, fixture matrix, adapters, and flow state module ready for UI integration.
- Backend contract notes ready to inform Plan 05 API integration.

## Acceptance Criteria

- Mock functions are asynchronous and do not call live services.
- Mock/domain modules do not call browser APIs, `fetch`, Mapbox, or env vars.
- Flow state names align with `docs/wireframes-v1.md`.
- Route selection always happens before direction choice.
- Manual search and nearby lookup both return route-level choices.
- Direction choice is explicit before route confirmation.
- Empty direction response, missing geometry, API failure, and withheld advice are distinct states.
- `overhead` and `none` map to neutral computed UI states, not true withheld states.
- Backend direct sun exposure is inverted before producing rider seat recommendations.
- Off-route preview maps directly to a preview result state, not a separate warning step.
- State and fixtures are deterministic and serializable.
- Retry targets preserve enough context to retry the exact failed action.
- Adapter and flow tests cover normal, empty, error, preview, neutral, withheld, stale async, and retry cases.

## Verification

- Run `npm test`.
- Run a targeted search to confirm no live service URL, browser API call, Mapbox dependency, or `NEXT_PUBLIC_API_URL` reference was introduced in `src/domain` or `src/mocks`.
