import { describe, it, expect } from "vitest";
import {
  formatNewToolsMessage,
  formatPricingChangeMessage,
  formatTrendingMessage,
  formatStatusMessage,
} from "./notify";

describe("formatNewToolsMessage", () => {
  it("formats multiple new tools", () => {
    const tools = [
      { name: "ToolA", category: "Coding" },
      { name: "ToolB", category: "Writing" },
    ] as any[];
    const msg = formatNewToolsMessage(tools);
    expect(msg).toContain("Found 2 new tools");
    expect(msg).toContain("**ToolA** (Coding)");
    expect(msg).toContain("**ToolB** (Writing)");
  });

  it("returns empty string for no tools", () => {
    expect(formatNewToolsMessage([])).toBe("");
  });
});

describe("formatPricingChangeMessage", () => {
  it("formats pricing change", () => {
    const msg = formatPricingChangeMessage([
      { toolName: "Midjourney", oldPricing: "$30/mo", newPricing: "$20/mo" },
    ]);
    expect(msg).toContain("**Midjourney**");
    expect(msg).toContain("$30/mo");
    expect(msg).toContain("$20/mo");
  });
});

describe("formatTrendingMessage", () => {
  it("formats trending alert", () => {
    const msg = formatTrendingMessage({
      toolName: "ToolX",
      sources: ["Product Hunt", "HN", "Reddit"],
      timeframe: "24 hours",
    });
    expect(msg).toContain("**ToolX**");
    expect(msg).toContain("Product Hunt, HN, Reddit");
  });
});

describe("formatStatusMessage", () => {
  it("formats status with data", () => {
    const msg = formatStatusMessage(247, "2026-03-12T10:00:00Z", 15);
    expect(msg).toContain("247");
    expect(msg).toContain("15");
  });

  it("handles never-run state", () => {
    const msg = formatStatusMessage(0, null, 8);
    expect(msg).toContain("never");
  });
});
