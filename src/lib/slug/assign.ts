import type { PublicEpisode, PublicSeries, SlugRegistryEntry } from "@/types";

import { generateEpisodeSlug, generateSeriesSlug } from "./generate";

export type PublicEpisodeWithoutSlug = Omit<PublicEpisode, "slug">;
export type PublicSeriesWithoutSlug = Omit<PublicSeries, "slug">;

interface SeriesSlugLookup {
  get(seriesId: string): string | undefined;
}

interface SlugAssignmentResult {
  episodes: PublicEpisode[];
  series: PublicSeries[];
  registry: Record<string, SlugRegistryEntry>;
}

const buildSeriesSlugMap = (
  seriesEntries: PublicSeriesWithoutSlug[],
  takenSlugs: Set<string>,
  registry: Record<string, SlugRegistryEntry>
): Map<string, string> => {
  const map = new Map<string, string>();

  [...seriesEntries]
    .sort((a, b) => a.seriesId.localeCompare(b.seriesId))
    .forEach((series) => {
      const slug = generateSeriesSlug(series, takenSlugs);
      map.set(series.seriesId, slug);
      registry[slug] = { type: "series", id: series.seriesId };
    });

  return map;
};

const buildEpisodeSlugMap = (
  episodeEntries: PublicEpisodeWithoutSlug[],
  lookup: SeriesSlugLookup,
  takenSlugs: Set<string>,
  registry: Record<string, SlugRegistryEntry>
): Map<string, string> => {
  const map = new Map<string, string>();

  [...episodeEntries]
    .sort((a, b) => a.episodeId.localeCompare(b.episodeId))
    .forEach((episode) => {
      const slug = generateEpisodeSlug(episode, lookup, takenSlugs);
      map.set(episode.episodeId, slug);
      registry[slug] = { type: "episode", id: episode.episodeId };
    });

  return map;
};

export const assignSlugsToArtefacts = (
  episodes: PublicEpisodeWithoutSlug[],
  series: PublicSeriesWithoutSlug[]
): SlugAssignmentResult => {
  const takenSlugs = new Set<string>();
  const registry: Record<string, SlugRegistryEntry> = {};

  const seriesSlugMap = buildSeriesSlugMap(series, takenSlugs, registry);
  const seriesLookup: SeriesSlugLookup = {
    get: (seriesId: string) => seriesSlugMap.get(seriesId)
  };
  const episodeSlugMap = buildEpisodeSlugMap(episodes, seriesLookup, takenSlugs, registry);

  const publicSeries = series.map((entry) => {
    const slug = seriesSlugMap.get(entry.seriesId);
    if (!slug) {
      throw new Error(`Failed to assign slug for series ${entry.seriesId}`);
    }
    return {
      ...entry,
      slug
    };
  });

  const publicEpisodes = episodes.map((entry) => {
    const slug = episodeSlugMap.get(entry.episodeId);
    if (!slug) {
      throw new Error(`Failed to assign slug for episode ${entry.episodeId}`);
    }
    return {
      ...entry,
      slug
    };
  });

  return {
    episodes: publicEpisodes,
    series: publicSeries,
    registry
  };
};

export default assignSlugsToArtefacts;
