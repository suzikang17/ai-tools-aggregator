#!/usr/bin/env npx tsx
/**
 * CLI for Market Pulse data operations.
 *
 * Commands:
 *   pulse-load      - Output Market Pulse data as JSON
 *   pulse-save-tool - Add/update a tracked tool (reads JSON from stdin)
 *   pulse-snapshot  - Take weekly snapshot, recalculate ranks
 *   pulse-graduate  - Promote eligible Discovery tools
 *   pulse-status    - Output Market Pulse stats as JSON
 *   pulse-seed      - Generate initial seed data
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { TrackedTool, MarketPulseData } from "../data/market-pulse-schema";
import type { ToolsData } from "../data/schema";
import { normalizeDomain } from "../data/validate";
import {
  calculatePopularityScore,
  calculateSentimentTrend,
  getISOWeek,
  takeSnapshot,
  trimHistory,
  assignRanks,
  checkGraduation,
} from "../data/pulse-logic";

const REPO_ROOT = process.env.REPO_ROOT || ".";
const PULSE_PATH = join(REPO_ROOT, "data/market-pulse.json");
const TOOLS_PATH = join(REPO_ROOT, "data/tools.json");

function loadPulse(): MarketPulseData {
  if (!existsSync(PULSE_PATH)) {
    return { metadata: { lastRefreshed: null, totalTracked: 0 }, tools: [] };
  }
  return JSON.parse(readFileSync(PULSE_PATH, "utf-8"));
}

function savePulse(data: MarketPulseData): void {
  data.metadata.totalTracked = data.tools.length;
  writeFileSync(PULSE_PATH, JSON.stringify(data, null, 2));
}

function loadTools(): ToolsData {
  return JSON.parse(readFileSync(TOOLS_PATH, "utf-8"));
}

function readStdin(): string {
  return readFileSync("/dev/stdin", "utf-8").trim();
}

function isDuplicatePulse(name: string, url: string, tools: TrackedTool[]): boolean {
  const candidateName = name.toLowerCase().trim();
  const candidateDomain = normalizeDomain(url);
  return tools.some(
    (t) => t.name.toLowerCase().trim() === candidateName &&
           normalizeDomain(t.url) === candidateDomain,
  );
}

const SEED_TOOLS: { name: string; url: string; category: string }[] = [
  // Coding
  { name: "ChatGPT", url: "https://chat.openai.com", category: "Coding" },
  { name: "Claude", url: "https://claude.ai", category: "Coding" },
  { name: "GitHub Copilot", url: "https://github.com/features/copilot", category: "Coding" },
  { name: "Cursor", url: "https://cursor.com", category: "Coding" },
  { name: "Replit", url: "https://replit.com", category: "Coding" },
  { name: "Cody", url: "https://sourcegraph.com/cody", category: "Coding" },
  { name: "Tabnine", url: "https://www.tabnine.com", category: "Coding" },
  { name: "Windsurf", url: "https://codeium.com/windsurf", category: "Coding" },
  // Image Gen
  { name: "Midjourney", url: "https://www.midjourney.com", category: "Image Gen" },
  { name: "DALL-E", url: "https://openai.com/dall-e-3", category: "Image Gen" },
  { name: "Stable Diffusion", url: "https://stability.ai", category: "Image Gen" },
  { name: "Leonardo AI", url: "https://leonardo.ai", category: "Image Gen" },
  { name: "Ideogram", url: "https://ideogram.ai", category: "Image Gen" },
  { name: "Flux", url: "https://flux.ai", category: "Image Gen" },
  // Video
  { name: "Runway", url: "https://runwayml.com", category: "Video" },
  { name: "Pika", url: "https://pika.art", category: "Video" },
  { name: "Kling", url: "https://klingai.com", category: "Video" },
  { name: "Sora", url: "https://openai.com/sora", category: "Video" },
  { name: "HeyGen", url: "https://www.heygen.com", category: "Video" },
  // Audio
  { name: "ElevenLabs", url: "https://elevenlabs.io", category: "Audio" },
  { name: "Suno", url: "https://suno.com", category: "Audio" },
  { name: "Udio", url: "https://www.udio.com", category: "Audio" },
  { name: "Murf", url: "https://murf.ai", category: "Audio" },
  // Writing
  { name: "Jasper", url: "https://www.jasper.ai", category: "Writing" },
  { name: "Copy.ai", url: "https://www.copy.ai", category: "Writing" },
  { name: "Grammarly AI", url: "https://www.grammarly.com", category: "Writing" },
  { name: "Writesonic", url: "https://writesonic.com", category: "Writing" },
  // Productivity
  { name: "Notion AI", url: "https://www.notion.so/product/ai", category: "Productivity" },
  { name: "Otter.ai", url: "https://otter.ai", category: "Productivity" },
  { name: "Mem", url: "https://mem.ai", category: "Productivity" },
  { name: "Reclaim AI", url: "https://reclaim.ai", category: "Productivity" },
  // Research
  { name: "Perplexity", url: "https://www.perplexity.ai", category: "Research" },
  { name: "Elicit", url: "https://elicit.com", category: "Research" },
  { name: "Consensus", url: "https://consensus.app", category: "Research" },
  { name: "Semantic Scholar", url: "https://www.semanticscholar.org", category: "Research" },
  // Design
  { name: "Figma AI", url: "https://www.figma.com", category: "Design" },
  { name: "Canva AI", url: "https://www.canva.com", category: "Design" },
  { name: "Looka", url: "https://looka.com", category: "Design" },
  { name: "Uizard", url: "https://uizard.io", category: "Design" },
  // Data
  { name: "Julius AI", url: "https://julius.ai", category: "Data" },
  { name: "Obviously AI", url: "https://www.obviously.ai", category: "Data" },
  // Agents
  { name: "AutoGPT", url: "https://autogpt.net", category: "Agents" },
  { name: "CrewAI", url: "https://www.crewai.com", category: "Agents" },
  { name: "LangChain", url: "https://www.langchain.com", category: "Agents" },
  // Marketing
  { name: "AdCreative.ai", url: "https://www.adcreative.ai", category: "Marketing" },
  { name: "Lately AI", url: "https://www.lately.ai", category: "Marketing" },
];

const command = process.argv[2];

switch (command) {
  case "pulse-load": {
    const data = loadPulse();
    console.log(JSON.stringify(data, null, 2));
    break;
  }

  case "pulse-save-tool": {
    const input = JSON.parse(readStdin());
    const data = loadPulse();

    const existingIndex = data.tools.findIndex(
      (t) => t.name.toLowerCase().trim() === input.name.toLowerCase().trim() &&
             normalizeDomain(t.url) === normalizeDomain(input.url),
    );

    if (existingIndex >= 0) {
      const existing = data.tools[existingIndex];
      if (input.buzzScore !== undefined) existing.buzzScore = input.buzzScore;
      if (input.reviewRating !== undefined) existing.reviewRating = input.reviewRating;
      if (input.category !== undefined) existing.category = input.category;
      if (input.description !== undefined) existing.description = input.description;
      if (input.pricing !== undefined) existing.pricing = input.pricing;
      if (input.sourceCount !== undefined) existing.sourceCount = input.sourceCount;
      if (input.buzzSources !== undefined) existing.buzzSources = input.buzzSources;
      if (input.ratingSources !== undefined) existing.ratingSources = input.ratingSources;
      existing.lastRefreshed = new Date().toISOString();
      console.log(JSON.stringify({ action: "updated", name: existing.name }));
    } else {
      const now = new Date().toISOString();
      const newTool: TrackedTool = {
        name: input.name,
        url: input.url,
        category: input.category || "Other",
        description: input.description || "",
        pricing: input.pricing || "Unknown",
        buzzScore: input.buzzScore ?? null,
        reviewRating: input.reviewRating ?? null,
        popularityScore: null,
        rank: null,
        sentimentTrend: null,
        history: [],
        buzzSources: input.buzzSources ?? [],
        ratingSources: input.ratingSources ?? [],
        dateTracked: now,
        lastRefreshed: now,
        sourceCount: input.sourceCount ?? 0,
      };
      data.tools.push(newTool);
      console.log(JSON.stringify({ action: "added", name: newTool.name }));
    }

    savePulse(data);
    break;
  }

  case "pulse-snapshot": {
    const data = loadPulse();
    const tools = loadTools();
    const week = getISOWeek();

    for (const tool of data.tools) {
      const discoveryMatch = tools.tools.find(
        (dt) => dt.name.toLowerCase().trim() === tool.name.toLowerCase().trim() &&
                normalizeDomain(dt.url) === normalizeDomain(tool.url),
      );
      const isTrending = discoveryMatch?.trending === true;

      tool.popularityScore = calculatePopularityScore(
        tool.buzzScore, tool.reviewRating, tool.sourceCount, isTrending,
      );

      // Calculate trend BEFORE taking snapshot so current week isn't in the average
      tool.sentimentTrend = calculateSentimentTrend(tool.popularityScore, tool.history);

      takeSnapshot(tool, week);
      tool.history = trimHistory(tool.history);
    }

    const ranked = assignRanks(data.tools);
    data.tools = ranked;
    data.metadata.lastRefreshed = new Date().toISOString();

    savePulse(data);
    console.log(JSON.stringify({
      action: "snapshot",
      week,
      toolCount: data.tools.length,
      ranked: data.tools.filter((t) => t.rank != null).length,
    }));
    break;
  }

  case "pulse-graduate": {
    const data = loadPulse();
    const tools = loadTools();
    let graduated = 0;

    for (const tool of tools.tools) {
      if (!checkGraduation(tool)) continue;
      if (isDuplicatePulse(tool.name, tool.url, data.tools)) continue;

      const now = new Date().toISOString();
      data.tools.push({
        name: tool.name,
        url: tool.url,
        category: tool.category,
        description: tool.description,
        pricing: tool.pricing,
        buzzScore: tool.buzzScore,
        reviewRating: tool.reviewRating,
        popularityScore: null,
        rank: null,
        sentimentTrend: null,
        history: [],
        dateTracked: now,
        lastRefreshed: now,
        sourceCount: tool.sourceUrls.length,
      });
      graduated++;
    }

    savePulse(data);
    console.log(JSON.stringify({ action: "graduated", count: graduated }));
    break;
  }

  case "pulse-status": {
    const data = loadPulse();
    const upCount = data.tools.filter((t) => t.sentimentTrend === "up").length;
    const downCount = data.tools.filter((t) => t.sentimentTrend === "down").length;
    const top5 = data.tools
      .filter((t) => t.rank != null)
      .sort((a, b) => a.rank! - b.rank!)
      .slice(0, 5)
      .map((t) => ({ rank: t.rank, name: t.name, score: t.popularityScore, trend: t.sentimentTrend }));

    console.log(JSON.stringify({
      totalTracked: data.metadata.totalTracked,
      lastRefreshed: data.metadata.lastRefreshed,
      moversUp: upCount,
      moversDown: downCount,
      top5,
    }));
    break;
  }

  case "pulse-seed": {
    const data = loadPulse();
    let added = 0;

    for (const seed of SEED_TOOLS) {
      if (isDuplicatePulse(seed.name, seed.url, data.tools)) continue;

      data.tools.push({
        name: seed.name,
        url: seed.url,
        category: seed.category,
        description: "",
        pricing: "",
        buzzScore: null,
        reviewRating: null,
        popularityScore: null,
        rank: null,
        sentimentTrend: null,
        history: [],
        dateTracked: new Date().toISOString(),
        lastRefreshed: null,
        sourceCount: 0,
      });
      added++;
    }

    savePulse(data);
    console.log(JSON.stringify({ action: "seeded", added, total: data.tools.length }));
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    console.error("Commands: pulse-load, pulse-save-tool, pulse-snapshot, pulse-graduate, pulse-status, pulse-seed");
    process.exit(1);
}
