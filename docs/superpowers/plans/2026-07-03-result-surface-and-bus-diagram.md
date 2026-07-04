# Result Surface And Bus Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Context Receipt result surface and redesign `AdviceBusDiagram` toward the Transit Pictogram Bus direction.

**Architecture:** Keep the onboard flow state machine unchanged. Extract result rendering inside `OnboardingFlowScreen.tsx` into a focused `AdviceResultSurface` helper plus `ResultRouteReceipt`, and redesign `AdviceBusDiagram` markup/CSS so it reads as a bus-shaped pictogram instead of a two-column card.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, Vitest, Testing Library.

---

### Task 1: Result Surface Contract Tests

**Files:**

- Modify: `tests/prototype-scenarios.test.tsx`

- [ ] **Step 1: Write failing tests for the Context Receipt result surface**

Add these tests inside the existing `describe("prototype scenarios", () => { ... })` block, before the scenario-switcher reachability test:

```tsx
test("onboard advice uses route receipt context before the recommendation surface", async () => {
  render(
    <HomePageApp
      prototypeScenarioId="advice-onboard-left"
      runtime="prototype"
    />
  );

  expect(await screen.findByText("4 de 4")).toBeInTheDocument();
  expect(screen.getByText("124")).toBeInTheDocument();
  expect(screen.getByText("TICEN - Lagoa")).toBeInTheDocument();
  expect(
    screen.getByText("Agora no ônibus · sentido TICEN para Lagoa")
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Sente à esquerda" })
  ).toBeInTheDocument();
  expect(screen.getByText("Recomendação")).toBeInTheDocument();
  expect(
    screen.getByLabelText(
      "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus."
    )
  ).toBeInTheDocument();
  expect(
    screen.getByText("Estimativa pelo sol direto. Pode variar no caminho.")
  ).toBeInTheDocument();
});

test("preview advice keeps preview status in the route receipt instead of the title", async () => {
  render(
    <HomePageApp prototypeScenarioId="advice-preview" runtime="prototype" />
  );

  expect(
    await screen.findByRole("heading", {
      name: "Melhor sentar à direita",
    })
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Prévia da linha · sentido TICEN para Lagoa/)
  ).toBeInTheDocument();
  expect(screen.getByText("Prévia")).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: /Prévia/i })
  ).not.toBeInTheDocument();
});

test("neutral advice keeps route context without leaking a side recommendation", async () => {
  render(
    <HomePageApp
      prototypeScenarioId="advice-neutral-overhead"
      runtime="prototype"
    />
  );

  expect(
    await screen.findByRole("heading", { name: "Sem lado melhor agora" })
  ).toBeInTheDocument();
  expect(screen.getByText("124")).toBeInTheDocument();
  expect(screen.getByText("TICEN - Lagoa")).toBeInTheDocument();
  expect(screen.getByText("Recomendação")).toBeInTheDocument();
  expect(screen.queryByText("Sente aqui")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- tests/prototype-scenarios.test.tsx
```

Expected: FAIL because `124` is not rendered as its own receipt chip, route/status metadata is not in the requested receipt format, and current result structure still puts preview state in the result header badge.

### Task 2: Context Receipt Result Surface

**Files:**

- Modify: `src/screens/OnboardingFlowScreen.tsx`
- Modify: `src/screens/OnboardingFlowScreen.module.css`

- [ ] **Step 1: Implement `AdviceResultSurface` and `ResultRouteReceipt`**

In `src/screens/OnboardingFlowScreen.tsx`, replace the existing `renderAdviceResult` function with:

```tsx
function renderAdviceResult({
  advice,
  directionLabel,
  route,
}: {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  directionLabel?: string;
  route?: RouteCandidate;
}) {
  const variant = adviceVariantCopy(advice);

  return (
    <AdviceResultSurface
      advice={advice}
      directionLabel={directionLabel}
      route={route}
      variant={variant}
    />
  );
}

function AdviceResultSurface({
  advice,
  directionLabel,
  route,
  variant,
}: {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  directionLabel?: string;
  route?: RouteCandidate;
  variant: ReturnType<typeof adviceVariantCopy>;
}) {
  return (
    <section className={styles.resultStack} aria-labelledby="screen-title">
      <p className={styles.progress}>4 de 4</p>
      <ResultRouteReceipt
        advice={advice}
        directionLabel={directionLabel}
        route={route}
      />
      <div className={styles.recommendationPanel}>
        <p className={styles.resultEyebrow}>Recomendação</p>
        <h1 id="screen-title" className={styles.resultTitle}>
          {variant.title}
        </h1>
        <p className={styles.body}>{variant.body}</p>
        {advice.mode !== "preview" &&
        advice.freshnessNotice === "recentFallback" ? (
          <div className={styles.noticePanel} role="status">
            <p>
              Usando sua última localização conhecida. Atualize quando estiver
              no ônibus.
            </p>
          </div>
        ) : null}
        <div className={styles.diagramFocus} data-result-focus="diagram">
          <AdviceBusDiagram
            advice={advice}
            summary={variant.accessibleSummary}
          />
        </div>
      </div>
      {variant.previewNote !== undefined ? (
        <p className={styles.previewNotice}>{variant.previewNote}</p>
      ) : null}
      <p className={styles.estimateNotice}>{ESTIMATE_NOTICE}</p>
    </section>
  );
}

function ResultRouteReceipt({
  advice,
  directionLabel,
  route,
}: {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  directionLabel?: string;
  route?: RouteCandidate;
}) {
  if (route === undefined) {
    return null;
  }

  const statusLabel =
    advice.mode === "preview" ? "Prévia da linha" : "Agora no ônibus";
  const metadata =
    directionLabel === undefined
      ? statusLabel
      : `${statusLabel} · sentido ${directionLabel}`;

  return (
    <div className={styles.routeReceipt}>
      <span className={styles.routeCode}>{route.code}</span>
      <div className={styles.routeReceiptText}>
        <strong>{route.name}</strong>
        <span>{metadata}</span>
      </div>
      {advice.mode === "preview" ? (
        <span className={styles.routeReceiptBadge}>Prévia</span>
      ) : null}
    </div>
  );
}
```

Update the call site in the `onboardAdviceResult` / `routePreviewAdviceResult` case from `routeLabel: selectedRouteLabel` to `route: state.selectedRoute`.

- [ ] **Step 2: Add layered result CSS**

In `src/screens/OnboardingFlowScreen.module.css`, keep existing non-result styles and add:

```css
.resultStack {
  display: grid;
  gap: var(--space-3);
}

.routeReceipt {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid rgba(231, 222, 210, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.routeCode {
  min-width: 44px;
  min-height: 36px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: var(--color-ink);
  color: var(--color-paper);
  font-size: 0.92rem;
  font-weight: 800;
}

.routeReceiptText {
  min-width: 0;
  display: grid;
  gap: var(--space-1);
}

.routeReceiptText strong {
  overflow-wrap: anywhere;
  font-size: 1rem;
  line-height: 1.25;
}

.routeReceiptText span,
.previewNotice {
  color: var(--color-muted-ink);
  font-size: 0.86rem;
  line-height: 1.35;
}

.routeReceiptBadge {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-2);
  border: 1px solid rgba(78, 156, 181, 0.35);
  border-radius: 999px;
  background: var(--color-shade-100);
  color: var(--color-ink);
  font-size: 0.78rem;
  font-weight: 750;
}

.recommendationPanel {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: 24px;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.94),
      rgba(255, 249, 238, 0.84)
    ),
    var(--color-paper);
  box-shadow: var(--shadow-soft);
}

.resultTitle {
  margin: 0;
  font-size: clamp(1.72rem, 8vw, 2.15rem);
  font-weight: 780;
  letter-spacing: 0;
  line-height: 1.03;
}
```

Leave `.resultCard`, `.resultHeader`, `.resultBadge`, and `.summaryPanelCompact` in place until cleanup after tests pass, to keep this step small.

- [ ] **Step 3: Run focused test and verify GREEN**

Run:

```bash
npm test -- tests/prototype-scenarios.test.tsx
```

Expected: the new result-surface tests pass. Existing tests may still fail if text expectations need minor adjustment; update only expectations that describe the intentional receipt anatomy.

### Task 3: Bus Diagram Contract Tests

**Files:**

- Create: `tests/bus-diagrams.test.tsx`

- [ ] **Step 1: Write failing tests for bus-like diagram anatomy**

Create `tests/bus-diagrams.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AdviceBusDiagram } from "../src/components/AdviceBusDiagram";
import type { UiAdviceState } from "../src/domain/types";

const leftAdvice: Exclude<UiAdviceState, { mode: "withheld" }> = {
  mode: "onboard",
  directSunExposure: "right",
  freshnessNotice: "fresh",
  horizon: "upcoming",
  recommendedSeatArea: "left",
  sunCondition: "daylight",
};

describe("AdviceBusDiagram", () => {
  test("renders a city-bus pictogram with front, wheel, aisle, and side split cues", () => {
    render(
      <AdviceBusDiagram
        advice={leftAdvice}
        summary="Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus."
      />
    );

    expect(
      screen.getByLabelText(
        "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("frente")).toBeInTheDocument();
    expect(screen.getByText("esquerda")).toBeInTheDocument();
    expect(screen.getByText("direita")).toBeInTheDocument();
    expect(screen.getByText("corredor")).toBeInTheDocument();
    expect(screen.getByText("Sente aqui")).toBeInTheDocument();
    expect(screen.getByText("sol direto")).toBeInTheDocument();
    expect(screen.getByTestId("bus-shell")).toHaveAttribute(
      "data-diagram-shape",
      "transit-pictogram-bus"
    );
    expect(screen.getByTestId("bus-wheels")).toBeInTheDocument();
    expect(screen.getByTestId("bus-windshield")).toBeInTheDocument();
  });

  test("neutral advice does not show a recommended-side callout", () => {
    render(
      <AdviceBusDiagram
        advice={{
          mode: "neutralComputed",
          directSunExposure: "overhead",
          sunCondition: "daylight",
        }}
        summary="Diagrama neutro do ônibus. Nenhum lado do ônibus aparece como melhor área agora."
      />
    );

    expect(screen.queryByText("Sente aqui")).not.toBeInTheDocument();
    expect(screen.getAllByText("sem destaque")).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- tests/bus-diagrams.test.tsx
```

Expected: FAIL because the current diagram does not expose `frente`, `corredor`, `data-testid="bus-shell"`, `data-testid="bus-wheels"`, or `data-testid="bus-windshield"`.

### Task 4: Transit Pictogram Bus Diagram

**Files:**

- Modify: `src/components/AdviceBusDiagram.tsx`
- Modify: `src/components/AdviceBusDiagram.module.css`

- [ ] **Step 1: Update diagram markup to expose bus anatomy**

In `AdviceBusDiagram.tsx`, update `CabinInterior` so the outer bus and cues use testable, semantic anatomy:

```tsx
function CabinInterior({
  zones,
  variant,
}: {
  zones: [CabinZone, CabinZone];
  variant: "side" | "deck";
}) {
  return (
    <div
      className={styles.bus}
      data-diagram-layout="long-bus"
      data-diagram-shape="transit-pictogram-bus"
      data-diagram-size="result-focus"
      data-testid="bus-shell"
      aria-hidden="true"
    >
      <span
        className={styles.wheelCue}
        data-diagram-cue="wheels"
        data-testid="bus-wheels"
      />
      <div className={styles.frontCue} data-diagram-cue="front">
        <span className={styles.windshield} data-testid="bus-windshield">
          frente
        </span>
        <span className={styles.driverCue} />
      </div>
      <div
        className={`${styles.cabinBody} ${
          variant === "deck" ? styles.cabinBodyDeck : ""
        }`}
        data-diagram-cue="seats"
      >
        {variant === "side" ? (
          <>
            <CabinZoneView side="left" zone={zones[0]} />
            <div className={styles.aisle}>
              <span>corredor</span>
            </div>
            <CabinZoneView side="right" zone={zones[1]} />
          </>
        ) : (
          <>
            <CabinDeckZoneView zone={zones[0]} />
            <div className={styles.deckAisle}>
              <span>corredor</span>
            </div>
            <CabinDeckZoneView zone={zones[1]} />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Tune CSS toward the Transit Pictogram Bus direction**

In `AdviceBusDiagram.module.css`, adjust the bus to be wider, flatter, and more bus-like:

```css
.bus {
  width: min(100%, 276px);
  height: clamp(226px, 31vh, 286px);
  justify-self: center;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 2px solid rgba(37, 33, 27, 0.14);
  border-radius: 30px 30px 22px 22px;
  background:
    linear-gradient(
      180deg,
      rgba(255, 249, 238, 0.96),
      rgba(255, 255, 255, 0.98)
    ),
    var(--color-paper);
  box-shadow: 0 16px 34px rgba(37, 33, 27, 0.1);
  position: relative;
  overflow: visible;
}

.bus::after {
  content: "";
  position: absolute;
  top: -7px;
  left: 44px;
  right: 44px;
  height: 16px;
  border: 2px solid rgba(37, 33, 27, 0.1);
  border-bottom: 0;
  border-radius: 999px 999px 0 0;
  background: var(--color-paper);
}

.windshield {
  min-height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px 999px 14px 14px;
  background:
    linear-gradient(90deg, rgba(78, 156, 181, 0.2), rgba(78, 156, 181, 0.05)),
    #f7fbfb;
  border: 1px solid rgba(78, 156, 181, 0.3);
  color: var(--color-muted-ink);
  font-size: 0.68rem;
  font-weight: 750;
  text-transform: uppercase;
}

.aisle {
  border-radius: 999px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), transparent),
    repeating-linear-gradient(
      to bottom,
      var(--color-line) 0,
      var(--color-line) 9px,
      transparent 9px,
      transparent 18px
    );
}

.aisle span {
  writing-mode: vertical-rl;
  color: var(--color-muted-ink);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0;
}
```

Preserve the existing warm hatching, cool recommended fill, check cue, and neutral behavior unless a selector conflicts with the new anatomy.

- [ ] **Step 3: Run bus diagram tests and verify GREEN**

Run:

```bash
npm test -- tests/bus-diagrams.test.tsx
```

Expected: PASS.

### Task 5: Cleanup And Focused Verification

**Files:**

- Modify: `src/screens/OnboardingFlowScreen.module.css`
- Modify: `tests/prototype-scenarios.test.tsx`
- Modify: `tests/bus-diagrams.test.tsx`

- [ ] **Step 1: Remove unused result CSS**

After all tests pass, remove unused result-only selectors if TypeScript/grep confirms they are no longer referenced:

```bash
rg "resultCard|resultHeader|resultBadge|summaryPanelCompact" src/screens/OnboardingFlowScreen.tsx src/screens/OnboardingFlowScreen.module.css
```

Only delete selectors that no longer appear in JSX.

- [ ] **Step 2: Run focused verification**

Run:

```bash
npm test -- tests/prototype-scenarios.test.tsx tests/bus-diagrams.test.tsx
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 3: Run completion gate**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all pass. If the existing Vitest/Vite ESM startup error recurs, record it exactly and do not claim the full gate passed.
