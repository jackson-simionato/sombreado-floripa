# 07 - Polish and Mobile QA

## Goal

Refine the v1 frontend until it feels trustworthy, joyful, and reliable on mobile.

## Inputs

- API-integrated frontend
- Mapbox confirmation map
- Brand guide
- Wireframes

## Work

- Tighten visual hierarchy, spacing, colors, and typography.
- Check all Portuguese copy for clarity and overflow.
- Verify the bus orientation diagram is understandable without relying only on color.
- Audit accessibility labels, contrast, focus states, and reduced-motion behavior.
- Test on small and medium mobile viewports.
- Verify manual route search, route selection, direction choice, and route confirmation on mobile.
- Verify slow loading, denied geolocation, no candidates, route-without-directions, API errors, preview-with-warning, true withheld, and Mapbox confirmation fallback responses.
- Consider adding a small Playwright mobile smoke suite once the runtime is no longer a mocked-only prototype:
  - run Chromium at a 360px-wide mobile viewport
  - walk the default onboard flow end to end
  - verify scenario or QA-state reachability if a dev-only switcher still exists
  - assert no horizontal overflow in core states
  - confirm sticky actions are visible and clickable
  - check core text and ARIA labels without using brittle visual snapshots

## Deliverable

- A polished v1 frontend ready for broader testing.

## Acceptance Criteria

- The app looks intentionally designed, not just functional.
- The result screen is clear at a glance.
- All core states work on mobile without layout overlap.
- Onboard advice and route preview advice are visibly distinct without relying on color alone.
- Manual QA findings are documented before release.
