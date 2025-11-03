import { beforeEach, describe, expect, it } from "vitest";

import { getAllEpisodes, resetDataCaches } from "@/lib/data";
import { getPeopleIndex, getPeopleForEpisode, getTopPeopleForSeries, resetPeopleIndex } from "@/lib/indexes/people";

describe("people index", () => {
  beforeEach(() => {
    resetDataCaches();
    resetPeopleIndex();
  });

  it("builds a reusable index", () => {
    const index = getPeopleIndex();
    expect(index.size).toBeGreaterThan(0);

    const entry = index.get("Adolf Hitler");
    expect(entry?.appearances).toBeGreaterThan(0);
  });

  it("returns top people for a series", () => {
    const top = getTopPeopleForSeries("hitler-with-ian-kershaw-20210614", 3);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].count).toBeGreaterThan(0);
  });

  it("lists people for an episode", () => {
    const episode = getAllEpisodes().find((item) => item.keyPeople.length > 0);
    expect(episode).toBeDefined();

    const people = getPeopleForEpisode(episode!.episodeId);
    expect(people.length).toBeGreaterThan(0);
    expect(people[0].name).toBeDefined();
  });
});
