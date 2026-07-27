# Task 1 report — Issue #26 Production Result Surface

## Delivered

- Extracted the result composition into public `AdviceResultSurface`, keeping `OnboardingFlowScreen` to result-screen selection and controller action wiring.
- Added stable result markers: `advice-result-screen`, `advice-route-receipt`, `advice-result-header`, `advice-diagram-proof`, `advice-trust-row`, and `advice-result-actions`.
- Applied the approved context copy exactly: `Agora no ônibus`, `Prévia da linha · ponto estimado`, and `Última localização conhecida`.
- Kept the visible estimate copy as `Estimativa pela incidência de sol. Pode variar no caminho.` and retained direct `Trocar linha` while the future options sheet is out of scope.
- Added a deterministic `advice-recent-location` prototype scenario using `freshnessNotice: "recentFallback"`, plus HomePageApp coverage for both the status and stale-location explanation.
- Repaired the prerequisite prototype imports using the package's supported per-icon entry points (`@phosphor-icons/react/CaretUp`, etc.); this avoids the unresolved `dist/icons/*` imports and avoids loading the full icon barrel.

## RED / GREEN evidence

RED command:

```text
npm test -- tests/advice-result-surface.test.tsx
```

RED output:

```text
FAIL tests/advice-result-surface.test.tsx
Error: Failed to resolve import "../src/components/AdviceResultSurface"
```

GREEN commands:

```text
npm test -- tests/advice-result-surface.test.tsx tests/advice-ledger-prototype.test.tsx
npm run typecheck
npm test -- tests/advice-result-surface.test.tsx tests/advice-ledger-prototype.test.tsx tests/prototype-scenarios.test.tsx tests/home-screen.test.tsx
```

GREEN output:

```text
2 test files passed, 9 tests passed; typecheck passed.
4 test files passed, 102 tests passed; typecheck passed.
```

Final verification:

```text
npx prettier --check <Task 1 owned paths>
npm run lint
npm run typecheck
npm run test
npm run build
```

Final output:

```text
Task 1 Prettier check: passed.
lint: passed.
typecheck: passed.
full suite: 15 test files passed, 206 tests passed.
build: passed.
```

## Files changed

- `src/components/AdviceResultSurface.tsx`
- `src/components/AdviceResultSurface.module.css`
- `src/screens/OnboardingFlowScreen.tsx`
- `src/screens/OnboardingFlowScreen.module.css`
- `src/domain/types.ts`
- `src/mocks/scenarioStates.ts`
- `src/prototypes/advice-ledger/AdviceLedgerPrototype.tsx`
- `tests/advice-result-surface.test.tsx`
- `tests/prototype-scenarios.test.tsx`
- `tests/home-screen.test.tsx`

## Self-review

- The public component accepts the existing `UiAdviceState` non-withheld union without changing browser transport or flow-controller contracts.
- The screen retains controller-owned refresh and route-change callbacks, and the direct route-change action remains functional.
- Context, recommendation, stale-location notice, and diagram summary are separately observable through behavior tests.
- Front/back diagram internals and any options-sheet behavior were not changed.

## Concerns

- The repository-wide `npm run format:check` reports the pre-existing uncommitted controller plan at `docs/superpowers/plans/2026-07-27-issue-25-production-advice.md`; this file was explicitly left untouched. All Task 1 owned paths pass Prettier.
- `npm run build` succeeds but emits existing Vite sourcemap/dynamic-import warnings. In the sandbox it also first reports a non-fatal Wrangler log-write permission warning before completing successfully.
