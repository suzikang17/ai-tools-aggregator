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
