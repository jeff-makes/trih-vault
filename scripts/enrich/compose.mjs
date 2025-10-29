import fs from "fs";
import path from "path";

const root = process.cwd();
const fromPublic = (file) => path.join(root, "public", file);
const fromData = (file) => path.join(root, "data", file);

function isEnoent(error) {
  return Boolean(error && typeof error === "object" && error.code === "ENOENT");
}

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

function writeJsonIfChanged(filePath, value) {
  const next = JSON.stringify(value, null, 2) + "\n";
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (prev !== next) {
    fs.writeFileSync(filePath, next, "utf8");
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function applyEpisodeEnrichment(rawEpisodes, cache) {
  return rawEpisodes.map((episode) => {
    const enrichment = cache[episode.id];
    if (!enrichment || typeof enrichment !== "object") {
      return { ...episode };
    }
    const { enrichmentFingerprint: _skip, ...fields } = enrichment;
    if (Object.keys(fields).length === 0) {
      return { ...episode };
    }
    return { ...episode, ...fields };
  });
}

function applySeriesEnrichment(rawSeries, cache) {
  return rawSeries.map((item) => {
    const enrichment = cache[item.id];
    if (!enrichment || typeof enrichment !== "object") {
      return { ...item };
    }
    const { enrichmentFingerprint: _skip, ...fields } = enrichment;
    if (Object.keys(fields).length === 0) {
      return { ...item };
    }
    return { ...item, ...fields };
  });
}

function parseDateValue(value) {
  if (typeof value !== "string") {
    return Number.POSITIVE_INFINITY;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }
  return timestamp;
}

function sortEpisodes(list) {
  return [...list].sort((a, b) => {
    const aTime = parseDateValue(a.pubDate);
    const bTime = parseDateValue(b.pubDate);
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.id.localeCompare(b.id);
  });
}

function sortSeries(list) {
  return [...list].sort((a, b) => {
    const aTitle = typeof a.title === "string" ? a.title : "";
    const bTitle = typeof b.title === "string" ? b.title : "";
    const titleCompare = aTitle.localeCompare(bTitle, "en", { sensitivity: "base" });
    if (titleCompare !== 0) {
      return titleCompare;
    }
    return a.id.localeCompare(b.id);
  });
}

function formatSeriesEntry(entry) {
  const { id, title, episodeIds } = entry;
  const result = {
    id,
    title,
    episodeIds,
  };

  if (Object.prototype.hasOwnProperty.call(entry, "yearFrom")) {
    result.yearFrom = entry.yearFrom;
  }

  if (Object.prototype.hasOwnProperty.call(entry, "yearTo")) {
    result.yearTo = entry.yearTo;
  }

  if (Object.prototype.hasOwnProperty.call(entry, "provisional")) {
    result.provisional = entry.provisional;
  }

  if (Object.prototype.hasOwnProperty.call(entry, "publicTitle")) {
    result.publicTitle = entry.publicTitle;
  }

  for (const [key, value] of Object.entries(entry)) {
    if (
      key === "id" ||
      key === "title" ||
      key === "episodeIds" ||
      key === "yearFrom" ||
      key === "yearTo" ||
      key === "provisional" ||
      key === "publicTitle"
    ) {
      continue;
    }
    result[key] = value;
  }

  return result;
}

function main() {
  const existingEpisodes = readJson(fromPublic("episodes.json"), []);
  const existingSeries = readJson(fromPublic("series.json"), []);

  const rawEpisodes = readJson(fromPublic("episodes.raw.json"), null) ?? existingEpisodes;
  const rawSeries = readJson(fromPublic("series.raw.json"), null) ?? existingSeries;

  const episodeCache = readJson(fromData("episode-enrichment.json"), {});
  const seriesCache = readJson(fromData("series-enrichment.json"), {});

  const enrichedEpisodes = sortEpisodes(applyEpisodeEnrichment(ensureArray(rawEpisodes), episodeCache));
  const enrichedSeries = sortSeries(applySeriesEnrichment(ensureArray(rawSeries), seriesCache));
  const formattedSeries = enrichedSeries.map(formatSeriesEntry);

  writeJsonIfChanged(fromPublic("episodes.json"), enrichedEpisodes);
  writeJsonIfChanged(fromPublic("series.json"), formattedSeries);
}

main();
