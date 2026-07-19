# Issue 5 Route Geometry And Confirmation Design

## Purpose

Complete the live flow through Route Confirmation by loading frontend-ready
Route Geometry after the Rider chooses a Direction Choice. The flow must
distinguish usable Geometry, missing Geometry, retryable failures, and stale
route versions without displaying the wrong route or falling back to mocked
Advice.

Issue #5 removes the temporary issue #4 boundary after direction selection.
It renders the existing compact schematic from live Geometry or the existing
route-and-direction fallback when Geometry is unavailable. Initial live Advice
remains owned by issue #6.

## Settled Decisions

- Route Geometry loads only after explicit route and direction selection.
- Requests carry the selected `routeId`, exact `routeVersionId`, and selected
  `routeDirectionId`.
- The browser contract is the canonical Geometry model:
  `{ routeId, routeVersionId, routeDirectionId, polyline: [{ lat, lng }] }`.
- Flow state, mocks, fixtures, and confirmation rendering use the canonical
  polyline model instead of the legacy segment-rich Geometry model.
- The live response must match the requested route, version, and direction.
  An identity mismatch is a malformed response, not missing Geometry.
- A matching response with fewer than two valid points maps to Route
  Confirmation Fallback and still allows confirmation.
- Non-numeric, non-finite, or out-of-range coordinates are malformed response
  failures and render the retryable API Error state.
- Network failures, non-stale HTTP failures, malformed success bodies, and
  malformed public error envelopes render the retryable API Error state.
- Geometry API Error keeps route and direction context visible. Its primary
  action retries the exact Geometry request; its secondary action is
  "Trocar sentido".
- A typed `routeVersionStale` response uses the existing route-choice recovery:
  refresh the originating candidate list, show the route-changed notice, and
  require explicit route and direction reselection.
- Geometry requests use `AbortController`. Aborts are silent, and reducer
  request IDs remain the final stale-response correctness guard.
- The existing accessible schematic renderer displays the live polyline.
  Mapbox installation, token configuration, map loading, and final map style
  remain out of scope.
- `/prototype` loads fixture-backed Geometry through the same
  `RiderFlowClient` operation as live mode and preserves its downstream mocked
  Advice flow.
- Live mode removes `stopAfterDirectionSelection` and the
  `liveDirectionSelectedUnsupported` screen.
- After the Rider confirms the route, live mode stops at a temporary issue #5
  boundary instead of calling mocked Advice. The boundary shows:
  - heading: "Linha confirmada";
  - body: "A linha e o sentido estão prontos para calcular a recomendação.";
  - actions: "Trocar sentido" and "Trocar linha".
- Issue #6 will remove the temporary confirmation boundary and make route
  confirmation request initial live Advice.

## Scope

In scope:

- A Zod-validated Route Geometry transport client for:
  `GET /routes/{routeId}/directions/{routeDirectionId}/geometry?routeVersionId={routeVersionId}`.
- Exact URL encoding, `credentials: "omit"`, and `AbortSignal` forwarding.
- Response identity and coordinate validation.
- Canonical Geometry adaptation across domain, mock, and UI boundaries.
- `getRouteGeometry` on live and mock `RiderFlowClient` implementations.
- Live Geometry orchestration after Direction Choice.
- Usable-Geometry confirmation and missing-Geometry fallback confirmation.
- Exact retry, contextual recovery, stale-version recovery, cancellation, and
  stale-response protection.
- The temporary post-confirmation live boundary before issue #6.
- Automated tests at transport/client, reducer/hook, and screen seams.
- Issue #5 expectations in `docs/qa/05-api-integration.md`.

Out of scope:

- Mapbox GL JS, map tokens, map styles, or interactive map behavior.
- Advice transport, Advice response adaptation, or Advice rendering changes.
- Location freshness, accuracy thresholds, recent-location policy, or preview
  selection.
- Live location watching, background Advice refresh, or pause/resume controls.
- Backend API, CORS, route-data processing, advisory computation, scraper, or
  database changes.

## Architecture

Add `src/api/routeGeometry.ts` beside the existing operation-specific browser
clients. It defines the camelCase Geometry schema and builds the version-pinned
request on top of `src/api/browserApi.ts`. The schema validates identifiers,
coordinate numbers, latitude bounds, and longitude bounds. After parsing, the
client verifies that all returned identifiers equal the request context.

Extend the domain-facing `RiderFlowClient` with:

```ts
getRouteGeometry(
  input: {
    routeId: string;
    routeVersionId: string;
    routeDirectionId: string;
  },
  options?: { signal?: AbortSignal }
): Promise<RouteGeometry>;
```

The live implementation returns validated canonical Geometry. The mock
implementation obtains fixture Geometry through `MockApi` and returns the same
domain model. Neither implementation converts the polyline into service
segments or Mapbox types.

`useOnboardingFlow` remains the async orchestration boundary. It owns the
current Geometry abort controller, dispatches a unique request ID, calls the
shared rider-flow client, handles typed stale-version recovery, and treats
aborts as silent. The reducer owns pending-request identity, selection
invariants, success/fallback screen selection, and rejection of late events.

The screen layer renders `geometry.polyline` with the existing schematic
component. It does not parse transport responses or decide whether a request
is current.

## User Flows

### Usable Geometry

1. The Rider selects a Direction Choice.
2. The app shows the existing "Preparando confirmação..." loading state while
   retaining route and direction context.
3. The app requests Geometry with the selected route, version, and direction.
4. A matching response with at least two valid points renders Route
   Confirmation and the schematic trajectory.
5. The Rider may change direction or confirm the route.
6. Confirming enters the temporary "Linha confirmada" live boundary. It does
   not request mocked or live Advice in issue #5.

### Missing Geometry

1. The Geometry request succeeds with matching identifiers and fewer than two
   valid points.
2. The app renders Route Confirmation Fallback with route and direction
   summaries.
3. The Rider may choose "Confirmar mesmo assim" or "Trocar sentido".
4. Confirming enters the same temporary live boundary as usable Geometry.

### Retryable Geometry Failure

1. Geometry loading fails through a network, service, or malformed-response
   failure that is not `routeVersionStale`.
2. The API Error state retains route and direction summaries.
3. "Tentar de novo" repeats the exact route/version/direction request.
4. "Trocar sentido" returns to Direction Choice without discarding the route.

### Stale Route Version

1. Geometry loading returns typed `routeVersionStale`.
2. The app aborts and clears obsolete Geometry and selection state.
3. Manual origin reruns the preserved query; nearby origin reruns discovery
   with the latest usable location.
4. The refreshed candidate list shows the route-changed notice.
5. The Rider explicitly selects the route and direction again.

## Error And Cancellation Semantics

- Matching identifiers plus fewer than two valid points is the only
  missing-Geometry fallback condition owned by the live transport.
- Identifier mismatch, invalid coordinates, malformed response shape,
  malformed error envelope, network failure, and non-stale HTTP failure are
  retryable generic API failures.
- Backend diagnostic messages, validation details, identifiers, and raw
  coordinates never appear in Rider copy.
- `routeVersionStale` never retries the old Geometry request or silently moves
  selection to a newer version.
- Selecting another direction, changing route, leaving the flow, or unmounting
  aborts the active Geometry request.
- Abort failures do not dispatch `operationFailed`.
- Geometry success or failure with a non-current request ID cannot mutate
  screen, selection, Geometry, or error state even if cancellation loses a
  race.

## Testing

Use test-first changes at three layers:

- Transport/client:
  - exact encoded Geometry path and `routeVersionId` query parameter;
  - `credentials: "omit"` and `AbortSignal` forwarding;
  - valid canonical response parsing;
  - identity mismatch and invalid coordinate rejection;
  - matching empty and single-point polylines;
  - typed `routeVersionStale` and generic failure normalization;
  - live and mock `RiderFlowClient` parity.
- Reducer/hook:
  - Geometry loading after explicit Direction Choice;
  - usable Geometry reaches Route Confirmation;
  - empty and single-point Geometry reach fallback confirmation;
  - exact retry context and contextual "Trocar sentido" recovery;
  - manual and nearby stale-version recovery without silent reselection;
  - silent aborts and stale success/failure request IDs;
  - confirmation enters the temporary live boundary without an Advice call.
- Screen flow:
  - nearby and manual paths both reach live Route Confirmation;
  - canonical polyline renders in the schematic;
  - missing Geometry fallback copy and actions;
  - Geometry API Error retains route/direction and exposes retry/change actions;
  - temporary "Linha confirmada" boundary copy and actions;
  - `/prototype` preserves fixture-backed confirmation and Advice states.

## Documentation And QA

Add an Issue #5 section to `docs/qa/05-api-integration.md` describing live
Geometry success, missing-Geometry fallback, retryable failures, stale-version
recovery, and the issue #6 boundary. Automated frontend completion gates are
mandatory. Attempt local browser smoke against `sombreado-service` when it is
available; if backend or CORS state prevents it, record the blocker rather than
adding backend behavior here.

## Rejected Approaches

### Keep the legacy segment-rich Geometry model

The frontend contract and `sombreado-service` browser endpoint already expose
a frontend-ready polyline. Preserving the old service-internal segment model
would require unnecessary adaptation and leave two competing Geometry shapes
inside the frontend.

### Maintain separate live and mock Geometry models

Parallel models would make prototype parity weaker and force the hook or screen
to branch on runtime mode. Both clients should satisfy one domain-facing
interface.

### Install Mapbox in issue #5

The live-transport baseline explicitly excludes Mapbox, and the existing
schematic is sufficient to verify Geometry success and fallback semantics.
Mapbox integration has separate token, loading, accessibility, and failure
concerns owned by Plan 06.

### Treat every short or malformed polyline as fallback

An empty or single-point matching response simply cannot draw a route and is a
safe fallback. Invalid coordinates or mismatched identity indicate a contract
failure that must remain visible and retryable.

### Call mocked Advice after live confirmation

Mixing live route selection and Geometry with mocked Advice would misrepresent
the product runtime. Issue #5 stops at an explicit confirmation boundary until
issue #6 connects live Advice.
