import type { Episode, RSSItem, CSVRow } from './types';

export function joinData(rssItems: RSSItem[], csvRows: CSVRow[]): Episode[] {
  const csvByEpisode = new Map<number, CSVRow[]>();

  for (const row of csvRows) {
    const existing = csvByEpisode.get(row.episode) || [];
    existing.push(row);
    csvByEpisode.set(row.episode, existing);
  }

  const episodes: Episode[] = rssItems.map((item) => {
    const csvData = csvByEpisode.get(item.episode) || [];

    const eras = Array.from(
      new Set(csvData.map((r) => r.era).filter((e) => e))
    ).sort();

    const regions = Array.from(
      new Set(csvData.map((r) => r.region).filter((r) => r))
    ).sort();

    const title_sheet = csvData.find((r) => r.title)?.title || null;

    return {
      episode: item.episode,
      title_feed: item.title,
      title_sheet,
      pubDate: item.pubDate,
      description: item.description,
      duration: item.duration,
      audio: item.audio,
      eras,
      regions,
    };
  });

  episodes.sort((a, b) => b.episode - a.episode);

  return episodes;
}
