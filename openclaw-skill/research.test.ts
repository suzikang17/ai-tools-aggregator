import { describe, it, expect } from "vitest";
import {
  sortSourcesByPriority,
  shouldSkipSource,
  updateQualityScore,
  updateTrendingFlags,
  formatDiscordSummary,
} from "./research";
import type { Source, SourcesData, ToolsData } from "../data/schema";

describe("sortSourcesByPriority", () => {
  it("puts seeds before discovered sources", () => {
    const sources: Source[] = [
      { url: "https://discovered.com", name: "D", type: "discovered", lastChecked: null, toolsFound: 10, timesChecked: 1, qualityScore: 10 },
      { url: "https://seed.com", name: "S", type: "seed", lastChecked: null, toolsFound: 0, timesChecked: 0, qualityScore: 0 },
    ];
    const sorted = sortSourcesByPriority(sources);
    expect(sorted[0].type).toBe("seed");
  });

  it("sorts by quality score within same type", () => {
    const sources: Source[] = [
      { url: "https://a.com", name: "A", type: "discovered", lastChecked: null, toolsFound: 1, timesChecked: 10, qualityScore: 0.1 },
      { url: "https://b.com", name: "B", type: "discovered", lastChecked: null, toolsFound: 5, timesChecked: 5, qualityScore: 1.0 },
    ];
    const sorted = sortSourcesByPriority(sources);
    expect(sorted[0].name).toBe("B");
  });
});

describe("shouldSkipSource", () => {
  it("skips low-quality discovered sources with enough checks", () => {
    const source: Source = { url: "", name: "", type: "discovered", lastChecked: null, toolsFound: 0, timesChecked: 15, qualityScore: 0.05 };
    expect(shouldSkipSource(source)).toBe(true);
  });

  it("does not skip seed sources regardless of score", () => {
    const source: Source = { url: "", name: "", type: "seed", lastChecked: null, toolsFound: 0, timesChecked: 15, qualityScore: 0.01 };
    expect(shouldSkipSource(source)).toBe(false);
  });

  it("does not skip discovered sources with fewer than 10 checks", () => {
    const source: Source = { url: "", name: "", type: "discovered", lastChecked: null, toolsFound: 0, timesChecked: 5, qualityScore: 0 };
    expect(shouldSkipSource(source)).toBe(false);
  });

  it("skips discovered source at exactly 10 checks with low score", () => {
    const source: Source = { url: "", name: "", type: "discovered", lastChecked: null, toolsFound: 0, timesChecked: 10, qualityScore: 0.05 };
    expect(shouldSkipSource(source)).toBe(true);
  });
});

describe("updateQualityScore", () => {
  it("calculates score as toolsFound / timesChecked", () => {
    const source: Source = { url: "", name: "", type: "seed", lastChecked: null, toolsFound: 4, timesChecked: 4, qualityScore: 1 };
    updateQualityScore(source, 2);
    expect(source.timesChecked).toBe(5);
    expect(source.toolsFound).toBe(6);
    expect(source.qualityScore).toBeCloseTo(1.2);
    expect(source.lastChecked).not.toBeNull();
  });
});

describe("updateTrendingFlags", () => {
  it("clears trending after expiry period", () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const tools: ToolsData = {
      metadata: { lastUpdated: null, totalTools: 1, trendingCount: 1 },
      tools: [{
        name: "OldTool", url: "", category: "Coding", description: "",
        features: [], pricing: "", dateAdded: "", dateUpdated: eightDaysAgo.toISOString(),
        trending: true, sourceUrls: [],
      }],
    };
    updateTrendingFlags(tools);
    expect(tools.tools[0].trending).toBe(false);
  });

  it("keeps trending within expiry period", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const tools: ToolsData = {
      metadata: { lastUpdated: null, totalTools: 1, trendingCount: 1 },
      tools: [{
        name: "NewTool", url: "", category: "Coding", description: "",
        features: [], pricing: "", dateAdded: "", dateUpdated: twoDaysAgo.toISOString(),
        trending: true, sourceUrls: [],
      }],
    };
    updateTrendingFlags(tools);
    expect(tools.tools[0].trending).toBe(true);
  });
});

describe("formatDiscordSummary", () => {
  it("formats summary with new tools", () => {
    const result = {
      newTools: [{ name: "ToolA", category: "Coding" }] as any[],
      updatedTools: ["ToolB"],
      newSources: [],
      pagesVisited: 10,
    };
    const msg = formatDiscordSummary(result);
    expect(msg).toContain("Found 1 new tools");
    expect(msg).toContain("**ToolA** (Coding)");
    expect(msg).toContain("Updated 1 existing tools");
    expect(msg).toContain("Visited 10 pages");
  });

  it("formats empty run", () => {
    const result = { newTools: [], updatedTools: [], newSources: [], pagesVisited: 5 };
    const msg = formatDiscordSummary(result);
    expect(msg).toBe("Visited 5 pages. Site updated.");
  });
});
