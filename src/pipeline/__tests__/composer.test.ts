import { describe, expect, it } from "vitest";

import { runComposeStep } from "@/pipeline/composer";
import { runValidation } from "@/pipeline/validator";
import episodeSchema from "../../../schema/episode.public.schema.json";
import seriesSchema from "../../../schema/series.public.schema.json";
import cacheSchema from "../../../schema/cache.llm.schema.json";
import {
  LlmEpisodeCacheEntry,
  LlmSeriesCacheEntry,
  ProgrammaticEpisode,
  ProgrammaticSeries,
  RawEpisode
} from "@/types";

const createSampleData = () => {
  const rawEpisodes: RawEpisode[] = [
    {
      episodeId: "ep-1",
      title: "Episode One",
      publishedAt: "2024-01-01T00:00:00.000Z",
      description: "<p>Episode one description.</p>",
      audioUrl: "https://example.com/ep-1.mp3",
      rssLastSeenAt: "2024-01-04T00:00:00.000Z",
      source: {
        guid: "guid-1",
        itunesEpisode: 1,
        megaphoneId: null,
        enclosureUrl: "https://example.com/ep-1.mp3"
      }
    },
    {
      episodeId: "ep-2",
      title: "Episode Two",
      publishedAt: "2024-01-02T00:00:00.000Z",
      description: "<p>Episode two description.</p>",
      audioUrl: "https://example.com/ep-2.mp3",
      rssLastSeenAt: "2024-01-04T00:00:00.000Z",
      source: {
        guid: "guid-2",
        itunesEpisode: 2,
        megaphoneId: null,
        enclosureUrl: "https://example.com/ep-2.mp3"
      }
    }
  ];

  const fingerprintOne = "a".repeat(64);
  const fingerprintTwo = "b".repeat(64);
  const seriesFingerprint = "c".repeat(64);

  const programmaticEpisodes: Record<string, ProgrammaticEpisode> = {
    "ep-1": {
      episodeId: "ep-1",
      title: "Episode One",
      publishedAt: "2024-01-01T00:00:00.000Z",
      description: "Episode one description.",
      audioUrl: "https://example.com/ep-1.mp3",
      cleanTitle: "Episode One",
      cleanDescriptionMarkdown: "Episode one description.",
      cleanDescriptionText: "Episode one description.",
      descriptionBlocks: ["Episode one description."],
      credits: undefined,
      fingerprint: fingerprintOne,
      cleanupVersion: 1,
      derived: undefined,
      part: 1,
      seriesId: "series-20240101",
      seriesKey: "series",
      seriesKeyRaw: "Series",
      seriesGroupingConfidence: "high",
      rssLastSeenAt: "2024-01-04T00:00:00.000Z",
      itunesEpisode: 1,
      keyPeople: [],
      keyPlaces: [],
      keyThemes: [],
      yearFrom: null,
      yearTo: null,
      yearConfidence: "unknown"
    },
    "ep-2": {
      episodeId: "ep-2",
      title: "Episode Two",
      publishedAt: "2024-01-02T00:00:00.000Z",
      description: "Episode two description.",
      audioUrl: "https://example.com/ep-2.mp3",
      cleanTitle: "Episode Two",
      cleanDescriptionMarkdown: "Episode two description.",
      cleanDescriptionText: "Episode two description.",
      descriptionBlocks: ["Episode two description."],
      credits: undefined,
      fingerprint: fingerprintTwo,
      cleanupVersion: 1,
      derived: undefined,
      part: 2,
      seriesId: "series-20240101",
      seriesKey: "series",
      seriesKeyRaw: "Series",
      seriesGroupingConfidence: "high",
      rssLastSeenAt: "2024-01-04T00:00:00.000Z",
      itunesEpisode: 2,
      keyPeople: [],
      keyPlaces: [],
      keyThemes: [],
      yearFrom: null,
      yearTo: null,
      yearConfidence: "unknown"
    }
  };

  const programmaticSeries: Record<string, ProgrammaticSeries> = {
    "series-20240101": {
      seriesId: "series-20240101",
      seriesKey: "series",
      seriesKeyRaw: "Series",
      seriesTitleFallback: "series",
      seriesGroupingConfidence: "high",
      episodeIds: ["ep-1", "ep-2"],
      memberEpisodeFingerprints: [fingerprintOne, fingerprintTwo],
      fingerprint: seriesFingerprint,
      yearFrom: null,
      yearTo: null,
      yearConfidence: "unknown",
      derived: {
        episodeSummaries: [
          { part: 1, cleanTitle: "Episode One", cleanDescriptionText: "Episode one description." },
          { part: 2, cleanTitle: "Episode Two", cleanDescriptionText: "Episode two description." }
        ]
      },
      rssLastSeenAt: "2024-01-04T00:00:00.000Z"
    }
  };

  const episodeLlmCache: Record<string, LlmEpisodeCacheEntry> = {
    ["ep-1:" + fingerprintOne]: {
      episodeId: "ep-1",
      fingerprint: fingerprintOne,
      model: "gpt-5-nano",
      promptVersion: "episode.enrichment.v1",
      createdAt: "2024-01-05T00:00:00.000Z",
      status: "ok",
      notes: null,
      keyPeople: ["Horatio Nelson"],
      keyPlaces: ["Britain"],
      keyThemes: ["napoleonic-wars", "naval-warfare", "britannia"],
      keyTopics: [
        { id: "napoleonic-wars", label: "Napoleonic Wars", slug: "napoleonic-wars" }
      ],
      yearFrom: 1803,
      yearTo: 1805,
      yearConfidence: "high"
    },
    ["ep-2:" + fingerprintTwo]: {
      episodeId: "ep-2",
      fingerprint: fingerprintTwo,
      model: "gpt-5-nano",
      promptVersion: "episode.enrichment.v1",
      createdAt: "2024-01-05T00:00:00.000Z",
      status: "skipped",
      notes: "Fingerprint unchanged",
      keyPeople: [],
      keyPlaces: [],
      keyThemes: [],
      keyTopics: [],
      yearFrom: null,
      yearTo: null,
      yearConfidence: "unknown"
    }
  };

  const seriesLlmCache: Record<string, LlmSeriesCacheEntry> = {
    ["series-20240101:" + seriesFingerprint]: {
      seriesId: "series-20240101",
      fingerprint: seriesFingerprint,
      model: "gpt-5-nano",
      promptVersion: "series.enrichment.v1",
      createdAt: "2024-01-05T00:00:00.000Z",
      status: "ok",
      notes: null,
      seriesTitle: "The Trafalgar Campaign",
      narrativeSummary: "A deep dive into Admiral Nelson's final victories at sea.",
      tonalDescriptors: ["dramatic", "historical"],
      yearFrom: 1803,
      yearTo: 1805,
      yearConfidence: "medium"
    }
  };

  return {
    rawEpisodes,
    programmaticEpisodes,
    programmaticSeries,
    episodeLlmCache,
    seriesLlmCache,
    fingerprintOne,
    fingerprintTwo,
    seriesFingerprint
  };
};

describe("runComposeStep", () => {
  it("merges programmatic and LLM layers into public artefacts", () => {
    const {
      rawEpisodes,
      programmaticEpisodes,
      programmaticSeries,
      episodeLlmCache,
      seriesLlmCache
    } = createSampleData();

    const { publicEpisodes, publicSeries, slugRegistry } = runComposeStep({
      rawEpisodes,
      programmaticEpisodes,
      programmaticSeries,
      episodeLlmCache,
      seriesLlmCache
    });

    expect(publicEpisodes).toHaveLength(2);
    expect(publicEpisodes[0].episodeId).toBe("ep-1");
    expect(publicEpisodes[0].keyPeople).toEqual(["Horatio Nelson"]);
    expect(publicEpisodes[1].keyPeople).toEqual([]);
    expect(publicEpisodes[0].keyTopics).toEqual([
      expect.objectContaining({ id: "napoleonic-wars", label: "Napoleonic Wars", slug: "napoleonic-wars" })
    ]);
    expect(publicEpisodes[1].keyTopics).toEqual([]);
    expect(publicEpisodes[0].slug).toBeTruthy();
    expect(publicEpisodes[1].slug).toBeTruthy();
    expect(new Set(publicEpisodes.map((episode) => episode.slug)).size).toBe(publicEpisodes.length);

    expect(publicSeries).toHaveLength(1);
    expect(publicSeries[0].seriesTitle).toBe("The Trafalgar Campaign");
    expect(publicSeries[0].tonalDescriptors).toEqual(["dramatic", "historical"]);
    expect(publicSeries[0].slug).toBeTruthy();

    expect(Object.values(slugRegistry)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "episode", id: "ep-1" }),
        expect.objectContaining({ type: "episode", id: "ep-2" }),
        expect.objectContaining({ type: "series", id: "series-20240101" })
      ])
    );
  });
});

describe("runValidation", () => {
  it("validates composed artefacts and caches", () => {
    const {
      rawEpisodes,
      programmaticEpisodes,
      programmaticSeries,
      episodeLlmCache,
      seriesLlmCache
    } = createSampleData();

    const { publicEpisodes, publicSeries } = runComposeStep({
      rawEpisodes,
      programmaticEpisodes,
      programmaticSeries,
      episodeLlmCache,
      seriesLlmCache
    });

    expect(() =>
      runValidation({
        rawEpisodes,
        programmaticEpisodes,
        programmaticSeries,
        episodeLlmCache,
        seriesLlmCache,
        publicEpisodes,
        publicSeries,
        episodeSchema: episodeSchema as Record<string, unknown>,
        seriesSchema: seriesSchema as Record<string, unknown>,
        episodeCacheSchema: cacheSchema as Record<string, unknown>,
        seriesCacheSchema: cacheSchema as Record<string, unknown>
      })
    ).not.toThrow();
  });

  it("throws when referential integrity is broken", () => {
    const {
      rawEpisodes,
      programmaticEpisodes,
      programmaticSeries,
      episodeLlmCache,
      seriesLlmCache
    } = createSampleData();

    const { publicEpisodes, publicSeries } = runComposeStep({
      rawEpisodes,
      programmaticEpisodes,
      programmaticSeries,
      episodeLlmCache,
      seriesLlmCache
    });

    const brokenSeries = [
      {
        ...publicSeries[0],
        episodeIds: ["ep-missing"]
      }
    ];

    expect(() =>
      runValidation({
        rawEpisodes,
        programmaticEpisodes,
        programmaticSeries,
        episodeLlmCache,
        seriesLlmCache,
        publicEpisodes,
        publicSeries: brokenSeries,
        episodeSchema: episodeSchema as Record<string, unknown>,
        seriesSchema: seriesSchema as Record<string, unknown>,
        episodeCacheSchema: cacheSchema as Record<string, unknown>,
        seriesCacheSchema: cacheSchema as Record<string, unknown>
      })
    ).toThrow(/does not include episode/);
  });
});
