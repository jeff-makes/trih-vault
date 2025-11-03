import { writeFileSync } from "node:fs";
import { join } from "node:path";

import type { PublicEpisode, PublicSeries } from "../src/types";

import { loadPublicEpisodes, loadPublicSeries } from "../src/lib/data/publicArtefacts.ts";
import { generateEpisodeSlug, generateSeriesSlug } from "../src/lib/slug/generate.ts";

type RegistryType = "series" | "episode";

interface RegistryEntry {
  type: RegistryType;
  id: string;
}

const createRegistry = (): Record<string, RegistryEntry> => {
  const registry: Record<string, RegistryEntry> = {};
  const takenSlugs = new Set<string>();
  const seriesSlugMap = new Map<string, string>();

  const seriesEntries = [...loadPublicSeries()].sort((a, b) => a.seriesId.localeCompare(b.seriesId));
  seriesEntries.forEach((series: PublicSeries) => {
    const slug = generateSeriesSlug(series, takenSlugs);
    seriesSlugMap.set(series.seriesId, slug);
    registry[slug] = { type: "series", id: series.seriesId };
  });

  const seriesLookup = {
    get: (seriesId: string): string | undefined => seriesSlugMap.get(seriesId)
  };

  const episodeEntries = [...loadPublicEpisodes()].sort((a, b) => a.episodeId.localeCompare(b.episodeId));
  episodeEntries.forEach((episode: PublicEpisode) => {
    const slug = generateEpisodeSlug(episode, seriesLookup, takenSlugs);
    registry[slug] = { type: "episode", id: episode.episodeId };
  });

  return registry;
};

const main = () => {
  const registry = createRegistry();
  const outputPath = join(process.cwd(), "public/slug-registry.json");
  const orderedEntries = Object.keys(registry)
    .sort()
    .reduce<Record<string, RegistryEntry>>((acc, key) => {
      acc[key] = registry[key];
      return acc;
    }, {});

  writeFileSync(outputPath, `${JSON.stringify(orderedEntries, null, 2)}\n`, "utf-8");
  // eslint-disable-next-line no-console
  console.log(`Wrote slug registry with ${Object.keys(orderedEntries).length} entries to ${outputPath}`);
};

main();
