import {
  extractPart,
  kebabCase,
  normalizeTitle,
  readJsonFile,
  seriesHead,
  shortHash,
  toTitleCase,
  writeJsonFile,
} from './utils.js';

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

async function main() {
  const episodes = await readJsonFile('public/episodes.json', []);
  if (episodes.length === 0) {
    console.log('No episodes found.');
    return;
  }

  const baseEpisodes = new Map();
  for (const episode of episodes) {
    const cleaned = { ...episode };
    delete cleaned.seriesId;
    delete cleaned.topicId;
    cleaned.part = null;
    baseEpisodes.set(episode.id, cleaned);
  }

  const episodesForGrouping = [...episodes].sort((a, b) => {
    const aEpisode = getItunesEpisode(a);
    const bEpisode = getItunesEpisode(b);
    const safeAEpisode = aEpisode === null ? Number.MAX_SAFE_INTEGER : aEpisode;
    const safeBEpisode = bEpisode === null ? Number.MAX_SAFE_INTEGER : bEpisode;
    if (safeAEpisode !== safeBEpisode) {
      return safeAEpisode - safeBEpisode;
    }
    const aDate = getPubDateValue(a.pubDate);
    const bDate = getPubDateValue(b.pubDate);
    if (aDate !== bDate) {
      return aDate - bDate;
    }
    return a.id.localeCompare(b.id);
  });

  const groups = new Map();

  for (const episode of episodesForGrouping) {
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
    const headKey = headKeySlug || kebabCase(episode.id ?? '') || `series-${shortHash(headKeyBase)}`;

    if (!groups.has(headKey)) {
      groups.set(headKey, {
        headKey,
        headValue,
        anchorId: episode.id,
        entries: [],
        partsSeen: new Set(),
      });
    }

    const group = groups.get(headKey);
    if (!group) continue;

    if (group.entries.length === 0) {
      group.anchorId = episode.id;
    }

    if (group.partsSeen.has(part)) {
      continue;
    }

    group.partsSeen.add(part);
    group.entries.push({
      episode,
      part,
      itunesEpisode: getItunesEpisode(episode),
      pubDateValue: getPubDateValue(episode.pubDate),
    });
  }

  const seriesRecords = [];
  const debugSeries = [];

  for (const group of groups.values()) {
    if (group.entries.length < 2) {
      continue;
    }

    const sortedEntries = [...group.entries].sort((a, b) => {
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

    const seriesId = `s_${shortHash(`${group.headKey}::${group.anchorId}`)}`;
    const titleSource = group.headValue || group.headKey.replace(/-/g, ' ');
    const seriesTitle = toTitleCase(titleSource);

    const episodeIds = [];
    for (const entry of sortedEntries) {
      const existing = baseEpisodes.get(entry.episode.id);
      if (!existing) {
        continue;
      }
      existing.part = entry.part;
      existing.seriesId = seriesId;
      delete existing.topicId;
      baseEpisodes.set(entry.episode.id, existing);
      episodeIds.push(entry.episode.id);
    }

    const uniqueEpisodeIds = Array.from(new Set(episodeIds));

    seriesRecords.push({
      id: seriesId,
      title: seriesTitle,
      episodeIds: uniqueEpisodeIds,
      yearFrom: null,
      yearTo: null,
      provisional: {
        head: group.headKey,
      },
    });

    debugSeries.push({
      headKey: group.headKey,
      seriesId,
      parts: sortedEntries.map((entry) => entry.part),
    });
  }

  const updatedEpisodes = Array.from(baseEpisodes.values());
  updatedEpisodes.sort((a, b) => {
    const dateA = getPubDateValue(a.pubDate);
    const dateB = getPubDateValue(b.pubDate);
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    return a.id.localeCompare(b.id);
  });

  seriesRecords.sort((a, b) => a.id.localeCompare(b.id));

  await writeJsonFile('public/episodes.json', updatedEpisodes);
  await writeJsonFile('public/series.json', seriesRecords);
  await writeJsonFile('public/topics.json', []);

  const singletonsCount = updatedEpisodes.reduce((count, episode) => (episode.seriesId ? count : count + 1), 0);

  console.log('Total episodes:', episodes.length);
  console.log('Series (multi-part):', seriesRecords.length);
  console.log('Singletons:', singletonsCount);

  const nelsonSeries = seriesRecords.find(
    (entry) => entry.episodeIds.includes('ep608') && entry.episodeIds.includes('ep609')
  );
  if (nelsonSeries) {
    const parts = nelsonSeries.episodeIds.map((episodeId) => {
      const episode = updatedEpisodes.find((entry) => entry.id === episodeId);
      return typeof episode?.part === 'number' ? episode.part : null;
    });
    console.log(
      `Nelson sanity: series ${nelsonSeries.id} episodeCount=${nelsonSeries.episodeIds.length} episodes=[${nelsonSeries.episodeIds.join(
        ', '
      )}] parts=[${parts.join(', ')}]`
    );
  } else {
    console.log('Nelson sanity: no series found for episodes ep608 and ep609');
  }

  const preview = debugSeries.slice(0, 10);
  for (const entry of preview) {
    console.log(` - ${entry.headKey}: ${entry.seriesId} parts=[${entry.parts.join(', ')}]`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
