import { NextResponse } from "next/server";
import { get, put } from "@vercel/blob";

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
import episodeSchema from "@/../schema/episode.public.schema.json" assert { type: "json" };
import seriesSchema from "@/../schema/series.public.schema.json" assert { type: "json" };
import cacheSchema from "@/../schema/cache.llm.schema.json" assert { type: "json" };
import { SERIES_OVERRIDES } from "@/config/seriesOverrides";

const blobAuthOptions = process.env.BLOB_READ_WRITE_TOKEN
  ? { token: process.env.BLOB_READ_WRITE_TOKEN }
  : {};

const readJsonFromBlob = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const blob = await get(key, blobAuthOptions);
    const downloadUrl = blob.downloadUrl ?? blob.url;
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download blob ${key}: ${response.status}`);
    }
    const text = await response.text();
    if (!text) {
      return fallback;
    }
    return JSON.parse(text) as T;
  } catch (error: any) {
    if (error?.status === 404 || error?.name === "BlobNotFoundError") {
      return fallback;
    }
    throw error;
  }
};

const writeJsonToBlob = async (key: string, value: unknown): Promise<void> => {
  const body = stableStringify(value as any) + "\n";
  await put(key, body, {
    access: "private",
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
};

const readTextFromBlob = async (key: string): Promise<string> => {
  try {
    const blob = await get(key, blobAuthOptions);
    const downloadUrl = blob.downloadUrl ?? blob.url;
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download blob ${key}: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    if (error?.status === 404 || error?.name === "BlobNotFoundError") {
      return "";
    }
    throw error;
  }
};

const writeTextToBlob = async (key: string, value: string): Promise<void> => {
  await put(key, value, {
    access: "private",
    contentType: "text/plain;charset=utf-8",
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
};

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rawEpisodesKey = "data/episodes-raw.json";
    const programmaticEpisodesKey = "data/episodes-programmatic.json";
    const seriesProgrammaticKey = "data/series-programmatic.json";
    const rssSnapshotKey = `data/source/rss.${today}.json`;
    const publicEpisodesKey = "public/episodes.json";
    const publicSeriesKey = "public/series.json";
    const episodeLlmCacheKey = "data/episodes-llm.json";
    const seriesLlmCacheKey = "data/series-llm.json";
    const errorsKey = "data/errors.jsonl";

    const existingRawEpisodes = await readJsonFromBlob<RawEpisode[]>(rawEpisodesKey, []);
    const existingEpisodeLlmCache = await readJsonFromBlob<Record<string, LlmEpisodeCacheEntry>>(episodeLlmCacheKey, {});
    const existingSeriesLlmCache = await readJsonFromBlob<Record<string, LlmSeriesCacheEntry>>(seriesLlmCacheKey, {});

    const { newRawEpisodes, dailySnapshot } = await runFetchStep(existingRawEpisodes);

    const updatedRawEpisodes = [...existingRawEpisodes, ...newRawEpisodes];
    const programmaticEpisodes = runProgrammaticEnrichment(updatedRawEpisodes);
    const { programmaticSeries } = runSeriesGrouping(programmaticEpisodes, SERIES_OVERRIDES);

    const episodeLlmResult = await runLlmEpisodeEnrichment(programmaticEpisodes, existingEpisodeLlmCache);
    const seriesLlmResult = await runLlmSeriesEnrichment(programmaticSeries, existingSeriesLlmCache);

    const updatedEpisodeLlmCache = episodeLlmResult.cache;
    const updatedSeriesLlmCache = seriesLlmResult.cache;

    const errors = [...episodeLlmResult.errors, ...seriesLlmResult.errors];

    const { publicEpisodes, publicSeries } = runComposeStep({
      rawEpisodes: updatedRawEpisodes,
      programmaticEpisodes,
      programmaticSeries,
      episodeLlmCache: updatedEpisodeLlmCache,
      seriesLlmCache: updatedSeriesLlmCache
    });

    runValidation({
      rawEpisodes: updatedRawEpisodes,
      programmaticEpisodes,
      programmaticSeries,
      episodeLlmCache: updatedEpisodeLlmCache,
      seriesLlmCache: updatedSeriesLlmCache,
      publicEpisodes,
      publicSeries,
      episodeSchema: episodeSchema as unknown as Record<string, unknown>,
      seriesSchema: seriesSchema as unknown as Record<string, unknown>,
      episodeCacheSchema: cacheSchema as unknown as Record<string, unknown>,
      seriesCacheSchema: cacheSchema as unknown as Record<string, unknown>
    });

    await writeJsonToBlob(rssSnapshotKey, dailySnapshot as DailyRssSnapshot);
    await writeJsonToBlob(rawEpisodesKey, updatedRawEpisodes);
    await writeJsonToBlob(programmaticEpisodesKey, programmaticEpisodes);
    await writeJsonToBlob(seriesProgrammaticKey, programmaticSeries);
    await writeJsonToBlob(episodeLlmCacheKey, updatedEpisodeLlmCache);
    await writeJsonToBlob(seriesLlmCacheKey, updatedSeriesLlmCache);
    await writeJsonToBlob(publicEpisodesKey, publicEpisodes);
    await writeJsonToBlob(publicSeriesKey, publicSeries);

    if (errors.length > 0) {
      const existingErrors = await readTextFromBlob(errorsKey);
      const prefix = existingErrors
        ? existingErrors.endsWith("\n")
          ? existingErrors
          : `${existingErrors}\n`
        : "";
      const appended = `${prefix}${errors.map((entry) => stableStringify(entry)).join("\n")}\n`;
      await writeTextToBlob(errorsKey, appended);
    }

    return NextResponse.json({
      status: "ok",
      newEpisodes: newRawEpisodes.length
    });
  } catch (error: unknown) {
    console.error("Pipeline run failed", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
