# 02 - Wireframes Creation

## Goal

Create low-fidelity mobile wireframes for the complete v1 onboard-first flow, including manual route search and preview-with-warning behavior, before coding the app.

## Inputs

- `docs/brand-guide.md`
- `docs/product-decisions.md`
- `CONTEXT.md`

## Work

- Define the ordered onboard flow as a screen-state contract: state name, trigger/input, primary action, fallback action, and minimum copy.
- Include a compact flow diagram that shows location, manual search, route selection, direction selection, confirmation, onboard result, preview result, true withheld, and error branches.
- Target a narrow mobile viewport around 360-390px and identify any sticky or fixed-position actions.
- Add wireframe-level accessibility notes for focus order, diagram text equivalents, non-color sun/shade cues, and reduced-motion-safe transitions.
- Wireframe the location request screen with location as the primary action and manual route search as a secondary action.
- Wireframe geolocation denied as a recovery state that leads into shared manual route search, with location retry as a secondary action.
- Wireframe nearby route candidate selection as route-only choices.
- Wireframe manual route search as a secondary path from route candidate selection.
- Wireframe route selection before direction selection, including the manual search path.
- Wireframe a dedicated direction choice screen or sheet after route selection, using rider-facing destination or neighborhood labels.
- Make selected direction explicit before the rider reaches route confirmation.
- Wireframe mandatory selected route confirmation after direction choice, with a compact map area.
- Wireframe the route confirmation fallback when map, token, or geometry is unavailable.
- Add light confirmation-screen copy that prepares riders for preview mode when they are not currently onboard.
- Wireframe the advisory result with the bus orientation diagram.
- Wireframe result mode labels, including onboard advice and route preview advice.
- Keep the bus orientation diagram structure consistent across onboard and preview results; distinguish preview through label and notice copy.
- Wireframe no candidates, route-without-directions, API error, slow loading, preview-with-warning, and true withheld states.
- Make no nearby route candidates recover through manual route search, with location retry as a secondary action.
- Treat off-route usage as a preview-with-warning state when an estimated point near the selected route can still produce advice.
- Document that preview-with-warning depends on service support for an estimated point on or near the selected route.
- Keep preview fallback point selection automatic for v1; do not add rider-facing segment or stop picking to the wireframes.
- In preview mode, keep the selected route/direction and make location refresh the primary recovery action.
- Reserve true withheld states for cases where the app cannot compute useful advice at all.
- Decide exact minimum Brazilian Portuguese copy for every state, including heading, body, primary action, secondary action, and notices where applicable.
- Note which states depend on mocked data, API responses, or the later Mapbox confirmation map.
- Ensure manual search returns route-only choices, then rejoins the same direction selection and selected route confirmation path as nearby route candidates.

## Deliverable

- A wireframe document in `docs/wireframes-v1.md`.

## Acceptance Criteria

- `docs/wireframes-v1.md` includes a compact screen-state contract that later implementation can follow without re-deciding flow behavior.
- `docs/wireframes-v1.md` includes a flow diagram for the complete v1 onboard and preview flow.
- Every core v1 state has a sketched layout and primary action.
- The result screen makes the seat-area recommendation obvious within a few seconds.
- Primary actions and route/direction choices are designed for one-handed mobile use on a moving bus.
- The bus diagram and preview/onboard distinctions do not rely on color alone.
- Empty and failure states are designed, not left as generic errors.
- The wireframes do not introduce timetable planning, stop planning, saved trips, or map-led navigation.
