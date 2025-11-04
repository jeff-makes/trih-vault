import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";

import {
  EpisodeTopic,
  LlmEpisodeCacheEntry,
  LlmSeriesCacheEntry,
  ProgrammaticEpisode,
  ProgrammaticSeries,
  PublicEpisode,
  PublicSeries,
  RawEpisode
} from "@/types";
import { TOPIC_BY_ID } from "@/config/topics";

interface ValidatorInput {
  rawEpisodes: RawEpisode[];
  programmaticEpisodes: Record<string, ProgrammaticEpisode>;
  programmaticSeries: Record<string, ProgrammaticSeries>;
  episodeLlmCache: Record<string, LlmEpisodeCacheEntry>;
  seriesLlmCache: Record<string, LlmSeriesCacheEntry>;
  publicEpisodes: PublicEpisode[];
  publicSeries: PublicSeries[];
  episodeSchema: Record<string, unknown>;
  seriesSchema: Record<string, unknown>;
  episodeCacheSchema: Record<string, unknown>;
  seriesCacheSchema: Record<string, unknown>;
}

const createAjv = () => {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true
  });
  addFormats(ajv);
  return ajv;
};

const formatAjvErrors = (errors: ErrorObject[] | null | undefined): string => {
  if (!errors || errors.length === 0) {
    return "";
  }

  return errors
    .map((error) => {
      const params = typeof error.params === "object" ? JSON.stringify(error.params) : String(error.params);
      return `${error.instancePath || "(root)"} ${error.message ?? ""} ${params}`;
    })
    .join("\n");
};

const ensureUniqueIds = (values: string[], context: string) => {
  const seen = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      throw new Error(`Duplicate identifier detected in ${context}: ${value}`);
    }
    seen.add(value);
  });
};

const ensureYearOrder = (from: number | null, to: number | null, context: string) => {
  if (from !== null && to !== null && from > to) {
    throw new Error(`Invalid year range in ${context}: yearFrom (${from}) > yearTo (${to})`);
  }
};

const validateTopicRefs = (topics: EpisodeTopic[], context: string) => {
  topics.forEach((topic) => {
    if (topic.isPending) {
      if (!topic.id || !topic.label || !topic.slug) {
        throw new Error(`Pending topic missing required fields in ${context}`);
      }
      return;
    }
    const definition = TOPIC_BY_ID[topic.id];
    if (!definition) {
      throw new Error(`Unknown topic id "${topic.id}" in ${context}`);
    }
    if (topic.label !== definition.label) {
      throw new Error(
        `Topic label mismatch for ${topic.id} in ${context}: expected "${definition.label}", received "${topic.label}"`
      );
    }
    if (topic.slug !== definition.slug) {
      throw new Error(
        `Topic slug mismatch for ${topic.id} in ${context}: expected "${definition.slug}", received "${topic.slug}"`
      );
    }
  });
};

export const runValidation = ({
  rawEpisodes,
  programmaticEpisodes,
  programmaticSeries,
  episodeLlmCache,
  seriesLlmCache,
  publicEpisodes,
  publicSeries,
  episodeSchema,
  seriesSchema,
  episodeCacheSchema,
  seriesCacheSchema
}: ValidatorInput): void => {
  const ajv = createAjv();

  const validateEpisode = ajv.compile(episodeSchema);
  const validateSeries = ajv.compile(seriesSchema);
  const validateEpisodeCache = ajv.compile(episodeCacheSchema);
  const validateSeriesCache = ajv.compile(seriesCacheSchema);

  const allEpisodeIds = rawEpisodes.map((episode) => episode.episodeId);
  ensureUniqueIds(allEpisodeIds, "raw episodes");

  const publicEpisodeIds = publicEpisodes.map((episode) => episode.episodeId);
  ensureUniqueIds(publicEpisodeIds, "public episodes");

  const rawEpisodeMap = new Map(rawEpisodes.map((episode) => [episode.episodeId, episode]));
  const programmaticEpisodeMap = new Map(
    Object.values(programmaticEpisodes).map((episode) => [episode.episodeId, episode])
  );

  const publicSeriesMap = new Map(publicSeries.map((series) => [series.seriesId, series]));
  const usedSlugs = new Set<string>();

  const ensureUniqueSlug = (slug: string, context: string) => {
    if (!slug) {
      throw new Error(`Missing slug for ${context}`);
    }
    if (usedSlugs.has(slug)) {
      throw new Error(`Duplicate slug detected for ${context}: ${slug}`);
    }
    usedSlugs.add(slug);
  };

  publicEpisodes.forEach((episode) => {
    const episodeId = episode.episodeId;
    if (!episodeId) {
      throw new Error("Encountered public episode without an episodeId");
    }
    ensureUniqueSlug(episode.slug, `public episode ${episodeId}`);
    if (!rawEpisodeMap.has(episodeId)) {
      throw new Error(`Public episode ${episodeId} missing corresponding raw episode`);
    }
    if (!programmaticEpisodeMap.has(episodeId)) {
      throw new Error(`Public episode ${episodeId} missing corresponding programmatic episode`);
    }

    if (episode.seriesId) {
      const parentSeries = publicSeriesMap.get(episode.seriesId);
      if (!parentSeries) {
        throw new Error(`Public episode ${episodeId} references missing series ${episode.seriesId}`);
      }
      if (!parentSeries.episodeIds.includes(episodeId)) {
        throw new Error(`Series ${episode.seriesId} does not include episode ${episodeId} in its membership`);
      }
    }

    ensureYearOrder(episode.yearFrom, episode.yearTo, `public episode ${episodeId}`);

    if (!validateEpisode(episode)) {
      throw new Error(
        `Public episode ${episodeId} failed schema validation:\n${formatAjvErrors(validateEpisode.errors)}`
      );
    }
    validateTopicRefs(episode.keyTopics ?? [], `public episode ${episodeId}`);
  });

  publicSeries.forEach((series: PublicSeries) => {
    const seriesId = series.seriesId;
    if (!seriesId) {
      throw new Error("Encountered public series without a seriesId");
    }
    ensureUniqueSlug(series.slug, `public series ${seriesId}`);
    if (!validateSeries(series)) {
      throw new Error(
        `Public series ${seriesId} failed schema validation:\n${formatAjvErrors(validateSeries.errors)}`
      );
    }

    series.episodeIds.forEach((episodeId) => {
      if (!publicEpisodeIds.includes(episodeId)) {
        throw new Error(`Series ${seriesId} references missing public episode ${episodeId}`);
      }
    });

    ensureYearOrder(series.yearFrom, series.yearTo, `public series ${seriesId}`);
  });

  Object.entries(episodeLlmCache).forEach(([cacheKey, entry]) => {
    if (!validateEpisodeCache(entry)) {
      throw new Error(`Episode LLM cache entry ${cacheKey} failed schema validation:\n${formatAjvErrors(validateEpisodeCache.errors)}`);
    }
    validateTopicRefs(entry.keyTopics ?? [], `episode LLM cache ${cacheKey}`);
  });

  Object.entries(seriesLlmCache).forEach(([cacheKey, entry]) => {
    if (!validateSeriesCache(entry)) {
      throw new Error(`Series LLM cache entry ${cacheKey} failed schema validation:\n${formatAjvErrors(validateSeriesCache.errors)}`);
    }
  });
};

export default runValidation;
