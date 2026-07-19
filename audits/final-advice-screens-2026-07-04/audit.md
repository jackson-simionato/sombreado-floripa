# Final Advice Screens UX Audit

Audit date: 2026-07-04  
Scope: only `onboardAdviceResult` and `routePreviewAdviceResult` in `src/screens/OnboardingFlowScreen.tsx`, plus the visible styling from `src/screens/OnboardingFlowScreen.module.css`.  
Evidence: local prototype screenshots captured at 390 x 844 and 1024 x 900.

## Screenshots

1. `01-mobile-onboard-advice.png` - mobile onboard advice, 390 px wide.
2. `02-mobile-preview-advice.png` - mobile route preview advice, 390 px wide.
3. `03-desktop-onboard-advice.png` - desktop onboard advice, 1024 px wide.
4. `04-desktop-preview-advice.png` - desktop route preview advice, 1024 px wide.

See `metrics.json` for measured element positions.

## Step List

1. Mobile onboard advice - Healthy. The recommendation appears quickly, reads as the primary message, and the route receipt supports rather than competes.
2. Mobile route preview advice - Needs attention. The recommendation is clear, but the preview route receipt and notes add enough vertical weight that the estimate note sits close to the sticky action area.
3. Desktop onboard advice - Healthy. The screen is centered, calm, and the hierarchy stays clear.
4. Desktop route preview advice - Needs attention. The core answer is clear, but the preview note and estimate note fall into the sticky action zone at this viewport height.

## Strengths

- The recommendation title is the strongest element in both states. In the 390 px captures, the title starts at 148 px for onboard and 166 px for preview, so the answer is available without scrolling.
- The route receipt gives useful context without becoming a second card. Its compact pill form supports confidence in the selected line and direction.
- The recommendation panel makes the answer feel final and distinct from route setup. The eyebrow, title, body, and bus diagram create a clear result surface.
- The bus diagram reinforces the recommendation visually and textually. The recommended side uses a label and check mark, while the sun side is separately labeled, so it does not rely on color alone.

## Mobile Findings

1. High - The preview screen puts trust copy too close to the sticky controls.

   Evidence: in `02-mobile-preview-advice.png`, the preview note runs from 630-665 px, the estimate note from 686-706 px, and sticky actions start at 716 px. This leaves only about 10 px before the sticky action gradient begins. The estimate note is technically visible, but it feels like footer debris rather than part of the result.

   Friction: the preview note and estimate note are both important trust qualifiers, but their placement makes the rider finish reading them while the primary action area is already visually taking over.

   Recommendation: keep one concise trust qualifier visible above the sticky action area. If both preview distance and direct-sun limitation remain, reduce repetition or group them more tightly so they read as intentional context, not leftover copy.

2. Medium - The preview route receipt adds vertical height before the answer.

   Evidence: the onboard receipt is 58 px tall; the preview receipt is 76 px tall because the metadata wraps and the `Prévia` badge occupies the third grid column. The preview title starts 18 px lower than the onboard title.

   Friction: this is not fatal, because the answer still appears above the fold. But at 390 px, the receipt, badge, and preview note all say "preview", which creates repeated caveat weight before and after the answer.

   Recommendation: keep the receipt compact and let only one element carry the preview distinction strongly. The route receipt can identify the state, while the note explains the practical meaning.

3. Medium - The bus diagram is useful, but it consumes most of the recommendation panel.

   Evidence: on mobile, the panel is 448 px tall for onboard and 483 px for preview. The diagram alone is 304 px tall. It helps comprehension, but it pushes supporting trust copy toward the sticky controls.

   Friction: the diagram is valuable after the rider has read the answer, but its height makes the bottom qualifiers feel cramped on the preview screen.

   Recommendation: preserve the diagram as supporting context, but treat the first viewport as answer-first. The result should still feel complete if the rider only reads the title, one body line, and one concise qualifier.

4. Low - The onboard result feels balanced at 390 px, with a large calm gap above actions.

   Evidence: in `01-mobile-onboard-advice.png`, the estimate note ends at 584 px and sticky actions start at 716 px. The gap makes the screen breathe and the result feels finished.

   Recommendation: use the onboard state as the baseline density target for the preview state.

## Desktop Findings

1. High - The desktop preview estimate note is partially obscured by the sticky action gradient.

   Evidence: in `04-desktop-preview-advice.png`, sticky actions start at 760 px. The estimate note begins at 767 px, so it sits underneath the sticky area and is visually faded/covered. The document height is 964 px against a 900 px viewport, so the final qualifier is not cleanly available without scrolling.

   Friction: this weakens the geometric limitation exactly in the preview state, where trust and limitation copy matter most.

   Recommendation: ensure preview-specific trust copy clears the sticky action zone at common desktop heights, either by reducing vertical weight above it or increasing usable bottom clearance for this result state.

2. Medium - Desktop inherits a narrow mobile app column, which keeps hierarchy clear but leaves the preview result feeling tall.

   Evidence: the app column is about 398 px wide at 1024 px. The preview panel is 541 px tall, compared with 503 px onboard, and the extra notes push the bottom content into the action area.

   Friction: the centered column is consistent with a mobile-first product, but the preview state misses the opportunity to breathe vertically on desktop.

   Recommendation: no major desktop redesign is needed. Just make sure the final trust note is not hidden by fixed actions.

## Supporting Element Callouts

- Route receipt: useful context. On preview, the wrapped metadata plus `Prévia` badge creates repeated preview signaling and pushes the answer down.
- Recommendation panel: strong hierarchy. The title is unmistakably primary. The panel height becomes the main pressure point in preview.
- Bus diagram: useful context, especially for left/right comprehension. Its size is the biggest contributor to vertical weight after the title/body.
- Preview note: useful and specific. Its distance copy adds trust, but together with receipt preview labeling and the estimate note it creates caveat stacking.
- Estimate note: necessary for trust, but its current position makes it weakest when it should be visible. This is most severe on desktop preview and noticeable on mobile preview.

## Accessibility Risks From Screenshot And Code Review

- Reading order risk: the route receipt appears before the `h1` in the result section (`OnboardingFlowScreen.tsx` lines 598-608). Visually this is acceptable, but assistive technology users may hear route metadata before the primary recommendation. Test with a screen reader before treating the current order as final.
- Sticky overlay risk: the fixed actions visually cover or compete with the estimate note in the preview state. This can affect low-vision users and zoomed layouts even if the DOM content remains present.
- Color reliance appears acceptable from the screenshots because the bus diagram includes labels, a check mark, and text, not color alone.

## Evidence Limits

- Screenshots were captured from prototype states, not a live onboard geolocation session.
- This audit did not test keyboard focus order, screen reader output, browser zoom, or dynamic text scaling.
- The screenshots cover 390 x 844 mobile and 1024 x 900 desktop only.
