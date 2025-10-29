import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { epFingerprint } from "./fingerprints.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");

const EPISODE_SYSTEM_PROMPT =
  "You extract structured historical metadata from a podcast episode. Return strict JSON only, matching the provided schema. Use only the episode title and description.";

const EPISODE_USER_TEMPLATE = `EPISODE\nTitle: {{title}}\nDescription (HTML possible):\n{{description}}\n\nReturn strict JSON matching:\n{\n  \"yearFrom\": number|null,\n  \"yearTo\": number|null,\n  \"keyPeople\": string[],\n  \"keyPlaces\": string[],\n  \"keyBattles\": string[],\n  \"keyDates\": string[],\n  \"organizations\": string[],\n  \"themes\": string[],\n  \"confidence\": number\n}`;

const MAX_ATTEMPTS = 3;

type Episode = {
  id: string;
  title?: string | null;
  description?: string | null;
};

type EpisodeEnrichment = {
  yearFrom: number | null;
  yearTo: number | null;
  keyPeople: string[];
  keyPlaces: string[];
  keyBattles: string[];
  keyDates: string[];
  organizations: string[];
  themes: string[];
  confidence: number;
};

type EpisodeCacheEntry = EpisodeEnrichment & {
  lastEnrichedAt?: string;
  enrichmentFingerprint: string;
  [key: string]: unknown;
};

type EpisodeCache = Record<string, EpisodeCacheEntry>;

async function readJson<T>(relativePath: string, fallback: T): Promise<T> {
  const fullPath = path.join(ROOT_DIR, relativePath);
  try {
    const raw = await fs.readFile(fullPath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonIfChanged(relativePath: string, value: unknown): Promise<void> {
  const fullPath = path.join(ROOT_DIR, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const next = JSON.stringify(value, null, 2) + "\n";
  let previous = "";
  try {
    previous = await fs.readFile(fullPath, "utf8");
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  if (previous !== next) {
    await fs.writeFile(fullPath, next, "utf8");
  }
}

function stripHtml(input: string | null | undefined): string {
  if (!input) {
    return "";
  }
  return input
    .replace(/<\s*br\s*\/?>(\r?\n)*/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r?\n/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeYear(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  if (normalized < -10000 || normalized > 3000) {
    return null;
  }
  return normalized;
}

function sanitizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(6));
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const results: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    results.push(trimmed);
  }
  return results;
}

function formatEpisodePrompt(episode: Episode, withReminder = false): string {
  const base = EPISODE_USER_TEMPLATE
    .replace("{{title}}", episode.title ?? "")
    .replace("{{description}}", stripHtml(episode.description ?? ""));
  if (withReminder) {
    return `${base}\n\nREMINDER: Reply with strict JSON only.`;
  }
  return base;
}

function safeParseJson(payload: string): any | null {
  try {
    return JSON.parse(payload);
  } catch (error) {
    const first = payload.indexOf("{");
    const last = payload.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      return null;
    }
    const candidate = payload.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch (innerError) {
      return null;
    }
  }
}

function sanitizeEpisodeEnrichment(raw: any): EpisodeEnrichment {
  return {
    yearFrom: sanitizeYear(raw?.yearFrom),
    yearTo: sanitizeYear(raw?.yearTo),
    keyPeople: sanitizeStringArray(raw?.keyPeople),
    keyPlaces: sanitizeStringArray(raw?.keyPlaces),
    keyBattles: sanitizeStringArray(raw?.keyBattles),
    keyDates: sanitizeStringArray(raw?.keyDates),
    organizations: sanitizeStringArray(raw?.organizations),
    themes: sanitizeStringArray(raw?.themes),
    confidence: sanitizeConfidence(raw?.confidence),
  };
}

function entriesEqual(a: EpisodeCacheEntry | undefined, b: EpisodeCacheEntry): boolean {
  if (!a) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

async function requestEpisodeEnrichment(openai: OpenAI, episode: Episode, attempt = 0): Promise<EpisodeEnrichment> {
  const response = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      { role: "system", content: EPISODE_SYSTEM_PROMPT },
      { role: "user", content: formatEpisodePrompt(episode, attempt > 0) },
    ],
  });

  const message = response?.choices?.[0]?.message?.content ?? "";
  const parsed = safeParseJson(message);
  if (parsed) {
    return sanitizeEpisodeEnrichment(parsed);
  }

  if (attempt + 1 < MAX_ATTEMPTS) {
    return requestEpisodeEnrichment(openai, episode, attempt + 1);
  }

  throw new Error(`Failed to parse enrichment for episode ${episode.id}`);
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable.");
    process.exitCode = 1;
    return;
  }

  const episodes = await readJson<Episode[]>("public/episodes.raw.json", []);
  if (!Array.isArray(episodes) || episodes.length === 0) {
    console.log("No episodes found. Skipping episode enrichment.");
    return;
  }

  const cache = await readJson<EpisodeCache>("data/episode-enrichment.json", {});
  const nextCache: EpisodeCache = { ...cache };
  const openai = new OpenAI({ apiKey });
  const nowIso = new Date().toISOString();

  const dirtyEpisodes = episodes.filter((episode) => {
    if (!episode || typeof episode !== "object") {
      return false;
    }
    if (typeof episode.id !== "string") {
      return false;
    }
    const fingerprint = epFingerprint(episode.title ?? "", episode.description ?? "");
    const existing = cache[episode.id];
    return !existing || existing.enrichmentFingerprint !== fingerprint;
  });

  if (dirtyEpisodes.length === 0) {
    console.log("Episode enrichment cache is up to date.");
    return;
  }

  let mutated = false;

  for (const episode of dirtyEpisodes) {
    const fingerprint = epFingerprint(episode.title ?? "", episode.description ?? "");
    const existing = cache[episode.id];
    console.log(`Enriching episode ${episode.id} (${episode.title ?? "untitled"})`);
    const enrichment = await requestEpisodeEnrichment(openai, episode);
    const entry: EpisodeCacheEntry = {
      ...(existing ?? {}),
      ...enrichment,
      lastEnrichedAt: nowIso,
      enrichmentFingerprint: fingerprint,
    };
    if (!entriesEqual(existing, entry)) {
      mutated = true;
    }
    nextCache[episode.id] = entry;
  }

  if (!mutated) {
    console.log("Episode enrichment responses produced no changes.");
    return;
  }

  await writeJsonIfChanged("data/episode-enrichment.json", nextCache);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
