const LEADING_NUMBER_REGEX = /^\s*\d+[\.\)\-:]*\s*/;
const PART_SUFFIX_REGEX = /\s*\(?(?:part|episode)\s+(\d+)\)?\s*$/i;
const TRAILING_PUNCTUATION_REGEX = /[\s:\-–—]+$/;

export interface PartExtractionResult {
  title: string;
  partNumber: number | null;
}

/**
 * Removes a leading numeric identifier such as "613. " or "42) ".
 */
export const stripLeadingNumber = (title: string): string => {
  if (!title) {
    return "";
  }

  return title.replace(LEADING_NUMBER_REGEX, "");
};

/**
 * Extracts a trailing part/episode marker and returns the remaining title plus the parsed part number.
 */
export const extractPartNumber = (title: string): PartExtractionResult => {
  if (!title) {
    return { title: "", partNumber: null };
  }

  const match = title.match(PART_SUFFIX_REGEX);
  if (!match) {
    return {
      title: title.trim().replace(TRAILING_PUNCTUATION_REGEX, ""),
      partNumber: null
    };
  }

  const partNumber = Number.parseInt(match[1], 10);
  const trimmed = title.slice(0, match.index ?? title.length).trim().replace(TRAILING_PUNCTUATION_REGEX, "");

  return {
    title: trimmed,
    partNumber: Number.isNaN(partNumber) ? null : partNumber
  };
};

/**
 * Returns the subtitle section after the first colon, or the full title when no colon is present.
 */
export const deriveSubtitleSource = (title: string): string => {
  if (!title) {
    return "";
  }

  const colonIndex = title.indexOf(":");
  if (colonIndex === -1) {
    return title.trim();
  }

  return title.slice(colonIndex + 1).trim();
};
