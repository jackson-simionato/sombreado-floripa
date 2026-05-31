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

## Local-Service Smoke Checklist

Mark each state as verified against local service, verified with fixtures only, blocked by backend gap, or not checked.

| State or behavior | Local service | Fixtures | Notes |
| --- | --- | --- | --- |
| Missing `NEXT_PUBLIC_API_URL` fails clearly in live mode |  |  |  |
| Nearby route lookup after rider taps location |  |  |  |
| Nearby empty result |  |  |  |
| Manual route search |  |  |  |
| Manual empty result |  |  |  |
| Route candidates stay route-only |  |  |  |
| Direction choices load after route selection |  |  |  |
| Route without directions |  |  |  |
| Stale route version recovery |  |  |  |
| Geometry loads for confirmation |  |  |  |
| Missing geometry falls back to route confirmation fallback |  |  |  |
| Geometry network/API failure shows API error |  |  |  |
| Initial onboard advice request |  |  |  |
| Preview advice without location |  |  |  |
| Preview advice from far away/manual route selection |  |  |  |
| Neutral night advice |  |  |  |
| True withheld advice |  |  |  |
| Initial advice API error |  |  |  |
| Live location watch starts after confirmation/result |  |  |  |
| Live advice refresh is throttled |  |  |  |
| Background refresh failure preserves last advice |  |  |  |
| Live updates can be paused/stopped |  |  |  |
| Last-updated/freshness copy is visible |  |  |  |
| Browser location denial recovers through manual search |  |  |  |
| Low-accuracy location does not produce misleading onboard advice |  |  |  |
| Abort/stale request behavior does not mutate current state |  |  |  |

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

| Contract item | Status | Notes |
| --- | --- | --- |
| CORS allows local frontend origin |  |  |
| Public endpoints require no auth/cookies |  |  |
| CamelCase JSON fields |  |  |
| `GET /route-candidates/nearby` |  |  |
| `GET /route-candidates/search` |  |  |
| `GET /routes/{routeId}/directions?routeVersionId=...` |  |  |
| `GET /routes/{routeId}/directions/{routeDirectionId}/geometry?routeVersionId=...` |  |  |
| `POST /advice` |  |  |
| `POST /advice` supports `mode` |  |  |
| `POST /advice` supports `horizon` |  |  |
| `POST /advice` supports `fallbackToPreview` |  |  |
| Preview uses direction start without location |  |  |
| Preview is not distance-gated by rider location |  |  |
| Successful advice returns `recommendedSeatArea` |  |  |
| Successful advice returns `sunCondition` |  |  |
| Night returns neutral advice, not withheld |  |  |
| Non-2xx errors use stable envelope |  |  |
| Stale version returns `409 routeVersionStale` |  |  |

## Backend Contract Gaps

Record gaps that must be fixed in `sombreado-service` before Plan 05 can be fully verified against local service.

| Gap | Blocking state | Frontend fallback during Plan 05 | Backend follow-up |
| --- | --- | --- | --- |
|  |  |  |  |

## Result

Final QA status:

- Passed:
- Passed with backend gaps:
- Blocked:

Summary:

