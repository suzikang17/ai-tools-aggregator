import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import type { Tool, ToolsData, Source, SourcesData } from "../data/schema";
import { isDuplicate } from "../data/validate";

export const MAX_PAGES = 200;
export const MAX_DURATION_MS = 30 * 60 * 1000;
export const MAX_DEPTH = 2;
export const TRENDING_EXPIRY_DAYS = 7;

const REPO_ROOT = process.env.REPO_ROOT || ".";
const TOOLS_PATH = join(REPO_ROOT, "data/tools.json");
const SOURCES_PATH = join(REPO_ROOT, "data/sources.json");
const CHECKPOINT_PATH = join(REPO_ROOT, "data/.research-checkpoint.json");

export interface ResearchResult {
  newTools: Tool[];
  updatedTools: string[];
  newSources: Source[];
  pagesVisited: number;
}

interface Checkpoint {
  lastSourceIndex: number;
  timestamp: string;
}

export function loadData(): { tools: ToolsData; sources: SourcesData } {
  const tools: ToolsData = JSON.parse(readFileSync(TOOLS_PATH, "utf-8"));
  const sources: SourcesData = JSON.parse(readFileSync(SOURCES_PATH, "utf-8"));
  return { tools, sources };
}

export function saveData(tools: ToolsData, sources: SourcesData): void {
  tools.metadata.lastUpdated = new Date().toISOString();
  tools.metadata.totalTools = tools.tools.length;
  tools.metadata.trendingCount = tools.tools.filter((t) => t.trending).length;

  writeFileSync(TOOLS_PATH, JSON.stringify(tools, null, 2));
  writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2));
}

export function sortSourcesByPriority(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => {
    if (a.type === "seed" && b.type !== "seed") return -1;
    if (b.type === "seed" && a.type !== "seed") return 1;
    return b.qualityScore - a.qualityScore;
  });
}

export function shouldSkipSource(source: Source): boolean {
  return (
    source.type === "discovered" &&
    source.timesChecked >= 10 &&
    source.qualityScore < 0.1
  );
}

export function updateQualityScore(source: Source, newToolsFound: number): void {
  source.timesChecked += 1;
  source.toolsFound += newToolsFound;
  source.qualityScore = source.toolsFound / source.timesChecked;
  source.lastChecked = new Date().toISOString();
}

export function updateTrendingFlags(tools: ToolsData, now: Date = new Date()): void {
  for (const tool of tools.tools) {
    if (tool.trending) {
      const updated = new Date(tool.dateUpdated);
      const daysSinceUpdate =
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > TRENDING_EXPIRY_DAYS) {
        tool.trending = false;
      }
    }
  }
}

export function formatDiscordSummary(result: ResearchResult): string {
  const parts: string[] = [];

  if (result.newTools.length > 0) {
    const toolList = result.newTools
      .map((t) => `**${t.name}** (${t.category})`)
      .join(", ");
    parts.push(`Found ${result.newTools.length} new tools: ${toolList}`);
  }

  if (result.updatedTools.length > 0) {
    parts.push(`Updated ${result.updatedTools.length} existing tools.`);
  }

  if (result.newSources.length > 0) {
    parts.push(
      `Discovered ${result.newSources.length} new sources to monitor.`,
    );
  }

  parts.push(`Visited ${result.pagesVisited} pages. Site updated.`);

  return parts.join(" ");
}

function loadCheckpoint(): Checkpoint | null {
  if (existsSync(CHECKPOINT_PATH)) {
    try {
      const content = readFileSync(CHECKPOINT_PATH, "utf-8").trim();
      if (!content) return null;
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}

function saveCheckpoint(sourceIndex: number): void {
  const checkpoint: Checkpoint = {
    lastSourceIndex: sourceIndex,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
}

function clearCheckpoint(): void {
  if (existsSync(CHECKPOINT_PATH)) {
    unlinkSync(CHECKPOINT_PATH);
  }
}

function commitAndPush(): void {
  const opts = { cwd: REPO_ROOT };
  execSync("git add data/tools.json data/sources.json", opts);
  execSync('git commit -m "chore: update tools data [automated]"', opts);
  execSync("git push", opts);
}

// Main research function — called by OpenClaw when the skill is triggered.
export async function runResearch(): Promise<string> {
  const startTime = Date.now();
  const { tools, sources } = loadData();
  const sorted = sortSourcesByPriority(sources.sources);

  // Resume from checkpoint if a previous run was interrupted
  const checkpoint = loadCheckpoint();
  const startIndex = checkpoint ? checkpoint.lastSourceIndex : 0;

  const result: ResearchResult = {
    newTools: [],
    updatedTools: [],
    newSources: [],
    pagesVisited: 0,
  };

  updateTrendingFlags(tools);

  let hitBudget = false;

  for (let i = startIndex; i < sorted.length; i++) {
    const source = sorted[i];

    if (result.pagesVisited >= MAX_PAGES || Date.now() - startTime >= MAX_DURATION_MS) {
      saveCheckpoint(i);
      hitBudget = true;
      break;
    }

    if (shouldSkipSource(source)) continue;

    try {
      // TODO: OPENCLAW_INTEGRATION — Wire up OpenClaw's browser relay here.
      // Replace this block with:
      //   const pageResults = await openclaw.browse(source.url, {
      //     extract: "ai_tools",
      //     maxDepth: MAX_DEPTH,
      //     maxPages: MAX_PAGES - result.pagesVisited,
      //   });
      // Then process pageResults: deduplicate tools, update source scores,
      // add new sources. The orchestration logic below is ready — only the
      // browser call itself needs to be filled in once connected to OpenClaw.
      throw new Error("OpenClaw browser integration not yet wired up");
    } catch (error) {
      // Log and skip unreachable/errored sources, continue with the rest
      console.error(`[research] Failed to process source "${source.name}": ${error}`);
      continue;
    }
  }

  if (!hitBudget) {
    clearCheckpoint();
  }

  const hasChanges = result.newTools.length > 0 || result.updatedTools.length > 0 || result.newSources.length > 0;
  if (hasChanges) {
    saveData(tools, sources);
    commitAndPush();
  }

  return formatDiscordSummary(result);
}
