# Issue 2 Live Runtime Smoke Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` a live-only route-candidate smoke runtime while preserving the full mocked flow at `/prototype`.

**Architecture:** Add a narrow Zod-validated route-candidate client for the browser API. Build a small local live-runtime component that owns only the smoke states, leaving the existing reducer-driven mocked app untouched and moved to `/prototype`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zod, Vitest, Testing Library, browser `fetch`, browser `navigator.geolocation`.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add `zod`.
- Create `src/api/routeCandidates.ts`: route-candidate schema, client factory, request helpers, and normalized live API error.
- Create `src/app/LiveHomePage.tsx`: live-only smoke runtime with local UI state.
- Modify `app/page.tsx`: render `LiveHomePage`.
- Create `app/prototype/page.tsx`: render existing `PrototypeHomePage`.
- Modify `tests/home-screen.test.tsx`: split `/` live-runtime assertions from explicit prototype assertions.
- Create `tests/api/routeCandidates.test.ts`: API client fetch and validation tests.
- Modify `docs/qa/05-api-integration.md`: add issue #2 smoke section and backend CORS blocker.

### Task 1: Add Route-Candidate API Tests

**Files:**

- Create: `tests/api/routeCandidates.test.ts`
- Later create: `src/api/routeCandidates.ts`

- [ ] **Step 1: Write failing API tests**

Create `tests/api/routeCandidates.test.ts` with tests that import `createRouteCandidatesClient`, call nearby and manual search methods, and assert `credentials: "omit"`, URL construction, order preservation, and malformed-response failure.

- [ ] **Step 2: Run API tests and verify RED**

Run:

```bash
npm test -- tests/api/routeCandidates.test.ts
```

Expected: fail because `src/api/routeCandidates.ts` does not exist.

- [ ] **Step 3: Add Zod and implement route-candidate client**

Install `zod`, then create `src/api/routeCandidates.ts` with:

- `routeCandidatesResponseSchema`
- `RouteCandidateTransport`
- `RouteCandidatesResponseTransport`
- `LiveApiError`
- `createRouteCandidatesClient({ baseUrl, fetchImpl })`
- `requireApiBaseUrl(value)`

Both client methods must call `fetch` with `{ method: "GET", credentials: "omit" }`.

- [ ] **Step 4: Run API tests and verify GREEN**

Run:

```bash
npm test -- tests/api/routeCandidates.test.ts
```

Expected: pass.

### Task 2: Add Live Runtime Tests

**Files:**

- Modify: `tests/home-screen.test.tsx`
- Later create: `src/app/LiveHomePage.tsx`
- Later modify: `app/page.tsx`
- Later create: `app/prototype/page.tsx`

- [ ] **Step 1: Write failing live runtime tests**

Update `tests/home-screen.test.tsx` so:

- `/` renders missing API configuration when no API URL is provided.
- `/` does not render the prototype scenario switcher.
- `/prototype` renders the scenario switcher and can still reach mocked states.
- `/` fetches manual route candidates through a live client and selecting one shows the unsupported-next-step state.
- `/` fetches nearby route candidates through live geolocation and live client.

- [ ] **Step 2: Run live runtime tests and verify RED**

Run:

```bash
npm test -- tests/home-screen.test.tsx
```

Expected: fail because `/` still renders `PrototypeHomePage` and `/prototype` does not exist.

- [ ] **Step 3: Implement live runtime and prototype route**

Create `src/app/LiveHomePage.tsx`, switch `app/page.tsx` to render it with `process.env.NEXT_PUBLIC_API_URL`, and create `app/prototype/page.tsx` rendering `PrototypeHomePage`.

The live component should keep local states for missing config, idle, loading, results, empty, error, and selected unsupported. It should never call the mock API.

- [ ] **Step 4: Run live runtime tests and verify GREEN**

Run:

```bash
npm test -- tests/home-screen.test.tsx
```

Expected: pass.

### Task 3: Update QA Documentation

**Files:**

- Modify: `docs/qa/05-api-integration.md`

- [ ] **Step 1: Patch QA notes**

Add an issue #2 smoke section that states local live browser smoke is blocked by `jackson-simionato/sombreado-service#11` until backend CORS allows the local Next origin. Record that this repo must not add backend behavior.

- [ ] **Step 2: Check docs diff**

Run:

```bash
git diff -- docs/qa/05-api-integration.md
```

Expected: the QA doc includes issue #2 smoke setup and blocker notes only.

### Task 4: Full Verification

**Files:**

- All changed files.

- [ ] **Step 1: Run focused tests**

```bash
npm test -- tests/api/routeCandidates.test.ts tests/home-screen.test.tsx
```

- [ ] **Step 2: Run full frontend checks**

```bash
npm test
npm run lint
npm run typecheck
```

- [ ] **Step 3: Confirm frontend-only boundary**

```bash
rg "FastAPI|APIRouter|scraper|GTFS|CREATE TABLE|INSERT INTO" app src tests
```

Expected: no backend implementation code in app, src, or tests.
