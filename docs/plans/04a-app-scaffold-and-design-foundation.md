# 04a - App Scaffold and Design Foundation

## Goal

Create the root-level Next.js foundation for the mocked prototype, including tooling, app shell, brand tokens, centralized copy, and the initial location request screen.

## Dependencies

- Plan 03 cleanup branch is ready.
- `docs/plans/04-mocked-frontend-prototype.md`
- `docs/brand-guide.md`
- `docs/wireframes-v1.md`
- `docs/product-decisions.md`
- `CONTEXT.md`

## Work

- Scaffold a root-level Next.js TypeScript app. Do not create a nested `frontend/` folder.
- Use npm with Next.js, React, TypeScript, Vitest, React Testing Library, and jsdom.
- Add scripts for `npm run dev`, `npm test`, and any standard type/lint checks introduced by the scaffold.
- Create the initial app structure:

  ```text
  app/
    layout.tsx
    page.tsx
    globals.css
  src/
    components/
    content/copy.ts
    screens/
  tests/
  ```

- Implement the mobile-first app shell with a warm surface background and constrained mobile-width column on wider screens.
- Add lightweight CSS tokens from `docs/brand-guide.md` for color, typography, spacing, borders, focus, and touch targets.
- Add a reusable sticky bottom action pattern with bottom safe-area support and scroll padding.
- Centralize initial Brazilian Portuguese copy in `src/content/copy.ts`. Do not add a full localization system.
- Implement the `Location Request` screen from `docs/wireframes-v1.md`.
- Include the first-screen copy:
  - `De que lado sentar?`
  - `Encontre a melhor lateral do ônibus pelo sol direto.`
  - `Usar minha localização`
  - `Procurar linha manualmente`
  - `A localização só é usada para encontrar linhas perto de você.`
- Add a simple bus-side split motif suitable for the first screen. It may be simpler than the final advisory diagram, but it must not rely on color alone.
- Ensure tapping the location button does not call real browser geolocation yet; it may transition to a temporary mocked loading state until Plan 04c wires the flow.

## Deliverable

- A runnable root-level app with the first screen, brand foundation, copy module, and test setup.

## Acceptance Criteria

- `npm install`, `npm run dev`, and `npm test` work from the repository root.
- The app renders on `/` with no required environment variables.
- The first screen is mobile-first and remains centered on wider desktop viewports.
- The app does not call live services, real geolocation, or Mapbox.
- The first screen uses semantic buttons, visible focus states, and touch targets of at least 44px.
- Portuguese copy does not overflow at a 360px-wide viewport.

## Verification

- Run `npm test`.
- Run the scaffold's type/lint check if one is added.
- Manually verify the app at a small mobile viewport and a wider desktop viewport.
