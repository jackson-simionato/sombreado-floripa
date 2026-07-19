# Issue 3 Live Nearby Route Candidates Design

## Purpose

Connect nearby Route Candidate discovery to the live browser API through the
real Onboard Flow, while preserving `/prototype` as the fixture-driven QA
runtime.

Issue #3 is the bridge from the temporary issue #2 smoke runtime into the
reducer-driven product flow. It should make nearby live data feel like the
normal route-first flow without absorbing Direction Choice, geometry, or advice
work from later issues.

## Settled Decisions

- `/` should use the existing `HomePageApp`, `useOnboardingFlow`, and
  `OnboardingFlowScreen` path instead of the temporary `LiveHomePage` local
  state machine.
- `/prototype` should continue to use mock fixtures and the scenario switcher.
- Nearby Route Candidates are requested only after the Rider taps the location
  action.
- Nearby requests use the Plan 05 constants: `radiusMeters: 1200` and
  `limit: 5`.
- Manual Route Search remains live because issue #2 already made it live. #3
  must not regress it back to mocks or remove the path.
- Route Candidates remain route-only. Selecting a route must not load Direction
  Choice in this issue.
- Direction Choice remains owned by issue #4.
- Live route-candidate order is preserved exactly as Sombreado Service returns
  it. Do not sort live nearby candidates in the frontend.
- Runtime JSON validation stays at the Zod transport boundary.
- Fetch calls use `credentials: "omit"`.
- Add `AbortSignal` support to the live client seam, but keep reducer request
  IDs as the correctness guard against stale responses.
- Location handling stays minimal: use a successful one-shot browser
  geolocation result, then call nearby. Do not add full freshness, accuracy,
  recent fallback, or live watch policy in this issue.
- Live failures reuse existing Onboard Flow recovery and API error states. Do
  not expose backend diagnostic messages or Zod details to Riders.

## Scope

In scope:

- Replace `/` usage of `LiveHomePage` with the reducer-driven product flow.
- Introduce a rider-flow client boundary suitable for Plan 05.
- Provide a live implementation for:
  - `listNearbyRouteCandidates`
  - `searchRouteCandidates`
- Provide a mock implementation for `/prototype` and existing tests.
- Adapt live `RouteCandidatesResponse` transport into domain
  `RouteCandidate` values without changing response order.
- Preserve live manual search behavior from issue #2.
- Keep route selection stopped before Direction Choice, with the existing
  unsupported-next-step copy or an equivalent compact stop state.
- Cover malformed responses, public API errors, network failures, and stale
  reducer requests at the client, flow, and screen seams.
- Update issue #3 QA expectations in `docs/qa/05-api-integration.md`.

Out of scope:

- Direction Choice loading.
- Route geometry loading.
- Sun-side Advice requests.
- Stale route-version recovery.
- Low-accuracy or stale-location policy.
- `watchPosition()` or advice refresh behavior.
- Backend CORS, API server behavior, scraper behavior, route-data processing,
  or advisory computation.

## Architecture

Create a rider-flow client interface that speaks in product operations rather
than backend implementation terms:

- `listNearbyRouteCandidates(input, options?)`
- `searchRouteCandidates(input, options?)`

For issue #3, the interface should not include Direction Choice, geometry, or
advice methods unless the implementation needs explicit unsupported stubs for
type compatibility. Prefer keeping the interface as small as the current issue
allows, then extending it in #4, #5, and #6.

The live implementation should reuse the Zod route-candidate schema from issue
#2 and map transport fields into domain route candidates:

- `routeId`
- `routeVersionId`
- `code`
- `name`
- optional `distanceMeters`
- `directionHints`

The mock implementation should preserve current prototype behavior and can keep
prototype-only sorting or fixture preparation where needed. The live adapter
must not sort nearby or manual results.

`useOnboardingFlow` should accept injected dependencies instead of creating the
mock API unconditionally. `/` passes the live rider-flow client and a browser
location provider. `/prototype` passes the mock client and mock location
provider.

## User Flow

The issue #3 product path is:

1. Rider opens `/`.
2. Missing `NEXT_PUBLIC_API_URL` still fails clearly before the flow starts.
3. Rider taps `Usar minha localização`.
4. Browser geolocation runs once.
5. The app requests nearby Route Candidates from the live API.
6. The app renders the existing `Escolha sua linha` Route Candidate screen.
7. The displayed order matches the live API response order.
8. Selecting a route stops before Direction Choice with compact copy explaining
   that the next live step is not connected yet.

The manual path remains:

1. Rider opens manual search.
2. The app calls live manual search after a query is entered.
3. The app renders route-only candidates in service relevance order.
4. Selecting a route stops before Direction Choice until issue #4.

## Error Handling

Normalize errors into existing flow states:

- Browser geolocation denial, unavailable, or timeout returns to the existing
  location recovery path with manual search available.
- Network failures map to a generic API error.
- Non-2xx public API errors map to a generic API error.
- Malformed Zod responses map to a generic API error.
- Stale async responses are ignored by reducer request ID, even when fetch
  aborts are also supported.

Rider-facing copy must stay in Brazilian Portuguese and must not include
backend messages, raw error envelopes, validation details, stack traces, route
debug terms, or schema names.

## Testing

Use test-first changes for:

- `/` uses the reducer-driven product flow, not the temporary live smoke
  component.
- `/prototype` keeps the scenario switcher and mocked flow.
- Missing `NEXT_PUBLIC_API_URL` still renders the configuration screen.
- Nearby route lookup calls the live client after the Rider location action.
- Nearby route lookup sends `radiusMeters: 1200`, `limit: 5`, and
  `credentials: "omit"`.
- Nearby response order is preserved.
- Manual search remains live and preserves response order.
- Route Candidates remain route-only before Direction Choice.
- Selecting a route stops before Direction Choice in #3.
- Malformed responses normalize to controlled flow errors.
- Network and public API failures normalize to controlled flow errors.
- Stale reducer responses do not mutate current state.

## Documentation

Update `docs/qa/05-api-integration.md` with an issue #3 smoke section that
records:

- `/` now uses the reducer-driven product flow for live nearby/manual Route
  Candidates.
- Direction Choice is intentionally deferred to issue #4.
- Local browser smoke still depends on backend CORS allowing the local Next.js
  origin.
- This repository must not add backend behavior to satisfy the smoke path.

## Rejected Approaches

### Keep `LiveHomePage` and harden it

This is the smallest code change, but it would keep a second route-selection UI
and a second local state machine. That makes issue #4 harder because Direction
Choice would need to reconnect to the real reducer later.

### Implement Direction Choice in #3

This would make the Rider flow feel more complete, but it crosses issue
boundaries. Issue #4 explicitly owns manual search completion and Direction
Choice pinned to `routeVersionId`.

### Sort nearby candidates defensively in the live adapter

The API contract says response order is meaningful. Sorting in the live
frontend would hide backend relevance semantics and could contradict service
ordering. Prototype fixtures may still prepare deterministic order separately.
