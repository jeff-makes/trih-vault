import type { PublicEpisode } from "@/types";

import { getAllEpisodes } from "@/lib/data";

export interface PeopleIndexEntry {
  name: string;
  appearances: number;
  episodeIds: string[];
  seriesIds: string[];
  coOccurrences: { name: string; count: number }[];
  seriesCounts: Record<string, number>;
}

export type PeopleIndex = Map<string, PeopleIndexEntry>;

let cachedIndex: PeopleIndex | null = null;

const normaliseName = (value: string): string => value.trim();

const createEntry = (name: string) => ({
  name,
  appearances: 0,
  episodeIds: new Set<string>(),
  seriesCounts: new Map<string, number>(),
  coOccurrences: new Map<string, number>()
});

const serialiseEntry = (entry: ReturnType<typeof createEntry>): PeopleIndexEntry => ({
  name: entry.name,
  appearances: entry.appearances,
  episodeIds: Array.from(entry.episodeIds).sort(),
  seriesIds: Array.from(entry.seriesCounts.keys()).sort(),
  coOccurrences: Array.from(entry.coOccurrences.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count })),
  seriesCounts: Array.from(entry.seriesCounts.entries()).reduce<Record<string, number>>((acc, [seriesId, count]) => {
    acc[seriesId] = count;
    return acc;
  }, {})
});

const buildIndex = (): PeopleIndex => {
  const episodes = getAllEpisodes();
  const working = new Map<string, ReturnType<typeof createEntry>>();

  episodes.forEach((episode: PublicEpisode) => {
    const uniquePeople = Array.from(new Set((episode.keyPeople ?? []).map(normaliseName))).filter(Boolean);
    uniquePeople.forEach((person) => {
      if (!working.has(person)) {
        working.set(person, createEntry(person));
      }
    });

    uniquePeople.forEach((person, _, arr) => {
      const entry = working.get(person)!;
      entry.appearances += 1;
      entry.episodeIds.add(episode.episodeId);
      if (episode.seriesId) {
        entry.seriesCounts.set(episode.seriesId, (entry.seriesCounts.get(episode.seriesId) ?? 0) + 1);
      }

      arr.forEach((other) => {
        if (other === person) {
          return;
        }
        entry.coOccurrences.set(other, (entry.coOccurrences.get(other) ?? 0) + 1);
      });
    });
  });

  const index: PeopleIndex = new Map();
  working.forEach((entry, name) => {
    index.set(name, serialiseEntry(entry));
  });

  return index;
};

export const getPeopleIndex = (): PeopleIndex => {
  if (!cachedIndex) {
    cachedIndex = buildIndex();
  }
  return cachedIndex;
};

export interface AggregatedPerson {
  name: string;
  count: number;
}

export const getTopPeopleForSeries = (seriesId: string, limit = 5): AggregatedPerson[] => {
  const index = getPeopleIndex();
  const results: AggregatedPerson[] = [];

  index.forEach((entry) => {
    const count = entry.seriesCounts?.[seriesId];
    if (count) {
      results.push({ name: entry.name, count });
    }
  });

  return results
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const getPeopleForEpisode = (episodeId: string): AggregatedPerson[] => {
  const index = getPeopleIndex();
  const matches: AggregatedPerson[] = [];

  index.forEach((entry) => {
    if (entry.episodeIds.includes(episodeId)) {
      matches.push({ name: entry.name, count: 1 });
    }
  });

  return matches.sort((a, b) => a.name.localeCompare(b.name));
};

export const resetPeopleIndex = (): void => {
  cachedIndex = null;
};
