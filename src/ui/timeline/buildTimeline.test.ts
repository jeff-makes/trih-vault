import { describe, expect, it } from 'vitest';
import { buildTimeline, type RawEpisodeInput, type RawSeriesInput } from './buildTimeline';

const baseEpisode = (overrides: Partial<RawEpisodeInput>): RawEpisodeInput => ({
  id: 'episode',
  cleanTitle: 'Episode',
  yearFrom: null,
  yearTo: null,
  seriesId: null,
  part: null,
  publishedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
});

describe('buildTimeline', () => {
  it('orders standalone episodes chronologically and computes proportional offsets', () => {
    const episodes: RawEpisodeInput[] = [
      baseEpisode({ id: 'ep-1066', cleanTitle: '1066', yearFrom: 1066 }),
      baseEpisode({ id: 'ep-1492', cleanTitle: '1492', yearFrom: 1492 }),
      baseEpisode({ id: 'ep-44bc', cleanTitle: '44 BC', yearFrom: -44 })
    ];

    const { items } = buildTimeline({
      episodes,
      series: [],
      yearPixelMultiplier: 1,
      minGapPx: 0
    });

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ id: 'ep-44bc', yearValue: -44, offset: 0 });
    expect(items[1]).toMatchObject({ id: 'ep-1066', yearValue: 1066, offset: 1110 });
    expect(items[2]).toMatchObject({ id: 'ep-1492', yearValue: 1492, offset: 426 });
  });

  it('applies the minimum gap when year differences are small', () => {
    const episodes: RawEpisodeInput[] = [
      baseEpisode({ id: 'ep-1900', cleanTitle: '1900', yearFrom: 1900 }),
      baseEpisode({ id: 'ep-1905', cleanTitle: '1905', yearFrom: 1905 })
    ];

    const { items } = buildTimeline({
      episodes,
      series: [],
      yearPixelMultiplier: 1,
      minGapPx: 20
    });

    expect(items[0].offset).toBe(0);
    expect(items[1].offset).toBe(20);
  });

  it('derives series year ranges and produces undated standalone list', () => {
    const seriesEpisodes: RawEpisodeInput[] = [
      baseEpisode({
        id: 'part-1',
        cleanTitle: 'Episode One',
        yearFrom: 1914,
        seriesId: 'series-ww1',
        part: 1
      }),
      baseEpisode({
        id: 'part-2',
        cleanTitle: 'Episode Two',
        yearTo: 1918,
        seriesId: 'series-ww1',
        part: 2
      })
    ];

    const standaloneEpisodes: RawEpisodeInput[] = [
      baseEpisode({
        id: 'standalone-dated',
        cleanTitle: 'Cold War Recap',
        yearFrom: 1950
      }),
      baseEpisode({
        id: 'standalone-undated',
        cleanTitle: 'Lost Episode',
        publishedAt: '2024-02-01T12:00:00.000Z'
      })
    ];

    const episodes = [...seriesEpisodes, ...standaloneEpisodes];

    const series: RawSeriesInput[] = [
      {
        id: 'series-ww1',
        seriesTitle: 'World War I',
        yearFrom: null,
        yearTo: null,
        episodeCount: 2,
        episodeIds: ['part-1', 'part-2']
      }
    ];

    const { items, undated } = buildTimeline({
      episodes,
      series,
      yearPixelMultiplier: 1,
      minGapPx: 0
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: 'series',
      id: 'series-ww1',
      yearLabel: '1914 – 1918',
      yearValue: 1914,
      episodeCount: 2
    });
    expect(items[0].episodes).toEqual([
      expect.objectContaining({ id: 'part-1', partLabel: 'Part 1', yearLabel: '1914' }),
      expect.objectContaining({ id: 'part-2', partLabel: 'Part 2', yearLabel: '1918' })
    ]);

    expect(items[1]).toMatchObject({
      kind: 'episode',
      id: 'standalone-dated',
      yearLabel: '1950',
      yearValue: 1950
    });

    expect(undated).toEqual([
      { id: 'standalone-undated', title: 'Lost Episode', publishedLabel: 'Published 1 Feb 2024' }
    ]);
  });
});
