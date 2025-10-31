import {
  LlmEpisodeCacheEntry,
  LlmSeriesCacheEntry,
  ProgrammaticEpisode,
  ProgrammaticSeries,
  PublicEpisode,
  PublicSeries,
  RawEpisode
} from "@/types";

interface ComposeInput {
  rawEpisodes: RawEpisode[];
  programmaticEpisodes: Record<string, ProgrammaticEpisode>;
  programmaticSeries: Record<string, ProgrammaticSeries>;
  episodeLlmCache: Record<string, LlmEpisodeCacheEntry>;
  seriesLlmCache: Record<string, LlmSeriesCacheEntry>;
}

interface ComposeOutput {
  publicEpisodes: PublicEpisode[];
  publicSeries: PublicSeries[];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const getEpisodeLlm = (
  entry: ProgrammaticEpisode,
  episodeCache: Record<string, LlmEpisodeCacheEntry>
): LlmEpisodeCacheEntry | null => {
  const cacheKey = `${entry.episodeId}:${entry.fingerprint}`;
  const cacheEntry = episodeCache[cacheKey];
  if (!cacheEntry || cacheEntry.status !== "ok") {
    return null;
  }
  return cacheEntry;
};

const getSeriesLlm = (
  entry: ProgrammaticSeries,
  seriesCache: Record<string, LlmSeriesCacheEntry>
): LlmSeriesCacheEntry | null => {
  const cacheKey = `${entry.seriesId}:${entry.fingerprint}`;
  const cacheEntry = seriesCache[cacheKey];
  if (!cacheEntry || cacheEntry.status !== "ok") {
    return null;
  }
  return cacheEntry;
};

const normalizeYearRange = (yearFrom: number | null, yearTo: number | null): [number | null, number | null] => {
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    return [yearTo, yearFrom];
  }
  return [yearFrom, yearTo];
};

export const runComposeStep = ({
  rawEpisodes,
  programmaticEpisodes,
  programmaticSeries,
  episodeLlmCache,
  seriesLlmCache
}: ComposeInput): ComposeOutput => {
  const rawEpisodeMap = new Map(rawEpisodes.map((episode) => [episode.episodeId, episode]));

  const publicEpisodes: PublicEpisode[] = Object.values(programmaticEpisodes)
    .map((episode) => {
      const raw = rawEpisodeMap.get(episode.episodeId);
      if (!raw) {
        throw new Error(`Missing raw episode for ${episode.episodeId}`);
      }

      const llm = getEpisodeLlm(episode, episodeLlmCache);

      const [episodeYearFrom, episodeYearTo] = normalizeYearRange(
        llm?.yearFrom ?? episode.yearFrom ?? null,
        llm?.yearTo ?? episode.yearTo ?? null
      );

      return {
        id: episode.episodeId,
        episodeId: episode.episodeId,
        title: raw.title,
        publishedAt: raw.publishedAt,
        description: raw.description,
        audioUrl: raw.audioUrl,
        rssLastSeenAt: raw.rssLastSeenAt,
        itunesEpisode: raw.source.itunesEpisode ?? null,
        cleanTitle: episode.cleanTitle,
        cleanDescriptionMarkdown: episode.cleanDescriptionMarkdown,
        cleanDescriptionText: episode.cleanDescriptionText,
        descriptionBlocks: clone(episode.descriptionBlocks),
        credits: episode.credits ? clone(episode.credits) : undefined,
        fingerprint: episode.fingerprint,
        cleanupVersion: episode.cleanupVersion,
        derived: episode.derived ? clone(episode.derived) : undefined,
        part: episode.part ?? null,
        seriesId: episode.seriesId ?? null,
        seriesKey: episode.seriesKey ?? null,
        seriesKeyRaw: episode.seriesKeyRaw ?? null,
        seriesGroupingConfidence: episode.seriesGroupingConfidence,
        keyPeople: llm?.keyPeople ? [...llm.keyPeople] : [],
        keyPlaces: llm?.keyPlaces ? [...llm.keyPlaces] : [],
        keyThemes: llm?.keyThemes ? [...llm.keyThemes] : [],
        yearFrom: episodeYearFrom,
        yearTo: episodeYearTo,
        yearConfidence: llm?.yearConfidence ?? episode.yearConfidence ?? "unknown"
      };
    })
    .sort((a, b) => {
      const dateDiff = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      return dateDiff !== 0 ? dateDiff : a.episodeId.localeCompare(b.episodeId);
    });

  const publicSeriesWithSortKey = Object.values(programmaticSeries)
    .map((series) => {
      const llm = getSeriesLlm(series, seriesLlmCache);

      const firstEpisodePublishedAt = series.episodeIds
        .map((episodeId) => rawEpisodeMap.get(episodeId)?.publishedAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? null;

      const [seriesYearFrom, seriesYearTo] = normalizeYearRange(
        llm?.yearFrom ?? series.yearFrom ?? null,
        llm?.yearTo ?? series.yearTo ?? null
      );

      return {
        id: series.seriesId,
        seriesId: series.seriesId,
        seriesKey: series.seriesKey ?? null,
        seriesKeyRaw: series.seriesKeyRaw ?? null,
        seriesGroupingConfidence: series.seriesGroupingConfidence,
        episodeIds: [...series.episodeIds],
        yearFrom: seriesYearFrom,
        yearTo: seriesYearTo,
        yearConfidence: llm?.yearConfidence ?? series.yearConfidence ?? "unknown",
        fingerprint: series.fingerprint,
        memberEpisodeFingerprints: series.memberEpisodeFingerprints
          ? [...series.memberEpisodeFingerprints]
          : undefined,
        derived: series.derived ? clone(series.derived) : undefined,
        seriesTitle: llm?.seriesTitle ?? series.seriesTitleFallback,
        narrativeSummary: llm?.narrativeSummary ?? null,
        tonalDescriptors: llm?.tonalDescriptors ? [...llm.tonalDescriptors] : null,
        rssLastSeenAt: series.rssLastSeenAt ?? null,
        _sortKey: firstEpisodePublishedAt ?? "9999-12-31T23:59:59.999Z"
      } as PublicSeries & { _sortKey: string };
    })
    .sort((a, b) => {
      if (a._sortKey !== b._sortKey) {
        return a._sortKey.localeCompare(b._sortKey);
      }
      return a.seriesId.localeCompare(b.seriesId);
    });

  const publicSeries = publicSeriesWithSortKey.map(({ _sortKey, ...rest }) => rest);

  return {
    publicEpisodes,
    publicSeries
  };
};

export default runComposeStep;
