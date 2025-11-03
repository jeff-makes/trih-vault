import type { PublicEpisode } from "@/types";

import { getAllEpisodes } from "@/lib/data";

export interface PlacesIndexEntry {
  name: string;
  appearances: number;
  episodeIds: string[];
  seriesCounts: Record<string, number>;
}

export type PlacesIndex = Map<string, PlacesIndexEntry>;

let cachedIndex: PlacesIndex | null = null;

const normaliseName = (value: string): string => value.trim();

const buildIndex = (): PlacesIndex => {
  const episodes = getAllEpisodes();
  const working = new Map<string, { appearances: number; episodeIds: Set<string>; seriesCounts: Map<string, number> }>();

  episodes.forEach((episode: PublicEpisode) => {
    const uniquePlaces = Array.from(new Set((episode.keyPlaces ?? []).map(normaliseName))).filter(Boolean);
    uniquePlaces.forEach((place) => {
      if (!working.has(place)) {
        working.set(place, {
          appearances: 0,
          episodeIds: new Set<string>(),
          seriesCounts: new Map<string, number>()
        });
      }
    });

    uniquePlaces.forEach((place) => {
      const entry = working.get(place)!;
      entry.appearances += 1;
      entry.episodeIds.add(episode.episodeId);
      if (episode.seriesId) {
        entry.seriesCounts.set(episode.seriesId, (entry.seriesCounts.get(episode.seriesId) ?? 0) + 1);
      }
    });
  });

  const index: PlacesIndex = new Map();
  working.forEach((entry, name) => {
    index.set(name, {
      name,
      appearances: entry.appearances,
      episodeIds: Array.from(entry.episodeIds).sort(),
      seriesCounts: Array.from(entry.seriesCounts.entries()).reduce<Record<string, number>>((acc, [seriesId, count]) => {
        acc[seriesId] = count;
        return acc;
      }, {})
    });
  });

  return index;
};

export const getPlacesIndex = (): PlacesIndex => {
  if (!cachedIndex) {
    cachedIndex = buildIndex();
  }
  return cachedIndex;
};

export interface AggregatedPlace {
  name: string;
  count: number;
}

export const getTopPlacesForSeries = (seriesId: string, limit = 5): AggregatedPlace[] => {
  const index = getPlacesIndex();
  const results: AggregatedPlace[] = [];

  index.forEach((entry) => {
    const count = entry.seriesCounts[seriesId];
    if (count) {
      results.push({ name: entry.name, count });
    }
  });

  return results
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const resetPlacesIndex = (): void => {
  cachedIndex = null;
};
