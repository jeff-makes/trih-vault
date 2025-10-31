# Timeline Data QA Backlog

Use this list to capture data issues discovered while testing the timeline UI. Each entry should include the affected episode/series IDs, a short description, and the suspected pipeline stage to adjust later (typically `grouper.ts` heuristics or a future override map).

## Open Items

- _None_ – overrides + grouper normalization applied (2025-10-31).

## Recently Resolved

- Episodes `175`–`177` (`Crucifixion` / `The Jews Against Rome` arc) now share `crucifixion-20220414`.
- London week (`209`–`213`) grouped under `londinium-20220718`.
- Stalingrad arc (`214`–`215`) grouped under `the-battle-of-stalingrad-20220725`.
- Byzantine arc (`218`–`220`), Cleopatra arc (`195`–`198`), Treason arc (`248`–`249`), Rise of the Nazis (`295`–`298`), Reagan arc (`310`–`312`), Columbus arc (`306`–`309`), Coronations arc (`327`–`329`), Fall of Saigon (`324`–`325`), Hundred Years’ War (`318`–`321`), Ireland arc (`336`–`339`), Jesus Christ (`287`–`288`), Lady Jane Grey (`293`–`294`), Trial of Charles I (`143`–`144`), Princes in the Tower (`138`–`139`), Amsterdam (`351`–`352`), Paris 1968 (`353`–`354`), Oppenheimer (`343`–`344`), World Cup of Kings & Queens (`123`–`124`), Alexander the Great (`116`–`117`), American Civil War (`200`–`203`), American Revolution (`347`–`350`), Trials of Oscar Wilde (`341`–`342`), Ancient Carthage (`421`–`424`), Custer vs. Crazy Horse (`446`–`453`), Modern Elections (`463`–`464`), History’s Greatest Beards (`491`–`492`), and Peasants’ Revolt / Chaucer follow-ups (`413`–`416`) now align via overrides.

## How to resolve future discoveries

1. Update `src/config/seriesOverrides.ts` (or refine `grouper.ts`) so affected episodes share the intended `seriesId`.
2. Re-run `npm run dev:pipeline -- --max-llm-calls 0` (or full pipeline) to regenerate `public/*.json`.
3. Verify with `jq '.[] | select(.seriesId == null and (.cleanTitle | test("Part \\\\d"))) public/episodes.json'`.
