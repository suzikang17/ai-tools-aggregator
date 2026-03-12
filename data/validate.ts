import type { Tool } from "./schema";

const REQUIRED_FIELDS: (keyof Tool)[] = [
  "name", "url", "category", "description", "features",
  "pricing", "dateAdded", "dateUpdated", "trending", "sourceUrls",
];

export function validateTool(tool: unknown): tool is Tool {
  if (!tool || typeof tool !== "object") return false;
  const obj = tool as Record<string, unknown>;
  return REQUIRED_FIELDS.every((field) => field in obj);
}

export function normalizeDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return hostname;
  } catch {
    return url.toLowerCase();
  }
}

export function isDuplicate(
  candidate: { name: string; url: string },
  existing: Tool[],
): boolean {
  const candidateName = candidate.name.toLowerCase().trim();
  const candidateDomain = normalizeDomain(candidate.url);

  return existing.some(
    (tool) =>
      tool.name.toLowerCase().trim() === candidateName &&
      normalizeDomain(tool.url) === candidateDomain,
  );
}
