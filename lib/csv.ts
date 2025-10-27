import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import type { CSVRow } from './types';

export function readCSV(): CSVRow[] {
  const csvPath = path.join(process.cwd(), 'data', 'trih_episode_list.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const csvRows: CSVRow[] = [];

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

  return csvRows;
}
