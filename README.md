# The Rest Is History Explorer

Next.js + TypeScript application and data pipeline that powers the public “The Rest Is History” explorer. The repo houses both the deterministic ingestion/enrichment pipeline and the static UI that reads the resulting JSON artefacts.

## Project Layout

- `src/pipeline/*` — RSS fetcher, programmatic enrichment, series grouping, LLM enrichment, composer, validator.
- `src/run-local-pipeline.ts` — orchestrates a full pipeline run.
- `data/` — working directory for pipeline snapshots, caches, and intermediate artefacts.
- `public/` — published JSON that the UI consumes (`episodes.json`, `series.json`, etc.).
- `app/` — Next.js App Router UI that renders the timeline and detail views.
- `docs/` — system overview, PRDs, implementation notes.
- `.github/workflows/` — CI + scheduled publish workflows.

## Prerequisites

- Node.js 20+ (project uses 23 locally, CI targets Node 20).
- npm (ships with Node).
- Environment variables in `.env.local` when running locally:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL_PRIMARY` (default `gpt-5-nano`)
  - `OPENAI_MODEL_FALLBACK` (default `gpt-4o-mini`)
  - `VERCEL_REVALIDATE_URL` (optional locally, required for scheduled publish)

## Common Commands

```bash
npm install                # install dependencies
npm run dev                # Next.js UI at http://localhost:3000
npm run dev:pipeline       # full pipeline run (rewrites data/ + public/)
npm run dev:pipeline -- --plan  # dry run for CI or quick verification
npm run schema:check       # validate artefacts against JSON Schemas
npm test                   # Vitest suite
```

## Deploy & Automation

- `ci.yml` runs lint, pipeline plan mode, and tests on every push/PR.
- `pipeline-publish.yml` runs nightly (and on dispatch), executes the full pipeline, commits updated artefacts back to `main`, and triggers the Vercel revalidation webhook when output changes.
- Vercel builds the Next.js UI from the committed artefacts; ensure commit authors have access to the Vercel project.

## Documentation

Key references live in the `docs/` directory:

- `SYSTEM_OVERVIEW.md` — architecture and pipeline walkthrough.
- `PRD-Pipeline.md` — product requirements for the data layer.
- `PRD-UI.md` — UI experience goals and scope.
- `timeline-data-qa.md`, `timeline-series-plan.md` — QA notes and planning docs.

## Contributing Workflow

1. Run `npm run dev:pipeline -- --plan` before opening a PR to confirm pipeline wiring.
2. Update artefacts (if needed) with a full pipeline run and commit the resulting JSON alongside code changes.
3. Keep `docs/` up to date when workflow or architecture changes.
4. Monitor GitHub Actions and Vercel deployments after merging.

For more background, start with `docs/SYSTEM_OVERVIEW.md` and the PRDs. Feel free to open issues or draft docs in `docs/` as new requirements emerge.
