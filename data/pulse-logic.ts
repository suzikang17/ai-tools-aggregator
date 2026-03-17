import type { TrackedTool, WeeklySnapshot } from "./market-pulse-schema";
import type { Tool } from "./schema";

export function calculatePopularityScore(
  buzzScore: number | null,
  reviewRating: number | null,
  sourceCount: number,
  isTrending: boolean,
): number {
  const buzz = (buzzScore ?? 0) * 0.4;
  const rating = ((reviewRating ?? 0) / 5 * 100) * 0.3;
  const sources = (Math.min(sourceCount, 10) / 10 * 100) * 0.2;
  const trending = isTrending ? 10 : 0;
  return Math.round(buzz + rating + sources + trending);
}

export function calculateSentimentTrend(
  currentScore: number,
  history: WeeklySnapshot[],
): "up" | "down" | "stable" | null {
  if (history.length < 2) return null;

  const recent = history
    .slice(-4)
    .filter((h) => h.popularityScore != null);

  if (recent.length < 2) return null;

  const avg = recent.reduce((sum, h) => sum + h.popularityScore!, 0) / recent.length;

  if (currentScore > avg * 1.05) return "up";
  if (currentScore < avg * 0.95) return "down";
  return "stable";
}

export function getISOWeek(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function takeSnapshot(tool: TrackedTool, week: string): TrackedTool {
  const snapshot: WeeklySnapshot = {
    week,
    buzzScore: tool.buzzScore,
    reviewRating: tool.reviewRating,
    popularityScore: tool.popularityScore,
  };

  const existingIndex = tool.history.findIndex((h) => h.week === week);
  if (existingIndex >= 0) {
    tool.history[existingIndex] = snapshot;
  } else {
    tool.history.push(snapshot);
  }

  return tool;
}

export function trimHistory(history: WeeklySnapshot[], max: number = 52): WeeklySnapshot[] {
  if (history.length <= max) return history;
  return history.slice(history.length - max);
}

export function assignRanks(tools: TrackedTool[]): TrackedTool[] {
  const scored = tools.filter((t) => t.popularityScore != null);
  const unscored = tools.filter((t) => t.popularityScore == null);

  scored.sort((a, b) => b.popularityScore! - a.popularityScore!);

  let currentRank = 1;
  for (let i = 0; i < scored.length; i++) {
    if (i > 0 && scored[i].popularityScore !== scored[i - 1].popularityScore) {
      currentRank = currentRank + 1;
    }
    scored[i].rank = currentRank;
  }

  for (const tool of unscored) {
    tool.rank = null;
  }

  return [...scored, ...unscored];
}

export function checkGraduation(tool: Tool): boolean {
  return (
    tool.buzzScore != null &&
    tool.buzzScore >= 60 &&
    tool.reviewRating != null &&
    tool.reviewRating >= 3.5 &&
    tool.sourceUrls.length >= 3
  );
}
