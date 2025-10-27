import { XMLParser } from 'fast-xml-parser';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RSS_URL = 'https://feeds.megaphone.fm/GLT4787413333';

async function fetchRSS() {
  console.log('Fetching RSS feed...');
  const response = await fetch(RSS_URL);
  const xml = await response.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const result = parser.parse(xml);
  const items = result?.rss?.channel?.item || [];

  const rssItems = items
    .map((item) => {
      const episodeNum = item['itunes:episode'] || item['itunes:episodeNumber'];
      const title = item['itunes:title'] || item.title;
      const enclosure = item.enclosure;
      const audio = enclosure?.['@_url'] || null;
      const duration = item['itunes:duration'] || null;

      if (!episodeNum || !title) {
        return null;
      }

      let description = item.description || item['itunes:summary'] || '';
      description = description.replace(/<[^>]*>/g, '').trim();

      return {
        episode: parseInt(episodeNum, 10),
        title,
        pubDate: item.pubDate || '',
        description,
        duration,
        audio,
      };
    })
    .filter((item) => item !== null && !isNaN(item.episode));

  console.log(`Parsed ${rssItems.length} episodes from RSS`);
  return rssItems;
}

function readCSV() {
  console.log('Reading CSV...');
  const csvPath = path.join(__dirname, '..', 'data', 'trih_episode_list.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const csvRows = [];

  for (const record of records) {
    const episodeValue = record.Episode || record.episode;

    if (!episodeValue || episodeValue === '#VALUE!') {
      continue;
    }

    const episodeNum = parseInt(episodeValue, 10);
    if (isNaN(episodeNum)) {
      continue;
    }

    const era = (record['Time Period'] || record.era || '').trim();
    const region = (record.Region || record.region || '').trim();
    const title = (record.Title || record.title || '').trim();

    if (!era && !region) {
      continue;
    }

    csvRows.push({
      episode: episodeNum,
      title: title || undefined,
      era,
      region,
    });
  }

  console.log(`Parsed ${csvRows.length} rows from CSV`);
  return csvRows;
}

function joinData(rssItems, csvRows) {
  console.log('Joining datasets...');
  const csvByEpisode = new Map();

  for (const row of csvRows) {
    const existing = csvByEpisode.get(row.episode) || [];
    existing.push(row);
    csvByEpisode.set(row.episode, existing);
  }

  const episodes = rssItems.map((item) => {
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

  console.log(`Created ${episodes.length} merged episodes`);
  return episodes;
}

async function main() {
  try {
    const rssItems = await fetchRSS();
    const csvRows = readCSV();
    const episodes = joinData(rssItems, csvRows);

    const outputPath = path.join(__dirname, '..', 'public', 'episodes.json');
    fs.writeFileSync(outputPath, JSON.stringify(episodes, null, 2));

    console.log(`✅ Successfully wrote ${episodes.length} episodes to public/episodes.json`);
  } catch (error) {
    console.error('❌ Error building dataset:', error);
    process.exit(1);
  }
}

main();
