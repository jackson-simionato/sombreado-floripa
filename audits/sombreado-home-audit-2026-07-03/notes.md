# Sombreado Floripa Home/Prototype Audit

Captured on 2026-07-03 from the current prototype home flow.

## Screenshots

1. `01-mobile-home.png`
2. `02-mobile-routes-nearby.png`
3. `03-desktop-home.png`

## Findings

1. **[Mobile][P1] The primary CTA is pushed too far down and is partly obscured on the home screen.**
   - In `01-mobile-home.png`, the "Usar minha localização" action sits below a very tall intro block and is partially covered by the fixed prototype selector tray.
   - This makes the onboarding-first flow read like a poster first and a task screen second.
   - Fix: move the primary action closer to the headline, reduce the intro illustration height on phones, and keep prototype/dev controls out of the product viewport when sharing or auditing.

2. **[Mobile][P1] The hero consumes too much vertical space for a first step.**
   - The title, lead copy, and bus diagram dominate most of the 390px-wide viewport in `01-mobile-home.png`.
   - The screen feels tall before the user gets to any action, so the "what do I do next?" moment arrives late.
   - Fix: tighten top spacing, reduce the diagram height on small screens, and consider moving one clear CTA above or beside the diagram.

3. **[Mobile][P2] The route-list state feels underfilled and visually unbalanced.**
   - In `02-mobile-routes-nearby.png`, the three route cards stop well before the bottom of the viewport, leaving a large empty lower section.
   - The floating prototype tray also steals attention from the actual workflow controls.
   - Fix: let the candidate list breathe less vertically, pull supporting copy closer to the list, and keep any prototype-only tray off the mobile artboard.

4. **[Desktop][P2] The desktop view is too narrow for the available width.**
   - In `03-desktop-home.png`, the app is capped to a 430px column, so the page reads like a phone screenshot centered on a much larger canvas.
   - That keeps the mobile-first intent, but it also makes the desktop experience feel isolated and unfinished.
   - Fix: if desktop matters, add a wider supporting layout or a deliberate framed presentation; if it is intentionally mobile-only, make that intent clearer so the empty space feels purposeful.

5. **[Accessibility][P2] The fixed bottom prototype selector interferes with touch target clarity on small screens.**
   - The selector is large enough to occupy meaningful mobile width and is positioned where the primary action needs to live.
   - Even if it is prototype-only, it reduces the usable touch area and can hide the true next step.
   - Fix: remove or demote the selector outside user-facing captures, and confirm the actual product keeps primary actions fully visible at 390px wide.

## What I Could Not Verify From Screenshots Alone

- Keyboard focus order and whether the fixed controls are reachable without overlap.
- Screen-reader labels and announcement behavior.
- Exact tap behavior when the viewport is shorter, zoomed, or rotated.
- Whether the prototype selector is intentionally shown in shareable captures or should be hidden outside development.

## Step Health

1. **Home / location request** - Good screen structure, but the action area is too low and too crowded by prototype chrome on mobile.
2. **Nearby routes** - Readable list state, but the bottom half feels empty and the prototype controls distract from the onboarding flow.
3. **Desktop home** - Stable and legible, but the 430px cap leaves a lot of unused width and makes the page feel phone-only.
