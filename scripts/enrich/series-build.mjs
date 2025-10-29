import {
  ARC_GAP_DAYS,
  extractPart,
  kebabCase,
  normalizeTitle,
  readJsonFile,
  seriesHead,
  shortHash,
  shouldStartNewArc,
  toTitleCase,
  writeJsonFile,
} from '../utils.js';

function getItunesEpisode(episode) {
  const value = typeof episode.itunesEpisode === 'number' ? episode.itunesEpisode : null;
  if (value !== null && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function getPubDateValue(pubDate) {
  const value = Date.parse(pubDate ?? '');
  if (Number.isFinite(value)) {
    return value;
  }
  return Number.MAX_SAFE_INTEGER;
}

function ensureEpisodeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) => entry && typeof entry === 'object' && typeof entry.id === 'string');
}

function sortEntriesForBucket(entries) {
  return [...entries].sort((a, b) => {
    if (a.part !== b.part) {
      return a.part - b.part;
    }
    const aEpisode = a.itunesEpisode ?? Number.MAX_SAFE_INTEGER;
    const bEpisode = b.itunesEpisode ?? Number.MAX_SAFE_INTEGER;
    if (aEpisode !== bEpisode) {
      return aEpisode - bEpisode;
    }
    if (a.pubDateValue !== b.pubDateValue) {
      return a.pubDateValue - b.pubDateValue;
    }
    return a.episode.id.localeCompare(b.episode.id);
  });
}

async function main() {
  const episodesRaw = await readJsonFile('public/episodes.raw.json', []);
  const episodes = ensureEpisodeList(episodesRaw);

  if (episodes.length === 0) {
    console.log('No episodes found. Skipping series build.');
    await writeJsonFile('public/series.raw.json', []);
    return;
  }

  const candidatesByHead = new Map();

  for (const episode of episodes) {
    const title = episode.title ?? '';
    const normalizedTitle = normalizeTitle(title || episode.id || '');
    const partFromEpisode = typeof episode.part === 'number' && Number.isFinite(episode.part) ? episode.part : null;
    const partFromTitle = extractPart(title);
    const part = partFromEpisode ?? partFromTitle ?? null;
    if (part === null) {
      continue;
    }

    const headValueRaw = seriesHead(title);
    const fallbackHead = headValueRaw || normalizedTitle || episode.id || '';
    const headValue = headValueRaw || fallbackHead;
    const headKeyBase = headValue || fallbackHead;
    const headKeySlug = kebabCase(headKeyBase);
    const headKey = headKeySlug || kebabCase(episode.id) || `series-${shortHash(headKeyBase)}`;

    if (!candidatesByHead.has(headKey)) {
      candidatesByHead.set(headKey, { headKey, headValue, entries: [] });
    }

    const collection = candidatesByHead.get(headKey);
    if (!collection) {
      continue;
    }

    collection.entries.push({
      episode,
      part,
      itunesEpisode: getItunesEpisode(episode),
      pubDateValue: getPubDateValue(episode.pubDate),
    });
  }

  const bucketsByHead = new Map();

  for (const collection of candidatesByHead.values()) {
    const sortedEntries = [...collection.entries].sort((a, b) => {
      const aEpisode = a.itunesEpisode ?? Number.MAX_SAFE_INTEGER;
      const bEpisode = b.itunesEpisode ?? Number.MAX_SAFE_INTEGER;
      if (aEpisode !== bEpisode) {
        return aEpisode - bEpisode;
      }
      if (a.pubDateValue !== b.pubDateValue) {
        return a.pubDateValue - b.pubDateValue;
      }
      if (a.part !== b.part) {
        return a.part - b.part;
      }
      return a.episode.id.localeCompare(b.episode.id);
    });

    const headBuckets = [];

    for (const entry of sortedEntries) {
      const lastBucket = headBuckets[headBuckets.length - 1];
      if (shouldStartNewArc(lastBucket, entry, ARC_GAP_DAYS)) {
        headBuckets.push({
          headKey: collection.headKey,
          headValue: collection.headValue,
          anchorId: entry.episode.id,
          entries: [],
          partsSeen: new Set(),
          firstPubValue: Number.isFinite(entry.pubDateValue) ? entry.pubDateValue : null,
          lastPubValue: Number.isFinite(entry.pubDateValue) ? entry.pubDateValue : null,
        });
      }

      const targetBucket = headBuckets[headBuckets.length - 1];
      if (!targetBucket) {
        continue;
      }

      targetBucket.entries.push(entry);
      targetBucket.partsSeen.add(entry.part);

      if (Number.isFinite(entry.pubDateValue)) {
        if (targetBucket.firstPubValue === null || targetBucket.firstPubValue === undefined) {
          targetBucket.firstPubValue = entry.pubDateValue;
        }
        targetBucket.lastPubValue = entry.pubDateValue;
      }
    }

    if (headBuckets.length > 0) {
      bucketsByHead.set(collection.headKey, headBuckets);
    }
  }

  const seriesRecords = [];

  for (const headBuckets of bucketsByHead.values()) {
    for (const bucket of headBuckets) {
      if (bucket.entries.length < 2) {
        continue;
      }

      const sortedEntries = sortEntriesForBucket(bucket.entries);
      const seriesId = `s_${shortHash(`${bucket.headKey}::${bucket.anchorId}`)}`;
      const titleSource = bucket.headValue || bucket.headKey.replace(/-/g, ' ');
      const seriesTitle = toTitleCase(titleSource);
      const episodeIds = Array.from(new Set(sortedEntries.map((entry) => entry.episode.id)));

      seriesRecords.push({
        id: seriesId,
        title: seriesTitle,
        episodeIds,
        provisional: {
          head: bucket.headKey,
        },
      });
    }
  }

  seriesRecords.sort((a, b) => a.id.localeCompare(b.id));

  await writeJsonFile('public/series.raw.json', seriesRecords);
  console.log(`Built ${seriesRecords.length} series.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
