import { beforeEach, describe, expect, it } from "vitest";

import { resetDataCaches } from "@/lib/data";
import { getPlacesIndex, getTopPlacesForSeries, resetPlacesIndex } from "@/lib/indexes/places";

describe("places index", () => {
  beforeEach(() => {
    resetDataCaches();
    resetPlacesIndex();
  });

  it("builds an index of places", () => {
    const index = getPlacesIndex();
    expect(index.size).toBeGreaterThan(0);
  });

  it("returns top places for a series", () => {
    const top = getTopPlacesForSeries("hitler-with-ian-kershaw-20210614", 3);
    expect(Array.isArray(top)).toBe(true);
  });
});
