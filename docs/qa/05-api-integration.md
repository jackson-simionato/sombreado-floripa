# 05 API Integration QA

Use this document to record verification for Plan 05. The goal is to prove the frontend can run against a local `sombreado-service` through `NEXT_PUBLIC_API_URL` while keeping mocked tests and prototype scenarios intact.

## Environment

Record during QA:

- Frontend branch:
- Frontend commit:
- `NEXT_PUBLIC_API_URL`:
- Browser and version:
- Device or viewport:
- Local `sombreado-service` branch:
- Local `sombreado-service` commit:
- Backend seed/data set:

## Commands

Run from the repository root:

```bash
npm test
npm run lint
npm run typecheck
```

Run the app with a local service URL:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/v1 npm run dev
```

Confirm no backend or scraper behavior was added to this frontend repo:

```bash
rg "FastAPI|APIRouter|scraper|GTFS|CREATE TABLE|INSERT INTO" app src tests
```

Expected result: no backend implementation code in `app`, `src`, or `tests`. Mentions in docs are acceptable when they describe repo boundaries or contract gaps.

## Issue #2 Live Runtime Smoke

Issue #2 prepares the smallest live-backed product runtime path. It does not
complete full Plan 05 API integration.

Expected issue #2 behavior:

- `/` is live-only and requires `NEXT_PUBLIC_API_URL`.
- `/` shows `Configuração da API ausente` when the public API URL is missing.
- `/` does not render the fixture-driven prototype scenario switcher.
- `/prototype` keeps the full mocked flow and scenario switcher for QA.
- Live route-candidate requests use `credentials: "omit"`.
- Live smoke covers nearby route candidates and manual route search only.
- Selecting a live route candidate stops at the unsupported-next-step state
  until later slices connect direction, confirmation, and advice.

Local live browser smoke is blocked until
`jackson-simionato/sombreado-service#11` allows the local Next.js origin through
backend CORS. Do not add backend CORS behavior, API routes, scraper behavior, or
advisory computation to this frontend repository.

## Issue #3 Live Nearby Route Candidates

Issue #3 moves live Route Candidate discovery from the temporary issue #2 smoke
runtime into the reducer-driven Onboard Flow. It still does not complete full
Plan 05 API integration.

Expected issue #3 behavior:

- `/` uses the same route-first Onboard Flow screens as the prototype runtime,
  backed by a live rider-flow client.
- `/prototype` keeps the fixture-driven mocked flow and scenario switcher.
- Nearby Route Candidates are requested only after the Rider taps the location
  action.
- Nearby lookup sends `radiusMeters: 1200` and `limit: 5`.
- Manual Route Search remains live and uses the same rider-flow client boundary.
- Nearby and manual Route Candidate order preserves Sombreado Service response
  order.
- Route Candidates remain route-only before Direction Choice.
- Selecting a live Route Candidate stops before Direction Choice until issue #4.
- Malformed responses, public API errors, network failures, and stale reducer
  requests are handled through controlled flow states.

Local live browser smoke still depends on
`jackson-simionato/sombreado-service#11` allowing the local Next.js origin
through backend CORS. Do not add backend CORS behavior, API routes, scraper
behavior, route-data processing, or advisory computation to this frontend
repository.

## Issue #4 Manual Search And Direction Choice

Issue #4 completes the live route-first selection path through Direction
Choice. It stops before Route Geometry, which remains owned by issue #5.

Expected issue #4 behavior:

- Manual Route Search remains debounced and preserves service relevance order.
- Clearing or replacing a query cancels obsolete requests and stale results.
- Nearby and manual Route Candidates remain route-only.
- Selecting either candidate source loads Direction Choices through the shared
  rider-flow client.
- Direction requests include the selected `routeVersionId` and preserve service
  order.
- Empty Direction Choices render Route Without Directions.
- `routeVersionStale` refreshes candidates and requires explicit route and
  direction reselection.
- Generic Direction Choice failures retry the exact route/version request.
- Live direction selection stops before Geometry, which remains issue #5.
- `/prototype` keeps fixture-backed Direction Choice and downstream states.

Automated coverage verifies the live manual/direction path, cancellation,
response order, route-version pinning, stale-version recovery, Route Without
Directions, and prototype parity. Local browser smoke was not run during this
slice because it requires a separately running local `sombreado-service` with
compatible seeded route data and CORS configuration. This is an environment
dependency, not permission to add backend behavior to this repository.

## Issue #5 Route Geometry And Confirmation

Issue #5 completes the live flow through Route Confirmation. It stops after
confirmation, before the initial Advice request owned by issue #6.

Expected issue #5 behavior:

- Selecting a Direction Choice loads Geometry through the shared rider-flow
  client with the selected route, version, and direction identifiers.
- Live Geometry uses the canonical camelCase frontend polyline contract.
- Response identifiers must match the request context before Geometry renders.
- Matching Geometry with at least two valid points renders the existing compact
  schematic confirmation.
- Matching empty or single-point Geometry renders Route Confirmation Fallback
  and still allows confirmation.
- Invalid coordinates, mismatched identifiers, network failures, and service
  failures render retryable API Error.
- Geometry retry repeats the exact route/version/direction request; the
  secondary recovery action is "Trocar sentido".
- `routeVersionStale` refreshes candidates and requires explicit route and
  direction reselection.
- AbortController and reducer request IDs prevent obsolete Geometry responses
  from mutating current state.
- Live confirmation enters a temporary "Linha confirmada" boundary and does
  not call mocked Advice.
- `/prototype` keeps fixture-backed Geometry and downstream Advice states
  through the same rider-flow client interface.

Automated coverage must verify transport validation, request context,
success/fallback/error mapping, exact retry, stale-version recovery, aborted
and late responses, the temporary live confirmation boundary, and prototype
parity. Attempt local browser smoke with `sombreado-service`; record unavailable
backend or CORS state as a blocker rather than adding backend behavior here.

Implementation evidence for issue #5:

- `npm run format:check`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run typecheck`: passed.
- `npm run test`: passed with 9 test files and 148 tests.
- `npm run build`: passed; `/` and `/prototype` were prerendered successfully.
- The frontend-only boundary scan found no backend, scraper, GTFS, or database
  implementation in `app`, `src`, or `tests`.
- Local-service browser smoke was blocked because no service was listening at
  `http://127.0.0.1:8000`; the `/health/live` probe failed with curl error 7.
  `.env.local` was configured with
  `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/v1`.

## Issue #7 Stale Route Version Recovery

Issue #7 keeps stale route-version recovery explicit across direction,
geometry, and advice-adjacent flows.

Expected issue #7 behavior:

- `routeVersionStale` clears the selected route, direction, geometry, and
  advice state before recovery starts.
- Nearby-origin stale recovery asks for a fresh browser location first, then
  falls back to the most recent usable nearby location if the fresh lookup
  fails.
- Manual-origin stale recovery restores the previous query and reruns it
  without requiring retyping.
- If neither a fresh nor recent nearby location is usable, the flow lands in
  `locationDeniedRecovery` with the manual-search escape hatch.
- The stale notice stays visible on the refreshed candidate/search screen and
  clears once the rider selects a new route.

Automated coverage verifies fresh-location-first nearby recovery, recent
fallback, manual rerun, current advice request recovery, and no silent
reselection. Local browser smoke was not rerun for this slice.

## Issue #8 Runtime Split And Prototype QA

Issue #8 locks the final Plan 05 runtime split instead of adding new backend
behavior.

Expected issue #8 behavior:

- `/` is the live product runtime and requires `NEXT_PUBLIC_API_URL`.
- `/` never falls back to fixture-backed route, direction, geometry, or advice
  data when live configuration is missing or miswired.
- `/prototype` is the fixture-backed QA runtime and keeps the prototype
  scenario switcher.
- `/prototype` does not require `NEXT_PUBLIC_API_URL`.
- Prototype scenarios use the same rider-flow client operation shape as live
  mode, but remain backed by shared mock fixtures.

Automated coverage verifies missing live config behavior, live route separation
from the prototype switcher, explicit live-flow dependency guards, prototype
route availability, and prototype scenario reachability. Local browser smoke
should record the live-service path separately from fixture-only prototype
coverage in the checklist below.

## Local-Service Smoke Checklist

Mark each state as verified against local service, verified with fixtures only, blocked by backend gap, or not checked.

| State or behavior                                                | Local service | Fixtures | Notes                                                                                                                    |
| ---------------------------------------------------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Missing `NEXT_PUBLIC_API_URL` fails clearly in live mode         | Not checked   | Verified | Automated route-split coverage renders the live missing-config screen without prototype switcher                         |
| Main `/` route does not render prototype scenario switcher       | Not checked   | Verified | Automated coverage verifies `/` stays live-only when `NEXT_PUBLIC_API_URL` is present                                    |
| `/prototype` is available without `NEXT_PUBLIC_API_URL`          | Not checked   | Verified | Fixture-backed prototype route keeps the scenario switcher and default location screen                                   |
| Main `/` route cannot silently fall back to fixtures             | Not checked   | Verified | Explicit live-flow dependency guard fails fast if live dependencies are missing                                          |
| Nearby route lookup after rider taps location                    |               |          |                                                                                                                          |
| Nearby empty result                                              |               |          |                                                                                                                          |
| Manual route search                                              |               |          |                                                                                                                          |
| Manual empty result                                              |               |          |                                                                                                                          |
| Route candidates stay route-only                                 |               |          |                                                                                                                          |
| Direction choices load after route selection                     |               |          |                                                                                                                          |
| Route without directions                                         |               |          |                                                                                                                          |
| Stale route version recovery                                     | Blocked       | Verified | Service offline; automated coverage now includes fresh-location-first nearby recovery, recent fallback, and manual rerun |
| Geometry loads for confirmation                                  | Blocked       | Verified | Service offline; live-client flow test passed                                                                            |
| Missing geometry falls back to route confirmation fallback       | Blocked       | Verified | Service offline; empty-polyline flow test passed                                                                         |
| Geometry network/API failure shows API error                     | Blocked       | Verified | Service offline; retry flow test passed                                                                                  |
| Initial onboard advice request                                   |               |          |                                                                                                                          |
| Preview advice without location                                  |               |          |                                                                                                                          |
| Preview advice from far away/manual route selection              |               |          |                                                                                                                          |
| Neutral night advice                                             |               |          |                                                                                                                          |
| True withheld advice                                             |               |          |                                                                                                                          |
| Initial advice API error                                         |               |          |                                                                                                                          |
| Live location watch starts after confirmation/result             |               |          |                                                                                                                          |
| Live advice refresh is throttled                                 |               |          |                                                                                                                          |
| Background refresh failure preserves last advice                 |               |          |                                                                                                                          |
| Live updates can be paused/stopped                               |               |          |                                                                                                                          |
| Last-updated/freshness copy is visible                           |               |          |                                                                                                                          |
| Browser location denial recovers through manual search           |               |          |                                                                                                                          |
| Low-accuracy location does not produce misleading onboard advice |               |          |                                                                                                                          |
| Abort/stale request behavior does not mutate current state       |               |          |                                                                                                                          |

## Rider Copy Checks

Confirm the UI:

- Uses Brazilian Portuguese rider-facing copy.
- Labels actual onboard advice as onboard advice.
- Labels route preview advice as preview advice.
- Does not expose backend `message`, stack traces, route debug terms, bearings, shape IDs, or raw error details.
- Does not promise guaranteed shade.
- Keeps the geometric estimate notice visible.
- Distinguishes preview, withheld, API error, and paused live update states without relying on color alone.

## API Contract Checks

Confirm local service compatibility with `docs/api-contract.md`:

| Contract item                                                                     | Status | Notes |
| --------------------------------------------------------------------------------- | ------ | ----- |
| CORS allows local frontend origin                                                 |        |       |
| Public endpoints require no auth/cookies                                          |        |       |
| CamelCase JSON fields                                                             |        |       |
| `GET /route-candidates/nearby`                                                    |        |       |
| `GET /route-candidates/search`                                                    |        |       |
| `GET /routes/{routeId}/directions?routeVersionId=...`                             |        |       |
| `GET /routes/{routeId}/directions/{routeDirectionId}/geometry?routeVersionId=...` |        |       |
| `POST /advice`                                                                    |        |       |
| `POST /advice` supports `mode`                                                    |        |       |
| `POST /advice` supports `horizon`                                                 |        |       |
| `POST /advice` supports `fallbackToPreview`                                       |        |       |
| Preview uses direction start without location                                     |        |       |
| Preview is not distance-gated by rider location                                   |        |       |
| Successful advice returns `recommendedSeatArea`                                   |        |       |
| Successful advice returns `sunCondition`                                          |        |       |
| Night returns neutral advice, not withheld                                        |        |       |
| Non-2xx errors use stable envelope                                                |        |       |
| Stale version returns `409 routeVersionStale`                                     |        |       |

## Backend Contract Gaps

Record gaps that must be fixed in `sombreado-service` before Plan 05 can be fully verified against local service.

| Gap | Blocking state | Frontend fallback during Plan 05 | Backend follow-up |
| --- | -------------- | -------------------------------- | ----------------- |
|     |                |                                  |                   |

## Result

Final QA status:

- Passed:
- Passed with backend gaps:
- Blocked:

Summary:
