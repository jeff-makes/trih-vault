import type { PublicEpisode, PublicSeries } from "@/types";

import { loadPublicEpisodes, loadPublicSeries, findSlugEntry } from "@/lib/data";

let episodeIndex: Map<string, PublicEpisode> | null = null;
let seriesIndex: Map<string, PublicSeries> | null = null;

const buildEpisodeIndex = () => {
  if (!episodeIndex) {
    episodeIndex = new Map(loadPublicEpisodes().map((episode) => [episode.episodeId, episode]));
  }
  return episodeIndex;
};

const buildSeriesIndex = () => {
  if (!seriesIndex) {
    seriesIndex = new Map(loadPublicSeries().map((series) => [series.seriesId, series]));
  }
  return seriesIndex;
};

export const getEpisodeBySlug = (slug: string): PublicEpisode | undefined => {
  const episodes = buildEpisodeIndex();
  const entry = findSlugEntry(slug);

  if (entry?.type === "episode") {
    const match = episodes.get(entry.id);
    if (match) {
      return match;
    }
  }

  return episodes.get(slug);
};

export const getSeriesBySlug = (slug: string): PublicSeries | undefined => {
  const series = buildSeriesIndex();
  const entry = findSlugEntry(slug);

  if (entry?.type === "series") {
    const match = series.get(entry.id);
    if (match) {
      return match;
    }
  }

  return series.get(slug);
};

export const pruneSlugLookupCaches = (): void => {
  episodeIndex = null;
  seriesIndex = null;
};
