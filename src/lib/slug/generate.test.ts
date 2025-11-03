import { describe, expect, it } from "vitest";

import type { PublicEpisode, PublicSeries } from "@/types";

import { generateEpisodeSlug, generateSeriesSlug } from "./generate";

const baseSeries = (overrides: Partial<PublicSeries> = {}): PublicSeries => ({
  id: overrides.id ?? "series-001",
  seriesId: overrides.seriesId ?? "series-001",
  seriesTitle: overrides.seriesTitle ?? "Sample Series Title",
  seriesKey: null,
  seriesKeyRaw: null,
  seriesGroupingConfidence: "high",
  episodeIds: overrides.episodeIds ?? [],
  yearFrom: null,
  yearTo: null,
  yearConfidence: "unknown",
  fingerprint: "fingerprint",
  derived: undefined,
  memberEpisodeFingerprints: undefined,
  tonalDescriptors: null,
  narrativeSummary: null,
  rssLastSeenAt: null
});

const baseEpisode = (overrides: Partial<PublicEpisode> = {}): PublicEpisode => ({
  id: overrides.id ?? "episode-001",
  episodeId: overrides.episodeId ?? "episode-001",
  title: overrides.title ?? "Episode Title",
  cleanTitle: overrides.cleanTitle ?? overrides.title ?? "Episode Title",
  publishedAt: overrides.publishedAt ?? "2024-01-01T00:00:00.000Z",
  description: overrides.description ?? "",
  cleanDescriptionMarkdown: overrides.cleanDescriptionMarkdown ?? "",
  cleanDescriptionText: overrides.cleanDescriptionText ?? "",
  descriptionBlocks: overrides.descriptionBlocks ?? [],
  audioUrl: overrides.audioUrl ?? "https://example.com/audio.mp3",
  rssLastSeenAt: overrides.rssLastSeenAt ?? "2024-01-01T00:00:00.000Z",
  itunesEpisode: overrides.itunesEpisode ?? null,
  cleanupVersion: overrides.cleanupVersion ?? 1,
  credits: overrides.credits,
  fingerprint: overrides.fingerprint ?? "fingerprint",
  derived: overrides.derived,
  part: overrides.part ?? null,
  seriesId: overrides.seriesId ?? null,
  seriesKey: overrides.seriesKey ?? null,
  seriesKeyRaw: overrides.seriesKeyRaw ?? null,
  seriesGroupingConfidence: overrides.seriesGroupingConfidence ?? "high",
  keyPeople: overrides.keyPeople ?? [],
  keyPlaces: overrides.keyPlaces ?? [],
  keyThemes: overrides.keyThemes ?? [],
  yearFrom: overrides.yearFrom ?? null,
  yearTo: overrides.yearTo ?? null,
  yearConfidence: overrides.yearConfidence ?? "unknown"
});

describe("generateSeriesSlug", () => {
  it("slugifies series titles keeping four tokens", () => {
    const taken = new Set<string>();
    const slug = generateSeriesSlug(
      baseSeries({ seriesId: "the-french-revolution-20240728", seriesTitle: "The French Revolution: From Versailles to the Rights of Man" }),
      taken
    );
    expect(slug).toBe("french-revolution-versailles-rights");
    expect(taken.has(slug)).toBe(true);
  });

  it("falls back to seriesId fragments when title collapses", () => {
    const taken = new Set<string>();
    const slug = generateSeriesSlug(baseSeries({ seriesId: "slug-fallback-001", seriesTitle: "The And Of" }), taken);
    expect(slug).toBe("slug-fallback-001");
  });

  it("applies numeric suffixes on collisions", () => {
    const taken = new Set<string>();
    const first = generateSeriesSlug(baseSeries({ seriesId: "series-alpha", seriesTitle: "World War" }), taken);
    const second = generateSeriesSlug(baseSeries({ seriesId: "series-beta", seriesTitle: "World War" }), taken);
    expect(first).toBe("world-war");
    expect(second).toBe("world-war-2");
  });
});

describe("generateEpisodeSlug", () => {
  it("generates standalone slug with trimmed title", () => {
    const taken = new Set<string>();
    const seriesLookup = { get: () => undefined };
    const slug = generateEpisodeSlug(
      baseEpisode({ cleanTitle: "607. Nelson’s Lover: The Scandalous Lady Hamilton" }),
      seriesLookup,
      taken
    );
    expect(slug).toBe("scandalous-lady");
  });

  it("uses series handle + subtitle tokens + pt", () => {
    const taken = new Set<string>(["french-revolution-versailles-rights"]);
    const seriesLookup = {
      get: (seriesId: string) => (seriesId === "french-2024" ? "french-revolution-versailles-rights" : undefined)
    };
    const slug = generateEpisodeSlug(
      baseEpisode({
        seriesId: "french-2024",
        cleanTitle: "The French Revolution: Marie Antoinette (Part 1)",
        part: 1
      }),
      seriesLookup,
      taken
    );
    expect(slug).toBe("versailles-marie-antoinette-pt1");
  });

  it("drops extra subtitle tokens to keep pt token", () => {
    const taken = new Set<string>();
    const seriesLookup = { get: () => "world-war-ii" };
    const slug = generateEpisodeSlug(
      baseEpisode({
        seriesId: "wwii",
        cleanTitle: "World War II: Allied Counteroffensive at Stalingrad (Part 12)",
        part: 12
      }),
      seriesLookup,
      taken
    );
    expect(slug).toBe("worldwar-allied-counteroffensive-pt12");
  });

  it("falls back to episodeId when no tokens remain", () => {
    const taken = new Set<string>();
    const seriesLookup = { get: () => undefined };
    const slug = generateEpisodeSlug(baseEpisode({ cleanTitle: "The And Of" }), seriesLookup, taken);
    expect(slug).toBe("epis");
  });

  it("applies collision suffixes", () => {
    const taken = new Set<string>();
    const seriesLookup = { get: () => undefined };
    const first = generateEpisodeSlug(baseEpisode({ cleanTitle: "Battle of the Nile" }), seriesLookup, taken);
    const second = generateEpisodeSlug(baseEpisode({ cleanTitle: "Battle of the Nile" }), seriesLookup, taken);
    expect(first).toBe("battle-nile");
    expect(second).toBe("battle-nile-2");
  });

  it("avoids duplicate tokens between handle and keywords", () => {
    const taken = new Set<string>();
    const seriesLookup = { get: () => "alexander-the-great" };
    const slug = generateEpisodeSlug(
      baseEpisode({
        seriesId: "alexander",
        cleanTitle: "Alexander the Great: Alexander the Great (Part 1)",
        part: 1
      }),
      seriesLookup,
      taken
    );
    expect(slug).toBe("alexander-great-pt1");
  });
});
