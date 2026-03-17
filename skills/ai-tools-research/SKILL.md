---
name: ai-tools-research
version: 1.0.0
description: |
  Research and catalog trending AI tools from across the web. Use when:
  (1) User says "research now" to run a full research cycle
  (2) User asks for "status" of tracked tools
  (3) User says "add source <url>" to add a new monitoring source
---

# AI Tools Research

Research and catalog trending AI tools from across the web.

## Commands

- `research now` — Run a full research cycle
- `status` — Report current stats
- `add source <url>` — Add a new URL to monitored sources

## CLI Helper

All data operations go through the CLI at `openclaw-skill/cli.ts`. Run it via exec:

```
npx tsx openclaw-skill/cli.ts <command> [args]
```

Commands:
- `load-sources` — Get prioritized source list (JSON)
- `load-tools` — Get current tools data (JSON)
- `save-tool` — Add/update a tool (pipe JSON to stdin)
- `add-source <url>` — Add a new source URL
- `update-source` — Update source stats (pipe JSON to stdin)
- `status` — Get current stats (JSON)
- `commit-push` — Commit and push data changes to GitHub

## Research Cycle (`research now`)

When a user says "research now", follow this process:

### Step 1: Load sources
```
npx tsx openclaw-skill/cli.ts load-sources
```
This returns a JSON array of sources sorted by priority (seeds first, then by quality score).

### Step 2: Browse each source

For each source in the list, visit it and extract AI tool information.

**For static pages** (blogs, lists, directories):
Use `web_fetch` to get the page content. This is faster and cheaper than the browser.

**For dynamic pages** (SPAs, pages requiring JS):
Use `browser navigate <url>`, then `browser snapshot` to read the content.

**What to extract from each page:**
Look for mentions of AI tools, products, or services. For each tool found, extract:
- **name**: The tool's name
- **url**: The tool's homepage URL
- **category**: One of: Writing, Image Gen, Coding, Audio, Video, Productivity, Data, Agents, Marketing, Design, Research, Other
- **description**: One sentence describing what it does
- **features**: Key features as a list of short strings
- **pricing**: Pricing info (e.g., "Free", "Freemium", "$20/mo", "Enterprise")
- **buzzScore**: Public buzz score 0-100 based on mentions, upvotes, comments, and excitement level across sources. Consider: volume of mentions (more = higher), tone of discussion (excited vs neutral vs negative), recency of buzz. Use null if insufficient data.
- **reviewRating**: Star rating 1.0-5.0 (half-star increments: 1.0, 1.5, 2.0, ..., 5.0). Pull actual ratings from Product Hunt, G2, or similar review sites when available. Estimate from user review text when no structured rating exists. Use null if no reviews found.

### Step 3: Save each tool found

For each tool extracted, pipe it to the CLI:
```
echo '{"name":"ToolName","url":"https://example.com","category":"Coding","description":"Does X","features":["feat1","feat2"],"pricing":"Free","buzzScore":72,"reviewRating":4.5,"sourceUrls":["https://source-url.com"]}' | npx tsx openclaw-skill/cli.ts save-tool
```

The CLI handles deduplication automatically — if a tool with the same name and domain already exists, it updates instead of duplicating.

### Step 4: Update source stats

After checking each source, update its stats:
```
echo '{"url":"https://source-url.com","newToolsFound":3}' | npx tsx openclaw-skill/cli.ts update-source
```

### Step 5: Follow links (depth 2 max)

If a source page links to other pages that look like AI tool directories, lists, or roundups:
- Follow up to 5 promising links per source
- Extract tools from those pages too
- If you discover a new source worth monitoring, add it:
  ```
  npx tsx openclaw-skill/cli.ts add-source https://new-source.com/ai-tools
  ```

### Step 6: Refresh Market Pulse sentiment

After discovery is complete, refresh sentiment data for tracked tools:

1. Run `npx tsx openclaw-skill/pulse-cli.ts pulse-load` to get the Market Pulse tool list
2. For each tracked tool (batch by visiting relevant sources rather than one-by-one):
   - Check the tool's URL for current status, pricing, description
   - Search Reddit, HN, Product Hunt for recent mentions and sentiment
   - Estimate buzzScore (0-100) based on mention volume and excitement level
   - Estimate reviewRating (1.0-5.0) from user reviews and ratings found
   - Count distinct sources mentioning the tool
   - If you cannot find sentiment data for a tool, skip it (preserve existing values)
3. For each tool with updated data, pipe it to the CLI:
   ```
   echo '{"name":"ToolName","url":"https://example.com","buzzScore":75,"reviewRating":4.0,"sourceCount":5}' | npx tsx openclaw-skill/pulse-cli.ts pulse-save-tool
   ```

### Step 7: Snapshot and graduate

After refreshing sentiment:
```
npx tsx openclaw-skill/pulse-cli.ts pulse-graduate
npx tsx openclaw-skill/pulse-cli.ts pulse-snapshot
```

### Step 8: Commit and push

After processing all sources:
```
npx tsx openclaw-skill/cli.ts commit-push
```

This now stages `data/tools.json`, `data/sources.json`, and `data/market-pulse.json`.

### Step 9: Report

Summarize what you found in Discord:
- How many new tools were added
- How many existing tools were updated
- Any new sources discovered
- List the most interesting finds by name and category
- Market Pulse summary: how many tools refreshed, any rank changes

## Budget Limits

- **Max pages**: 200 per run
- **Max time**: 30 minutes per run
- **Max depth**: 2 levels of link following
- Track your page count as you go. Stop when you hit the limit.

## Status Command

When a user says "status":
```
npx tsx openclaw-skill/cli.ts status
```
Format the JSON response into a readable Discord message:
```
📊 **Status**
Tools tracked: X
Sources monitored: Y (Z seeds, W discovered)
Last research run: <date>
Trending: N tools
```

## Add Source Command

When a user says "add source <url>":
```
npx tsx openclaw-skill/cli.ts add-source <url>
```
Report whether it was added or already exists.

## Market Pulse Commands

- `pulse status` — Show Market Pulse leaderboard summary in Discord. Run:
  ```
  npx tsx openclaw-skill/pulse-cli.ts pulse-status
  ```
  Format the JSON into a readable Discord message:
  ```
  📊 **Market Pulse**
  Tools tracked: X
  Last refreshed: <date>
  Movers: ▲ X up, ▼ Y down this week

  **Top 5:**
  #1 ToolName (score) ▲
  #2 ToolName (score) —
  ...
  ```

## Trending Detection

A tool is trending if it appears across 3+ distinct sources within 48 hours.
Trending flag clears after 7 days without new appearances.

## Category Rules

Valid categories: Writing, Image Gen, Coding, Audio, Video, Productivity, Data, Agents, Marketing, Design, Research, Other.

Assign the most specific category that fits. Use "Other" only when nothing else applies.

## Concurrency

Only one research run at a time. If already running, tell the user.
