import { readFileSync } from "node:fs";
import { join } from "node:path";

type RegistryType = "episode" | "series";

export interface SlugRegistryEntry {
  type: RegistryType;
  id: string;
}

type SlugRegistry = Record<string, SlugRegistryEntry>;

let cachedRegistry: SlugRegistry | null = null;

const loadRegistryFromDisk = (): SlugRegistry => {
  const filePath = join(process.cwd(), "public/slug-registry.json");
  const contents = readFileSync(filePath, "utf-8");
  return JSON.parse(contents) as SlugRegistry;
};

export const loadSlugRegistry = (): SlugRegistry => {
  if (!cachedRegistry) {
    cachedRegistry = loadRegistryFromDisk();
  }
  return cachedRegistry;
};

export const resetSlugRegistryCache = (): void => {
  cachedRegistry = null;
};

export const findSlugEntry = (slug: string): SlugRegistryEntry | undefined => {
  const registry = loadSlugRegistry();
  return registry[slug];
};
