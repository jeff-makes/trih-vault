# Vercel ISR Cost Mitigation Plan

Date captured: 2026-05-26

## Current Diagnosis

Vercel usage is not aligned with human traffic from Google Analytics. The likely root cause is crawler amplification across a large static App Router graph, not accidental revalidation loops or application bugs.

Evidence found:

- No intentional ISR controls were found in app code: no `export const revalidate`, no `next: { revalidate }`, no `unstable_cache`, and no server cached `fetch()` patterns.
- Production build prerenders roughly 1,700 App Router pages.
- Runtime logs show machine-like traversal across `/episode`, `/topics`, `/people`, `/places`, `/series`, and `/`.
- Static App Router pages produce HTML and RSC artifacts. Even cache hits can count as ISR reads, and large RSC payloads increase transfer cost.
- Search Console changes the strategy:
  - `/topics` pages are the strongest SEO asset.
  - `/episode` pages are individually long-tail but collectively useful.
  - `/people` pages are weaker.
  - `/places` pages are weakest.
  - Most exported/indexed URLs drive no clicks, and a small set of pages drives most traffic.

## Goals

- Reduce ISR reads and Fast Origin Transfer by 80-95%.
- Preserve strong `/topics` pages.
- Preserve `/episode` indexing for now.
- Be aggressive with weak `/people` and `/places` long-tail pages.
- Prefer fast operational mitigation before deeper architecture refactors.

## Phase 1: Immediate Operational Mitigation

Goal: reduce crawler-driven ISR reads before major code changes.

Expected impact: 40-85% reduction if unwanted crawlers are the primary driver.

Risk: low to moderate. Main risk is accidentally challenging or blocking useful search crawlers. Start with logging where possible, then tighten.

Checklist:

- [ ] Enable Vercel AI Bots Managed Ruleset.
- [ ] Enable Vercel Bot Protection Managed Ruleset.
- [ ] Start managed bot rules in log/challenge mode if unsure.
- [ ] Move obvious unwanted AI/SEO scrapers to deny.
- [ ] Add WAF rule for known AI and SEO scraper user agents.
- [ ] Add rate limits for suspicious non-browser traffic.
- [ ] Apply stricter limits to `/people/*` and `/places/*`.
- [ ] Apply more conservative limits to `/topics/*` and `/episode/*`.
- [ ] Keep Googlebot and Bingbot allowed.
- [x] Tighten generated `robots.txt`.
- [ ] Record baseline ISR reads/day, ISR bytes/day, Fast Origin Transfer/day.
- [ ] Track path-prefix breakdown: `/topics`, `/episode`, `/people`, `/places`, `/series`, `/`.
- [ ] Track top user agents and challenge/deny counts.
- [ ] Recheck Vercel usage after 24 hours, 72 hours, and 7 days.

Suggested WAF targets:

- `GPTBot`
- `ClaudeBot`
- `meta-externalagent`
- `Amazonbot`
- `PetalBot`
- `SemrushBot`
- `AhrefsBot`
- `MJ12bot`
- `DotBot`
- `BLEXBot`
- `Bytespider`

Suggested rate-limit signals:

- High unique URL count per IP/user-agent over a short window.
- Missing or odd browser headers.
- Very high request rates against static HTML/RSC routes.
- Repeated traversal of `/people/*` and `/places/*`.

Observability notes:

- Primary success metric: ISR reads/day.
- Secondary success metrics: ISR read bytes/day and Fast Origin Transfer/day.
- Watch Google Search Console crawl stats and indexed page counts to ensure useful search crawling remains healthy.

## Phase 2: SEO Surface Pruning

Goal: reduce crawler-discoverable weak URLs while preserving SEO winners.

Expected impact: 20-60% additional reduction, depending how much crawler traffic currently lands on weak people/place pages.

Risk: moderate. Use Search Console click/impression data and deploy gradually.

Checklist:

- [ ] Add high-value page policy module, likely `src/lib/seo/pageValue.ts`.
- [ ] Add generated or checked-in Search Console allowlist data.
- [ ] Keep strong `/topics` pages static and indexed.
- [ ] Keep `/episode` pages indexed for now.
- [ ] Include only high-value `/people` pages in sitemap.
- [ ] Include only high-value `/places` pages in sitemap.
- [ ] Add `noindex, follow` metadata to low-value people/place pages during transition.
- [ ] Update `getPersonStaticSlugs()` to return only curated or SEO-proven people.
- [ ] Update `getPlaceStaticSlugs()` to return only curated or SEO-proven places.
- [ ] Keep `getTopicStaticSlugs()` broad.
- [ ] Add `dynamicParams = false` to weak entity route families after transition.
- [ ] Disable `Link` prefetch on dense episode/entity lists.

Suggested high-value criteria:

- Topics: curated topic registry OR any Search Console clicks OR meaningful impressions.
- Episodes: keep indexed/static for now because aggregate clicks are useful.
- People: Search Console clicks >= 2, meaningful impressions, or manual allowlist.
- Places: Search Console clicks >= 2-3, meaningful impressions, or manual allowlist.
- Everything else: remove from sitemap, noindex during transition, then consider 404/410 or `dynamicParams = false`.

Likely files:

- `src/lib/entities.ts`
- `app/people/[slug]/page.tsx`
- `app/places/[slug]/page.tsx`
- `app/topics/[slug]/page.tsx`
- `app/episode/[slug]/page.tsx`
- `scripts/generate-sitemap.ts`
- `src/components/detail/EpisodeCard.tsx`
- `src/components/detail/PillLink.tsx`
- `src/components/entity/EntityEpisodes.tsx`

## Phase 3: App Router and RSC Payload Optimization

Goal: reduce byte cost per legitimate crawl or visit.

Expected impact: 15-50% additional Fast Origin Transfer reduction. This may reduce bytes more than read count.

Risk: highest implementation cost. Do this only if Phase 1 and Phase 2 do not sufficiently reduce cost.

Checklist:

- [ ] Stop passing full episode arrays into client entity components.
- [ ] Replace full `PublicEpisode` props with compact episode summaries.
- [ ] Render initial entity lists server-side.
- [ ] Load additional entity episodes on demand.
- [ ] Redesign high-cardinality entity pages.
- [ ] Keep topic pages rich because they are SEO winners.
- [ ] Keep people/place pages thinner unless proven valuable.
- [ ] Consider static JSON shards or route handlers for "load more" behavior.

Likely files:

- `src/components/entity/EntityEpisodes.tsx`
- `app/topics/[slug]/page.tsx`
- `app/people/[slug]/page.tsx`
- `app/places/[slug]/page.tsx`
- possible new `src/components/entity/EntityEpisodeList.server.tsx`

## Decision Gates

Run Phase 1 first and measure for 3-7 days.

Proceed to Phase 2 if:

- ISR reads remain above target.
- Fast Origin Transfer remains high.
- Logs still show broad crawling of weak people/place URLs.

Proceed to Phase 3 if:

- Phase 1 and Phase 2 reduce request count but bytes remain too high.
- Top transfer-cost pages are still large `/topics` or other high-value SEO pages that must stay indexed.

## Phase 1 Starting State

Repo-side action started now:

- `scripts/generate-sitemap.ts` now generates a stricter `robots.txt`.
- `public/robots.txt` now matches the generated policy after running `npm run generate:sitemap`.
- `npm run test` passes with 13 files and 51 tests.

Vercel dashboard actions still need manual execution unless writable firewall API access is added to the workspace.
