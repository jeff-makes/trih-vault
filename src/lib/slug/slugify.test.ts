import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("transliterates accents and lowercases", () => {
    expect(slugify("Québec L'été Rouge")).toBe("quebec-lete-rouge");
  });

  it("removes stop words", () => {
    expect(slugify("The Battle of the Nile")).toBe("battle-nile");
  });

  it("preserves intra-word hyphens", () => {
    expect(slugify("Women's March")).toBe("women-march");
  });

  it("drops punctuation and trim duplicates", () => {
    expect(slugify("Attack!!! -- the French???")).toBe("attack-french");
  });

  it("collapses possessive to base noun", () => {
    expect(slugify("Hitler’s War")).toBe("hitler-war");
  });

  it("returns empty string when only stop words remain", () => {
    expect(slugify("The And Of")).toBe("");
  });
});
