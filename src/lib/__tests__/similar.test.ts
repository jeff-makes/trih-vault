import { beforeEach, describe, expect, it } from "vitest";

import { getAllEpisodes, resetDataCaches } from "@/lib/data";
import { findRelatedEpisodes, findRelatedSeries, scoreEpisodeSimilarity } from "@/lib/similar";

describe("similarity helpers", () => {
  beforeEach(() => {
    resetDataCaches();
  });

  it("scores related episodes with same series higher", () => {
    const episodes = getAllEpisodes().filter((episode) => episode.seriesId);
    const target = episodes[0];
    const sibling = episodes.find((episode) => episode.seriesId === target.seriesId && episode.episodeId !== target.episodeId);
    const outsider = episodes.find((episode) => episode.seriesId !== target.seriesId);

    expect(target).toBeDefined();
    expect(sibling).toBeDefined();
    expect(outsider).toBeDefined();

    const siblingScore = scoreEpisodeSimilarity(target, sibling!);
    const outsiderScore = scoreEpisodeSimilarity(target, outsider!);
    expect(siblingScore).toBeGreaterThanOrEqual(outsiderScore);
  });

  it("finds related episodes", () => {
    const episodes = getAllEpisodes().filter((episode) => episode.seriesId);
    const target = episodes[0];
    const related = findRelatedEpisodes(target.episodeId, 3);
    expect(Array.isArray(related)).toBe(true);
  });

  it("finds related series", () => {
    const episodes = getAllEpisodes().filter((episode) => episode.seriesId);
    const targetSeriesId = episodes[0].seriesId!;
    const related = findRelatedSeries(targetSeriesId, 3);
    expect(Array.isArray(related)).toBe(true);
  });
});
