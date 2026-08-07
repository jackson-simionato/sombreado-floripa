# Advice State Prototype Design QA

## Comparison Target

- Source visual truth: `docs/design/wayfinder/selected-signature-advice-direction-v2.png`
- Source pixels: 941 × 1672
- Implementation: `docs/design/wayfinder/advice-state-prototype/360x640-left-onboard.png`
- Implementation viewport: 360 × 640 at device scale factor 1
- Comparison state: left-side recommendation, onboard advice
- Full-view comparison: `docs/design/wayfinder/advice-state-prototype/comparison-left-onboard-360x640.png`
- Focused proof comparison: `docs/design/wayfinder/advice-state-prototype/comparison-focus-proof-left-onboard-360x640.png`

## Findings

No actionable P0, P1, or P2 differences remain.

- Brand system: the implementation uses the repository’s Newsreader/Hanken Grotesk type pairing, warm alabaster surface, charcoal action, soft-blue recommendation field, and sun-tan exposure field.
- Hierarchy: progress, route receipt, advice context, serif recommendation, visual proof, boarding cue, estimate disclosure, and persistent actions follow the selected source’s order and emphasis.
- Diagram fidelity: the proof uses generated flat bus artwork inspired by `bus_diagram.png`, not CSS art. The side asset is mirrored for right advice. Front, back, and neutral have dedicated artwork whose seat zones change with the state.
- Directional axis: left/right states keep vertical side-by-side fields. Front/back states switch to horizontal top/middle/bottom bands so the color split follows the advice axis. Their five-row assets consistently color the two outer pairs and leave the middle row neutral.
- Physical consistency: every direction uses the same 250 px artwork slot and center anchor; front/back bands now wrap the bus instead of leaving a large white gap.
- Vehicle detail consistency: the rear lanterns are red in side, front, back, and neutral artwork variants.
- Front/back alignment: the visible bus body is nudged within the horizontal proof frame so the top and bottom surrounding space read evenly.
- Front/back field balance: the neutral background strip is drawn from the proof container's exact vertical midpoint, aligned to the middle seat row; the colored fields continue around the bus to the remaining edges.
- Non-color meaning: recommendation and higher-incidence areas pair color with Phosphor check/sun icons, explicit labels, area names, and an accessible text summary.
- Copy: rider-facing advice consistently uses `incidência de sol`; the selected state says `Este lado tende a ter menor incidência de sol.` and the proof says `Maior incidência`.
- Responsive behavior: 30 combinations passed across 360 × 640 and 390 × 844: five recommendation areas multiplied by onboard, preview, and recent-location contexts. No document or screen overflow, clipped persistent action, cropped proof text, missing artwork, incorrect asset state, or browser console error was recorded.
- Interaction and accessibility: estimate and options sheets focus their headings, make the background inert, trap focus, close with Escape or backdrop, restore focus to their trigger, and expose action outcomes through a live status region. Reduced-motion checks pass.

## Comparison History

1. The first generated-artwork pass scaled the bus too far beyond its center slot, cropping the vehicle and colliding with the callouts.
   - Fix: switched from percentage scaling to a measured 250 px image slot at 360 × 640 and re-centered the callouts.
2. Immediate Playwright assertions raced the component’s intentional `requestAnimationFrame` focus restoration, and one matrix state was measured before its image decoded.
   - Fix: wait for asynchronous focus and image readiness before measuring or capturing.
3. Next.js development chrome appeared over the first comparison capture.
   - Fix: exclude the development portal from screenshot evidence while leaving the app DOM unchanged.
4. The oversized generated image was centered by its grid alignment fallback, which placed its left edge at the frame edge and shifted the visible bus.
   - Fix: position the artwork from the frame’s 50%/50% point and assert the artwork/frame center delta in the browser validator.
5. Front/back states initially inherited the mobile three-column media rule, so their surrounding fields remained vertical.
   - Fix: add a mobile deck layout override with horizontal color bands, centered bus artwork, and a regression assertion for the horizontal proof axis.
6. Front/back artwork initially used uneven seat-zone counts and a smaller image slot, which made the bus feel inconsistent between directions.
   - Fix: regenerate both five-row assets with two colored rows, one neutral middle row, two colored rows, then restore the shared artwork width and wrap it with horizontal bands.
7. The generated front/back variants inherited dark olive rear lanterns and their transparent padding made the visible body sit slightly high.
   - Fix: normalize the lantern fill to the shared red and apply a small deck-only vertical optical correction.
8. The first horizontal-band layout left an oversized neutral center field around the bus.
   - Fix: make the neutral strip a deterministic centered band aligned to the middle seat row, allowing the colored fields to wrap the bus farther toward the center.
9. The horizontal fields initially used generic surface tokens that did not match the generated seat fills closely enough.
   - Fix: derive the front/back field colors from the corresponding blue, tan, and neutral seat fills so the artwork and surrounding fields read as one system.

## State Evidence

- Left: `docs/design/wayfinder/advice-state-prototype/360x640-left-onboard.png`
- Right: `docs/design/wayfinder/advice-state-prototype/360x640-right-onboard.png`
- Front: `docs/design/wayfinder/advice-state-prototype/360x640-front-onboard.png`
- Back: `docs/design/wayfinder/advice-state-prototype/360x640-back-onboard.png`
- Neutral: `docs/design/wayfinder/advice-state-prototype/360x640-neutral-onboard.png`
- Machine-readable matrix: `docs/design/wayfinder/advice-state-prototype/matrix-results.json`

## Follow-up Polish

- [P3] The selected source uses a diagonal hatch across the full warm proof field. The prototype keeps hatching inside the generated warm seats and relies on sun icon plus text in the outer field; a future production pass can add a real raster texture if that extra density still feels useful on-device.

## Final Result

final result: passed
