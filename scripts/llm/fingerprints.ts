import { stableHash } from "../../lib/hash.ts";

export function epFingerprint(title, description) {
  return stableHash(`${title}||${description ?? ""}`);
}

export function seriesFingerprint(baseTitle, childTitles) {
  return stableHash(`${baseTitle}|${[...childTitles].join("|")}`);
}
