export interface BuzzSource {
  platform: string;            // "Reddit", "HN", "Product Hunt", "X/Twitter", etc.
  mentions?: number;
  sentiment?: string;          // "positive", "mixed", "negative", "neutral"
  detail?: string;             // freeform, e.g. "2 threads, 145 comments"
}

export interface RatingSource {
  platform: string;            // "G2", "Product Hunt", "Capterra", "TrustRadius"
  rating: number;
  reviewCount?: number;
}

export interface WeeklySnapshot {
  week: string;                // ISO week: "2026-W12"
  buzzScore: number | null;
  reviewRating: number | null;
  popularityScore: number | null;
}

export interface TrackedTool {
  name: string;
  url: string;
  category: string;
  description: string;
  pricing: string;

  buzzScore: number | null;
  reviewRating: number | null;
  popularityScore: number | null;
  rank: number | null;

  sentimentTrend: "up" | "down" | "stable" | null;

  parentPlatform?: string;         // e.g. "Google Labs", "Microsoft Azure AI"

  buzzSources?: BuzzSource[];
  ratingSources?: RatingSource[];

  history: WeeklySnapshot[];

  dateTracked: string;
  lastRefreshed: string | null;
  sourceCount: number;
}

export interface MarketPulseData {
  metadata: {
    lastRefreshed: string | null;
    totalTracked: number;
  };
  tools: TrackedTool[];
}
