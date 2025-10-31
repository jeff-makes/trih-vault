# Series Grouping Remediation Plan

We’ve uncovered many multi-part arcs whose episodes never grouped together because the current heuristics bail out whenever the episode title stem differs slightly (e.g., `200: American Civil War: …`). This document outlines the plan to fix grouping at the pipeline level and clean up existing artefacts. Delete once the work is complete.

---

## 1. Grouper Improvements

1. **Normalize episode prefixes**  
   - Extend `stripNumberPrefix` to remove the episode number *and* any immediate punctuation (`:`, `-`, `–`, etc.).  
   - Ensure we collapse stray whitespace after stripping so stems start cleanly (`"American Civil War: …"` instead of `": American Civil War …"`).

2. **Robust stem extraction**  
   - Update `stripPartSuffix` / `splitOnDelimiters` so subtitle differences (“The Causes” vs “Outbreak”) don’t produce unique series keys when the base phrase matches.  
   - Consider capturing both the leading phrase and, when the delimiter is a colon, the second segment if it shares the same root (`"American Civil War"`).

3. **Part detection + gap logic**  
   - Keep the 14-day continuity guard, but allow subsequent parts to attach even if a bonus or preview episode sits between them.  
   - Guard against accidental re-use of a slug by comparing normalized stems before reopening a series.

## 2. Overrides & QA Safety Nets

1. **Manual override map**  
   - Introduce a small config (e.g., `data/series-overrides.json`) that maps episode IDs to explicit `seriesId`s.  
   - Merge this in after heuristic grouping so edge cases (Custer vs. Crazy Horse → Custer’s Last Stand) stay bundled without code edits.

2. **Automated QA check**  
   - Turn the ad-hoc “Part ≥2 without seriesId” query into a script or unit test. Fail the pipeline (or CI) if any such items remain.  
   - Optionally add checks ensuring every series has at least two members and that `seriesTitleFallback` doesn’t contain dangling colon prefixes.

3. **Documentation upkeep**  
   - Use `docs/timeline-data-qa.md` to track anomalies until they’re cleared. Once the script/test is reliable, the doc should approach zero entries.

## 3. Backfill & Verification

1. **Regenerate artefacts**  
   - Re-run `npm run dev:pipeline` (or the segment covering fetcher→composer) after the grouper changes.  
   - Confirm `public/episodes.json` + `public/series.json` now include complete `episodeIds` lists for the arcs in the QA log.

2. **Validate UI behaviour**  
   - Re-run the timeline QA script; manually spot-check high-profile arcs (American Civil War, Cleopatra, Hundred Years’ War, etc.).  
   - Ensure series year ranges update as expected once members carry consistent `yearFrom/yearTo`.

3. **LLM summaries & metadata**  
   - For series whose membership changed, consider re-enriching via the existing pipeline flags (or force an LLM backfill) so summaries match the new scope.  
   - Verify slug registry remains stable; collisions should be handled by the deterministic resolver already in place.

---

## Reference

- Heuristic code: `src/pipeline/grouper.ts`  
- QA query (temporary): `jq '.[] | select(.seriesId == null and (.cleanTitle | test("Part \\\\d")))' public/episodes.json`  
- Current anomaly list: `docs/timeline-data-qa.md`

