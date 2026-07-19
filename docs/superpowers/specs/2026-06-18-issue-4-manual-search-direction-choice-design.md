# Issue 4 Manual Search And Direction Choice Design

## Purpose

Complete the live route-first selection path by keeping Manual Route Search on
the shared rider-flow client and loading authoritative Direction Choices only
after a Rider selects a Route Candidate.

Issue #4 removes the temporary issue #3 stop after route selection. It pins
Direction Choice lookup to the candidate's `routeVersionId`, handles stale
route versions without silent reselection, and then stops after the Rider
selects a direction. Route Geometry and Route Confirmation remain owned by
issue #5.

## Settled Decisions

- Manual Route Search remains a 180 ms debounced type-ahead interaction.
- Manual search keeps `limit: 8` and preserves Sombreado Service response
  order exactly. The frontend does not sort results.
- Clearing the query aborts the active request, clears candidates and
  empty/error state, and makes no API request.
- Starting a new manual request clears results from the prior query and shows a
  loading message so stale cards cannot appear below new input.
- Route Candidates remain route-only. `directionHints` may remain display-only
  supporting text, but candidates never contain selectable direction IDs.
- Direction Choices load only after Route Candidate selection.
- Direction requests use both the selected `routeId` and its exact
  `routeVersionId`.
- Direction Choice response order is backend-owned and preserved exactly.
  `sequence` remains metadata; the frontend does not sort by it.
- Direction loading has a dedicated Rider-facing state that retains the
  selected route summary. It does not reuse nearby-route loading copy.
- `200 { "directions": [] }` renders the existing Route Without Directions
  state rather than an API error.
- A non-stale Direction Choice failure uses the existing retryable API Error
  state. Retry repeats the same route/version request; changing route remains
  available.
- A typed `409 routeVersionStale` triggers route-choice recovery rather than a
  generic error:
  - manual origin restores and reruns the previous query;
  - nearby origin reruns nearby discovery with the latest usable location;
  - neither path silently reselects the old route or direction.
- Refreshed candidates show an inline notice:
  "As opções desta linha foram atualizadas. Escolha a linha e o sentido
  novamente."
- Public API errors are parsed through one shared Zod-validated error boundary.
  Backend `message` values and validation details are never rendered.
- Manual and direction requests use `AbortController`. Aborts are silent and
  reducer request IDs remain the final stale-response correctness guard.
- `/prototype` loads Direction Choices through the same `RiderFlowClient`
  operation as live mode while retaining fixture-backed data.
- The issue #3 `stopAfterRouteSelection` option and
  `liveRouteSelectedUnsupported` screen are removed.
- Live mode adds a temporary issue #4 boundary after direction selection. It
  shows the selected route and direction with "Trocar sentido" and "Trocar
  linha" actions. It does not request Geometry or show a disabled continuation
  action.

## Scope

In scope:

- Shared public API error-envelope parsing and typed `routeVersionStale`.
- A Zod-validated Direction Choice transport client for:
  `GET /routes/{routeId}/directions?routeVersionId={routeVersionId}`.
- `listRouteDirections` on both live and mock `RiderFlowClient`
  implementations.
- Service-order-preserving adaptation into domain `DirectionChoice` values.
- Manual search cancellation, clearing, loading, and stale-response behavior.
- Dedicated Direction Choice loading and post-selection boundary states.
- Exact route-version retry and stale-version recovery for manual and nearby
  origins.
- Existing Route Without Directions and generic API Error recovery paths.
- Automated tests at transport/client, reducer/hook, and screen seams.
- Issue #4 expectations in `docs/qa/05-api-integration.md`.

Out of scope:

- Route Geometry transport or rendering.
- Route Confirmation or Mapbox behavior.
- Advice requests or Advice response adaptation.
- Location accuracy/freshness timestamps and recent-location policy.
- Live location watching or background Advice refresh.
- Backend CORS, API routes, route processing, scraper behavior, or database
  work.

## Architecture

Add `src/api/browserApi.ts` as the narrow shared browser transport boundary. It
owns base URL normalization, `credentials: "omit"`, abort classification,
public error-envelope parsing, and Zod validation of success responses.
`src/api/routeCandidates.ts` and the new `src/api/routeDirections.ts` define
operation-specific schemas and URLs on top of that boundary.

Extend the domain-facing `RiderFlowClient` with:

```ts
listRouteDirections(
  input: { routeId: string; routeVersionId: string },
  options?: { signal?: AbortSignal }
): Promise<DirectionChoice[]>;
```

The live implementation maps camelCase transport values without sorting. The
mock implementation calls the existing fixture API with the same route/version
input and adapts the result without sorting. Route Candidate hints stay
non-authoritative.

`useOnboardingFlow` remains the async orchestration boundary. It owns one abort
controller for the current manual search and one for the current directions
request. It passes explicit request IDs into the reducer and ignores abort
errors. The reducer owns deterministic screen state, pending request identity,
selection clearing, recovery notice state, and the no-silent-reselection
invariant.

## User Flows

### Manual Search To Direction Choice

1. Rider opens Manual Route Search.
2. Rider types a non-empty query.
3. After 180 ms, prior results clear and the app requests live Route
   Candidates with `limit: 8`.
4. The app renders candidates in service order.
5. Rider selects a route-only candidate.
6. The app shows "Carregando sentidos desta linha..." with the route summary.
7. The app requests directions with the selected `routeId` and exact
   `routeVersionId`.
8. The app renders Direction Choices in service order.
9. Rider selects a direction.
10. Live mode shows the issue #4 boundary with route and direction summaries;
    prototype mode continues through its existing fixture-backed Geometry
    path.

### Nearby Candidate To Direction Choice

The nearby path reuses steps 5-10 above. Manual and nearby selection must join
the same Direction Choice request and reducer path.

### Stale Route Version

1. A version-pinned directions request returns `409 routeVersionStale`.
2. The app clears the old route and direction selection.
3. For manual origin, it reruns the preserved query. For nearby origin, it
   reruns discovery with the latest usable location.
4. The refreshed list shows the inline update notice.
5. The Rider must explicitly choose the route and direction again.

## Error And Cancellation Semantics

- Valid public `routeVersionStale` errors produce typed recovery behavior.
- Valid public errors with other codes, malformed error envelopes, malformed
  success bodies, network failures, and non-stale HTTP failures normalize to
  generic Rider-facing API errors.
- Backend diagnostic messages, Zod details, route IDs, and version IDs do not
  appear in Rider copy.
- Retrying a generic Direction Choice error repeats the exact selected
  route/version pair.
- Changing a query aborts its prior request. Selecting another route aborts the
  prior directions request. Leaving the flow or unmounting aborts both.
- Abort failures do not dispatch `operationFailed`.
- A response with a non-current reducer request ID cannot update candidates,
  Direction Choices, selection, or errors even if cancellation loses a race.

## Testing

Use test-first changes at three layers:

- Transport/client:
  - exact direction URL encoding and `routeVersionId` query parameter;
  - `credentials: "omit"` and `AbortSignal` forwarding;
  - Direction Choice schema validation and service-order preservation;
  - shared public error parsing and typed `routeVersionStale`;
  - live and mock `RiderFlowClient` parity.
- Reducer/hook:
  - manual search clears old results and handles an empty query;
  - dedicated directions loading state;
  - empty Direction Choices;
  - exact retry context;
  - manual and nearby stale-version recovery with no silent reselection;
  - silent aborts and stale request IDs.
- Screen flow:
  - manual and nearby candidates both reach live Direction Choice;
  - candidates remain route-only;
  - loading, empty, generic error, and stale-recovery copy;
  - Direction Choice response order;
  - selected direction reaches the issue #4 boundary;
  - `/prototype` continues through mock Direction Choices.

## Documentation And QA

Add an Issue #4 section to `docs/qa/05-api-integration.md` describing the live
manual/direction path, version pinning, stale recovery, and issue #5 boundary.
Automated frontend completion gates are mandatory. Attempt local browser smoke
against `sombreado-service` when it is available; if backend or CORS state
prevents it, record the blocker rather than adding backend behavior here.

## Rejected Approaches

### Load directions from Route Candidate hints

Hints are presentation metadata and have no selectable direction IDs. Treating
them as authoritative would collapse route and direction selection and bypass
route-version validation.

### Sort Direction Choices by `sequence`

The browser contract makes response order authoritative. Frontend sorting would
hide service-order bugs and produce different live and mock semantics.

### Treat stale route versions as generic retryable errors

Retrying the same stale version cannot safely advance the flow. Recovery must
refresh choices and require explicit route and direction reselection.

### Keep the issue #3 stop after route selection

That state exists only because Direction Choice was intentionally deferred.
Keeping it after issue #4 would leave two competing live selection paths.

### Start Route Geometry in issue #4

Geometry introduces separate success, missing-data fallback, and retryable
failure semantics. Those belong to issue #5 and should not expand this slice.
