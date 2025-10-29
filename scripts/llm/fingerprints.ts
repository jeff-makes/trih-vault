import { stableHash } from "../../lib/hash";
export function epFingerprint(title: string, description?: string) {
  return stableHash(`${title}||${description ?? ""}`);
}
export function seriesFingerprint(baseTitle: string, childTitles: string[]) {
  return stableHash(`${baseTitle}|${[...childTitles].join("|")}`);
}
