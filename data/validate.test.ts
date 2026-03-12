import { describe, it, expect } from "vitest";
import { validateTool, normalizeDomain, isDuplicate } from "./validate";

describe("validateTool", () => {
  it("accepts a valid tool", () => {
    const tool = {
      name: "TestTool",
      url: "https://testtool.com",
      category: "Coding",
      description: "A test tool",
      features: ["feature1"],
      pricing: "Free",
      dateAdded: "2026-03-12",
      dateUpdated: "2026-03-12",
      trending: false,
      sourceUrls: ["https://producthunt.com/posts/testtool"],
    };
    expect(validateTool(tool)).toBe(true);
  });

  it("rejects a tool missing required fields", () => {
    const tool = { name: "TestTool" };
    expect(validateTool(tool)).toBe(false);
  });

  it("rejects null input", () => {
    expect(validateTool(null)).toBe(false);
  });

  it("rejects tool with null field values", () => {
    const tool = {
      name: null, url: null, category: null, description: null,
      features: null, pricing: null, dateAdded: null, dateUpdated: null,
      trending: null, sourceUrls: null,
    };
    expect(validateTool(tool)).toBe(false);
  });
});

describe("normalizeDomain", () => {
  it("strips www prefix", () => {
    expect(normalizeDomain("https://www.example.com/page")).toBe("example.com");
  });

  it("strips www but preserves other subdomains", () => {
    expect(normalizeDomain("https://app.example.com")).toBe("app.example.com");
  });

  it("handles plain domain", () => {
    expect(normalizeDomain("https://example.com")).toBe("example.com");
  });

  it("handles multi-part TLDs", () => {
    expect(normalizeDomain("https://www.example.co.uk")).toBe("example.co.uk");
  });
});

describe("isDuplicate", () => {
  const existing = [
    { name: "TestTool", url: "https://testtool.com", category: "Coding", description: "", features: [], pricing: "", dateAdded: "", dateUpdated: "", trending: false, sourceUrls: [] },
  ];

  it("detects duplicate by name + domain", () => {
    expect(isDuplicate({ name: "TestTool", url: "https://www.testtool.com" }, existing)).toBe(true);
  });

  it("detects duplicate case-insensitive", () => {
    expect(isDuplicate({ name: "testtool", url: "https://testtool.com" }, existing)).toBe(true);
  });

  it("allows different tools", () => {
    expect(isDuplicate({ name: "OtherTool", url: "https://othertool.com" }, existing)).toBe(false);
  });

  it("does not flag same name on different domain as duplicate", () => {
    expect(isDuplicate({ name: "TestTool", url: "https://otherdomain.com" }, existing)).toBe(false);
  });

  it("does not flag same domain with different name as duplicate", () => {
    expect(isDuplicate({ name: "DifferentTool", url: "https://testtool.com" }, existing)).toBe(false);
  });
});
