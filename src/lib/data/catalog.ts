import type { PublicEpisode, PublicSeries } from "@/types";

import { loadPublicEpisodes, loadPublicSeries } from "./publicArtefacts";
import { findSlugEntry } from "./slugRegistry";

type EpisodeMap = Map<string, PublicEpisode>;
type SeriesMap = Map<string, PublicSeries>;

let cachedEpisodes: PublicEpisode[] | null = null;
let cachedSeries: PublicSeries[] | null = null;
let cachedEpisodeMap: EpisodeMap | null = null;
let cachedSeriesMap: SeriesMap | null = null;

const ensureEpisodeCache = (): PublicEpisode[] => {
  if (!cachedEpisodes) {
    cachedEpisodes = loadPublicEpisodes();
  }
  return cachedEpisodes;
};

const ensureSeriesCache = (): PublicSeries[] => {
  if (!cachedSeries) {
    cachedSeries = loadPublicSeries();
  }
  return cachedSeries;
};

const ensureEpisodeMap = (): EpisodeMap => {
  if (!cachedEpisodeMap) {
    cachedEpisodeMap = new Map(ensureEpisodeCache().map((episode) => [episode.episodeId, episode]));
  }
  return cachedEpisodeMap;
};

const ensureSeriesMap = (): SeriesMap => {
  if (!cachedSeriesMap) {
    cachedSeriesMap = new Map(ensureSeriesCache().map((series) => [series.seriesId, series]));
  }
  return cachedSeriesMap;
};

export const getAllEpisodes = (): PublicEpisode[] => ensureEpisodeCache();

export const getAllSeries = (): PublicSeries[] => ensureSeriesCache();

export const getEpisodeById = (episodeId: string): PublicEpisode | undefined => ensureEpisodeMap().get(episodeId);

export const getSeriesById = (seriesId: string): PublicSeries | undefined => ensureSeriesMap().get(seriesId);

const resolveEpisodeIdFromSlug = (slug: string): string | null => {
  const entry = findSlugEntry(slug);
  if (entry?.type === "episode") {
    return entry.id;
  }
  // Support direct lookups by canonical ID for flexibility
  return slug; // will fall back to undefined if not a true ID
};

const resolveSeriesIdFromSlug = (slug: string): string | null => {
  const entry = findSlugEntry(slug);
  if (entry?.type === "series") {
    return entry.id;
  }
  return slug;
};

export const getEpisodeBySlug = (slug: string): PublicEpisode | undefined => {
  const episodeId = resolveEpisodeIdFromSlug(slug);
  return episodeId ? getEpisodeById(episodeId) : undefined;
};

export const getSeriesBySlug = (slug: string): PublicSeries | undefined => {
  const seriesId = resolveSeriesIdFromSlug(slug);
  return seriesId ? getSeriesById(seriesId) : undefined;
};

export const getEpisodesForSeries = (seriesId: string): PublicEpisode[] => {
  const episodes = ensureEpisodeCache();
  return episodes
    .filter((episode) => episode.seriesId === seriesId)
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
};

export const getSeriesForEpisode = (episodeId: string): PublicSeries | undefined => {
  const episode = getEpisodeById(episodeId);
  if (!episode?.seriesId) {
    return undefined;
  }
  return getSeriesById(episode.seriesId);
};

interface CountMap {
  [key: string]: number;
}

const incrementCount = (map: CountMap, key: string) => {
  if (!map[key]) {
    map[key] = 1;
  } else {
    map[key] += 1;
  }
};

const buildCountsFromEpisodes = (episodes: PublicEpisode[]): {
  people: CountMap;
  places: CountMap;
  themes: CountMap;
  topics: CountMap;
} => {
  const people: CountMap = {};
  const places: CountMap = {};
  const themes: CountMap = {};
  const topics: CountMap = {};

  episodes.forEach((episode) => {
    const uniquePeople = new Set(episode.keyPeople ?? []);
    const uniquePlaces = new Set(episode.keyPlaces ?? []);
    const uniqueThemes = new Set(episode.keyThemes ?? []);
    const uniqueTopics = new Set((episode.keyTopics ?? []).map((topic) => topic.id));

    uniquePeople.forEach((name) => incrementCount(people, name));
    uniquePlaces.forEach((name) => incrementCount(places, name));
    uniqueThemes.forEach((name) => incrementCount(themes, name));
    uniqueTopics.forEach((topicId) => incrementCount(topics, topicId));
  });

  return { people, places, themes, topics };
};

export interface SeriesAggregate {
  series: PublicSeries;
  episodes: PublicEpisode[];
  peopleCounts: CountMap;
  placeCounts: CountMap;
  themeCounts: CountMap;
  topicCounts: CountMap;
}

export const getSeriesAggregate = (seriesId: string): SeriesAggregate | undefined => {
  const series = getSeriesById(seriesId);
  if (!series) {
    return undefined;
  }

  const episodes = getEpisodesForSeries(seriesId);
  const { people, places, themes, topics } = buildCountsFromEpisodes(episodes);

  return {
    series,
    episodes,
    peopleCounts: people,
    placeCounts: places,
    themeCounts: themes,
    topicCounts: topics
  };
};

export interface EpisodeContext {
  episode: PublicEpisode;
  series: PublicSeries | undefined;
  siblings: PublicEpisode[];
  peopleCounts: CountMap;
  placeCounts: CountMap;
  themeCounts: CountMap;
  topicCounts: CountMap;
}

export const getEpisodeContext = (episodeId: string): EpisodeContext | undefined => {
  const episode = getEpisodeById(episodeId);
  if (!episode) {
    return undefined;
  }

  const series = episode.seriesId ? getSeriesById(episode.seriesId) : undefined;
  const siblings = episode.seriesId ? getEpisodesForSeries(episode.seriesId).filter((ep) => ep.episodeId !== episodeId) : [];
  const { people, places, themes, topics } = buildCountsFromEpisodes([episode]);

  return {
    episode,
    series,
    siblings,
    peopleCounts: people,
    placeCounts: places,
    themeCounts: themes,
    topicCounts: topics
  };
};

export const resetDataCaches = (): void => {
  cachedEpisodes = null;
  cachedSeries = null;
  cachedEpisodeMap = null;
  cachedSeriesMap = null;
};
