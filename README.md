# The Rest Is History Pipeline

This repository houses the deterministic data pipeline for *The Rest Is History*. It ingests the public RSS feed, performs programmatic cleanup, reuses cached LLM enrichments, and publishes stable JSON artefacts for downstream use.

## Quickstart

1. Install dependencies:
   ```bash
   npm install
   ```
2. Provide OpenAI credentials (required for enrichment stages):
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```
3. Run the full pipeline end to end:
   ```bash
   npm run fetch
   npm run enrich:episodes
   npm run build:series
   npm run enrich:series
   npm run llm:episodes
   npm run llm:series
   npm run compose
   npm run validate
   ```

The `llm:*` scripts respect cached fingerprints and the runtime safeguards described in [`docs/PRD-Pipeline.md`](docs/PRD-Pipeline.md). When developing locally, you may add the optional `--plan` flag to preview LLM usage before calling the APIs, or `--output <dir>` to write artefacts to a scratch directory.

## Outputs

After a successful run, the canonical public artefacts are emitted to:

- `public/episodes.json`
- `public/series.json`

Cache files (`data/episodes-llm.json`, `data/series-llm.json`) and intermediate layers are retained for incremental reruns and validation.
