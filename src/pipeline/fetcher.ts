import axios from "axios";
import { parseStringPromise } from "xml2js";
import { DailyRssSnapshot, RawEpisode } from "@/types";

const RSS_FEED_URL = "https://feeds.megaphone.fm/GLT4787413333";

type FetchStepResult = {
  newRawEpisodes: RawEpisode[];
  dailySnapshot: DailyRssSnapshot;
};

interface FetchStepOptions {
  since?: string | null;
  dryRun?: boolean;
  plan?: boolean;
}

const toIsoString = (date: Date): string => date.toISOString();

const normalizeGuid = (guid: string): string => guid.trim();

const firstString = (value: any): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return firstString(value[0]);
  }

  if (typeof value === "object") {
    if (value.url !== undefined) {
      return firstString(value.url);
    }
    if (value.href !== undefined) {
      return firstString(value.href);
    }
    if (value._ !== undefined) {
      return firstString(value._);
    }
  }

  return null;
};

const normaliseEpisode = (item: any): RawEpisode | null => {
  const guid = firstString(item.guid);
  const pubDate = firstString(item.pubDate);
  const enclosureNode = Array.isArray(item.enclosure) ? item.enclosure[0] : item.enclosure;
  const enclosureUrl = firstString(enclosureNode);

  if (!guid || !pubDate || !enclosureUrl) {
    return null;
  }

  const episodeId = normalizeGuid(guid);

  return {
    episodeId,
    title: item.title?.[0] ?? "",
    publishedAt: new Date(pubDate).toISOString(),
    description: item["content:encoded"]?.[0] ?? item.description?.[0] ?? "",
    audioUrl: enclosureUrl,
    rssLastSeenAt: toIsoString(new Date()),
    source: {
      guid: guid,
      itunesEpisode: (() => {
        const episode = firstString(item["itunes:episode"]);
        return episode ? Number(episode) : null;
      })(),
      megaphoneId: firstString(item["megaphone:id"]),
      enclosureUrl
    }
  };
};

export const runFetchStep = async (
  existingRawEpisodes: RawEpisode[],
  options: FetchStepOptions = {}
): Promise<FetchStepResult> => {
  const response = await axios.get(RSS_FEED_URL);
  const rss = await parseStringPromise(response.data, {
    explicitArray: true,
    explicitRoot: false,
    mergeAttrs: true,
    trim: true
  });

  const items = rss?.channel?.[0]?.item ?? [];

  const existingGuids = new Set(existingRawEpisodes.map((episode) => episode.source.guid));

  const rawEpisodes: RawEpisode[] = [];

  for (const item of items) {
    const normalized = normaliseEpisode(item);
    if (!normalized) {
      continue;
    }

    if (existingGuids.has(normalized.source.guid)) {
      continue;
    }

    rawEpisodes.push(normalized);
  }

  let filteredEpisodes = rawEpisodes;

  if (options.since) {
    const sinceDate = new Date(options.since);
    if (!Number.isNaN(sinceDate.getTime())) {
      filteredEpisodes = rawEpisodes.filter((episode) => {
        const publishedAt = new Date(episode.publishedAt);
        return publishedAt >= sinceDate;
      });
    }
  }

  const dailySnapshot: DailyRssSnapshot = {
    fetchedAt: toIsoString(new Date()),
    items
  };

  return {
    newRawEpisodes: filteredEpisodes,
    dailySnapshot
  };
};

export default runFetchStep;
