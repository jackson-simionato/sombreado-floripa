# Sombreado Floripa

Passenger-facing mobile web app for onboard sun-side guidance on Florianopolis buses.

Sombreado Floripa helps riders who are already boarding, onboard, or previewing a route choose the bus side with less direct sun exposure. The app is frontend-only: advisory computation, route data, scraper ingestion, and service APIs live in separate projects.

## Repository Role

This repository owns the browser app experience:

- onboard-first rider flow
- route candidate selection and manual route search UI
- explicit direction choice before confirmation
- compact route confirmation UI
- onboard advice, route preview advice, withheld, loading, empty, and error states
- browser-direct calls to `sombreado-service`

This repository does not own scraper ingestion, transit-data processing, advisory computation, or service endpoint implementation.

## Current Product Contract

The current v1 flow is defined by:

- [CONTEXT.md](CONTEXT.md) for canonical domain language
- [docs/product-decisions.md](docs/product-decisions.md) for product decisions
- [docs/wireframes-v1.md](docs/wireframes-v1.md) for the screen-state contract and low-fidelity flow
- [docs/brand-guide.md](docs/brand-guide.md) for visual and voice guidance

## Setup Expectations

The frontend app should be implemented at the repository root, not inside a nested `frontend/` folder.

The app calls `sombreado-service` directly from the browser using `NEXT_PUBLIC_API_URL` as the public API base URL convention.

Use Node.js 22 or later. With nvm, run `nvm use` from the repository root; `.nvmrc` selects the supported major version.

Install dependencies:

```bash
npm ci
```

Install Git hooks:

```bash
npm run prepare
```

Run the development server:

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

See [docs/engineering-standards.md](docs/engineering-standards.md) for branch, commit, hook, and pull request expectations.

## Production deploy

The app deploys to **Cloudflare Workers** from GitHub Actions on pushes to `main`, after the CI job passes.

### One-time setup

1. Create a free Cloudflare account if needed.
2. Create an API token with **Edit Cloudflare Workers**.
3. Copy the Cloudflare Account ID from the dashboard.
4. In this GitHub repository’s Actions secrets, set:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `NEXT_PUBLIC_API_URL` (public `sombreado-service` base URL including `/v1`)
   - optional `ALLOW_SKIP_DEPLOY=1` to skip deploy when the Cloudflare secrets are not ready yet
5. After the first successful deploy, add the Workers origin (for example `https://sombreado-floripa.<account>.workers.dev`) to `CORS_ORIGINS` on the Render-hosted `sombreado-service`.

## Not In Scope

- backend service implementation
- scraper or GTFS ingestion
- timetable planning
- bus stop planning as the primary flow
- accounts, saved routes, or feedback tools for v1
