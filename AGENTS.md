# Agent Guidance

This repository is the Sombreado Floripa frontend. Treat it as a browser app repo, not a backend, scraper, or transit-data workspace.

## Canonical Context

- Use [CONTEXT.md](CONTEXT.md) for domain terms and relationship rules.
- Use [docs/product-decisions.md](docs/product-decisions.md) for current product decisions.
- Use [docs/wireframes-v1.md](docs/wireframes-v1.md) as the v1 screen-state contract.
- Use [docs/brand-guide.md](docs/brand-guide.md) for UI, copy, and visual direction.

## Repo Boundaries

- Keep implementation frontend-only.
- Call `sombreado-service` directly from the browser with `NEXT_PUBLIC_API_URL`.
- Do not implement scraper ingestion, route-data processing, advisory computation, or API server behavior in this repo.
- Do not reintroduce old backend endpoint shapes or service ownership into contributor-facing docs.
- Do not create a nested `frontend/` app folder; future app scaffolding belongs at the repository root.

## Product Guardrails

- Preserve the onboard-first flow: locate or search, choose route, choose direction, confirm, then show advice.
- Keep manual search as a secondary path that returns route-only choices before direction selection.
- Keep route confirmation compact and supporting; the app is not map-led navigation.
- Distinguish onboard advice from route preview advice without relying on color alone.
- Do not promise guaranteed shade. Describe the result as less direct sun exposure and keep geometric limitations visible.

## Agent skills

### Issue tracker

Issues and PRDs for this repo live in GitHub Issues for `jackson-simionato/sombreado-floripa`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage labels use the five canonical skill roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context frontend repo using root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Engineering standards for coding agents

Coding agents must follow `docs/engineering-standards.md`.

### Branches and commits

- Branch from `develop` unless the user explicitly chooses a different base.
- Use branch names like `feat/2-short-slug`, `fix/18-short-slug`, `docs/21-short-slug`, `chore/frontend-hooks`, or `refactor/30-short-slug`.
- Prefer small, coherent commits over one mixed changeset.
- Use lightweight Conventional Commit subjects such as `feat(routes): add live candidate search`.
- Stage explicit paths. Do not use `git add .` when unrelated changes may exist.

### Completion checks

Before claiming implementation work is complete, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Use focused tests first when useful, but the full commands above are the default completion gate.
