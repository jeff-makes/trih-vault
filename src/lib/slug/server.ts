import { loadSlugRegistry } from "@/lib/data";
import { getEpisodeBySlug, getSeriesBySlug } from "./lookup";

export interface EpisodeStaticParam {
  slug: string;
}

export interface SeriesStaticParam {
  slug: string;
}

const listSlugsByType = (type: "episode" | "series"): string[] => {
  const registry = loadSlugRegistry();
  return Object.entries(registry)
    .filter(([, entry]) => entry.type === type)
    .map(([slug]) => slug);
};

export const listEpisodeSlugs = (): string[] => listSlugsByType("episode");

export const listSeriesSlugs = (): string[] => listSlugsByType("series");

export const resolveEpisode = getEpisodeBySlug;

export const resolveSeries = getSeriesBySlug;
