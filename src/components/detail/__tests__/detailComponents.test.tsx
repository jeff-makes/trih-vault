import { renderToStaticMarkup } from "react-dom/server";
import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  CollapsibleText,
  EpisodeCard,
  FindAndListen,
  LayoutDetail,
  PillLink,
  QuickFacts,
  RelatedRow
} from "@/components/detail";
import type { PublicEpisode } from "@/types";

vi.mock("next/link", () => {
  return {
    __esModule: true,
    default: ({ href, children, ...rest }: { href: string; children: ReactNode }) =>
      React.createElement("a", { href, ...rest }, children)
  };
});

vi.stubGlobal("React", React);

const sampleEpisode: PublicEpisode = {
  id: "ep-1",
  episodeId: "ep-1",
  slug: "sample-episode",
  title: "Sample Episode",
  publishedAt: "2024-01-01T00:00:00.000Z",
  description: "<p>Sample</p>",
  audioUrl: "https://example.com/audio.mp3",
  rssLastSeenAt: "2024-01-02T00:00:00.000Z",
  itunesEpisode: 42,
  cleanTitle: "Sample Episode",
  cleanDescriptionMarkdown: "Sample description",
  cleanDescriptionText:
    "This is a very long description for testing purposes. It should demonstrate trimming behaviour across the UI.",
  descriptionBlocks: [
    "This is a very long description for testing purposes. It should demonstrate trimming behaviour across the UI."
  ],
  credits: undefined,
  fingerprint: "f".repeat(64),
  cleanupVersion: 1,
  derived: undefined,
  part: 1,
  seriesId: "series-1",
  seriesKey: "series",
  seriesKeyRaw: "Series",
  seriesGroupingConfidence: "high",
  keyPeople: ["Ada Lovelace", "Charles Babbage"],
  keyPlaces: ["London"],
  keyThemes: ["early-computing"],
  keyTopics: [
    { id: "early-computing", label: "Early Computing", slug: "early-computing", isPending: false, notes: null }
  ],
  yearFrom: 1830,
  yearTo: 1843,
  yearConfidence: "medium"
};

describe("detail components", () => {
  it("renders PillLink with href", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PillLink, { href: "/people/ada", variant: "people" }, "Ada Lovelace")
    );
    expect(markup).toContain("href=\"/people/ada\"");
    expect(markup).toContain("Ada Lovelace");
  });

  it("renders EpisodeCard with part badge and pills", () => {
    const markup = renderToStaticMarkup(React.createElement(EpisodeCard, { episode: sampleEpisode }));
    expect(markup).toContain("/episode/sample-episode");
    expect(markup).toContain("Part 1");
    expect(markup).toContain("Ada Lovelace");
  });

  it("renders QuickFacts entries", () => {
    const markup = renderToStaticMarkup(
      React.createElement(QuickFacts, { items: [{ term: "Published", detail: "2024-01-01" }] })
    );
    expect(markup).toContain("Published");
    expect(markup).toContain("2024-01-01");
  });

  it("renders collapsible text with toggle button", () => {
    const longText = Array.from({ length: 8 }, (_, index) => `Paragraph ${index + 1}`).join("\n");
    const markup = renderToStaticMarkup(React.createElement(CollapsibleText, { text: longText }));
    expect(markup).toContain("Show more");
  });

  it("renders related row links", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RelatedRow, {
        title: "Related",
        items: [
          { href: "/episode/second", title: "Second Episode", meta: "Similarity 75%" },
          { href: "/episode/third", title: "Third Episode" }
        ]
      })
    );
    expect(markup).toContain("Related");
    expect(markup).toContain("/episode/second");
  });

  it("renders provider links in FindAndListen", () => {
    const markup = renderToStaticMarkup(React.createElement(FindAndListen, null));
    expect(markup).toContain("Apple Podcasts");
    expect(markup).toContain("Spotify");
  });

  it("renders LayoutDetail with breadcrumbs and footer link", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        LayoutDetail,
        {
          title: "Sample Episode",
          breadcrumbs: [
            { label: "Timeline", href: "/" },
            { label: "Sample Episode", href: "/episode/sample" }
          ],
          meta: React.createElement("span", null, "Meta info")
        },
        React.createElement("p", null, "Body")
      )
    );
    expect(markup).toContain("Sample Episode");
    expect(markup).toContain("href=\"/\"");
    expect(markup).toContain("Back to timeline");
  });
});
