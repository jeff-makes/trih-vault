"use client";

import { Fragment, useState } from 'react';
import type { TimelineItem, UndatedEpisode } from './buildTimeline';

type TimelineProps = {
  items: TimelineItem[];
  undatedEpisodes: UndatedEpisode[];
};

export function Timeline(props: TimelineProps) {
  const { items, undatedEpisodes } = props;
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  const toggleSeries = (id: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const hasTimelineContent = items.length > 0;
  const hasUndated = undatedEpisodes.length > 0;

  let timelineContent: JSX.Element | null = <p>No timeline content with year data yet.</p>;

  const getPeriodId = (yearValue: number | null): string | null => {
    if (yearValue === null) {
      return null;
    }
    if (yearValue <= 476) return 'antiquity';
    if (yearValue <= 800) return 'late-antiquity';
    if (yearValue <= 1500) return 'middle-ages';
    if (yearValue <= 1800) return 'early-modern';
    if (yearValue <= 1900) return 'c19';
    if (yearValue <= 2000) return 'c20';
    return 'c21';
  };

  if (hasTimelineContent) {
    const renderedBuckets = new Set<string>();
    const timelineNodes = items.map((item, index) => {
      const key = `${item.kind}-${item.id}`;
      const baseStyle = index === 0 ? undefined : { marginTop: `${item.offset}px` };
      const hasYearValue = typeof item.yearValue === 'number' && !Number.isNaN(item.yearValue);
      const periodId = hasYearValue ? getPeriodId(item.yearValue as number) : null;
      const anchors: React.ReactNode[] = [];
      if (periodId && !renderedBuckets.has(periodId)) {
        renderedBuckets.add(periodId);
        anchors.push(<div key={`anchor-${periodId}`} id={`bucket-${periodId}`} />);
      }

      if (item.kind === 'episode') {
        return (
          <Fragment key={key}>
            {anchors}
            <div className="timeline__entry" style={baseStyle}>
              <span className="timeline__marker" aria-hidden />
              <div className="timeline__card">
                <div className="timeline__year">{item.yearLabel}</div>
                <div className="timeline__title">{item.title}</div>
              </div>
            </div>
          </Fragment>
        );
      }

      const isExpanded = expandedSeries.has(item.id);
      const partsCount = item.episodeCount ?? item.episodes.length;
      const partsLabel = `${partsCount} part${partsCount === 1 ? '' : 's'}`;

      return (
        <Fragment key={key}>
          {anchors}
          <div className="timeline__entry timeline__entry--series" style={baseStyle}>
            <span className="timeline__marker timeline__marker--series" aria-hidden />
            <div className="timeline__card timeline__card--series">
              <div className="timeline__year">{item.yearLabel}</div>
              <button
                type="button"
                className="timeline__series-toggle"
                onClick={() => toggleSeries(item.id)}
                aria-expanded={isExpanded}
              >
                <span className="timeline__title-group">
                  <span className="timeline__title">{item.title}</span>
                  <span className="timeline__meta timeline__meta--series">{partsLabel}</span>
                </span>
                <span className="timeline__series-toggle-icon">{isExpanded ? '−' : '+'}</span>
              </button>

              {isExpanded ? (
                <ul className="timeline__series-list">
                  {item.episodes.map((episode) => (
                    <li key={episode.id} className="timeline__series-episode">
                      <div className="timeline__series-episode-title">
                        {episode.title}
                        {episode.partLabel ? <span className="timeline__series-part">{episode.partLabel}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Fragment>
      );
    });

    timelineContent = <div className="timeline">{timelineNodes}</div>;
  }

  return (
    <>
      <section>
        <h2>Timeline (alpha)</h2>
        {timelineContent}
      </section>

      {hasUndated ? (
        <section id="bucket-undated" className="undated-section">
          <h2>Undated Episodes</h2>
          <p>Items without a usable year range. We will revisit once we have a better strategy.</p>
          <ul className="undated-list">
            {undatedEpisodes.map((episode) => (
              <li key={episode.id} className="undated-item">
                <div className="undated-item__title">{episode.title}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
