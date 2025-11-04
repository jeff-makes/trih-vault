import type { PublicEpisode, PublicSeries } from "@/types";

import { getAllEpisodes, getAllSeries, getEpisodesForSeries } from "@/lib/data";

const toSet = (values: string[] | null | undefined): Set<string> => new Set((values ?? []).filter(Boolean));

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) {
    return 0;
  }
  let intersection = 0;
  a.forEach((value) => {
    if (b.has(value)) {
      intersection += 1;
    }
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export interface SimilarEpisode {
  episode: PublicEpisode;
  score: number;
}

export interface SimilarSeries {
  series: PublicSeries;
  score: number;
}

const buildEpisodeFeatureSets = (episode: PublicEpisode) => ({
  people: toSet(episode.keyPeople),
  places: toSet(episode.keyPlaces),
  themes: toSet(episode.keyThemes),
  topics: new Set((episode.keyTopics ?? []).map((topic) => topic.id))
});

export const scoreEpisodeSimilarity = (target: PublicEpisode, candidate: PublicEpisode): number => {
  if (target.episodeId === candidate.episodeId) {
    return 0;
  }

  const targetFeatures = buildEpisodeFeatureSets(target);
  const candidateFeatures = buildEpisodeFeatureSets(candidate);

  const peopleScore = jaccard(targetFeatures.people, candidateFeatures.people);
  const placesScore = jaccard(targetFeatures.places, candidateFeatures.places);
  const themeScore = jaccard(targetFeatures.themes, candidateFeatures.themes);
  const topicScore = jaccard(targetFeatures.topics, candidateFeatures.topics);

  let score = peopleScore * 0.45 + placesScore * 0.25 + themeScore * 0.15 + topicScore * 0.15;

  if (target.seriesId && candidate.seriesId && target.seriesId === candidate.seriesId) {
    score += 0.25; // strong bonus for same series membership
  }

  return clamp(score);
};

export const findRelatedEpisodes = (
  targetEpisodeId: string,
  limit = 6
): SimilarEpisode[] => {
  const episodes = getAllEpisodes();
  const target = episodes.find((episode) => episode.episodeId === targetEpisodeId);
  if (!target) {
    return [];
  }

  return episodes
    .map((candidate) => ({
      episode: candidate,
      score: scoreEpisodeSimilarity(target, candidate)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

const buildSeriesFeatureSets = (series: PublicSeries) => {
  const members = getEpisodesForSeries(series.seriesId);
  const people = new Set<string>();
  const places = new Set<string>();
  const themes = new Set<string>();
  const topics = new Set<string>();

  members.forEach((episode) => {
    (episode.keyPeople ?? []).forEach((person) => people.add(person));
    (episode.keyPlaces ?? []).forEach((place) => places.add(place));
    (episode.keyThemes ?? []).forEach((theme) => themes.add(theme));
    (episode.keyTopics ?? []).forEach((topic) => topics.add(topic.id));
  });

  return { people, places, themes, topics };
};

export const scoreSeriesSimilarity = (target: PublicSeries, candidate: PublicSeries): number => {
  if (target.seriesId === candidate.seriesId) {
    return 0;
  }

  const targetFeatures = buildSeriesFeatureSets(target);
  const candidateFeatures = buildSeriesFeatureSets(candidate);

  const peopleScore = jaccard(targetFeatures.people, candidateFeatures.people);
  const placesScore = jaccard(targetFeatures.places, candidateFeatures.places);
  const themeScore = jaccard(targetFeatures.themes, candidateFeatures.themes);
  const topicScore = jaccard(targetFeatures.topics, candidateFeatures.topics);

  const score = peopleScore * 0.45 + placesScore * 0.25 + themeScore * 0.15 + topicScore * 0.15;
  return clamp(score);
};

export const findRelatedSeries = (targetSeriesId: string, limit = 6): SimilarSeries[] => {
  const series = getAllSeries();
  const target = series.find((entry) => entry.seriesId === targetSeriesId);
  if (!target) {
    return [];
  }

  return series
    .map((candidate) => ({
      series: candidate,
      score: scoreSeriesSimilarity(target, candidate)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
