#!/usr/bin/env npx tsx
/**
 * CLI for OpenClaw agent to interact with tools data.
 * Called via `exec` from SKILL.md instructions.
 *
 * Commands:
 *   load-sources  - Output prioritized source list as JSON
 *   load-tools    - Output current tools data as JSON
 *   save-tool     - Add/update a tool (reads JSON from stdin)
 *   add-source    - Add a new source URL
 *   update-source - Update source stats after checking (reads JSON from stdin)
 *   status        - Output current stats
 *   commit-push   - Commit and push data changes
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import type { Tool, ToolsData, Source, SourcesData } from "../data/schema";
import { validateTool, isDuplicate, normalizeDomain } from "../data/validate";

const REPO_ROOT = process.env.REPO_ROOT || ".";
const TOOLS_PATH = join(REPO_ROOT, "data/tools.json");
const SOURCES_PATH = join(REPO_ROOT, "data/sources.json");

function loadTools(): ToolsData {
  return JSON.parse(readFileSync(TOOLS_PATH, "utf-8"));
}

function loadSources(): SourcesData {
  return JSON.parse(readFileSync(SOURCES_PATH, "utf-8"));
}

function saveTools(tools: ToolsData): void {
  tools.metadata.lastUpdated = new Date().toISOString();
  tools.metadata.totalTools = tools.tools.length;
  tools.metadata.trendingCount = tools.tools.filter((t) => t.trending).length;
  writeFileSync(TOOLS_PATH, JSON.stringify(tools, null, 2));
}

function saveSources(sources: SourcesData): void {
  writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2));
}

function readStdin(): string {
  return readFileSync("/dev/stdin", "utf-8").trim();
}

const command = process.argv[2];

switch (command) {
  case "load-sources": {
    const sources = loadSources();
    // Sort: seeds first, then by quality score descending
    const sorted = [...sources.sources].sort((a, b) => {
      if (a.type === "seed" && b.type !== "seed") return -1;
      if (b.type === "seed" && a.type !== "seed") return 1;
      return b.qualityScore - a.qualityScore;
    });
    // Filter out low-quality discovered sources
    const filtered = sorted.filter(
      (s) => !(s.type === "discovered" && s.timesChecked >= 10 && s.qualityScore < 0.1)
    );
    console.log(JSON.stringify(filtered, null, 2));
    break;
  }

  case "load-tools": {
    const tools = loadTools();
    console.log(JSON.stringify(tools, null, 2));
    break;
  }

  case "save-tool": {
    const input = JSON.parse(readStdin());
    const tools = loadTools();

    // Check for duplicate
    const dupIndex = tools.tools.findIndex((t) =>
      t.name.toLowerCase().trim() === input.name.toLowerCase().trim() &&
      normalizeDomain(t.url) === normalizeDomain(input.url)
    );
    const dup = dupIndex >= 0 ? tools.tools[dupIndex] : undefined;
    if (dup) {
      // Update existing tool
      Object.assign(dup, {
        ...input,
        dateUpdated: new Date().toISOString(),
        dateAdded: dup.dateAdded, // preserve original add date
      });
      console.log(JSON.stringify({ action: "updated", name: dup.name }));
    } else {
      const now = new Date().toISOString();
      const newTool: Tool = {
        name: input.name,
        url: input.url,
        category: input.category || "Other",
        description: input.description || "",
        features: input.features || [],
        pricing: input.pricing || "Unknown",
        dateAdded: now,
        dateUpdated: now,
        trending: false,
        sourceUrls: input.sourceUrls || [],
        buzzScore: input.buzzScore ?? null,
        reviewRating: input.reviewRating ?? null,
      };
      tools.tools.push(newTool);
      console.log(JSON.stringify({ action: "added", name: newTool.name }));
    }

    saveTools(tools);
    break;
  }

  case "add-source": {
    const url = process.argv[3];
    if (!url) {
      console.error("Usage: cli.ts add-source <url>");
      process.exit(1);
    }
    const sources = loadSources();
    const exists = sources.sources.some(
      (s) => normalizeDomain(s.url) === normalizeDomain(url)
    );
    if (exists) {
      console.log(JSON.stringify({ action: "exists", url }));
    } else {
      sources.sources.push({
        url,
        name: new URL(url).hostname,
        type: "discovered",
        lastChecked: null,
        toolsFound: 0,
        timesChecked: 0,
        qualityScore: 0,
      });
      saveSources(sources);
      console.log(JSON.stringify({ action: "added", url }));
    }
    break;
  }

  case "update-source": {
    const input = JSON.parse(readStdin());
    const sources = loadSources();
    const source = sources.sources.find((s) => s.url === input.url);
    if (source) {
      source.timesChecked += 1;
      source.toolsFound += input.newToolsFound || 0;
      source.qualityScore = source.toolsFound / source.timesChecked;
      source.lastChecked = new Date().toISOString();
      saveSources(sources);
      console.log(JSON.stringify({ action: "updated", url: source.url, qualityScore: source.qualityScore }));
    } else {
      console.log(JSON.stringify({ action: "not_found", url: input.url }));
    }
    break;
  }

  case "status": {
    const tools = loadTools();
    const sources = loadSources();
    console.log(JSON.stringify({
      totalTools: tools.metadata.totalTools,
      trendingCount: tools.metadata.trendingCount,
      lastUpdated: tools.metadata.lastUpdated,
      sourceCount: sources.sources.length,
      seedCount: sources.sources.filter((s) => s.type === "seed").length,
      discoveredCount: sources.sources.filter((s) => s.type === "discovered").length,
    }));
    break;
  }

  case "commit-push": {
    const opts = { cwd: REPO_ROOT };
    const dataFiles = "data/tools.json data/sources.json data/market-pulse.json";
    try {
      execSync(`git diff --quiet ${dataFiles}`, opts);
      console.log(JSON.stringify({ action: "no_changes" }));
    } catch {
      // There are changes to commit
      execSync(`git add ${dataFiles}`, opts);
      execSync('git commit -m "chore: update tools data [automated]"', opts);
      execSync("git push", opts);
      console.log(JSON.stringify({ action: "pushed" }));
    }
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    console.error("Commands: load-sources, load-tools, save-tool, add-source, update-source, status, commit-push");
    process.exit(1);
}
