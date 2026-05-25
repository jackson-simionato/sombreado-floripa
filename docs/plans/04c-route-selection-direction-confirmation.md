# 04c - Route Selection, Direction Choice, and Confirmation

## Goal

Build the core pre-advice journey from location/manual search through route selection, direction choice, and compact route confirmation.

## Dependencies

- `docs/plans/04a-app-scaffold-and-design-foundation.md`
- `docs/plans/04b-mock-contract-fixtures-and-flow-state.md`
- `docs/wireframes-v1.md`
- `docs/brand-guide.md`

## Work

- Wire the initial screen actions into the mocked flow state.
- Implement mocked location behavior without calling real browser geolocation by default.
- Implement `Finding Nearby Routes` and route-level `Route Candidate Selection`.
- Implement `Manual Route Search` as the secondary path.
- Keep manual search route-only. Search can match route code, route name, terminal, destination, and direction labels, but selecting a result must go to direction choice.
- Implement reusable route cards with semantic button behavior and accessible labels.
- Implement `Direction Choice` after any route selection, with reusable direction rows.
- Implement `Route Confirmation` after direction choice.
- Implement a compact static placeholder map region from mocked geometry. Do not install or initialize Mapbox.
- Implement `Route Confirmation Fallback` for missing geometry or mocked map-unavailable scenarios.
- Keep route and direction context visible in direction choice, confirmation, fallback, and post-selection error states.
- Use contextual reset/back actions such as `Trocar linha`, `Trocar sentido`, `Atualizar localização`, and `Procurar linha manualmente`.
- Add progress text only for the core path:
  - route selection: `1 de 4`
  - direction choice: `2 de 4`
  - route confirmation: `3 de 4`
- Do not add a persistent Home button or browser-history handling for each step.
- Add focused integration tests for nearby selection, manual search, direction choice, confirmation, and confirmation fallback.

## Deliverable

- The mocked app can reach route confirmation from both nearby routes and manual search.

## Acceptance Criteria

- Nearby candidates are route-only choices and do not preselect direction.
- Manual search result selection always leads to direction choice before confirmation.
- Confirmation shows selected route and selected direction.
- The static placeholder map renders when mocked geometry exists.
- The fallback confirmation state is reachable when geometry is missing or map availability is disabled by fixture/scenario.
- Sticky actions do not cover content and remain usable on small mobile viewports.
- Tests cover the normal nearby path, normal manual path, and map fallback path.

## Verification

- Run `npm test`.
- Manually verify the nearby and manual paths at a 360px-wide viewport.
- Confirm no Mapbox package or token requirement was added.
