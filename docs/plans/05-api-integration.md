# 05 - API Integration

## Goal

Connect the mocked onboard-first frontend flow to `sombreado-service` through browser-direct API calls, using the frontend-owned contract in `docs/api-contract.md`.

This plan should make the product runtime use live API calls by default while preserving fixture-driven tests and prototype scenarios through explicit test/prototype wiring.

## Dependencies

- Mocked frontend prototype from Plans 04a-04f
- `docs/api-contract.md`
- `docs/wireframes-v1.md`
- `docs/brand-guide.md`
- `docs/product-decisions.md`
- `NEXT_PUBLIC_API_URL`
- `sombreado-service` must allow the local Next.js origin `http://localhost:3000` in default CORS settings before local browser smoke testing.

## Contract Stance

- This repository dictates the browser-facing API it needs.
- Do not shape the app around current backend endpoint limitations when they conflict with the rider flow.
- If `sombreado-service` lacks required endpoints, fields, or semantics, document the backend gap in `docs/api-contract.md` and `docs/qa/05-api-integration.md`.
- Do not implement backend behavior, scraper behavior, advisory computation, route-data processing, or API server routes in this repository.
- Keep the app frontend-only and browser-direct.

## Required API Surface

Plan 05 integrates against these frontend contract operations:

- `GET /route-candidates/nearby`
- `GET /route-candidates/search`
- `GET /routes/{routeId}/directions?routeVersionId=...`
- `GET /routes/{routeId}/directions/{routeDirectionId}/geometry?routeVersionId=...`
- `POST /advice`

Use `NEXT_PUBLIC_API_URL` as the base including version prefix, for example `http://localhost:8000/v1`.

## Work

### Backend Preflight

- In `sombreado-service`, add `http://localhost:3000` to the default CORS origins while keeping the existing local origin.
- Update backend config coverage for the default CORS origins.
- Run backend config/API tests before frontend local-service smoke testing.

### API Boundary

- Add Zod as the runtime validation layer for API transport JSON.
- Define Zod schemas as the source of truth for API transport types.
- Add `zod` in the first live API integration slice; do not substitute hand-written transport validators.
- Keep frontend domain/flow types separate from transport schemas and adapt transport responses into domain state.
- Use camelCase frontend contract fields.
- Treat route, version, and direction IDs as opaque strings.
- Normalize malformed responses, failed fetches, non-2xx error envelopes, validation failures, and unknown errors into typed `FlowError`s.
- Use the stable error envelope from `docs/api-contract.md`.
- Map unknown API error codes to generic API error copy.
- Use `credentials: "omit"` for fetch requests.
- Support `AbortController` for route, direction, geometry, search, and advice requests.
- Keep reducer request IDs as state-correctness protection even when aborts are used.

### API Client

- Add an API client with rider-flow methods, not backend-shaped method names:
  - `listNearbyRouteCandidates`
  - `searchRouteCandidates`
  - `listDirectionChoices`
  - `getRouteGeometry`
  - `createAdvice`
- The hook should depend on this rider-flow client interface.
- Keep a mock implementation of the same interface for tests and prototype scenarios.
- Fail clearly in live app mode if `NEXT_PUBLIC_API_URL` is missing.
- Do not silently fall back to fixtures in the product runtime.
- Make `/` the live product runtime.
- Move the fixture-driven scenario switcher to `/prototype`.

### Contract Migration

- Migrate mock fixtures and tests from snake_case service-shaped payloads to the camelCase frontend contract.
- Rename frontend-facing advisory concepts toward advice terminology:
  - `AdviceRequest`
  - `AdviceResponse` or `AdviceResult`
  - `AdviceMode`
  - `AdviceHorizon`
- Keep `advisory` only where referring to backend internals or existing service implementation details.
- Use backend-provided `recommendedSeatArea` for the primary recommendation.
- Keep `directSunExposure` as raw sun exposure metadata.
- Keep front/back recommendations valid.
- Treat neutral results as successful advice, not withheld.
- Treat nighttime as successful neutral advice with `sunCondition: "night"`.

### Route Discovery

- Call nearby candidates after rider location is available.
- Send explicit frontend constants:
  - nearby radius: `1200m`
  - nearby limit: `5`
- Keep nearby candidates route-only. Do not include selectable direction IDs in route candidates.
- Preserve backend order for nearby relevance.
- Preserve backend order for manual search relevance.
- Send manual search limit `8`.
- Preserve manual search as a secondary path that returns route candidates before direction selection.

### Route Version Consistency

- Route discovery must return only current route candidates.
- Carry `routeVersionId` from the selected route candidate through directions, geometry, and advice requests.
- Treat `routeVersionId` as an opaque consistency token, not frontend-owned version-selection logic.
- If the backend returns `routeVersionStale`, map it to a recovery path that refreshes route choices and uses rider-facing copy such as "Essa linha mudou. Vamos atualizar as opções."
- Do not silently reselect a route or direction after stale-version recovery. The rider must confirm the refreshed route/direction again.
- For stale nearby-origin selections, the primary recovery action reruns nearby lookup when a usable current or recent fallback location exists.
- For stale manual-origin selections, the primary recovery action returns to manual search with the previous query.

### Direction And Geometry

- Call direction choices after route selection, passing `routeId` and `routeVersionId`.
- `200 { directions: [] }` maps to `Route Without Directions`.
- Fetch geometry after direction selection, passing `routeId`, `routeVersionId`, and `routeDirectionId`.
- Geometry response should be a frontend-ready polyline of `{ lat, lng }`.
- Missing route geometry maps to route confirmation fallback and still allows confirmation.
- Map provider/token/load failure also maps to route confirmation fallback, but remains frontend-local.
- Network or server failure while fetching geometry maps to API error because retry may fix it.

### Advice Modes And Horizons

- Use one advice endpoint with explicit request fields:
  - `mode: "onboard" | "preview"`
  - `horizon: "upcoming" | "remainingRoute"`
- Default onboard advice to `mode: "onboard"` and `horizon: "upcoming"`.
- Default preview advice to `mode: "preview"` and `horizon: "remainingRoute"`.
- On route confirmation, request onboard advice when a live, fresh browser location is available.
- If location refresh fails but the last acceptable location is recent, request onboard advice and show rider-facing copy that the app is using the last known location.
- If location is denied, unavailable, paused, stale, or inaccurate beyond the accepted fallback threshold, request preview advice.
- For v1 confirmation, onboard requests should include `fallbackToPreview: true`.
- Render the returned `mode`, not the route-selection source. If the response is preview, show preview copy.
- Preview advice should use the selected direction start by default and must not be withheld just because the rider is far away.

### Browser Geolocation

- Replace product-runtime mock location with a real browser geolocation provider.
- Do not request browser location before rider action.
- Support one-shot lookup for nearby route discovery.
- Support live location watching on the advice result screen with `navigator.geolocation.watchPosition()`.
- Do not start live watching merely because the rider used location for nearby route discovery.
- Make live updating visible and controllable on the result screen.
- Stop watching when the rider leaves the advice flow or pauses/stops updates.
- Keep mock location providers for tests and prototype scenarios.
- Normalize permission denied, unavailable, timeout, low accuracy, stale timestamp, and watch errors into typed frontend state.
- Define named frontend constants for freshness and accuracy:
  - acceptable accuracy: `accuracyMeters <= 100`
  - fresh location: observed no more than 30 seconds ago
  - recent fallback location: observed no more than 2 minutes ago

### Advice Refresh Behavior

- Automatically recompute advice while the result screen is open and live location is available.
- Throttle automatic recomputation by time or meaningful movement.
- Keep "Atualizar localização" as a manual fallback.
- Preserve the last successful advice if a background refresh fails.
- Show non-blocking refresh failure or paused/unavailable state on the result screen.
- Use full API error only when the initial advice request fails before any advice exists.
- Add separate flow state for initial request status and background advice refresh status.
- Track backend `computedAt` and frontend location fix timestamp so freshness copy can say when advice was last updated.

### UI States And Copy

- Preserve all screen states from `docs/wireframes-v1.md`.
- Loading, empty, route-without-directions, route confirmation fallback, API error, preview, neutral, paused live update, refresh failure, and true withheld states must be visible and understandable.
- The first live API integration slice must include minimal warning copy when onboard advice uses a recent fallback location, without adding the full live update controls.
- Do not expose backend diagnostic messages directly to riders.
- Keep rider-facing copy in Brazilian Portuguese.
- Keep new copy in the first live API integration slice minimal and functional. Do not use this slice for broad copy polish.
- Add only the copy required for missing live API configuration, stale route recovery, last-known-location warning, malformed or unexpected API responses, and preview because no usable location exists.
- Distinguish onboard advice from route preview advice through text, not color alone.
- Keep geometric limitations visible and do not promise guaranteed shade.

### Tests

- Preserve fixture-based tests by mocking the API client interface.
- Update domain/adapter tests to validate camelCase API transport schemas and domain adaptation.
- Add tests for:
  - missing `NEXT_PUBLIC_API_URL` in live mode
  - nearby route lookup through API client
  - nearby route lookup preserving backend relevance order
  - manual search preserving backend relevance order
  - route version stale error mapping
  - stale version recovery does not silently reselect the previous route or direction
  - route without directions
  - geometry missing fallback
  - geometry network/API error
  - onboard advice with live location
  - preview advice from manual/no-location path
  - neutral night advice
  - true withheld advice
  - background refresh failure preserving last advice
  - aborted stale requests not mutating state
- Keep prototype scenario tests explicitly wired to mocks.

### QA Documentation

- Create `docs/qa/05-api-integration.md`.
- Record local-service smoke-test steps there.
- Record any backend contract gaps that block full live integration.
- Record whether each required frontend state was verified against local service, fixture mocks, or both.

## Deliverable

- Product runtime connected to the browser-facing API client using `NEXT_PUBLIC_API_URL`.
- Prototype/test paths preserved through explicit mock wiring.
- `/prototype` preserves the fixture-driven scenario switcher.
- Runtime JSON validation through Zod at the API boundary.
- Real browser geolocation for product runtime, including live result-screen updates.
- Updated docs:
  - `docs/api-contract.md`
  - `docs/qa/05-api-integration.md`
  - `CONTEXT.md` terminology for seat-area recommendations

## Acceptance Criteria

- `/` uses live API mode by default.
- `/prototype` uses fixture-driven scenarios and does not require `NEXT_PUBLIC_API_URL`.
- The product runtime fails clearly if `NEXT_PUBLIC_API_URL` is missing.
- Tests and prototype scenarios still use fixtures through explicit mock wiring.
- Route candidates remain route-only before explicit direction choice.
- Manual search returns route candidates and rejoins the same direction-selection flow.
- Direction selection is pinned to the selected `routeVersionId`.
- Stale route versions produce a typed recovery path rather than silent recomputation against a different route version.
- Geometry failure modes distinguish missing geometry fallback from retryable API failure.
- Advice requests use explicit `mode` and `horizon`.
- Onboard advice uses fresh/live location; preview advice works without location.
- Onboard advice based on a recent fallback location is visibly labeled as using the last known location.
- Live location updates are visible, pausable, throttled, and non-disruptive on refresh failure.
- The app renders onboard, preview, neutral night, true withheld, API error, and route confirmation fallback states without backend debug language.
- The UI does not promise guaranteed shade.
- `docs/qa/05-api-integration.md` records local-service smoke results and any backend gaps.

## Verification

- Run unit/integration tests:

  ```bash
  npm test
  ```

- Run scaffold checks:

  ```bash
  npm run lint
  npm run typecheck
  ```

- Run a local-service smoke test with `NEXT_PUBLIC_API_URL` pointing at local `sombreado-service`.
- Manually verify nearby, manual search, direction choice, confirmation fallback, onboard advice, preview advice, neutral night, true withheld, initial API error, and background refresh failure states.
- Confirm no backend or scraper behavior was added to this repository:

  ```bash
  rg "FastAPI|APIRouter|scraper|GTFS|CREATE TABLE|INSERT INTO" app src tests
  ```
