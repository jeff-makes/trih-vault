import { describe, expect, it } from "vitest";

import { getEpisodeBySlug, getSeriesBySlug } from "./lookup";
import { loadSlugRegistry } from "../data";

describe("slug lookup helpers", () => {
  it("resolves episodes via registry slug", () => {
    const registry = loadSlugRegistry();
    const entry = Object.entries(registry).find(([, value]) => value.type === "episode");
    expect(entry).toBeDefined();

    const [slug, { id }] = entry!;
    const episode = getEpisodeBySlug(slug);
    expect(episode).toBeDefined();
    expect(episode?.episodeId).toBe(id);
  });

  it("falls back to raw id when slug missing", () => {
    const registry = loadSlugRegistry();
    const entry = Object.entries(registry).find(([, value]) => value.type === "series");
    expect(entry).toBeDefined();

    const [, { id }] = entry!;
    const series = getSeriesBySlug(id);
    expect(series).toBeDefined();
    expect(series?.seriesId).toBe(id);
  });
});
