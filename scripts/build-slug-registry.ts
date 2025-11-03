import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { PublicEpisode, PublicSeries } from "../src/types";

import stableStringify from "../src/lib/stableStringify";
import { assignSlugsToArtefacts } from "../src/lib/slug/assign";
import type { PublicEpisodeWithoutSlug, PublicSeriesWithoutSlug } from "../src/lib/slug/assign";

const readJsonFile = <T>(relativePath: string): T => {
  const filePath = join(process.cwd(), relativePath);
  const contents = readFileSync(filePath, "utf-8");
  return JSON.parse(contents) as T;
};

const writeJsonFile = (relativePath: string, value: unknown): void => {
  const filePath = join(process.cwd(), relativePath);
  writeFileSync(filePath, `${stableStringify(value as any)}\n`, "utf-8");
};

const stripEpisodeSlugs = (episodes: PublicEpisode[]): PublicEpisodeWithoutSlug[] =>
  episodes.map(({ slug: _slug, ...rest }) => rest);

const stripSeriesSlugs = (series: PublicSeries[]): PublicSeriesWithoutSlug[] =>
  series.map(({ slug: _slug, ...rest }) => rest);

const main = () => {
  const rawEpisodes = readJsonFile<PublicEpisode[]>("public/episodes.json");
  const rawSeries = readJsonFile<PublicSeries[]>("public/series.json");

  const { episodes, series, registry } = assignSlugsToArtefacts(
    stripEpisodeSlugs(rawEpisodes),
    stripSeriesSlugs(rawSeries)
  );

  writeJsonFile("public/episodes.json", episodes);
  writeJsonFile("public/series.json", series);
  writeJsonFile("public/slug-registry.json", registry);

  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${episodes.length} episode slugs, ${series.length} series slugs, registry entries: ${Object.keys(registry).length}`
  );
};

main();
