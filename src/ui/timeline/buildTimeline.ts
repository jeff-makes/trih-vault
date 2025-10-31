export type RawEpisodeInput = {
  id: string;
  cleanTitle: string;
  yearFrom: number | null;
  yearTo: number | null;
  seriesId: string | null;
  part: number | null;
  publishedAt: string | null;
};

export type RawSeriesInput = {
  id: string;
  seriesTitle: string;
  yearFrom: number | null;
  yearTo: number | null;
  episodeCount: number;
  episodeIds: string[];
};

export type EpisodeSummary = {
  id: string;
  title: string;
  yearLabel: string | null;
  partLabel: string | null;
};

export type TimelineEpisodeItem = {
  kind: 'episode';
  id: string;
  title: string;
  yearLabel: string;
  yearValue: number;
  offset: number;
};

export type TimelineSeriesItem = {
  kind: 'series';
  id: string;
  title: string;
  yearLabel: string;
  yearValue: number;
  offset: number;
  episodeCount: number;
  episodes: EpisodeSummary[];
};

export type TimelineItem = TimelineEpisodeItem | TimelineSeriesItem;

export type UndatedEpisode = {
  id: string;
  title: string;
  publishedLabel: string;
};

export type BuildTimelineOptions = {
  episodes: RawEpisodeInput[];
  series: RawSeriesInput[];
  yearPixelMultiplier?: number;
  minGapPx?: number;
};

export type BuildTimelineResult = {
  items: TimelineItem[];
  undated: UndatedEpisode[];
};

const DEFAULT_YEAR_PIXEL_MULTIPLIER = 2;
const DEFAULT_MIN_GAP_PX = 48;

const primaryYear = (yearFrom: number | null, yearTo: number | null): number | null => {
  if (typeof yearFrom === 'number') {
    return yearFrom;
  }
  if (typeof yearTo === 'number') {
    return yearTo;
  }
  return null;
};

const formatYearRange = (yearFrom: number | null, yearTo: number | null): string => {
  if (typeof yearFrom === 'number' && typeof yearTo === 'number') {
    if (yearFrom === yearTo) {
      return `${yearFrom}`;
    }
    return `${yearFrom} – ${yearTo}`;
  }
  if (typeof yearFrom === 'number') {
    return `${yearFrom}`;
  }
  if (typeof yearTo === 'number') {
    return `${yearTo}`;
  }
  return 'Undated';
};

const formatPartLabel = (part: number | null): string | null => {
  if (!part || Number.isNaN(part)) {
    return null;
  }
  return `Part ${part}`;
};

const formatPublishedLabel = (publishedAt: string | null): string => {
  if (!publishedAt) {
    return 'Published date unknown';
  }

  const time = Date.parse(publishedAt);
  if (Number.isNaN(time)) {
    return 'Published date unknown';
  }

  return `Published ${new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(time)}`;
};

export function buildTimeline(options: BuildTimelineOptions): BuildTimelineResult {
  const {
    episodes,
    series,
    yearPixelMultiplier = DEFAULT_YEAR_PIXEL_MULTIPLIER,
    minGapPx = DEFAULT_MIN_GAP_PX
  } = options;

  const episodesById = new Map<string, RawEpisodeInput>();
  episodes.forEach((episode) => {
    episodesById.set(episode.id, episode);
  });

  const standaloneEpisodes = episodes
    .filter((episode) => !episode.seriesId)
    .map((episode) => ({
      id: episode.id,
      title: episode.cleanTitle,
      yearFrom: episode.yearFrom,
      yearTo: episode.yearTo,
      primaryYear: primaryYear(episode.yearFrom, episode.yearTo)
    }));

  const undatedEpisodes = standaloneEpisodes
    .filter((episode) => episode.primaryYear === null)
    .map((episode) => {
      const raw = episodesById.get(episode.id);
      return {
        id: episode.id,
        title: episode.title,
        publishedLabel: formatPublishedLabel(raw?.publishedAt ?? null)
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const datedStandaloneEpisodes = standaloneEpisodes.filter((episode) => episode.primaryYear !== null);

  const seriesItems = series.map((seriesRecord) => {
    const orderIndex = new Map<string, number>();
    seriesRecord.episodeIds.forEach((episodeId, index) => {
      orderIndex.set(episodeId, index);
    });

    const memberEpisodes = seriesRecord.episodeIds
      .map((episodeId) => episodesById.get(episodeId))
      .filter((episode): episode is RawEpisodeInput => Boolean(episode));

    const derivedYearFrom =
      typeof seriesRecord.yearFrom === 'number'
        ? seriesRecord.yearFrom
        : memberEpisodes.reduce<number | null>((acc, episode) => {
            const candidate = primaryYear(episode.yearFrom, episode.yearTo);
            if (candidate === null) {
              return acc;
            }
            if (acc === null || candidate < acc) {
              return candidate;
            }
            return acc;
          }, null);

    const derivedYearTo =
      typeof seriesRecord.yearTo === 'number'
        ? seriesRecord.yearTo
        : memberEpisodes.reduce<number | null>((acc, episode) => {
            const candidate =
              typeof episode.yearTo === 'number' ? episode.yearTo : primaryYear(episode.yearFrom, episode.yearTo);
            if (candidate === null) {
              return acc;
            }
            if (acc === null || candidate > acc) {
              return candidate;
            }
            return acc;
          }, null);

    const sortedMemberEpisodes = [...memberEpisodes].sort((a, b) => {
      const indexA = orderIndex.get(a.id) ?? Number.POSITIVE_INFINITY;
      const indexB = orderIndex.get(b.id) ?? Number.POSITIVE_INFINITY;
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      const yearA = primaryYear(a.yearFrom, a.yearTo);
      const yearB = primaryYear(b.yearFrom, b.yearTo);
      if (yearA !== null && yearB !== null && yearA !== yearB) {
        return yearA - yearB;
      }
      const partA = a.part ?? Number.POSITIVE_INFINITY;
      const partB = b.part ?? Number.POSITIVE_INFINITY;
      if (partA !== partB) {
        return partA - partB;
      }
      return a.cleanTitle.localeCompare(b.cleanTitle);
    });

    return {
      id: seriesRecord.id,
      title: seriesRecord.seriesTitle,
      yearFrom: derivedYearFrom,
      yearTo: derivedYearTo,
      episodeCount: seriesRecord.episodeCount,
      primaryYear: primaryYear(derivedYearFrom, derivedYearTo),
      episodes: sortedMemberEpisodes.map((episode) => ({
        id: episode.id,
        title: episode.cleanTitle,
        yearLabel:
          typeof episode.yearFrom === 'number' || typeof episode.yearTo === 'number'
            ? formatYearRange(episode.yearFrom, episode.yearTo)
            : null,
        partLabel: formatPartLabel(episode.part)
      }))
    };
  });

  const datedSeries = seriesItems.filter((seriesItem) => seriesItem.primaryYear !== null);

  const combined = [
    ...datedSeries.map((seriesItem) => ({
      kind: 'series' as const,
      id: seriesItem.id,
      title: seriesItem.title,
      yearLabel: formatYearRange(seriesItem.yearFrom, seriesItem.yearTo),
      primaryYear: seriesItem.primaryYear!,
      episodeCount: seriesItem.episodeCount,
      episodes: seriesItem.episodes
    })),
    ...datedStandaloneEpisodes.map((episode) => ({
      kind: 'episode' as const,
      id: episode.id,
      title: episode.title,
      yearLabel: formatYearRange(episode.yearFrom, episode.yearTo),
      primaryYear: episode.primaryYear!
    }))
  ];

  combined.sort((a, b) => {
    if (a.primaryYear === b.primaryYear) {
      if (a.kind === b.kind) {
        return a.title.localeCompare(b.title);
      }
      return a.kind === 'series' ? -1 : 1;
    }
    return a.primaryYear - b.primaryYear;
  });

  let lastYear: number | null = null;
  const timelineItems: TimelineItem[] = combined.map((item, index) => {
    const { primaryYear: itemYear } = item;
    const gap = lastYear === null ? 0 : Math.max(0, itemYear - lastYear);
    const offset = index === 0 ? 0 : Math.max(minGapPx, gap * yearPixelMultiplier);
    lastYear = itemYear;

    if (item.kind === 'series') {
      return {
        kind: 'series',
        id: item.id,
        title: item.title,
        yearLabel: item.yearLabel,
        yearValue: item.primaryYear,
        offset,
        episodeCount: item.episodeCount,
        episodes: item.episodes
      };
    }

    return {
      kind: 'episode',
      id: item.id,
      title: item.title,
      yearLabel: item.yearLabel,
      yearValue: item.primaryYear,
      offset
    };
  });

  return { items: timelineItems, undated: undatedEpisodes };
}
