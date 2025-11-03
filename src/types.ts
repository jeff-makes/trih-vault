export type YearConfidence = "high" | "medium" | "low" | "unknown";

export interface SourceMetadata {
  guid: string;
  itunesEpisode: number | null;
  megaphoneId: string | null;
  enclosureUrl: string;
}

export interface RawEpisode {
  episodeId: string;
  title: string;
  publishedAt: string;
  description: string;
  audioUrl: string;
  rssLastSeenAt: string;
  source: SourceMetadata;
}

export interface ProgrammaticEpisodeCredits {
  producer?: string[];
  seniorProducer?: string[];
  execProducer?: string[];
  researcher?: string[];
  assistantProducer?: string[];
  editor?: string[];
  soundDesign?: string[];
  [key: string]: string[] | undefined;
}

export interface ProgrammaticEpisodeDerived {
  episodeCount?: number;
  subjectTags?: string[];
  [key: string]: unknown;
}

export interface ProgrammaticEpisode {
  episodeId: string;
  title: string;
  publishedAt: string;
  description: string;
  audioUrl: string;
  cleanTitle: string;
  cleanDescriptionMarkdown: string;
  cleanDescriptionText: string;
  descriptionBlocks: string[];
  credits?: ProgrammaticEpisodeCredits;
  fingerprint: string;
  cleanupVersion: number;
  derived?: ProgrammaticEpisodeDerived;
  part: number | null;
  seriesId: string | null;
  seriesKey: string | null;
  seriesKeyRaw: string | null;
  seriesGroupingConfidence: "high" | "medium" | "low";
  rssLastSeenAt: string;
  itunesEpisode?: number | null;
  keyPeople?: string[];
  keyPlaces?: string[];
  keyThemes?: string[];
  yearFrom?: number | null;
  yearTo?: number | null;
  yearConfidence?: YearConfidence;
}

export interface SeriesMembership {
  seriesId: string;
  episodeIds: string[];
}

export interface SeriesProgrammaticDerived {
  episodeCount?: number;
  subjectTags?: string[];
  episodeSummaries?: {
    part: number | null;
    cleanTitle: string;
    cleanDescriptionText: string;
  }[];
  [key: string]: unknown;
}

export interface ProgrammaticSeries {
  seriesId: string;
  seriesKey: string | null;
  seriesKeyRaw: string | null;
  seriesTitleFallback: string;
  seriesGroupingConfidence: "high" | "medium" | "low";
  episodeIds: string[];
  memberEpisodeFingerprints?: string[];
  fingerprint: string;
  yearFrom: number | null;
  yearTo: number | null;
  yearConfidence: YearConfidence;
  derived?: SeriesProgrammaticDerived;
  rssLastSeenAt: string | null;
}

export interface LlmEpisodeCacheEntry {
  episodeId: string;
  fingerprint: string;
  model: string;
  promptVersion: string;
  createdAt: string;
  status: "ok" | "skipped" | "error";
  notes: string | null;
  keyPeople: string[];
  keyPlaces: string[];
  keyThemes: string[];
  yearFrom: number | null;
  yearTo: number | null;
  yearConfidence: YearConfidence;
}

export interface LlmSeriesCacheEntry {
  seriesId: string;
  fingerprint: string;
  model: string;
  promptVersion: string;
  createdAt: string;
  status: "ok" | "skipped" | "error";
  notes: string | null;
  seriesTitle: string | null;
  narrativeSummary: string | null;
  tonalDescriptors?: string[] | null;
  yearFrom: number | null;
  yearTo: number | null;
  yearConfidence: YearConfidence;
}

export interface PublicEpisode {
  id: string;
  episodeId: string;
  title: string;
  slug: string;
  publishedAt: string;
  description: string;
  audioUrl: string;
  rssLastSeenAt: string;
  itunesEpisode: number | null;
  cleanTitle: string;
  cleanDescriptionMarkdown: string;
  cleanDescriptionText: string;
  descriptionBlocks: string[];
  credits?: ProgrammaticEpisodeCredits;
  fingerprint: string;
  cleanupVersion: number;
  derived?: ProgrammaticEpisodeDerived;
  part: number | null;
  seriesId: string | null;
  seriesKey: string | null;
  seriesKeyRaw: string | null;
  seriesGroupingConfidence: "high" | "medium" | "low";
  keyPeople: string[];
  keyPlaces: string[];
  keyThemes: string[];
  yearFrom: number | null;
  yearTo: number | null;
  yearConfidence: YearConfidence;
}

export interface PublicSeries {
  id: string;
  seriesId: string;
  slug: string;
  seriesKey: string | null;
  seriesKeyRaw: string | null;
  seriesGroupingConfidence: "high" | "medium" | "low";
  episodeIds: string[];
  yearFrom: number | null;
  yearTo: number | null;
  yearConfidence: YearConfidence;
  fingerprint: string;
  memberEpisodeFingerprints?: string[];
  derived?: SeriesProgrammaticDerived;
  seriesTitle: string;
  narrativeSummary: string | null;
  tonalDescriptors?: string[] | null;
  rssLastSeenAt: string | null;
}

export interface ErrorLedgerEntry {
  stage: string;
  itemId: string;
  when: string;
  level: "info" | "warn" | "error";
  message: string;
  details: Record<string, unknown> | null;
}

export interface DailyRssSnapshot {
  fetchedAt: string;
  items: unknown[];
}

export interface SlugRegistryEntry {
  type: "episode" | "series";
  id: string;
}

export interface PipelineState {
  rawEpisodes: RawEpisode[];
  programmaticEpisodes: Record<string, ProgrammaticEpisode>;
  programmaticSeries: Record<string, ProgrammaticSeries>;
  episodeLlmCache: Record<string, LlmEpisodeCacheEntry>;
  seriesLlmCache: Record<string, LlmSeriesCacheEntry>;
  publicEpisodes: PublicEpisode[];
  publicSeries: PublicSeries[];
  errors: ErrorLedgerEntry[];
  slugRegistry: Record<string, SlugRegistryEntry>;
}
