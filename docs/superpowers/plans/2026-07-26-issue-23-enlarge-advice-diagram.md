# Enlarge Advice Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the selected Bus Orientation Diagram dominant and fully legible at 360 × 640 px without scrolling or removing required Advice Result content.

**Architecture:** Keep the issue #23 prototype isolated under `src/prototypes/advice-ledger/`. Extend its browser validation script with measurable diagram-size and text-clipping checks, then rebalance only prototype CSS and remove redundant in-cabin area labels through prototype-scoped styling. Preserve the existing state model, shared `AdviceBusDiagram`, accessible summary, sheets, and actions.

**Tech Stack:** Next.js 15, React 19, CSS Modules, Playwright browser automation, Node.js 22.

## Global Constraints

- Frontend-only; do not add API, advisory computation, or transit-data behavior.
- Preserve all five recommendation areas, all three advice contexts, both target viewports, safe-area handling, keyboard behavior, and reduced motion.
- Keep route and direction, advice status, recommendation, complete diagram, estimate notice, `Entenda a estimativa`, `Atualizar localização`, and `Opções` available on the main result.
- Use `incidência de sol` in rider-facing estimate copy.
- Do not introduce scrolling at 360 × 640 px or 390 × 844 px.

---

### Task 1: Protect Diagram Legibility

**Files:**

- Modify: `scripts/validate-advice-ledger-prototype.mjs`
- Modify: `src/prototypes/advice-ledger/AdviceLedgerPrototype.module.css`

**Interfaces:**

- Consumes: `[data-testid="bus-shell"]` from the shared `AdviceBusDiagram`.
- Produces: browser evidence that the bus is at least 160 CSS px wide at 360 × 640 and that every visible in-bus text element fits its own box.

- [ ] **Step 1: Add failing browser assertions**

Measure the bus shell and visible `span`/`strong` descendants:

```js
const busShell = document.querySelector('[data-testid="bus-shell"]');
const clippedBusText = Array.from(
  busShell.querySelectorAll("span, strong")
).filter((element) => {
  const style = getComputedStyle(element);
  return (
    style.display !== "none" &&
    (element.scrollWidth > element.clientWidth + 1 ||
      element.scrollHeight > element.clientHeight + 1)
  );
});
```

Assert `busRect.width >= 160` at the 360 px viewport and assert that `clippedBusText` is empty for every state.

- [ ] **Step 2: Run the validator and verify RED**

Run:

```bash
source /home/jackson/.nvm/nvm.sh
nvm use
node scripts/validate-advice-ledger-prototype.mjs
```

Expected: FAIL because the current bus shell is about 126 CSS px wide.

- [ ] **Step 3: Rebalance the prototype-only layout**

In `AdviceLedgerPrototype.module.css`:

- reduce the route receipt, header, trust row, and action footprint;
- widen the center proof column and cap the bus shell around 178 CSS px;
- allow the bus to use the proof area's available height;
- narrow the external ledgers without removing their full labels;
- hide only the redundant cabin area labels while retaining the bus front cue, aisle label, in-bus tone callouts, external ledger labels, and accessible summary;
- restore the route-code badge foreground color inside the receipt.

- [ ] **Step 4: Run the validator and verify GREEN**

Run the same validator.

Expected: PASS for all 30 responsive states, diagram-size and text-fit assertions, keyboard behavior, sheets, reduced motion, and console errors.

- [ ] **Step 5: Inspect revised evidence**

Open the regenerated 360 × 640 screenshots and the source/prototype comparison board. Confirm that the bus is visually dominant, no visible text is cropped, the two ledgers remain connected and readable, and all persistent actions remain visible.

### Task 2: Complete Design QA

**Files:**

- Create: `design-qa.md`
- Regenerate: `docs/design/wayfinder/advice-state-prototype/*`

**Interfaces:**

- Consumes: `docs/design/wayfinder/selected-signature-advice-direction.png` and the regenerated prototype capture.
- Produces: a source-versus-implementation comparison with `final result: passed` or a concrete blocking fix list.

- [ ] **Step 1: Compare equal-state evidence**

Use the left/onboard 360 × 640 source-and-implementation comparison board, plus focused inspection of the central proof object.

- [ ] **Step 2: Record the QA result**

Document typography, spacing, colors, image/diagram quality, copy, interaction evidence, earlier findings, fixes, and any remaining P3 polish in `design-qa.md`.

- [ ] **Step 3: Run the repository completion gate**

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all commands pass.

- [ ] **Step 4: Return the revised live review**

Refresh the visual companion with the exact 360 × 640 and 390 × 844 frames and the interactive state panel, then ask for human acceptance of issue #23.
