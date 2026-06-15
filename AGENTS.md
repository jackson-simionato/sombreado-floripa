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

Triage labels use the canonical skill vocabulary: `bug`, `enhancement`, `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context frontend repo: use root `CONTEXT.md` and future `docs/adr/` records when present. See `docs/agents/domain.md`.
