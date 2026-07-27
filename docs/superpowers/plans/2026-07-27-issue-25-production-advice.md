# Production Advice Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement GitHub issue #25 and child issues #26–#29 by moving the accepted no-scroll advice experience into the production Onboard Flow.

**Architecture:** `OnboardingFlowScreen` remains the state router and passes existing domain state and actions into a production `AdviceResultSurface` module. `AdviceResultSurface` owns the compact hierarchy and disclosures, while `AdviceBusDiagram` owns one fixed five-state visual contract. The existing prototype scenario harness supplies deterministic production states to a browser matrix validator; advisory computation and browser transport remain unchanged.

**Tech Stack:** React 19, TypeScript, CSS Modules, Vitest, Testing Library, Playwright Chromium, Next/Vite.

## Global Constraints

- Preserve the onboard-first flow and the existing browser-owned `UiAdviceState` and `NEXT_PUBLIC_API_URL` contracts.
- Do not add advisory computation, route-data parsing, scraper behavior, service endpoints, or backend code.
- Production copy uses Brazilian Portuguese, `incidência de sol`, honest estimate language, and the approved back recommendation label `Prefira o fundo`.
- The essential result hierarchy fits without document scrolling at 360 × 640 px and remains usable at 390 × 844 px.
- Route context, advice context, recommendation or neutral result, accessible diagram summary, concise estimate notice, and persistent actions remain in meaningful reading order.
- `AdviceBusDiagram` uses one fixed 250 px artwork dimension contract for left, right, front, back, and neutral states.
- Right advice mirrors the side artwork; front/back use horizontal fields; neutral has no recommendation dominance.
- Front/back artwork preserves five seat rows, a neutral middle row aligned with the neutral field, matched field/seat colors, and red rear lanterns.
- Recommendation, higher-incidence, and neutral meanings use visible text/icon cues as well as color.
- Estimate and options sheets receive focus, trap focus, close with Escape or backdrop, restore focus, and make background content inert and hidden from assistive technologies.
- Reduced-motion preferences disable nonessential transitions.
- Withheld and API error states stay outside the valid-advice result surface.
- Tests observe public UI/component behavior; mocks are limited to browser/system seams.

---

### Task 1: Issue #26 — Production Result Surface

**Files:**

- Create: `src/components/AdviceResultSurface.tsx`
- Create: `src/components/AdviceResultSurface.module.css`
- Create: `tests/advice-result-surface.test.tsx`
- Modify: `src/screens/OnboardingFlowScreen.tsx`
- Modify: `src/screens/OnboardingFlowScreen.module.css`
- Modify: `src/domain/types.ts`
- Modify: `src/mocks/scenarioStates.ts`
- Modify: `tests/prototype-scenarios.test.tsx`
- Modify: `tests/home-screen.test.tsx`

**Interfaces:**

- Consumes: `advice: Exclude<UiAdviceState, { mode: "withheld" }>`, optional `{ code, name }` route, optional direction label, `onRefresh()`, `onChangeRoute()`, and later `onChangeDirection()`.
- Produces: `AdviceResultSurface` with stable `data-testid` markers for screen, route receipt, result header, diagram proof, trust row, and result actions.
- Keeps: `OnboardingFlowScreen` responsible only for screen selection and action wiring.

- [ ] **Step 1: Write a failing result-surface behavior test**

  Render onboard left, preview right, recent left, and neutral advice through the public component. Assert route/direction receipt, distinct status text, positive or neutral title, accessible diagram summary, concise estimate notice, refresh action, and route-change action.

- [ ] **Step 2: Run the focused test and verify red**

  Run: `npm test -- tests/advice-result-surface.test.tsx`

  Expected: FAIL because the production module and approved hierarchy do not exist.

- [ ] **Step 3: Extract and implement the compact result module**

  Move result copy and composition out of `OnboardingFlowScreen`. Use explicit context copy:

  ```ts
  onboard: "Agora no ônibus";
  preview: "Prévia da linha · ponto estimado";
  recent: "Última localização conhecida";
  ```

  Keep the visible trust copy:

  ```text
  Estimativa pela incidência de sol.
  Pode variar no caminho.
  ```

  Keep #28 sheet behavior out of this slice. Preserve a working direct `Trocar linha` action until Task 3 replaces that secondary action with the functional options sheet.

- [ ] **Step 4: Run result tests and typecheck to verify green**

  Run:

  ```bash
  npm test -- tests/advice-result-surface.test.tsx
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 5: Add recent-location production scenario coverage**

  Add a deterministic recent fallback scenario using onboard advice with `freshnessNotice: "recentFallback"`. Assert the dedicated status and stale-location explanation through `HomePageApp`.

- [ ] **Step 6: Run flow-focused tests**

  Run:

  ```bash
  npm test -- tests/prototype-scenarios.test.tsx tests/home-screen.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 7: Commit the coherent #26 slice**

  Stage only the files owned by Task 1 and commit with:

  ```text
  feat(advice): adopt approved result surface
  ```

---

### Task 2: Issue #27 — Shared Five-State Bus Orientation Diagram

**Files:**

- Modify: `src/components/AdviceBusDiagram.tsx`
- Modify: `src/components/AdviceBusDiagram.module.css`
- Modify: `tests/bus-diagrams.test.tsx`
- Reuse unchanged: `public/images/advice-bus-side.png`
- Reuse unchanged: `public/images/advice-bus-front.png`
- Reuse unchanged: `public/images/advice-bus-back.png`
- Reuse unchanged: `public/images/advice-bus-neutral.png`

**Interfaces:**

- Consumes: the existing `advice`, optional `density`, and accessible `summary` props.
- Produces: one fixed-footprint figure with `data-advice-area`, `data-proof-axis`, artwork source/mirror/size markers, and two visible semantic ledgers.
- Preserves: `BusSplitDiagram` as the separate abstract entry motif.

- [ ] **Step 1: Write failing five-state diagram tests**

  Assert:

  ```text
  left    -> side asset, not mirrored, vertical axis
  right   -> side asset, mirrored, vertical axis
  front   -> front asset, horizontal axis
  back    -> back asset, horizontal axis
  neutral -> neutral asset, vertical axis, two neutral ledgers
  ```

  For every state assert a 250 px marker, accessible summary, front cue, and explicit non-color labels. For front/back assert the five-row contract marker and neutral middle-row marker.

- [ ] **Step 2: Run the component test and verify red**

  Run: `npm test -- tests/bus-diagrams.test.tsx`

  Expected: FAIL against the current CSS pictogram and six-row zones.

- [ ] **Step 3: Implement the approved diagram contract**

  Port the accepted prototype’s state-to-artwork mapping, mirrored side behavior, ledgers, horizontal deck fields, and fixed artwork size into `AdviceBusDiagram`. Keep semantic copy inside the module and derive only the state from `UiAdviceState`.

- [ ] **Step 4: Run component and surface tests**

  Run:

  ```bash
  npm test -- tests/bus-diagrams.test.tsx tests/advice-result-surface.test.tsx
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 5: Commit the coherent #27 slice**

  Stage only the diagram implementation and test, then commit with:

  ```text
  feat(advice): complete bus orientation states
  ```

---

### Task 3: Issue #28 — Accessible Estimate and Options Sheets

**Files:**

- Create: `src/components/AdviceResultSheet.tsx`
- Create: `src/components/AdviceResultSheet.module.css`
- Modify: `src/components/AdviceResultSurface.tsx`
- Modify: `src/components/AdviceResultSurface.module.css`
- Modify: `tests/advice-result-surface.test.tsx`
- Modify: `src/screens/OnboardingFlowScreen.tsx`

**Interfaces:**

- `AdviceResultSheet` consumes `kind: "estimate" | "options"`, `onClose`, and route/direction action callbacks.
- `AdviceResultSurface` owns trigger refs and the active-sheet state, and passes real `changeDirection` / `changeRoute` callbacks from the flow.
- The sheet renders as a sibling of the inert result background, with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.

- [ ] **Step 1: Write failing keyboard and accessibility tests**

  Through `AdviceResultSurface`, assert initial heading focus, Tab and Shift+Tab wrap, Escape and backdrop dismissal, trigger focus restoration, `inert` plus `aria-hidden` background isolation, visible concise notice, and working change-direction/change-route callbacks.

- [ ] **Step 2: Run the focused test and verify red**

  Run: `npm test -- tests/advice-result-surface.test.tsx`

  Expected: FAIL because production sheets do not exist.

- [ ] **Step 3: Implement the reusable production sheet**

  Port the accepted prototype behavior without importing prototype modules. Lock body scrolling while open, clean up every document mutation/listener on close or unmount, and retain global reduced-motion behavior.

- [ ] **Step 4: Wire real options actions**

  Pass `actions.changeDirection` and `actions.changeRoute` from `OnboardingFlowScreen`. Keep `Atualizar localização` persistent on the main result; put route/direction changes behind `Opções`.

- [ ] **Step 5: Run focused tests and typecheck**

  Run:

  ```bash
  npm test -- tests/advice-result-surface.test.tsx tests/home-screen.test.tsx
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 6: Commit the coherent #28 slice**

  Stage only the disclosure/surface files and tests, then commit with:

  ```text
  feat(advice): add accessible result disclosures
  ```

---

### Task 4: Issue #29 — Production Advice Matrix and Evidence

**Files:**

- Modify: `src/app/PrototypeHomePage.tsx`
- Modify: `src/domain/types.ts`
- Modify: `src/mocks/scenarioStates.ts`
- Modify: `tests/prototype-scenarios.test.tsx`
- Modify: `tests/home-screen.test.tsx`
- Modify: `package.json`
- Create: `scripts/run-production-advice-qa.mjs`
- Create: `scripts/validate-production-advice-matrix.mjs`
- Create: `docs/design/wayfinder/production-advice-matrix/matrix-results.json`
- Create: representative PNGs under `docs/design/wayfinder/production-advice-matrix/`
- Create: `docs/design/wayfinder/production-advice-matrix/README.md`

**Interfaces:**

- `/prototype?scenario=<id>` deterministically opens an existing production `OnboardingFlowScreen` scenario.
- The validator exercises five advice areas × onboard/preview/recent contexts × two viewport sizes, plus withheld and advice-error boundaries.
- Evidence selectors are stable public test markers from Tasks 1–3.

- [ ] **Step 1: Write failing deterministic-scenario tests**

  Assert query-selected production scenarios for all area/context pairs plus withheld and advice error. Assert long route copy remains present and actions remain reachable.

- [ ] **Step 2: Run the scenario/flow tests and verify red**

  Run:

  ```bash
  npm test -- tests/prototype-scenarios.test.tsx tests/home-screen.test.tsx
  ```

  Expected: FAIL because the matrix scenarios and query selection are incomplete.

- [ ] **Step 3: Add matrix scenarios without changing domain contracts**

  Seed `FlowState` directly with valid `UiAdviceState` variants. Keep existing fixture scenarios and switcher compatibility. Add query parsing only for known `PrototypeScenarioId` values.

- [ ] **Step 4: Port the browser matrix validator**

  Validate:

  ```text
  no document or result overflow
  no clipped persistent actions or visible text
  correct artwork, mirror, axis, and semantic tones
  readable long Portuguese route/copy
  meaningful reading order and accessible summary
  estimate/options modal focus, trap, Escape, backdrop, restore, inert background
  reduced-motion computed behavior
  no console or page errors
  withheld and error remain distinct from valid advice
  ```

- [ ] **Step 5: Run production browser QA and retain evidence**

  Run: `npm run test:advice-matrix`

  Expected: 30 responsive advice combinations plus boundary/interactions validated with no overflow or console errors, and fresh JSON/PNG evidence written to the production evidence directory.

- [ ] **Step 6: Run focused integration tests**

  Run:

  ```bash
  npm test -- tests/prototype-scenarios.test.tsx tests/home-screen.test.tsx tests/bus-diagrams.test.tsx tests/advice-result-surface.test.tsx
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 7: Commit the coherent #29 slice**

  Stage only the matrix harness, tests, scripts, package manifest, and generated evidence. Commit with:

  ```text
  test(advice): validate production result matrix
  ```

---

### Task 5: Final Review and Completion Gate

**Files:**

- Review all files changed since the pre-task base commit.

**Interfaces:**

- Spec source: GitHub issues #25–#29.
- Standards source: `AGENTS.md`, `CONTEXT.md`, `docs/product-decisions.md`, `docs/wireframes-v1.md`, `docs/brand-guide.md`, and `docs/engineering-standards.md`.

- [ ] **Step 1: Run the required two-axis code review**

  Review the complete diff against the fixed pre-task base for Standards and Spec in parallel. Address all actionable findings and re-run focused checks.

- [ ] **Step 2: Run the full completion gate**

  Run:

  ```bash
  npm run format:check
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  ```

  Expected: every command exits 0.

- [ ] **Step 3: Classify and inspect commit scope**

  Inspect `git status`, every unstaged/staged diff, and `git diff --cached`. Preserve unrelated changes and stage explicit active-task paths only.

- [ ] **Step 4: Commit any final review fixes**

  Use one coherent conventional commit only if review changes remain:

  ```text
  fix(advice): address production result review
  ```
