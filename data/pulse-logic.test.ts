import { describe, it, expect } from "vitest";
import {
  calculatePopularityScore,
  calculateSentimentTrend,
  getISOWeek,
  takeSnapshot,
  trimHistory,
  assignRanks,
  checkGraduation,
} from "./pulse-logic";
import type { TrackedTool, WeeklySnapshot } from "./market-pulse-schema";
import type { Tool } from "./schema";

function makeTool(overrides: Partial<TrackedTool> = {}): TrackedTool {
  return {
    name: "TestTool", url: "https://test.com", category: "Coding",
    description: "A test tool", pricing: "Free",
    buzzScore: null, reviewRating: null, popularityScore: null, rank: null,
    sentimentTrend: null, history: [], dateTracked: "2026-01-01T00:00:00Z",
    lastRefreshed: null, sourceCount: 0,
    ...overrides,
  };
}

describe("calculatePopularityScore", () => {
  it("returns 0 when all inputs are null/zero", () => {
    expect(calculatePopularityScore(null, null, 0, false)).toBe(0);
  });

  it("calculates weighted score correctly", () => {
    // buzz: 80 * 0.4 = 32
    // rating: (4.0/5*100) * 0.3 = 24
    // sources: (5/10*100) * 0.2 = 10
    // trending: 10
    // total: 76
    expect(calculatePopularityScore(80, 4.0, 5, true)).toBe(76);
  });

  it("caps source count at 10", () => {
    const withTen = calculatePopularityScore(0, null, 10, false);
    const withTwenty = calculatePopularityScore(0, null, 20, false);
    expect(withTen).toBe(withTwenty);
  });

  it("handles null buzzScore", () => {
    expect(calculatePopularityScore(null, 5.0, 0, false)).toBe(30);
  });

  it("handles null reviewRating", () => {
    expect(calculatePopularityScore(100, null, 0, false)).toBe(40);
  });

  it("adds trending bonus", () => {
    const without = calculatePopularityScore(50, 3.0, 0, false);
    const withTrending = calculatePopularityScore(50, 3.0, 0, true);
    expect(withTrending - without).toBe(10);
  });
});

describe("calculateSentimentTrend", () => {
  it("returns null with fewer than 2 history entries", () => {
    expect(calculateSentimentTrend(50, [{ week: "2026-W10", buzzScore: null, reviewRating: null, popularityScore: 40 }])).toBeNull();
  });

  it("returns 'up' when current is >5% above 4-week average", () => {
    const history: WeeklySnapshot[] = [
      { week: "2026-W07", buzzScore: null, reviewRating: null, popularityScore: 50 },
      { week: "2026-W08", buzzScore: null, reviewRating: null, popularityScore: 50 },
      { week: "2026-W09", buzzScore: null, reviewRating: null, popularityScore: 50 },
      { week: "2026-W10", buzzScore: null, reviewRating: null, popularityScore: 50 },
    ];
    expect(calculateSentimentTrend(60, history)).toBe("up");
  });

  it("returns 'down' when current is >5% below 4-week average", () => {
    const history: WeeklySnapshot[] = [
      { week: "2026-W07", buzzScore: null, reviewRating: null, popularityScore: 80 },
      { week: "2026-W08", buzzScore: null, reviewRating: null, popularityScore: 80 },
      { week: "2026-W09", buzzScore: null, reviewRating: null, popularityScore: 80 },
      { week: "2026-W10", buzzScore: null, reviewRating: null, popularityScore: 80 },
    ];
    expect(calculateSentimentTrend(70, history)).toBe("down");
  });

  it("returns 'stable' when within 5%", () => {
    const history: WeeklySnapshot[] = [
      { week: "2026-W09", buzzScore: null, reviewRating: null, popularityScore: 50 },
      { week: "2026-W10", buzzScore: null, reviewRating: null, popularityScore: 50 },
    ];
    expect(calculateSentimentTrend(51, history)).toBe("stable");
  });

  it("uses only last 4 weeks of history", () => {
    const history: WeeklySnapshot[] = [
      { week: "2026-W05", buzzScore: null, reviewRating: null, popularityScore: 10 },
      { week: "2026-W06", buzzScore: null, reviewRating: null, popularityScore: 10 },
      { week: "2026-W07", buzzScore: null, reviewRating: null, popularityScore: 80 },
      { week: "2026-W08", buzzScore: null, reviewRating: null, popularityScore: 80 },
      { week: "2026-W09", buzzScore: null, reviewRating: null, popularityScore: 80 },
      { week: "2026-W10", buzzScore: null, reviewRating: null, popularityScore: 80 },
    ];
    // 4-week avg = 80, current = 82, within 5% → stable
    expect(calculateSentimentTrend(82, history)).toBe("stable");
  });
});

describe("getISOWeek", () => {
  it("returns correct ISO week string", () => {
    const date = new Date("2026-03-16");
    expect(getISOWeek(date)).toBe("2026-W12");
  });
});

describe("takeSnapshot", () => {
  it("adds a new snapshot", () => {
    const tool = makeTool({ buzzScore: 80, reviewRating: 4.0, popularityScore: 70 });
    const result = takeSnapshot(tool, "2026-W12");
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toEqual({
      week: "2026-W12", buzzScore: 80, reviewRating: 4.0, popularityScore: 70,
    });
  });

  it("overwrites existing snapshot for same week", () => {
    const tool = makeTool({
      buzzScore: 90, reviewRating: 4.5, popularityScore: 80,
      history: [{ week: "2026-W12", buzzScore: 70, reviewRating: 3.5, popularityScore: 60 }],
    });
    const result = takeSnapshot(tool, "2026-W12");
    expect(result.history).toHaveLength(1);
    expect(result.history[0].buzzScore).toBe(90);
  });
});

describe("trimHistory", () => {
  it("trims to max 52 entries, keeping newest", () => {
    const history: WeeklySnapshot[] = Array.from({ length: 55 }, (_, i) => ({
      week: `2026-W${String(i + 1).padStart(2, "0")}`,
      buzzScore: null, reviewRating: null, popularityScore: i,
    }));
    const trimmed = trimHistory(history);
    expect(trimmed).toHaveLength(52);
    expect(trimmed[0].week).toBe("2026-W04"); // oldest 3 trimmed
  });

  it("does nothing when under 52", () => {
    const history: WeeklySnapshot[] = [
      { week: "2026-W10", buzzScore: null, reviewRating: null, popularityScore: 50 },
    ];
    expect(trimHistory(history)).toHaveLength(1);
  });
});

describe("assignRanks", () => {
  it("assigns ranks by popularity score descending", () => {
    const tools = [
      makeTool({ name: "A", popularityScore: 90 }),
      makeTool({ name: "B", popularityScore: 70 }),
      makeTool({ name: "C", popularityScore: 80 }),
    ];
    const ranked = assignRanks(tools);
    expect(ranked.find((t) => t.name === "A")!.rank).toBe(1);
    expect(ranked.find((t) => t.name === "C")!.rank).toBe(2);
    expect(ranked.find((t) => t.name === "B")!.rank).toBe(3);
  });

  it("uses dense ranking for ties", () => {
    const tools = [
      makeTool({ name: "A", popularityScore: 90 }),
      makeTool({ name: "B", popularityScore: 90 }),
      makeTool({ name: "C", popularityScore: 80 }),
    ];
    const ranked = assignRanks(tools);
    expect(ranked.find((t) => t.name === "A")!.rank).toBe(1);
    expect(ranked.find((t) => t.name === "B")!.rank).toBe(1);
    expect(ranked.find((t) => t.name === "C")!.rank).toBe(2);
  });

  it("handles null popularity scores", () => {
    const tools = [
      makeTool({ name: "A", popularityScore: 50 }),
      makeTool({ name: "B", popularityScore: null }),
    ];
    const ranked = assignRanks(tools);
    expect(ranked.find((t) => t.name === "A")!.rank).toBe(1);
    expect(ranked.find((t) => t.name === "B")!.rank).toBeNull();
  });
});

describe("checkGraduation", () => {
  it("graduates tool meeting all criteria", () => {
    const tool = {
      name: "GoodTool", url: "https://good.com", category: "Coding",
      description: "", features: [], pricing: "Free",
      dateAdded: "", dateUpdated: "", trending: false,
      sourceUrls: ["a", "b", "c"], buzzScore: 70, reviewRating: 4.0,
    } as Tool;
    expect(checkGraduation(tool)).toBe(true);
  });

  it("rejects tool with low buzz", () => {
    const tool = {
      name: "LowBuzz", url: "https://low.com", category: "Coding",
      description: "", features: [], pricing: "Free",
      dateAdded: "", dateUpdated: "", trending: false,
      sourceUrls: ["a", "b", "c"], buzzScore: 50, reviewRating: 4.0,
    } as Tool;
    expect(checkGraduation(tool)).toBe(false);
  });

  it("rejects tool with null buzzScore", () => {
    const tool = {
      name: "NullBuzz", url: "https://null.com", category: "Coding",
      description: "", features: [], pricing: "Free",
      dateAdded: "", dateUpdated: "", trending: false,
      sourceUrls: ["a", "b", "c"], buzzScore: null, reviewRating: 4.0,
    } as Tool;
    expect(checkGraduation(tool)).toBe(false);
  });

  it("rejects tool with fewer than 3 sources", () => {
    const tool = {
      name: "FewSources", url: "https://few.com", category: "Coding",
      description: "", features: [], pricing: "Free",
      dateAdded: "", dateUpdated: "", trending: false,
      sourceUrls: ["a", "b"], buzzScore: 80, reviewRating: 4.5,
    } as Tool;
    expect(checkGraduation(tool)).toBe(false);
  });
});
