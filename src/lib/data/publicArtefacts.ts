import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PublicEpisode, PublicSeries } from "@/types";

let cachedEpisodes: PublicEpisode[] | null = null;
let cachedSeries: PublicSeries[] | null = null;

const readJsonFile = <T>(relativePath: string): T => {
  const filePath = join(process.cwd(), relativePath);
  const contents = readFileSync(filePath, "utf-8");
  return JSON.parse(contents) as T;
};

export const loadPublicEpisodes = (): PublicEpisode[] => {
  if (!cachedEpisodes) {
    cachedEpisodes = readJsonFile<PublicEpisode[]>("public/episodes.json");
  }
  return cachedEpisodes;
};

export const loadPublicSeries = (): PublicSeries[] => {
  if (!cachedSeries) {
    cachedSeries = readJsonFile<PublicSeries[]>("public/series.json");
  }
  return cachedSeries;
};

export const resetPublicArtefactCache = (): void => {
  cachedEpisodes = null;
  cachedSeries = null;
};
