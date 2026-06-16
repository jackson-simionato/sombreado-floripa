# Engineering Standards

These standards keep frontend changes small, reviewable, and easy to finish
consistently. They apply to humans and coding agents working in this
repository.

## Branches

Branch from `develop` unless the task explicitly targets another base.

Use an issue number when one exists:

```text
<type>/<issue-number>-<short-slug>
```

Use a short slug without an issue number for untracked maintenance:

```text
<type>/<short-slug>
```

Preferred types:

- `feat` for user-facing behavior.
- `fix` for bug fixes.
- `docs` for documentation-only changes.
- `chore` for tooling, dependencies, CI, or repo hygiene.
- `refactor` for behavior-preserving internal changes.

Examples:

- `feat/2-live-route-candidate-smoke`
- `fix/18-route-search-empty-state`
- `docs/21-api-integration-notes`
- `chore/frontend-hooks`

## Commits

Use lightweight Conventional Commit subjects:

```text
<type>(optional-scope): <imperative summary>
```

Examples:

- `feat(routes): add live candidate search`
- `test(flow): cover withheld advice state`
- `fix(config): allow local API base URL`
- `docs(contract): clarify preview advice copy`
- `chore(ci): add frontend verification gate`

Keep commits coherent:

- One behavior change per commit.
- Keep docs-only changes separate when they are not required for the code to
  make sense.
- Keep mechanical formatting separate from behavior changes.
- Keep refactors separate from behavior changes unless the refactor is the
  smallest safe path to the behavior change.
- Stage explicit paths instead of using `git add .` when unrelated changes may
  exist.

Split commits when reviewers would ask different questions about different
parts of the change. Good split points are contract adapters, state management,
UI behavior, tests, docs, and tooling.

## Local Workflow

Install dependencies:

```bash
npm ci
```

Install Git hooks:

```bash
npm run prepare
```

Start the app:

```bash
npm run dev
```

Before completing a change, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

For changes with a narrow test surface, run focused tests first, then the full
completion gate above.

## Formatting And Linting

Prettier is the formatter for supported project files. ESLint is the linter for
TypeScript and React code.

Use this order for local cleanup:

```bash
npm run format
npm run lint
npm run typecheck
```

Do not add overlapping formatters or linters unless the team first documents a
specific gap the existing tools do not cover.

## Pre-Commit

The pre-commit hook runs:

- `lint-staged`, which formats staged files with Prettier.
- `npm run typecheck`.
- `npm run test`.

Run the staged-file hook manually with:

```bash
npx lint-staged
```

Pre-commit is a local fast feedback tool. CI remains the authoritative gate.

## Pull Requests

PRs should be easy to review without reconstructing intent from chat.

Required:

- Link the GitHub issue when one exists.
- Summarize behavior changes, not just file changes.
- Include verification commands run locally.
- Keep unrelated cleanup out of the PR.
- Update `README.md`, `CONTEXT.md`, ADRs, or plan docs when public behavior or
  domain language changes.
- Call out browser API contract impact when the change affects
  `sombreado-service`.

Suggested PR body:

```markdown
## Summary

-

## Verification

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`

## Notes

-
```

## CI

CI must run non-mutating checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Do not add heavier gates such as coverage thresholds or browser automation until
the repository is ready to maintain them consistently.
