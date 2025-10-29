import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { seriesFingerprint } from "./fingerprints.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");

const SERIES_SYSTEM_PROMPT =
  "You summarize a history podcast mini-series. Reply with strict JSON only, matching the requested schema.";

const SERIES_USER_TEMPLATE = `SERIES\nTitle: {{title}}\n\nEPISODES:\n{{episodes}}\n\nReturn strict JSON matching:\n{\n  \"publicTitle\": \"string\",\n  \"yearFrom\": number|null,\n  \"yearTo\": number|null,\n  \"confidence\": number\n}`;

const MAX_ATTEMPTS = 3;

async function readJson(relativePath, fallback) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  try {
    const raw = await fs.readFile(fullPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonIfChanged(relativePath, value) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const next = JSON.stringify(value, null, 2) + "\n";
  let previous = "";
  try {
    previous = await fs.readFile(fullPath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  if (previous !== next) {
    await fs.writeFile(fullPath, next, "utf8");
  }
}

function stripHtml(input) {
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

function sanitizeYear(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  if (normalized < -10000 || normalized > 3000) {
    return null;
  }
  return normalized;
}

function sanitizeConfidence(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(6));
}

function sanitizePublicTitle(value, fallback) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return fallback;
}

function formatSeriesPrompt(series, episodes, withReminder = false) {
  const lines = [];
  const ids = Array.isArray(series.episodeIds) ? series.episodeIds : [];
  for (const episodeId of ids) {
    const record = episodes.get(episodeId);
    const title = record?.title ?? "";
    const description = stripHtml(record?.description ?? "");
    lines.push(`- ${title}\n  ${description}`.trimEnd());
  }
  const episodesBlock = lines.length > 0 ? lines.join("\n") : "(no additional episode details)";
  const base = SERIES_USER_TEMPLATE
    .replace("{{title}}", series.title ?? "")
    .replace("{{episodes}}", episodesBlock);
  if (withReminder) {
    return `${base}\n\nREMINDER: Reply with strict JSON only.`;
  }
  return base;
}

function safeParseJson(payload) {
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

function sanitizeSeriesEnrichment(raw, fallbackTitle) {
  return {
    publicTitle: sanitizePublicTitle(raw?.publicTitle, fallbackTitle),
    yearFrom: sanitizeYear(raw?.yearFrom),
    yearTo: sanitizeYear(raw?.yearTo),
    confidence: sanitizeConfidence(raw?.confidence),
  };
}

function entriesEqual(a, b) {
  if (!a) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

async function requestSeriesEnrichment(openai, series, episodes, attempt = 0) {
  const response = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      { role: "system", content: SERIES_SYSTEM_PROMPT },
      { role: "user", content: formatSeriesPrompt(series, episodes, attempt > 0) },
    ],
  });

  const message = response?.choices?.[0]?.message?.content ?? "";
  const parsed = safeParseJson(message);
  if (parsed) {
    return sanitizeSeriesEnrichment(parsed, series.title ?? "");
  }

  if (attempt + 1 < MAX_ATTEMPTS) {
    return requestSeriesEnrichment(openai, series, episodes, attempt + 1);
  }

  throw new Error(`Failed to parse enrichment for series ${series.id}`);
}

function computeSeriesFingerprint(series, episodes) {
  const baseTitle = series.title ?? "";
  const titles = [];
  for (const episodeId of series.episodeIds ?? []) {
    const record = episodes.get(episodeId);
    if (!record) continue;
    const title = record.title ?? "";
    titles.push(title);
  }
  return seriesFingerprint(baseTitle, titles);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable.");
    process.exitCode = 1;
    return;
  }

  const episodes = await readJson("public/episodes.raw.json", []);
  const episodeMap = new Map();
  for (const episode of episodes) {
    if (!episode || typeof episode !== "object" || typeof episode.id !== "string") {
      continue;
    }
    episodeMap.set(episode.id, {
      title: typeof episode.title === "string" ? episode.title : null,
      description: typeof episode.description === "string" ? episode.description : null,
    });
  }

  const seriesList = await readJson("public/series.raw.json", []);
  if (!Array.isArray(seriesList) || seriesList.length === 0) {
    console.log("No series found. Skipping series enrichment.");
    return;
  }

  const cache = await readJson("data/series-enrichment.json", {});
  const nextCache = { ...cache };
  const openai = new OpenAI({ apiKey });
  const nowIso = new Date().toISOString();

  const dirtySeries = seriesList.filter((series) => {
    if (!series || typeof series !== "object" || typeof series.id !== "string") {
      return false;
    }
    const fingerprint = computeSeriesFingerprint(series, episodeMap);
    const existing = cache[series.id];
    return !existing || existing.enrichmentFingerprint !== fingerprint;
  });

  if (dirtySeries.length === 0) {
    console.log("Series enrichment cache is up to date.");
    return;
  }

  let mutated = false;

  for (const series of dirtySeries) {
    const fingerprint = computeSeriesFingerprint(series, episodeMap);
    const existing = cache[series.id];
    console.log(`Enriching series ${series.id} (${series.title ?? "untitled"})`);
    const enrichment = await requestSeriesEnrichment(openai, series, episodeMap);
    const entry = {
      ...(existing ?? {}),
      ...enrichment,
      lastEnrichedAt: nowIso,
      enrichmentFingerprint: fingerprint,
    };
    if (!entriesEqual(existing, entry)) {
      mutated = true;
    }
    nextCache[series.id] = entry;
  }

  if (!mutated) {
    console.log("Series enrichment responses produced no changes.");
    return;
  }

  await writeJsonIfChanged("data/series-enrichment.json", nextCache);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
