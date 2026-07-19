# 04c - Route Selection, Direction Choice, and Confirmation

## Goal

Build the core pre-advice journey from location/manual search through route selection, direction choice, and compact route confirmation.

## Dependencies

- `docs/plans/04a-app-scaffold-and-design-foundation.md`
- `docs/plans/04b-mock-contract-fixtures-and-flow-state.md`
- `docs/wireframes-v1.md`
- `docs/brand-guide.md`

## Work

- Wire the initial screen actions into the mocked flow state through a small app flow controller hook, not by putting all async orchestration directly in `app/page.tsx`.
- Keep `app/page.tsx` focused on rendering/routing by `FlowState.screen`.
- Implement mocked location behavior without calling real browser geolocation by default.
- Default location behavior should be fast and granted: tapping `Usar minha localização` resolves the mock location, loads nearby routes, and advances to route candidates.
- Keep denied, unavailable, timeout, slow, and empty location/nearby variants fixture-driven for tests and later scenario switching; do not add visible scenario controls in this plan.
- Implement `Finding Nearby Routes` and route-level `Route Candidate Selection`.
- Implement `Manual Route Search` as the secondary path.
- Manual search should be automatic and fast after the rider enters a short query, without requiring a separate submit action.
- Keep manual search route-only. Search can match route code, route name, terminal, destination, and direction labels, but selecting a result must go to direction choice.
- Implement reusable route cards with semantic button behavior and accessible labels.
- Keep route cards route-first. Do not show `Sentido ...` or any direction-looking selected state on route candidate cards.
- Route cards may show subdued source/match helper text such as nearby/manual result context.
- Implement `Direction Choice` after any route selection, with reusable direction rows.
- Direction rows should display the fixture direction `name` directly, with `departureLabels` as supporting context.
- Implement `Route Confirmation` after direction choice.
- Implement a compact static placeholder map region from mocked geometry. Draw a simple non-interactive schematic from `toRoutePolyline()` when geometry exists. Do not install or initialize Mapbox.
- Implement `Route Confirmation Fallback` for missing geometry or mocked map-unavailable scenarios.
- Make missing-geometry fallback reachable through normal mocked data by selecting the `888 Lagoa - Trindade` route from manual search.
- Cover map-unavailable fallback through integration tests using hook/test options or a test harness; do not add a visible scenario switcher yet.
- Keep route and direction context visible in direction choice, confirmation, fallback, and post-selection error states.
- Use contextual reset/back actions such as `Trocar linha`, `Trocar sentido`, `Atualizar localização`, and `Procurar linha manualmente`.
- `Trocar linha` should return to the selected route's source: nearby selections return to `Route Candidate Selection`, manual selections return to `Manual Route Search` with the previous query/results.
- `Trocar sentido` should preserve the selected route and return to direction choice when directions are already loaded.
- Add progress text only for the core path:
  - route selection: `1 de 4`
  - direction choice: `2 de 4`
  - route confirmation: `3 de 4`
- Do not add a persistent Home button or browser-history handling for each step.
- Tapping `Confirmar esta linha` or `Confirmar mesmo assim` should advance to `Computing Advice`, but 04c should not call `createOnboardAdvisory` or render advice result states. That handoff belongs to 04d.
- Render lightweight versions of reachable edge/error screens from the existing flow contract so the app never lands on a blank state:
  - `Location Denied Recovery`
  - `No Nearby Routes`
  - `No Manual Results`
  - `Route Without Directions`
  - `API Error`
- Keep those edge/error screens simple in 04c; deeper scenario switching and polish belong to 04e.
- Add focused integration tests for nearby selection, manual search, direction choice, confirmation, and confirmation fallback.

## Deliverable

- The mocked app can reach route confirmation from both nearby routes and manual search.

## Acceptance Criteria

- Nearby candidates are route-only choices and do not preselect direction.
- Manual search result selection always leads to direction choice before confirmation.
- Manual search updates results automatically for short rider queries.
- Confirmation shows selected route and selected direction.
- The static placeholder map renders when mocked geometry exists.
- The fallback confirmation state is reachable when geometry is missing or map availability is disabled by fixture/scenario.
- Selecting manual route `888 Lagoa - Trindade` can reach the missing-geometry fallback.
- Confirming from either map or fallback advances to `Computing Advice` without rendering advice results in this plan.
- `Trocar linha` returns to the source list/search for the selected route.
- Sticky actions do not cover content and remain usable on small mobile viewports.
- Tests cover the normal nearby path, normal manual path, map fallback path, and source-aware route changing.

## Verification

- Run `npm test`.
- Manually verify the nearby and manual paths at a 360px-wide viewport.
- Confirm no Mapbox package or token requirement was added.
