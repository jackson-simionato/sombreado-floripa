# 04e - Edge States and Scenario Switcher

## Goal

Complete all mocked error, empty, recovery, and fallback states, then make every required state directly reachable through a prototype-only scenario switcher.

## Dependencies

- `docs/plans/04a-app-scaffold-and-design-foundation.md`
- `docs/plans/04b-mock-contract-fixtures-and-flow-state.md`
- `docs/plans/04c-route-selection-direction-confirmation.md`
- `docs/plans/04d-advice-results-and-bus-diagrams.md`
- `docs/wireframes-v1.md`

## Work

- Implement `Slow Loading Notice` for nearby lookup.
- Implement `Location Denied Recovery`.
- Implement `No Nearby Routes`.
- Implement `No Manual Results`.
- Implement `Route Without Directions`.
- Implement `API Error` with retry target context for route and advice failures.
- Ensure route and direction context stays visible in post-selection error states.
- Add recovery actions from the wireframe contract:
  - `Procurar linha manualmente`
  - `Tentar localização de novo`
  - `Buscar de novo`
  - `Trocar linha`
  - `Trocar sentido`
  - `Tentar de novo`
- Add a mocked-prototype-only scenario switcher that can directly reach:
  - location request
  - finding nearby routes
  - slow loading
  - denied location
  - route candidates
  - no nearby routes
  - manual search
  - no manual results
  - direction choice
  - route without directions
  - route confirmation
  - route confirmation fallback
  - computing advice
  - onboard left/right/front/back results
  - neutral overhead/none results
  - route preview result
  - true withheld
  - API error
- Make the scenario switcher clearly dev/prototype-only and avoid mixing it into the rider-facing content hierarchy.
- Add tests for edge-state copy, primary actions, fallback actions, retry behavior, and scenario reachability.

## Deliverable

- QA can inspect every required mocked state and advisory variant without editing code.

## Acceptance Criteria

- Every state in `docs/wireframes-v1.md` is implemented or intentionally covered by a consolidated result state.
- Recovery actions lead to the expected previous, retry, or manual-search state.
- The API error state preserves enough context to retry the failed action.
- Scenario switcher entries use stable labels and do not require live services.
- Tests cover scenario switcher reachability for all major states.

## Verification

- Run `npm test`.
- Manually walk through the scenario switcher and confirm every state renders.
- Confirm the switcher remains prototype-only and no production service/env dependency was introduced.
