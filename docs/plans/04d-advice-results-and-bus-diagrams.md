# 04d - Advice Results and Bus Diagrams

## Goal

Build the advisory result experience, including computing state, onboard advice, route preview advice, neutral computed advice, true withheld, and real bus diagrams.

## Dependencies

- `docs/plans/04a-app-scaffold-and-design-foundation.md`
- `docs/plans/04b-mock-contract-fixtures-and-flow-state.md`
- `docs/plans/04c-route-selection-direction-confirmation.md`
- `docs/brand-guide.md`
- `docs/wireframes-v1.md`

## Work

- Implement `Computing Advice` after route confirmation.
- Implement `Onboard Advice Result` with route and direction context.
- Implement `Route Preview Advice Result` as a clearly labeled preview result. Do not add a separate preview-warning screen.
- Implement `True Withheld` only for cases where useful advice cannot be computed.
- Implement neutral computed results for `overhead` and `none`.
- Keep route and direction context visible in computing, onboard result, preview result, neutral result, and withheld states.
- Add progress text `4 de 4` to advice result states, but not to withheld if it reads as an error/recovery state.
- Implement real advisory bus diagrams, not placeholders:
  - lengthwise left/right split as the main product motif for `left` and `right`
  - distinct secondary front/back diagram for `front` and `back`
  - neutral diagram frame for `overhead` and `none` with no fake side recommendation
- Use color plus labels, hatching, icons, outlines, or check marks. Never rely on color alone.
- Add accessible text equivalents for every bus diagram.
- Use direct recommendation copy:
  - `Sente à esquerda`
  - `Melhor sentar à direita`
  - front/back copy that recommends seats farther forward or farther back without pretending it is a left/right result
- Keep the geometric estimate notice visible on advice results.
- Add tests for left/right, front/back, overhead/none, preview, and withheld rendering.

## Deliverable

- The prototype can complete the mocked flow and show every advisory result type with accessible diagrams and honest limitations.

## Acceptance Criteria

- `left` and `right` produce seat-side recommendations.
- `front` and `back` use front/back presentation and copy.
- `overhead` and `none` are neutral computed results and do not claim a best side.
- `withheld` is reserved for cases where useful advice cannot be computed.
- Preview advice is visibly distinct from onboard advice without relying on color alone.
- Every diagram has an accessible text summary.
- Tests assert that neutral and front/back variants do not show left/right recommendation copy.

## Verification

- Run `npm test`.
- Manually verify advice result layout at a 360px-wide viewport.
- Check reduced-motion behavior if any animation is introduced.
