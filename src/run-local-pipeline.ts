import { promises as fs } from "node:fs";
import path from "node:path";

import stableStringify from "@/lib/stableStringify";
import { runFetchStep } from "@/pipeline/fetcher";
import { runProgrammaticEnrichment } from "@/pipeline/enricher";
import { runSeriesGrouping } from "@/pipeline/grouper";
import { runComposeStep } from "@/pipeline/composer";
import { runValidation } from "@/pipeline/validator";
import { runLlmEpisodeEnrichment, runLlmSeriesEnrichment } from "@/pipeline/llmEnricher";
import {
  DailyRssSnapshot,
  LlmEpisodeCacheEntry,
  LlmSeriesCacheEntry,
  RawEpisode
} from "@/types";
import { YearConfidence } from "@/types";
import { SERIES_OVERRIDES } from "@/config/seriesOverrides";

const DATA_DIR = path.resolve(process.cwd(), "data");
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

const readJsonFile = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
};

const writeJsonFile = async (filePath: string, data: unknown): Promise<void> => {
  const serialised = stableStringify(data as any);
  await fs.writeFile(filePath, serialised + "\n", "utf8");
};

const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.mkdir(dirPath, { recursive: true });
};

const appendJsonLines = async (filePath: string, entries: unknown[]): Promise<void> => {
  if (entries.length === 0) {
    return;
  }

  const content = entries.map((entry) => stableStringify(entry as any)).join("\n") + "\n";
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, content, "utf8");
};

interface LocalPipelineOptions {
  maxEpisodeLlmCalls?: number;
  maxSeriesLlmCalls?: number;
  dryRun?: boolean;
  since?: string | null;
  plan?: boolean;
  outputDir?: string | null;
  forceEpisodeIds?: Set<string>;
  forceSeriesIds?: Set<string>;
  forceAllEpisodes?: boolean;
  forceAllSeries?: boolean;
}

const YEAR_CONFIDENCE_RANK: Record<YearConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0
};

const normaliseYearRange = (yearFrom: number | null, yearTo: number | null): [number | null, number | null] => {
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    return [yearTo, yearFrom];
  }
  return [yearFrom, yearTo];
};

const applyEpisodeYearSpans = (
  programmaticEpisodes: Record<string, ProgrammaticEpisode>,
  episodeCache: Record<string, LlmEpisodeCacheEntry>
): void => {
  Object.values(programmaticEpisodes).forEach((episode) => {
    const cacheKey = `${episode.episodeId}:${episode.fingerprint}`;
    const cacheEntry = episodeCache[cacheKey];
    const isCacheValid = cacheEntry && cacheEntry.status === "ok";
    const candidateFrom = isCacheValid ? cacheEntry.yearFrom : episode.yearFrom ?? null;
    const candidateTo = isCacheValid ? cacheEntry.yearTo : episode.yearTo ?? null;
    const [yearFrom, yearTo] = normaliseYearRange(candidateFrom ?? null, candidateTo ?? null);
    episode.yearFrom = yearFrom;
    episode.yearTo = yearTo;
    episode.yearConfidence = isCacheValid
      ? cacheEntry.yearConfidence
      : episode.yearConfidence ?? "unknown";
  });
};

const applySeriesYearSpans = (
  programmaticSeries: Record<string, ProgrammaticSeries>,
  programmaticEpisodes: Record<string, ProgrammaticEpisode>
): void => {
  Object.values(programmaticSeries).forEach((series) => {
    const members = series.episodeIds
      .map((episodeId) => programmaticEpisodes[episodeId])
      .filter((episode): episode is ProgrammaticEpisode => Boolean(episode));

    const yearValues: number[] = [];
    members.forEach((episode) => {
      if (episode.yearFrom !== null && episode.yearFrom !== undefined) {
        yearValues.push(episode.yearFrom);
      }
      if (episode.yearTo !== null && episode.yearTo !== undefined) {
        yearValues.push(episode.yearTo);
      }
    });

    if (yearValues.length > 0) {
      const computedFrom = Math.min(...yearValues);
      const computedTo = Math.max(...yearValues);
      const [yearFrom, yearTo] = normaliseYearRange(computedFrom, computedTo);
      series.yearFrom = yearFrom;
      series.yearTo = yearTo;
      const seriesConfidence = members
        .map((episode) => episode.yearConfidence ?? "unknown")
        .reduce<YearConfidence>((current, candidate) => {
          return YEAR_CONFIDENCE_RANK[candidate] < YEAR_CONFIDENCE_RANK[current] ? candidate : current;
        }, "high");
      series.yearConfidence = seriesConfidence;
    } else {
      series.yearFrom = null;
      series.yearTo = null;
      series.yearConfidence = "unknown";
    }
  });
};

export const runLocalPipeline = async (options: LocalPipelineOptions = {}): Promise<void> => {
  const dataDir = options.outputDir
    ? path.resolve(process.cwd(), options.outputDir, "data")
    : DATA_DIR;
  const publicDir = options.outputDir
    ? path.resolve(process.cwd(), options.outputDir, "public")
    : PUBLIC_DIR;

  await ensureDir(dataDir);
  await ensureDir(publicDir);

  const rawEpisodesPath = path.join(dataDir, "episodes-raw.json");
  const programmaticEpisodesPath = path.join(dataDir, "episodes-programmatic.json");
  const seriesProgrammaticPath = path.join(dataDir, "series-programmatic.json");
  const episodeLlmCachePath = path.join(dataDir, "episodes-llm.json");
  const seriesLlmCachePath = path.join(dataDir, "series-llm.json");
  const rssSnapshotPath = path.join(dataDir, "source", `rss.${new Date().toISOString().slice(0, 10)}.json`);
  const publicEpisodesPath = path.join(publicDir, "episodes.json");
  const publicSeriesPath = path.join(publicDir, "series.json");
  const episodeSchemaPath = path.join(process.cwd(), "schema", "episode.public.schema.json");
  const seriesSchemaPath = path.join(process.cwd(), "schema", "series.public.schema.json");
  const cacheSchemaPath = path.join(process.cwd(), "schema", "cache.llm.schema.json");

  const existingRawEpisodes = await readJsonFile<RawEpisode[]>(rawEpisodesPath, []);
  const existingEpisodeLlmCache = await readJsonFile<Record<string, LlmEpisodeCacheEntry>>(episodeLlmCachePath, {});
  const existingSeriesLlmCache = await readJsonFile<Record<string, LlmSeriesCacheEntry>>(seriesLlmCachePath, {});

  const { newRawEpisodes, dailySnapshot } = await runFetchStep(existingRawEpisodes, {
    since: options.since ?? null,
    dryRun: options.dryRun ?? false,
    plan: options.plan ?? false
  });

  const updatedRawEpisodes = [...existingRawEpisodes, ...newRawEpisodes];
  const programmaticEpisodes = runProgrammaticEnrichment(updatedRawEpisodes);
  const { programmaticSeries } = runSeriesGrouping(programmaticEpisodes, SERIES_OVERRIDES);

  const episodeIdsToForce = new Set<string>();
  if (options.forceAllEpisodes) {
    Object.keys(programmaticEpisodes).forEach((id) => episodeIdsToForce.add(id));
  }
  if (options.forceEpisodeIds) {
    options.forceEpisodeIds.forEach((id) => episodeIdsToForce.add(id));
  }
  const forceEpisodeIds =
    episodeIdsToForce.size > 0
      ? new Set(Array.from(episodeIdsToForce).filter((id) => programmaticEpisodes[id]))
      : undefined;

  const seriesIdsToForce = new Set<string>();
  if (options.forceAllSeries) {
    Object.keys(programmaticSeries).forEach((id) => seriesIdsToForce.add(id));
  }
  if (options.forceSeriesIds) {
    options.forceSeriesIds.forEach((id) => seriesIdsToForce.add(id));
  }
  const forceSeriesIds =
    seriesIdsToForce.size > 0
      ? new Set(Array.from(seriesIdsToForce).filter((id) => programmaticSeries[id]))
      : undefined;

  const episodeLlmResult = await runLlmEpisodeEnrichment(programmaticEpisodes, existingEpisodeLlmCache, {
    maxLlmCalls: options.maxEpisodeLlmCalls,
    forceIds: forceEpisodeIds,
    planOnly: options.plan
  });
  const seriesLlmResult = await runLlmSeriesEnrichment(programmaticSeries, existingSeriesLlmCache, {
    maxLlmCalls: options.maxSeriesLlmCalls,
    forceIds: forceSeriesIds,
    planOnly: options.plan
  });

  const updatedEpisodeLlmCache = episodeLlmResult.cache;
  applyEpisodeYearSpans(programmaticEpisodes, updatedEpisodeLlmCache);
  const updatedSeriesLlmCache = seriesLlmResult.cache;
  const cleanedSeriesLlmCache = Object.fromEntries(
    Object.entries(updatedSeriesLlmCache).filter(([, entry]) => !!programmaticSeries[entry.seriesId])
  );
  applySeriesYearSpans(programmaticSeries, programmaticEpisodes);

  const errors = [...episodeLlmResult.errors, ...seriesLlmResult.errors];

  if (options.plan) {
    if (episodeLlmResult.planned.length === 0 && seriesLlmResult.planned.length === 0) {
      console.log("No LLM enrichments required — caches are up to date.");
    } else {
      if (episodeLlmResult.planned.length > 0) {
        const episodeRows = episodeLlmResult.planned.map((item) => {
          const episode = programmaticEpisodes[item.episodeId];
          const approxTokens = Math.ceil(
            (episode.cleanDescriptionText.length + episode.cleanTitle.length) / 3.5
          );
          return {
            episodeId: item.episodeId,
            fingerprint: item.fingerprint,
            approxTokens
          };
        });
        console.log("Episodes requiring LLM enrichment:");
        console.table(episodeRows);
      }
      if (seriesLlmResult.planned.length > 0) {
        const seriesRows = seriesLlmResult.planned.map((item) => {
          const series = programmaticSeries[item.seriesId];
          const summaryCount = series.derived?.episodeSummaries?.length ?? 0;
          const approxTokens = Math.ceil(summaryCount * 400);
          return {
            seriesId: item.seriesId,
            fingerprint: item.fingerprint,
            approxTokens
          };
        });
        console.log("Series requiring LLM enrichment:");
        console.table(seriesRows);
      }
    }
    return;
  }

  const { publicEpisodes, publicSeries } = runComposeStep({
    rawEpisodes: updatedRawEpisodes,
    programmaticEpisodes,
    programmaticSeries,
    episodeLlmCache: updatedEpisodeLlmCache,
    seriesLlmCache: cleanedSeriesLlmCache
  });

  const [episodeSchema, seriesSchema, cacheSchema] = await Promise.all([
    readJsonFile<Record<string, unknown>>(episodeSchemaPath, {}),
    readJsonFile<Record<string, unknown>>(seriesSchemaPath, {}),
    readJsonFile<Record<string, unknown>>(cacheSchemaPath, {})
  ]);

  runValidation({
    rawEpisodes: updatedRawEpisodes,
    programmaticEpisodes,
    programmaticSeries,
    episodeLlmCache: updatedEpisodeLlmCache,
    seriesLlmCache: updatedSeriesLlmCache,
    publicEpisodes,
    publicSeries,
    episodeSchema,
    seriesSchema,
    episodeCacheSchema: cacheSchema,
    seriesCacheSchema: cacheSchema
  });

  if (!options.dryRun) {
    await ensureDir(path.dirname(rssSnapshotPath));
    await writeJsonFile(rssSnapshotPath, dailySnapshot as DailyRssSnapshot);
    await writeJsonFile(rawEpisodesPath, updatedRawEpisodes);
    await writeJsonFile(programmaticEpisodesPath, programmaticEpisodes);
    await writeJsonFile(seriesProgrammaticPath, programmaticSeries);
    await writeJsonFile(episodeLlmCachePath, updatedEpisodeLlmCache);
    await writeJsonFile(seriesLlmCachePath, cleanedSeriesLlmCache);
    await writeJsonFile(publicEpisodesPath, publicEpisodes);
    await writeJsonFile(publicSeriesPath, publicSeries);
  } else {
    console.log("Dry run enabled — skipping filesystem writes.");
  }

  if (errors.length > 0) {
    if (options.dryRun) {
      console.log("Encountered recoverable errors:");
      errors.forEach((entry) => {
        console.log(`${entry.stage} :: ${entry.itemId} — ${entry.message}`);
      });
    } else {
      const errorsPath = path.join(dataDir, "errors.jsonl");
      await appendJsonLines(errorsPath, errors);
    }
  }
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const options: LocalPipelineOptions = {};
  const forcedIds: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--dry":
        options.dryRun = true;
        break;
      case "--plan":
        options.plan = true;
        break;
      case "--since":
        options.since = args[i + 1] ?? null;
        i += 1;
        break;
      case "--output":
        options.outputDir = args[i + 1] ?? null;
        i += 1;
        break;
      case "--max-llm-calls":
        {
          const value = Number(args[i + 1]);
          if (!Number.isNaN(value)) {
            options.maxEpisodeLlmCalls = value;
            options.maxSeriesLlmCalls = value;
          }
          i += 1;
        }
        break;
      case "--force-llm":
        {
          const value = args[i + 1];
          if (value) {
            value.split(",").forEach((id) => {
              const trimmed = id.trim();
              if (!trimmed) {
                return;
              }
              const lower = trimmed.toLowerCase();
              if (lower === "all") {
                options.forceAllEpisodes = true;
                options.forceAllSeries = true;
              } else if (lower === "episodes" || lower === "episode") {
                options.forceAllEpisodes = true;
              } else if (lower === "series" || lower === "series-only") {
                options.forceAllSeries = true;
              } else {
                forcedIds.push(trimmed);
              }
            });
          }
          i += 1;
        }
        break;
      default:
        break;
    }
  }

  if (forcedIds.length > 0) {
    options.forceEpisodeIds = new Set(forcedIds);
    options.forceSeriesIds = new Set(forcedIds);
  }

  runLocalPipeline(options).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
