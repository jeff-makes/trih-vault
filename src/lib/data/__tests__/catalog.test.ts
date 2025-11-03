import { describe, expect, it, beforeEach } from "vitest";

import {
  getAllEpisodes,
  getEpisodeById,
  getEpisodeBySlug,
  getSeriesById,
  getSeriesBySlug,
  getSeriesAggregate,
  getEpisodeContext,
  resetDataCaches
} from "@/lib/data";

describe("data catalog helpers", () => {
  beforeEach(() => {
    resetDataCaches();
  });

  it("resolves episodes by id and slug", () => {
    const episodes = getAllEpisodes();
    expect(episodes.length).toBeGreaterThan(0);

    const sample = episodes[0];
    const byId = getEpisodeById(sample.episodeId);
    const bySlug = getEpisodeBySlug(sample.slug);

    expect(byId?.episodeId).toBe(sample.episodeId);
    expect(bySlug?.episodeId).toBe(sample.episodeId);
  });

  it("exposes aggregates for a series", () => {
    const series = getSeriesBySlug("hitler-ian-kershaw-two");
    expect(series).toBeDefined();

    const aggregate = getSeriesAggregate(series!.seriesId);
    expect(aggregate).toBeDefined();
    expect(aggregate?.episodes.length).toBeGreaterThan(0);
    expect(Object.keys(aggregate?.peopleCounts ?? {}).length).toBeGreaterThan(0);
  });

  it("creates episode context with sibling information", () => {
    const series = getSeriesBySlug("hitler-ian-kershaw-two");
    expect(series).toBeDefined();
    const members = getSeriesAggregate(series!.seriesId)?.episodes ?? [];
    expect(members.length).toBeGreaterThan(0);

    const target = members[0];
    const context = getEpisodeContext(target.episodeId);

    expect(context).toBeDefined();
    expect(context?.series?.seriesId).toBe(series?.seriesId);
    expect(context?.siblings.every((episode) => episode.seriesId === series?.seriesId)).toBe(true);
  });
});
