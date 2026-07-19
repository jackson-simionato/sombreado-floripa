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
  - API error variants for nearby route lookup, manual search, direction lookup, route geometry, and advice computation
- Make the scenario switcher clearly dev/prototype-only and avoid mixing it into the rider-facing content hierarchy.
- Add tests for edge-state copy, primary actions, fallback actions, retry behavior, and scenario reachability.

## Clarified Decisions

- Implement the scenario switcher with direct seeded screen states, not scripted click-through flows. Normal flow tests should still validate the real reducer/action path.
- Keep seeded scenario state in a dedicated mock/prototype module such as `src/mocks/scenarioStates.ts`; do not weaken reducer invariants or put QA shortcuts in `src/domain/flow.ts`.
- Build seeded states through small fixture builders that reuse existing service-shaped fixtures and adapters, rather than hand-writing unrelated `FlowState` objects.
- Split scenario concepts:
  - `MockScenarioId` remains the mock API behavior axis.
  - Add a separate prototype scenario id/list for switcher entries and seeded UI states.
- Remount the flow when switching scenarios, keyed by the prototype scenario id, so reducer state, manual query draft, refs, mock API options, and timers reset together.
- Keep seeded loading scenarios inspectable until QA takes an action. Direct switcher entries for `findingNearbyRoutes`, `slowLoadingNotice`, and `computingAdvice` should not auto-complete.
- Place the switcher outside the rider-facing `AppShell`, as a visually distinct fixed developer/prototype tray with a compact selector and an explicit `Protótipo` label.
- Keep the switcher visible by default for this mocked prototype, but isolate it in a `PrototypeScenarioSwitcher` component so Plan 05 can remove or gate it cleanly.
- Use stable product-state labels in the switcher instead of raw fixture ids. Group labels by flow area, for example `Localização: busca lenta`, `Confirmação: fallback`, `Conselho: prévia`, and `Erro: conselho`.
- Implement multiple API error seeded states so retry context is testable for each failed operation:
  - nearby route lookup failure
  - manual search failure
  - direction lookup failure
  - route geometry failure
  - advice computation failure
- Preserve route and direction context in post-selection API error states.
- For manual-search API error, use `Usar minha localização` as the fallback action. Other API errors can keep `Procurar linha manualmente` as the fallback.
- Treat `True Withheld` as a recovery state, not a transient API failure: primary action is `Trocar linha`, secondary action is `Tentar de novo`.
- Tighten contractual edge-state copy to match `docs/wireframes-v1.md`, especially:
  - slow loading heading/body and `Continuar aguardando`
  - computing body `Vamos comparar esquerda e direita no sentido escolhido.`
  - true withheld heading `Não é possível recomendar agora`
  - API error fallback action based on failed operation
- Do not churn successful 04d advice result structure or copy except where required for scenario reachability or the clarified withheld action order.

## Deliverable

- QA can inspect every required mocked state and advisory variant without editing code.

## Acceptance Criteria

- Every state in `docs/wireframes-v1.md` is implemented or intentionally covered by a consolidated result state.
- Recovery actions lead to the expected previous, retry, or manual-search state.
- The API error state preserves enough context to retry the failed action.
- Scenario switcher entries use stable labels and do not require live services.
- Tests cover scenario switcher reachability for all major states.
- The scenario switcher is implemented as prototype-only UI outside the rider-facing content hierarchy.
- Seeded loading states remain available for visual QA instead of immediately resolving.
- `True Withheld` uses `Trocar linha` as the primary recovery action.

## Verification

- Run `npm test`.
- Manually walk through the scenario switcher and confirm every state renders.
- Confirm the switcher remains prototype-only and no production service/env dependency was introduced.
- Add a table-driven UI test over every prototype scenario id that asserts the expected primary heading and/or action.
- Add focused tests for retry targets, action order, manual-query preservation, post-selection context preservation, and API error fallback actions.
