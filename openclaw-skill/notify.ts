import type { Tool } from "../data/schema";

export interface PricingChange {
  toolName: string;
  oldPricing: string;
  newPricing: string;
}

export interface TrendingAlert {
  toolName: string;
  sources: string[];
  timeframe: string;
}

export function formatNewToolsMessage(tools: Tool[]): string {
  if (tools.length === 0) return "";
  const list = tools.map((t) => `**${t.name}** (${t.category})`).join(", ");
  return `🆕 Found ${tools.length} new tools: ${list}. Site updated.`;
}

export function formatPricingChangeMessage(changes: PricingChange[]): string {
  if (changes.length === 0) return "";
  const lines = changes.map(
    (c) => `💰 Pricing change: **${c.toolName}** changed from ${c.oldPricing} to ${c.newPricing}.`,
  );
  return lines.join("\n");
}

export function formatTrendingMessage(alert: TrendingAlert): string {
  const sourceList = alert.sources.join(", ");
  return `🔥 Trending: **${alert.toolName}** appeared on ${sourceList} in the last ${alert.timeframe}.`;
}

export function formatStatusMessage(
  totalTools: number,
  lastUpdated: string | null,
  sourceCount: number,
): string {
  const updated = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : "never";
  return [
    `📊 **Status**`,
    `Tools tracked: ${totalTools}`,
    `Sources monitored: ${sourceCount}`,
    `Last research run: ${updated}`,
  ].join("\n");
}
