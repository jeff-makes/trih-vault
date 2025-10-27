import { XMLParser } from 'fast-xml-parser';
import type { RSSItem } from './types';

const RSS_URL = 'https://feeds.megaphone.fm/GLT4787413333';

export async function fetchRSS(): Promise<RSSItem[]> {
  const response = await fetch(RSS_URL, {
    next: { revalidate: 43200 },
  });
  const xml = await response.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const result = parser.parse(xml);
  const items = result?.rss?.channel?.item || [];

  const rssItems: RSSItem[] = items
    .map((item: any) => {
      const episodeNum = item['itunes:episode'] || item['itunes:episodeNumber'];
      const title = item['itunes:title'] || item.title;
      const enclosure = item.enclosure;
      const audio = enclosure?.['@_url'] || null;
      const duration = item['itunes:duration'] || null;

      if (!episodeNum || !title) {
        return null;
      }

      let description = item.description || item['itunes:summary'] || '';
      description = stripHtml(description);

      return {
        episode: parseInt(episodeNum, 10),
        title,
        pubDate: item.pubDate || '',
        description,
        duration,
        audio,
      };
    })
    .filter((item: RSSItem | null): item is RSSItem => item !== null && !isNaN(item.episode));

  return rssItems;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}
