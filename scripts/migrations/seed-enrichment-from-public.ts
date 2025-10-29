import fs from "fs";
import path from "path";
import { epFingerprint, seriesFingerprint } from "../llm/fingerprints.ts";

const EPISODE_ENRICHMENT_FIELDS = [
  "yearFrom",
  "yearTo",
  "keyPeople",
  "keyPlaces",
  "keyBattles",
  "keyDates",
  "organizations",
  "themes",
  "confidence",
];

const SERIES_ENRICHMENT_FIELDS = [
  "publicTitle",
  "yearFrom",
  "yearTo",
  "confidence",
];

const root = process.cwd();
const resolvePublic = (file) => path.join(root, "public", file);
const resolveData = (file) => path.join(root, "data", file);

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (isEnoent(error)) {
      return fallback;
    }
    throw error;
  }
}

function isEnoent(error) {
  return Boolean(error && typeof error === "object" && error.code === "ENOENT");
}

function writeFileIfChanged(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (prev !== contents) {
    fs.writeFileSync(filePath, contents, "utf8");
  }
}

function writeJsonIfChanged(filePath, value) {
  const payload = JSON.stringify(value, null, 2) + "\n";
  writeFileIfChanged(filePath, payload);
}

function shallowEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sortObject(value) {
  const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries);
}

function main() {
  const episodesPath = resolvePublic("episodes.json");
  const seriesPath = resolvePublic("series.json");

  const episodesContent = fs.readFileSync(episodesPath, "utf8");
  const seriesContent = fs.readFileSync(seriesPath, "utf8");

  const episodes = JSON.parse(episodesContent);
  const series = JSON.parse(seriesContent);

  if (!Array.isArray(episodes) || !Array.isArray(series)) {
    throw new Error("Public data must be JSON arrays");
  }

  const episodesById = new Map();
  for (const episode of episodes) {
    if (episode && typeof episode === "object" && typeof episode.id === "string") {
      episodesById.set(episode.id, episode);
    }
  }

  const episodeCachePath = resolveData("episode-enrichment.json");
  const seriesCachePath = resolveData("series-enrichment.json");

  const episodeCache = readJson(episodeCachePath, {});
  const seriesCache = readJson(seriesCachePath, {});

  const nextEpisodeCache = { ...episodeCache };
  const nextSeriesCache = { ...seriesCache };

  for (const episode of episodes) {
    if (!episode || typeof episode !== "object" || typeof episode.id !== "string") {
      continue;
    }
    const existing = nextEpisodeCache[episode.id];
    const nextEntry = existing ? { ...existing } : {};
    let changed = false;

    for (const field of EPISODE_ENRICHMENT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(episode, field)) {
        const value = episode[field];
        if (!shallowEqual(nextEntry[field], value)) {
          nextEntry[field] = value;
          changed = true;
        }
      }
    }

    if (typeof episode.title === "string" && episode.title.trim()) {
      const description = typeof episode.description === "string" ? episode.description : undefined;
      const fingerprint = epFingerprint(episode.title, description);
      if (!shallowEqual(nextEntry.enrichmentFingerprint, fingerprint)) {
        nextEntry.enrichmentFingerprint = fingerprint;
        changed = true;
      }
    }

    if (changed) {
      nextEpisodeCache[episode.id] = nextEntry;
    }
  }

  for (const item of series) {
    if (!item || typeof item !== "object" || typeof item.id !== "string") {
      continue;
    }
    const existing = nextSeriesCache[item.id];
    const nextEntry = existing ? { ...existing } : {};
    let changed = false;

    for (const field of SERIES_ENRICHMENT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        const value = item[field];
        if (!shallowEqual(nextEntry[field], value)) {
          nextEntry[field] = value;
          changed = true;
        }
      }
    }

    if (typeof item.title === "string" && item.title.trim()) {
      const episodeIds = Array.isArray(item.episodeIds) ? item.episodeIds : [];
      const childTitles = episodeIds
        .map((episodeId) => {
          const episode = episodesById.get(episodeId);
          return episode && typeof episode.title === "string" ? episode.title : null;
        })
        .filter((value) => Boolean(value && value.trim()));
      if (childTitles.length > 0) {
        const fingerprint = seriesFingerprint(item.title, childTitles);
        if (!shallowEqual(nextEntry.enrichmentFingerprint, fingerprint)) {
          nextEntry.enrichmentFingerprint = fingerprint;
          changed = true;
        }
      }
    }

    if (changed) {
      nextSeriesCache[item.id] = nextEntry;
    }
  }

  const sortedEpisodeCache = sortObject(nextEpisodeCache);
  const sortedSeriesCache = sortObject(nextSeriesCache);

  writeJsonIfChanged(episodeCachePath, sortedEpisodeCache);
  writeJsonIfChanged(seriesCachePath, sortedSeriesCache);

  const episodesRawPath = resolvePublic("episodes.raw.json");
  const seriesRawPath = resolvePublic("series.raw.json");

  writeFileIfChanged(episodesRawPath, episodesContent);
  writeFileIfChanged(seriesRawPath, seriesContent);
}

main();
