import { DOMAIN_TOPICS } from "./constants";
import { slugify } from "./slugify";
import { deriveSubtitleSource, extractPartNumber, stripLeadingNumber } from "./titleUtils";

export interface SeriesSlugInput {
  seriesId: string;
  seriesTitle: string;
}

export interface EpisodeSlugInput {
  episodeId: string;
  cleanTitle: string;
  part: number | null;
  seriesId: string | null;
}

const MAX_SERIES_TOKENS = 4;
const MAX_EPISODE_TOKENS = 4;
const MAX_EPISODE_KEYWORD_TOKENS = 2;
const HANDLE_FALLBACK_ID_LENGTH = 8;

const splitTokens = (value: string): string[] => value.split("-").map((token) => token.trim()).filter(Boolean);

const takeFirstTokens = (tokens: string[], limit: number): string[] => tokens.slice(0, Math.max(limit, 0));

const fallbackTokensFromId = (id: string): string[] =>
  id
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .split("-")
    .filter(Boolean)
    .slice(0, MAX_SERIES_TOKENS);

const resolveSlugConflict = (baseSlug: string, taken: Set<string>): string => {
  let candidate = baseSlug;
  let counter = 2;
  while (taken.has(candidate)) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
  taken.add(candidate);
  return candidate;
};

const pickSeriesHandle = (seriesSlug: string, seriesId: string): string => {
  const tokens = splitTokens(seriesSlug);
  const handle = tokens.find((token) => !DOMAIN_TOPICS.has(token));
  if (handle) {
    return handle;
  }

  if (tokens.length >= 2) {
    return `${tokens[0]}${tokens[1]}`;
  }

  if (tokens.length === 1) {
    return tokens[0];
  }

  return seriesId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, HANDLE_FALLBACK_ID_LENGTH) || "item";
};

const ensureKeywordTokens = (candidateTokens: string[], fallbackTokens: string[], fallbackId: string): string[] => {
  if (candidateTokens.length > 0) {
    return candidateTokens;
  }
  if (fallbackTokens.length > 0) {
    return fallbackTokens;
  }
  return [fallbackId.slice(0, 4).toLowerCase()];
};

const dedupeTokens = (existing: string[], candidates: string[]): string[] => {
  const seen = new Set(existing);
  const results: string[] = [];
  candidates.forEach((token) => {
    if (!seen.has(token)) {
      seen.add(token);
      results.push(token);
    }
  });
  return results;
};

export const generateSeriesSlug = (series: SeriesSlugInput, taken: Set<string>): string => {
  const { seriesId, seriesTitle } = series;

  const baseSlug = slugify(seriesTitle);
  const tokens = splitTokens(baseSlug);
  const truncatedTokens =
    tokens.length > 0 ? takeFirstTokens(tokens, MAX_SERIES_TOKENS) : fallbackTokensFromId(seriesId);

  const joined = truncatedTokens.join("-");
  const finalSlug = resolveSlugConflict(joined || seriesId.toLowerCase(), taken);
  return finalSlug;
};

interface SeriesSlugLookup {
  get(seriesId: string): string | undefined;
}

export const generateEpisodeSlug = (
  episode: EpisodeSlugInput,
  seriesLookup: SeriesSlugLookup,
  taken: Set<string>
): string => {
  const cleanedTitle = stripLeadingNumber(episode.cleanTitle);
  const { title: titleWithoutPart, partNumber } = extractPartNumber(cleanedTitle);
  const subtitleSource = deriveSubtitleSource(titleWithoutPart);

  const subtitleSlug = slugify(subtitleSource);
  const keywordTokens = takeFirstTokens(splitTokens(subtitleSlug), MAX_EPISODE_KEYWORD_TOKENS);

  const fallbackSubtitleSlug = slugify(titleWithoutPart);
  const fallbackTokens = takeFirstTokens(splitTokens(fallbackSubtitleSlug), MAX_EPISODE_KEYWORD_TOKENS);

  const effectiveKeywords = ensureKeywordTokens(
    keywordTokens,
    fallbackTokens,
    episode.episodeId.replace(/[^a-z0-9]/gi, "")
  );

  const handle = episode.seriesId ? pickSeriesHandle(seriesLookup.get(episode.seriesId) ?? "", episode.seriesId) : null;

  const baseTokens: string[] = [];

  if (handle) {
    baseTokens.push(handle);
    const uniqueKeywords = dedupeTokens(baseTokens, effectiveKeywords);
    const slotsForKeywords = MAX_EPISODE_TOKENS - baseTokens.length - (partNumber ? 1 : 0);
    baseTokens.push(...uniqueKeywords.slice(0, Math.max(slotsForKeywords, 0)));
  } else {
    const uniqueKeywords = dedupeTokens(baseTokens, effectiveKeywords);
    const slotsForKeywords = MAX_EPISODE_TOKENS - (partNumber ? 1 : 0);
    baseTokens.push(...uniqueKeywords.slice(0, Math.max(slotsForKeywords, 0)));
  }

  if (partNumber !== null) {
    if (baseTokens.length >= MAX_EPISODE_TOKENS) {
      baseTokens.pop();
    }
    baseTokens.push(`pt${partNumber}`);
  }

  if (baseTokens.length === 0) {
    baseTokens.push(episode.episodeId.slice(0, 8).toLowerCase());
  }

  const joined = baseTokens.join("-");
  return resolveSlugConflict(joined, taken);
};
