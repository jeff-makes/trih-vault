import { STOP_WORDS } from "./constants";

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const TYPOGRAPHIC_DASH_REGEX = /[\u2012-\u2015]/g; // various dash forms
const TYPOGRAPHIC_QUOTE_REGEX = /[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F]/g;
const NON_ALLOWED_CHAR_REGEX = /[^a-z0-9\s-]/g;

/**
 * Converts arbitrary text into a lowercase hyphenated slug while preserving intra-word hyphens.
 * Stop words are removed, but token budgeting is handled by callers.
 */
export const slugify = (input: string): string => {
  if (!input) {
    return "";
  }

  const normalized = input.normalize("NFKD").replace(DIACRITICS_REGEX, "");

  const lower = normalized.toLowerCase();
  const possessiveNormalized = lower.replace(/([a-z0-9]{2,})['’]s\b/g, "$1");
  const demashed = possessiveNormalized.replace(TYPOGRAPHIC_DASH_REGEX, " ");
  const dequoted = demashed.replace(TYPOGRAPHIC_QUOTE_REGEX, "");

  // Remove apostrophes while keeping hyphenated compounds intact.
  const apostropheStripped = dequoted.replace(/['’]/g, "");
  const cleaned = apostropheStripped.replace(NON_ALLOWED_CHAR_REGEX, " ");

  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => !STOP_WORDS.has(token));

  if (tokens.length === 0) {
    return "";
  }

  return tokens.join("-").replace(/-+/g, "-");
};

export default slugify;
