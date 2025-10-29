import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { stableHash } from "../../lib/hash.ts";
import { slugify } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");

type SeriesEntry = {
  id: string;
  title?: string | null;
  publicTitle?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
};

type TopicEntry = {
  id: string;
  title: string;
  seriesIds: string[];
  yearFrom: number | null;
  yearTo: number | null;
  enrichmentFingerprint: string;
  [key: string]: unknown;
};

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

function normalizeForGrouping(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/part\s+[ivx\d]+/gi, " ")
    .replace(/\b(?:volume|vol|episode|ep)\s+[ivx\d]+\b/gi, " ")
    .replace(/\b\d{1,4}\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
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

function pickDisplayTitle(seriesList: SeriesEntry[], normalizedKey: string): string {
  const publicTitles = seriesList
    .map((series) => (typeof series.publicTitle === "string" ? series.publicTitle.trim() : ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  if (publicTitles.length > 0) {
    return publicTitles[0];
  }

  const rawTitles = seriesList
    .map((series) => (typeof series.title === "string" ? series.title.trim() : ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  if (rawTitles.length > 0) {
    return rawTitles[0];
  }

  return normalizedKey
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildTopic(seriesList: SeriesEntry[], normalizedKey: string): TopicEntry | null {
  if (seriesList.length < 2) {
    return null;
  }

  const seriesIds = Array.from(new Set(seriesList.map((series) => series.id))).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );

  if (seriesIds.length < 2) {
    return null;
  }

  const displayTitle = pickDisplayTitle(seriesList, normalizedKey);
  const slug = slugify(displayTitle);
  if (!slug) {
    return null;
  }

  let yearFrom: number | null = null;
  let yearTo: number | null = null;

  for (const series of seriesList) {
    const from = sanitizeYear(series.yearFrom);
    const to = sanitizeYear(series.yearTo);
    if (from !== null) {
      yearFrom = yearFrom === null ? from : Math.min(yearFrom, from);
    }
    if (to !== null) {
      yearTo = yearTo === null ? to : Math.max(yearTo, to);
    }
  }

  const topicId = `t_${slug}`;
  const fingerprint = stableHash(`${displayTitle}|${seriesIds.join("|")}`);

  return {
    id: topicId,
    title: displayTitle,
    seriesIds,
    yearFrom,
    yearTo,
    enrichmentFingerprint: fingerprint,
  };
}

function entriesEqual(a: TopicEntry | undefined, b: TopicEntry): boolean {
  if (!a) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main(): Promise<void> {
  const series = await readJson<SeriesEntry[]>("public/series.json", []);
  if (!Array.isArray(series) || series.length === 0) {
    console.log("No series available. Skipping topics build.");
    return;
  }

  const existingTopics = await readJson<TopicEntry[]>("public/topics.json", []);
  const existingById = new Map(existingTopics.map((topic) => [topic.id, topic]));
  const nextTopics = new Map(existingTopics.map((topic) => [topic.id, topic]));

  const groups = new Map<string, SeriesEntry[]>();

  for (const entry of series) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
      continue;
    }
    const normalizedTitle = normalizeForGrouping(entry.title ?? entry.publicTitle ?? "");
    if (!normalizedTitle) {
      continue;
    }
    if (!groups.has(normalizedTitle)) {
      groups.set(normalizedTitle, []);
    }
    groups.get(normalizedTitle)!.push(entry);
  }

  let mutated = false;

  for (const [normalized, list] of groups.entries()) {
    const topic = buildTopic(list, normalized);
    if (!topic) {
      continue;
    }
    const existing = existingById.get(topic.id);
    const merged: TopicEntry = { ...(existing ?? {}), ...topic };
    if (!entriesEqual(existing, merged)) {
      mutated = true;
      nextTopics.set(topic.id, merged);
    }
  }

  const ordered = Array.from(nextTopics.values()).sort((a, b) => {
    const titleCompare = (a.title ?? "").localeCompare(b.title ?? "", "en", { sensitivity: "base" });
    if (titleCompare !== 0) {
      return titleCompare;
    }
    return a.id.localeCompare(b.id);
  });

  if (!mutated) {
    console.log("Topics file already up to date.");
    return;
  }

  await writeJsonIfChanged("public/topics.json", ordered);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
