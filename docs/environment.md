# Environment Configuration

The pipeline consumes a small set of environment variables in both local development and production deployments.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | API token used by the LLM enrichment steps. Must be available locally and configured as a secret for CI workflows. |
| `OPENAI_MODEL_PRIMARY` | No (default `gpt-5-nano`) | Overrides the primary model used for OpenAI requests. |
| `OPENAI_MODEL_FALLBACK` | No (default `gpt-4o-mini`) | Secondary model used when the primary model is unavailable. |
| `VERCEL_REVALIDATE_URL` | No (recommended) | HTTPS endpoint called after pipeline publishes to trigger cache revalidation in Vercel. |

For local development, export the variables (or create a `.env.local` file recognised by Next.js tooling). In CI, configure them as encrypted secrets using the names referenced in `.github/workflows/ci.yml` and `.github/workflows/pipeline-publish.yml`.
