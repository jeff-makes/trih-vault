# Topic Registry

Curated taxonomy for `keyTopics` emitted by the episode LLM enrichment stage.

## Goals
- Provide reusable topic chips that link related episodes/series.
- Keep naming consistent across runs (no `WW2` vs `World War II` drift).
- Offer a review workflow for adding new topics when gaps appear.

## Naming Rules
1. **Title Case**, 1–4 words. Prefer the most recognisable phrasing (“World War II” over “WW2”).
2. **Singular concepts** — pick the overarching event/person/idea, not micro-details already covered by `keyThemes`.
3. **No punctuation** other than apostrophes or hyphenated surnames when necessary (e.g., “St Bartholomew's Day Massacre”).
4. **Use canonical spellings** (e.g., “Napoléon” → “Napoleon”).
5. **Stable IDs** — kebab-case strings derived from the label (`world-war-ii`). IDs never change once published.

## Registry Files
- `data/rules/topics.json` — machine-readable list of topic definitions (ID, label, slug, aliases, description).
- `src/config/topics.ts` — typed helpers for runtime use.

## LLM Guidance (preview)
- Episode prompt receives the registry (IDs, labels, aliases) and must only emit topic IDs from that list unless no reasonable match exists.
- When suggesting a new topic, it must follow the naming rules and include a short rationale. Composer will mark it `pending` until a maintainer approves and adds it to the registry.

## Adding / Updating Topics
1. Edit `data/rules/topics.json` (keep alphabetical order by label).
2. Run `npm run lint` to ensure JSON import types stay valid (no dedicated build step yet).
3. Document the change under “Recent Changes” in `codex-notes.md` if it affects the taxonomy materially.

### Approval Workflow for New Suggestions
1. Pipeline writes a ledger entry (`stage: llm:episodes`) whenever the model proposes a topic not found in the registry. The raw cache entry includes `keyTopics[].isPending = true` and a short `notes` string.
2. Review the suggestion, decide whether it belongs in the canonical list, and update `topics.json` accordingly (add aliases as needed).
3. Re-run the pipeline (or targeted enrichment) after adding the topic so caches capture the final ID/label.

## Seed Topics
The initial registry covers high-frequency arcs to unblock UI work:
- American Civil War
- Ancient Rome
- British Empire
- Cold War
- French Revolution
- Napoleonic Wars
- Theme Parks & Disney
- World War I
- World War II

Extend as needed, but keep the list curated—topics should be broad enough to connect multiple episodes.
