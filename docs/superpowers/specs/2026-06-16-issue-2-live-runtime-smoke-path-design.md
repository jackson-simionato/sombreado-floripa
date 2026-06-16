# Issue 2 Live Runtime Smoke Path Design

## Purpose

Prepare the smallest live-backed runtime path for issue #2, while keeping the
full fixture-driven prototype available for QA.

The goal is not full Plan 05 API integration. This slice proves that the main
product runtime is intentionally live-backed, refuses to run without
`NEXT_PUBLIC_API_URL`, and sends browser API requests without credentials.

## Scope

Implement this issue as a thin frontend-only extraction from Plan 05.

In scope:

- `/` is the live product runtime.
- `/` requires `NEXT_PUBLIC_API_URL`.
- Missing API configuration renders a clear Portuguese configuration screen
  before the rider flow starts.
- `/` never silently falls back to fixtures.
- `/prototype` preserves the existing fixture-driven scenario switcher and full
  mocked route-to-advice flow.
- The live smoke path covers route candidates only:
  - nearby route candidates after browser geolocation succeeds
  - manual route search
- Live route-candidate requests use `credentials: "omit"`.
- Route-candidate response JSON is validated with Zod at the API boundary.
- Selecting a live route candidate shows a compact unsupported-next-step state
  instead of continuing into mocked directions, geometry, or advice.
- QA docs reference the backend CORS dependency
  `jackson-simionato/sombreado-service#11` as the blocker for local live smoke.

Out of scope:

- Backend CORS changes in this repository.
- Direction choices, geometry, advice, stale route version recovery, or live
  advice refresh.
- A full replacement of existing mock fixtures or reducer states.
- A runtime flag that allows `/` to use fixtures.

## Architecture

Add a small live route-candidate API boundary, separate from the existing mock
flow reducer. This avoids polluting the domain flow with a temporary state that
exists only because live integration is incomplete.

The live runtime owns a local UI state machine:

- `missingConfig`
- `idle`
- `loading`
- `results`
- `empty`
- `error`
- `selectedUnsupported`

The existing reducer-driven app remains the prototype runtime and moves to
`/prototype`.

## API Boundary

Create a route-candidate client with two methods:

- `listNearbyRouteCandidates({ lat, lng, radiusMeters, limit })`
- `searchRouteCandidates({ query, limit })`

Both methods call the browser-facing contract in `docs/api-contract.md` using
`NEXT_PUBLIC_API_URL` as the base URL, including the `/v1` prefix. Fetch calls
must use `credentials: "omit"`.

Use a narrow Zod schema for `RouteCandidatesResponse`. Do not add schemas for
directions, geometry, or advice in this issue.

## Missing Configuration

If `NEXT_PUBLIC_API_URL` is not set, the live runtime renders a configuration
screen before the rider flow:

- Heading: `Configuração da API ausente`
- Body: `O Sombreado Floripa precisa de NEXT_PUBLIC_API_URL para carregar dados ao vivo. Configure a URL pública do sombreado-service e recarregue a página.`
- Rider line: `As informações das linhas não estão disponíveis neste ambiente.`

This is not the normal rider API error state. It is deployment/configuration
copy that is useful to maintainers and understandable to riders.

## Live Smoke Stop

After a live route candidate is selected, `/` must not continue into mocked
directions or advice. Instead, show a compact state explaining that live route
candidate loading worked but the next live step is outside this issue.

Suggested copy:

- Heading: `Linha carregada ao vivo`
- Body: `Ainda não é possível continuar com dados ao vivo neste ambiente. A próxima etapa vai conectar sentido, confirmação e conselho.`
- Secondary action: return to route selection or manual search.

## Testing

Use test-first changes for:

- missing `NEXT_PUBLIC_API_URL` renders the configuration screen
- live nearby/manual route candidate requests use `credentials: "omit"`
- `/` does not render the prototype scenario switcher
- `/prototype` keeps the prototype scenario switcher
- selecting a live candidate does not continue into mocked directions/advice

## Documentation

Update `docs/qa/05-api-integration.md` with an issue #2 smoke section. It should
state that local live browser smoke is blocked until
`jackson-simionato/sombreado-service#11` is resolved, without adding backend
behavior to this repository.
