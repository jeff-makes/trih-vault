import crypto from "node:crypto";

import { ProgrammaticEpisode, ProgrammaticSeries, YearConfidence } from "@/types";
import type { SeriesOverride } from "@/config/seriesOverrides";
import toSlug from "@/lib/slug";

const MAX_GAP_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const confidenceRank: Record<YearConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0
};

const formatDateIdFragment = (isoDate: string): string => isoDate.slice(0, 10).replace(/-/g, "");

const sha256 = (input: string): string =>
  crypto.createHash("sha256").update(input, "utf8").digest("hex");

const computeSeriesFingerprint = (seriesId: string, memberFingerprints: string[]): string => {
  const payload = `srfp:v1\n${seriesId}\n${memberFingerprints.join("\n")}`;
  return sha256(payload);
};

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const stripNumberPrefix = (title: string): string =>
  title.replace(/^\s*\d+\s*[:.)–—-]?\s*/, "").trim();

const stripPartSuffix = (title: string): string =>
  title
    .replace(
      /\s*[-–—:,]?\s*(?:\((?:part|pt\.?|episode)\s*[ivxlcdm\d]+\)|(?:part|pt\.?|episode)\s*[ivxlcdm\d]+)\s*$/i,
      ""
    )
    .trim();

const splitOnDelimiters = (input: string): string => {
  const delimiters = [":", " - ", " – ", " — "];
  for (const delimiter of delimiters) {
    const index = input.indexOf(delimiter);
    if (index !== -1) {
      const left = input.slice(0, index).trim();
      if (left.length >= 3) {
        return left;
      }
      const right = input.slice(index + delimiter.length).trim();
      if (right.length > 0) {
        return right;
      }
    }
  }
  return input;
};

const deriveSeriesKey = (
  title: string
): { raw: string; normalised: string; slug: string } | null => {
  const withoutNumber = stripNumberPrefix(title);
  const withoutPart = stripPartSuffix(withoutNumber);
  if (!withoutPart) {
    return null;
  }

  const collapsed = collapseWhitespace(withoutPart);
  if (!collapsed) {
    return null;
  }

  const base = splitOnDelimiters(collapsed);
  const raw = collapseWhitespace(base);
  if (!raw) {
    return null;
  }

  const slug = toSlug(raw);
  if (!slug) {
    return null;
  }

  return {
    raw,
    normalised: raw.toLowerCase(),
    slug
  };
};

const parsePartIndicator = (title: string): number | null => {
  const partRegex = /\b(?:part|pt\.?|episode)\s*(\d+|[ivxlcdm]+)/i;
  const match = title.match(partRegex);
  if (!match) {
    return null;
  }

  const value = match[1];
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const romanNumeralMap: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
    xi: 11,
    xii: 12,
    xiii: 13,
    xiv: 14,
    xv: 15,
    xvi: 16,
    xvii: 17,
    xviii: 18,
    xix: 19,
    xx: 20,
    xxi: 21,
    xxii: 22,
    xxiii: 23,
    xxiv: 24,
    xxv: 25,
    xxvi: 26,
    xxvii: 27,
    xxviii: 28,
    xxix: 29,
    xxx: 30,
    xxxi: 31,
    xxxii: 32,
    xxxiii: 33,
    xxxiv: 34,
    xxxv: 35,
    xxxvi: 36,
    xxxvii: 37,
    xxxviii: 38,
    xxxix: 39,
    xl: 40,
    xli: 41,
    xlii: 42,
    xliii: 43,
    xliv: 44,
    xlv: 45,
    xlvi: 46,
    xlvii: 47,
    xlviii: 48,
    xlix: 49,
    l: 50
  };
  return romanNumeralMap[value.toLowerCase()] ?? null;
};

interface WorkingSeries {
  slug: string;
  seriesKeyRaw: string;
  seriesKey: string;
  firstPublishedAt: string;
  lastPublishedAt: string;
  latestRssSeenAt: string | null;
  episodes: ProgrammaticEpisode[];
}

export const runSeriesGrouping = (
  programmaticEpisodes: Record<string, ProgrammaticEpisode>,
  seriesOverrides: SeriesOverride[] = []
): {
  rawSeries: Record<string, { seriesId: string; episodeIds: string[] }>;
  programmaticSeries: Record<string, ProgrammaticSeries>;
} => {
  const episodes = Object.values(programmaticEpisodes).sort((a, b) => {
    const dateDiff = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    return dateDiff !== 0 ? dateDiff : a.episodeId.localeCompare(b.episodeId);
  });

  const rawSeries: Record<string, { seriesId: string; episodeIds: string[] }> = {};
  const programmaticSeries: Record<string, ProgrammaticSeries> = {};

  const openSeries = new Map<string, WorkingSeries>();
  const completedSeries: WorkingSeries[] = [];

  const finaliseSeries = (slug: string) => {
    const series = openSeries.get(slug);
    if (!series) {
      return;
    }
    openSeries.delete(slug);
    completedSeries.push(series);
  };

  episodes.forEach((episode) => {
    const keyInfo = deriveSeriesKey(episode.cleanTitle);
    const part = parsePartIndicator(episode.cleanTitle);

    episode.seriesId = null;
    episode.seriesGroupingConfidence = "low";
    episode.seriesKeyRaw = keyInfo?.raw ?? null;
    episode.seriesKey = keyInfo?.normalised ?? null;
    episode.part = part;

    if (!keyInfo || part === null) {
      return;
    }

    const slug = keyInfo.slug;
    const currentSeries = openSeries.get(slug);
    const publishedAtDate = new Date(episode.publishedAt);
    const isPartOne = part === 1;

    if (!currentSeries || isPartOne) {
      if (currentSeries) {
        finaliseSeries(slug);
      }
      if (!isPartOne) {
        return;
      }
      openSeries.set(slug, {
        slug,
        seriesKeyRaw: keyInfo.raw,
        seriesKey: keyInfo.normalised,
        firstPublishedAt: episode.publishedAt,
        lastPublishedAt: episode.publishedAt,
        latestRssSeenAt: episode.rssLastSeenAt ?? null,
        episodes: [episode]
      });
      return;
    }

    const lastPublished = new Date(currentSeries.lastPublishedAt);
    const gapMs = publishedAtDate.getTime() - lastPublished.getTime();
    const maxGapMs = MAX_GAP_DAYS * MS_PER_DAY;

    if (gapMs > maxGapMs) {
      finaliseSeries(slug);
      if (!isPartOne) {
        return;
      }
      openSeries.set(slug, {
        slug,
        seriesKeyRaw: keyInfo.raw,
        seriesKey: keyInfo.normalised,
        firstPublishedAt: episode.publishedAt,
        lastPublishedAt: episode.publishedAt,
        latestRssSeenAt: episode.rssLastSeenAt ?? null,
        episodes: [episode]
      });
      return;
    }

    currentSeries.episodes.push(episode);
    currentSeries.lastPublishedAt = episode.publishedAt;
    if (
      episode.rssLastSeenAt &&
      (!currentSeries.latestRssSeenAt || episode.rssLastSeenAt > currentSeries.latestRssSeenAt)
    ) {
      currentSeries.latestRssSeenAt = episode.rssLastSeenAt;
    }
  });

  Array.from(openSeries.keys()).forEach((slug) => finaliseSeries(slug));

  const rebuildSeries = (seriesId: string, episodesForSeries: ProgrammaticEpisode[], seriesKeyRaw?: string | null) => {
    if (episodesForSeries.length === 0) {
      return;
    }

    const orderedEpisodes = [...episodesForSeries].sort((a, b) => {
      if (a.part !== null && b.part !== null && a.part !== b.part) {
        return a.part - b.part;
      }
      const dateDiff = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      return dateDiff !== 0 ? dateDiff : a.episodeId.localeCompare(b.episodeId);
    });

    const effectiveSeriesKeyRaw =
      seriesKeyRaw ??
      orderedEpisodes.find((episode) => episode.seriesKeyRaw)?.seriesKeyRaw ??
      deriveSeriesKey(orderedEpisodes[0]?.cleanTitle ?? "")?.raw ??
      seriesId;

    const seriesKey = effectiveSeriesKeyRaw ? effectiveSeriesKeyRaw.toLowerCase() : null;

    orderedEpisodes.forEach((episode) => {
      const part = parsePartIndicator(episode.cleanTitle);
      if (part !== null) {
        episode.part = part;
      }
      episode.seriesId = seriesId;
      episode.seriesKeyRaw = effectiveSeriesKeyRaw;
      episode.seriesKey = seriesKey;
      episode.seriesGroupingConfidence = "high";
    });

    const episodeIds = orderedEpisodes.map((episode) => episode.episodeId);
    const memberEpisodeFingerprints = orderedEpisodes.map((episode) => episode.fingerprint);

    const yearFromCandidates = orderedEpisodes
      .map((episode) => episode.yearFrom)
      .filter((value): value is number => typeof value === "number");
    const yearToCandidates = orderedEpisodes
      .map((episode) => episode.yearTo)
      .filter((value): value is number => typeof value === "number");

    const yearFrom = yearFromCandidates.length > 0 ? Math.min(...yearFromCandidates) : null;
    const yearTo = yearToCandidates.length > 0 ? Math.max(...yearToCandidates) : null;

    const yearConfidenceValues = orderedEpisodes.map(
      (episode) => episode.yearConfidence ?? "unknown"
    );
    const yearConfidence = yearConfidenceValues.length
      ? yearConfidenceValues.reduce<YearConfidence>((current, candidate) => {
          return confidenceRank[candidate] < confidenceRank[current] ? candidate : current;
        }, "high")
      : "unknown";

    const rssLastSeenAt = orderedEpisodes.reduce<string | null>((latest, episode) => {
      if (!episode.rssLastSeenAt) {
        return latest;
      }
      if (!latest || episode.rssLastSeenAt > latest) {
        return episode.rssLastSeenAt;
      }
      return latest;
    }, null);

    rawSeries[seriesId] = {
      seriesId,
      episodeIds
    };

    const fallbackTitle = effectiveSeriesKeyRaw ?? orderedEpisodes[0]?.cleanTitle ?? seriesId;

    programmaticSeries[seriesId] = {
      seriesId,
      seriesKey,
      seriesKeyRaw: effectiveSeriesKeyRaw ?? null,
      seriesTitleFallback: fallbackTitle,
      seriesGroupingConfidence: "high",
      episodeIds,
      memberEpisodeFingerprints,
      fingerprint: computeSeriesFingerprint(seriesId, memberEpisodeFingerprints),
      yearFrom,
      yearTo,
      yearConfidence,
      derived: {
        episodeSummaries: orderedEpisodes.map((episode) => ({
          part: episode.part,
          cleanTitle: episode.cleanTitle,
          cleanDescriptionText: episode.cleanDescriptionText
        })),
        episodeCount: orderedEpisodes.length
      },
      rssLastSeenAt
    };
  };

  completedSeries.forEach((series) => {
    if (series.episodes.length === 0) {
      return;
    }

    const orderedEpisodes = [...series.episodes].sort((a, b) => {
      if (a.part !== null && b.part !== null && a.part !== b.part) {
        return a.part - b.part;
      }
      const dateDiff = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      return dateDiff !== 0 ? dateDiff : a.episodeId.localeCompare(b.episodeId);
    });

    const seriesId = `${series.slug}-${formatDateIdFragment(series.firstPublishedAt)}`;
    const seriesConfidence: "high" | "medium" | "low" =
      orderedEpisodes.length >= 2 ? "high" : "medium";

    orderedEpisodes.forEach((episode) => {
      episode.seriesId = seriesId;
      episode.seriesKey = series.seriesKey;
      episode.seriesKeyRaw = series.seriesKeyRaw;
      episode.seriesGroupingConfidence = seriesConfidence;
    });

    const episodeIds = orderedEpisodes.map((episode) => episode.episodeId);
    const memberEpisodeFingerprints = orderedEpisodes.map((episode) => episode.fingerprint);

    const yearFromCandidates = orderedEpisodes
      .map((episode) => episode.yearFrom)
      .filter((value): value is number => typeof value === "number");
    const yearToCandidates = orderedEpisodes
      .map((episode) => episode.yearTo)
      .filter((value): value is number => typeof value === "number");

    const yearFrom = yearFromCandidates.length > 0 ? Math.min(...yearFromCandidates) : null;
    const yearTo = yearToCandidates.length > 0 ? Math.max(...yearToCandidates) : null;

    const yearConfidenceValues = orderedEpisodes.map(
      (episode) => episode.yearConfidence ?? "unknown"
    );
    const yearConfidence = yearConfidenceValues.length
      ? yearConfidenceValues.reduce<YearConfidence>((current, candidate) => {
          return confidenceRank[candidate] < confidenceRank[current] ? candidate : current;
        }, "high")
      : "unknown";

    const rssLastSeenAt = orderedEpisodes.reduce<string | null>((latest, episode) => {
      if (!episode.rssLastSeenAt) {
        return latest;
      }
      if (!latest || episode.rssLastSeenAt > latest) {
        return episode.rssLastSeenAt;
      }
      return latest;
    }, series.latestRssSeenAt);

    rebuildSeries(seriesId, orderedEpisodes, series.seriesKeyRaw);
  });

  if (seriesOverrides.length > 0) {
    seriesOverrides.forEach((override) => {
      const targetEpisodes = new Map<string, ProgrammaticEpisode>();

      const existingSeries = programmaticSeries[override.seriesId];
      if (existingSeries) {
        existingSeries.episodeIds.forEach((episodeId) => {
          const episode = programmaticEpisodes[episodeId];
          if (episode) {
            targetEpisodes.set(episode.episodeId, episode);
          }
        });
      }

      override.episodeIds.forEach((episodeId) => {
        const episode = programmaticEpisodes[episodeId];
        if (episode) {
          if (episode.seriesId && episode.seriesId !== override.seriesId) {
            const previousSeries = programmaticSeries[episode.seriesId];
            if (previousSeries) {
              previousSeries.episodeIds = previousSeries.episodeIds.filter((id) => id !== episode.episodeId);
              if (previousSeries.episodeIds.length === 0) {
                delete programmaticSeries[episode.seriesId];
                delete rawSeries[episode.seriesId];
              }
            }
          }
          targetEpisodes.set(episode.episodeId, episode);
        }
      });

      const episodesForSeries = Array.from(targetEpisodes.values());
      if (episodesForSeries.length === 0) {
        return;
      }

      rebuildSeries(override.seriesId, episodesForSeries, override.seriesKeyRaw ?? existingSeries?.seriesKeyRaw ?? null);
    });
  }

  episodes.forEach((episode) => {
    if (!episode.seriesId) {
      episode.part = null;
      episode.seriesKey = null;
      episode.seriesKeyRaw = null;
      episode.seriesGroupingConfidence = "low";
    }
  });

  return { rawSeries, programmaticSeries };
};

export default runSeriesGrouping;
