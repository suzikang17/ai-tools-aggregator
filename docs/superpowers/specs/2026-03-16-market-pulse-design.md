# Market Pulse Feature Design

## Overview

Add a "Market Pulse" tab to the AI Tools Aggregator that tracks sentiment and popularity of the most widely-used AI tools over time. While the existing Discovery tab finds new tools, Market Pulse maintains a curated leaderboard of established tools with live sentiment tracking.

## Architecture

Market Pulse lives alongside Discovery as a second tab on the site. It has its own data file (`data/market-pulse.json`), its own CLI commands, and its own AG Grid component. The OpenClaw agent handles both discovery and sentiment refresh in a single `research now` run.

```
Discovery tab ← data/tools.json ← OpenClaw research (find new tools)
Market Pulse tab ← data/market-pulse.json ← OpenClaw research (refresh sentiment)
                                           ← graduation from Discovery
                                           ← pre-seeded list
```

## Data Schema

### `data/market-pulse.json`

```typescript
interface TrackedTool {
  name: string;
  url: string;
  category: string;            // Same categories as Discovery
  description: string;
  pricing: string;

  // Sentiment (current)
  buzzScore: number | null;     // 0-100, public excitement/mentions
  reviewRating: number | null;  // 1.0-5.0, half-star increments
  popularityScore: number | null; // 0-100, composite rank score
  rank: number | null;          // Position on leaderboard (#1, #2, ...)

  // Trend
  sentimentTrend: "up" | "down" | "stable" | null;

  // Weekly history (max 52 entries, oldest trimmed)
  history: {
    week: string;                // ISO week: "2026-W12"
    buzzScore: number | null;
    reviewRating: number | null;
    popularityScore: number | null;
  }[];

  // Metadata
  dateTracked: string;          // When added to Market Pulse
  lastRefreshed: string | null; // Last sentiment check
  sourceCount: number;          // Distinct sources mentioning this tool
}

interface MarketPulseData {
  metadata: {
    lastRefreshed: string | null;
    totalTracked: number;
  };
  tools: TrackedTool[];
}
```

### Popularity Score Formula

```
popularityScore = (buzzScore * 0.4)
                + (reviewRating / 5 * 100 * 0.3)
                + (min(sourceCount, 10) / 10 * 100 * 0.2)
                + (isTrendingOnDiscovery ? 10 : 0)
```

- Buzz score: 40% weight — public excitement and mention volume
- Review rating: 30% weight — normalized from 1-5 scale to 0-100
- Source count: 20% weight — capped at 10 sources, normalized to 0-100
- Trending bonus: 10 points if tool is also trending on Discovery tab

### Sentiment Trend Calculation

Compare current week's popularity score to the average of the previous 4 weeks:
- **Up**: current > 4-week average + 5%
- **Down**: current < 4-week average - 5%
- **Stable**: within 5% of 4-week average
- **Null**: fewer than 2 history entries

### Weekly Snapshots

- A snapshot is taken each time the agent refreshes sentiment
- Snapshots are keyed by ISO week (`"2026-W12"`)
- If a snapshot for the current week already exists, it's overwritten (latest data wins)
- Max 52 snapshots per tool (1 year of history); oldest are trimmed on save
- Snapshots store buzz, rating, and popularity at that point in time

## Seeding

Market Pulse is pre-populated with ~50 well-known AI tools across all categories:

**Coding:** ChatGPT, Claude, GitHub Copilot, Cursor, Replit, Cody, Tabnine, Windsurf
**Image Gen:** Midjourney, DALL-E, Stable Diffusion, Leonardo AI, Ideogram, Flux
**Video:** Runway, Pika, Kling, Sora, HeyGen
**Audio:** ElevenLabs, Suno, Udio, Murf
**Writing:** Jasper, Copy.ai, Grammarly AI, Writesonic
**Productivity:** Notion AI, Otter.ai, Mem, Reclaim AI
**Research:** Perplexity, Elicit, Consensus, Semantic Scholar
**Design:** Figma AI, Canva AI, Looka, Uizard
**Data:** Julius AI, Obviously AI
**Agents:** AutoGPT, CrewAI, LangChain
**Marketing:** AdCreative.ai, Lately AI

All seeded tools start with null sentiment values — the first `research now` run populates them.

## Graduation from Discovery

Tools on the Discovery tab are automatically promoted to Market Pulse when they meet all three criteria:
- `buzzScore >= 60`
- `reviewRating >= 3.5`
- Mentioned by `>= 3` distinct sources (sourceUrls.length >= 3)

Graduation is checked during each `research now` run. The tool is copied to `market-pulse.json` (not moved — it stays on Discovery too). If a tool with the same name+domain already exists in Market Pulse, it's skipped.

## Frontend

### Tab Navigation

A tab bar at the top of the page: **Discovery** | **Market Pulse**

- Tabs are URL-hash based (`#discovery`, `#market-pulse`)
- Default tab: Discovery (preserves current behavior)
- Tab state persists on refresh via hash

### Market Pulse Grid Component

New React component `src/components/MarketPulseGrid.tsx` using AG Grid (same setup as ToolsGrid).

**Stats bar:**
- Total tracked count
- Last refreshed date
- Weekly movers summary: "▲ X ▼ Y this week"

**View toggle:** Two pill buttons — "Top Ranked" (default) and "Biggest Movers"

**Columns (Top Ranked mode):**

| Column | Field | Width | Notes |
|--------|-------|-------|-------|
| # | rank | 60px | Gold for #1, silver for #2, bronze for #3 |
| Name | name | 160px | Link to tool URL |
| Category | category | 130px | Colored badge (same as Discovery) |
| Buzz | buzzScore | 100px | Colored progress bar + number |
| Rating | reviewRating | 110px | Star display |
| Score | popularityScore | 80px | Bold number |
| Trend | sentimentTrend | 70px | ▲ green / ▼ red / — gray |

**Columns (Biggest Movers mode):**
Same columns, but:
- Sort by absolute change in popularityScore vs last week (descending)
- Rank column shows delta badge instead: "+8" green or "-5" red
- Tools with no history show "NEW" badge

**Category filter pills:** Same as Discovery tab, filters the Market Pulse grid.

**Default sort:** By rank ascending (Top Ranked) or by absolute score delta descending (Biggest Movers).

### Astro Page Update

`src/pages/index.astro` imports both `ToolsGrid` and `MarketPulseGrid` with `client:load`. Reads both `tools.json` and `market-pulse.json` at build time. A `TabNav` component controls which grid is visible.

## CLI Commands

New commands in `openclaw-skill/cli.ts`:

| Command | Description |
|---------|-------------|
| `pulse-load` | Output Market Pulse data as JSON |
| `pulse-save-tool` | Add/update a tracked tool (stdin JSON) |
| `pulse-snapshot` | Take weekly snapshot for all tools, trim history to 52, recalculate ranks |
| `pulse-graduate` | Check Discovery tools for graduation criteria, promote eligible ones |
| `pulse-status` | Output Market Pulse stats as JSON |

### `pulse-snapshot` logic:
1. Get current ISO week string
2. For each tool: push/overwrite snapshot for current week
3. Trim history arrays to max 52 entries
4. Recalculate `popularityScore` for all tools using the formula
5. Sort by popularity score, assign ranks
6. Calculate `sentimentTrend` (current vs 4-week average)
7. Save to file

### `pulse-graduate` logic:
1. Load `tools.json` and `market-pulse.json`
2. For each Discovery tool where buzzScore >= 60, reviewRating >= 3.5, sourceUrls.length >= 3:
   - Check if already in Market Pulse (by name + domain)
   - If not, add as new tracked tool with null history
3. Save `market-pulse.json`

## SKILL.md Updates

Add to the research cycle:

### After Discovery steps (existing Steps 1-7):

**Step 8: Refresh Market Pulse sentiment**
For each tracked tool in Market Pulse, the agent:
1. Runs `npx tsx openclaw-skill/cli.ts pulse-load` to get the list
2. For each tool, visits its URL + checks Reddit/HN/Product Hunt for current mentions
3. Estimates buzzScore (0-100) and reviewRating (1.0-5.0) from what it finds
4. Pipes updated tool data to `pulse-save-tool`

**Step 9: Snapshot and graduate**
1. Runs `pulse-graduate` to promote eligible Discovery tools
2. Runs `pulse-snapshot` to take weekly snapshot and recalculate ranks
3. Both Market Pulse and Discovery data are committed together in the final `commit-push`

### New SKILL.md commands:

- `pulse status` — Show Market Pulse leaderboard summary in Discord
- No separate "refresh" command — sentiment is always updated as part of `research now`

## Error Handling

- If the agent can't find sentiment data for a tracked tool during refresh, it preserves the existing values (don't overwrite with null)
- If `market-pulse.json` doesn't exist, CLI commands create it with empty tools array
- Graduation silently skips tools that are already tracked
- Weekly snapshot overwrites existing snapshot for the same week (idempotent)

## Testing

- Unit tests for popularity score calculation
- Unit tests for sentiment trend calculation
- Unit tests for graduation criteria check
- Unit tests for weekly snapshot trimming (52 max)
- Unit tests for rank assignment after score calculation
