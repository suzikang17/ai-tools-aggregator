---
name: ai-tools-research
version: 1.0.0
description: |
  Research and catalog trending AI tools from across the web. Use when:
  (1) User says "research now" to run a full research cycle
  (2) User asks for "status" of tracked tools
  (3) User says "add source <url>" to add a new monitoring source
  (4) User says "research <tool>" to deep-dive a specific tool
  (5) User says "research <category>" to scan a category
  (6) User says "find <query>" to do fuzzy search/research
  (7) User says "compare <platform> vs <platform>" to compare platforms
---

# AI Tools Research

Research and catalog trending AI tools from across the web.

## Commands

- `research now` — Run a full research cycle
- `research <tool>` — Deep-dive research on a specific tool
- `research <category>` — Scan an entire category for tools
- `find <query>` — Fuzzy search and research (e.g., "find AI video editors", "find alternatives to Copilot")
- `compare <platform> vs <platform>` — Compare platforms side-by-side (e.g., "compare Google vs Microsoft")
- `status` — Report current stats
- `pulse status` — Show Market Pulse leaderboard
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
3. For each tool with updated data, pipe it to the CLI. Include `buzzSources` and `ratingSources` arrays to show where the data came from:
   ```
   echo '{"name":"ToolName","url":"https://example.com","buzzScore":75,"reviewRating":4.0,"sourceCount":5,"buzzSources":[{"platform":"Reddit","mentions":15,"sentiment":"positive"},{"platform":"HN","detail":"2 threads, 89 comments","sentiment":"mixed"},{"platform":"Product Hunt","mentions":850,"sentiment":"positive"}],"ratingSources":[{"platform":"G2","rating":4.2,"reviewCount":150},{"platform":"Product Hunt","rating":4.5,"reviewCount":80}]}' | npx tsx openclaw-skill/pulse-cli.ts pulse-save-tool
   ```

   **buzzSources** fields: `platform` (required), `mentions` (count), `sentiment` ("positive"/"mixed"/"negative"/"neutral"), `detail` (freeform text)
   **ratingSources** fields: `platform` (required), `rating` (required, 1.0-5.0), `reviewCount` (number of reviews)

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

## Research Tool Command (`research <tool>`)

When a user says "research <tool name>", do a deep-dive on that specific tool:

### Step 1: Check if tool already exists
```
npx tsx openclaw-skill/cli.ts load-tools
npx tsx openclaw-skill/pulse-cli.ts pulse-load
```
Search both datasets for the tool by name (case-insensitive).

### Step 2: Research the tool
- Visit the tool's homepage to get current info (description, pricing, features)
- Search Reddit, Hacker News, Product Hunt, and X/Twitter for recent mentions
- Check G2, Capterra, or TrustRadius for ratings and reviews
- Look for comparisons with similar tools
- Estimate buzzScore (0-100) and reviewRating (1.0-5.0)

### Step 3: Save or update the tool
If the tool exists, update it:
```
echo '{"name":"ToolName","url":"https://example.com","buzzScore":75,"reviewRating":4.0,"description":"Updated desc","pricing":"Freemium","sourceCount":8}' | npx tsx openclaw-skill/pulse-cli.ts pulse-save-tool
```

If the tool is new, add it to Discovery first:
```
echo '{"name":"ToolName","url":"https://example.com","category":"Coding","description":"Does X","features":["feat1"],"pricing":"Free","buzzScore":72,"reviewRating":4.5,"sourceUrls":["https://source.com"]}' | npx tsx openclaw-skill/cli.ts save-tool
```

### Step 4: Report findings
Reply with a summary:
```
🔍 **Research: ToolName**
Category: X
Pricing: Y
Buzz: 75/100 | Rating: ★★★★☆ (4.0)
Status: [New — added to Discovery | Updated — buzz ↑15]

**Summary:** One paragraph about what the tool does, its strengths, weaknesses, and how it compares to alternatives.

**Recent buzz:** What people are saying (Reddit threads, HN discussions, Product Hunt launch, etc.)
```

## Research Category Command (`research <category>`)

When a user says "research <category>", scan that entire category:

Valid categories: Writing, Image Gen, Coding, Audio, Video, Productivity, Data, Agents, Marketing, Design, Research, Other.

If the user provides a fuzzy category name (e.g., "code", "images", "music"), map it to the closest valid category.

### Step 1: Load current tools in that category
```
npx tsx openclaw-skill/cli.ts load-tools
npx tsx openclaw-skill/pulse-cli.ts pulse-load
```
Filter both datasets to the target category.

### Step 2: Research the category
- Search for "best AI <category> tools 2026", "top <category> AI tools", "new <category> AI tools"
- Visit 5-10 relevant sources (blogs, directories, Reddit threads, comparison articles)
- For each tool found, extract: name, url, category, description, features, pricing, buzzScore, reviewRating
- Cross-reference with existing tools — note which are new vs already tracked

### Step 3: Save new and updated tools
Save each tool found using the appropriate CLI (same as full research cycle Steps 3-4).

### Step 4: Report findings
Reply with a category summary:
```
🔍 **Category Scan: Coding**
Tools tracked: 8 (3 new, 5 updated)

**New finds:**
• ToolA — Does X ($20/mo) — Buzz: 82
• ToolB — Does Y (Free) — Buzz: 65
• ToolC — Does Z (Freemium) — Buzz: 58

**Updated:**
• Cursor — Buzz: 90 → 92 ▲
• Copilot — Buzz: 88 → 85 ▼

**Trends:** Brief observation about what's happening in this category.
```

## Find Command (`find <query>`)

When a user says "find <query>", do an open-ended fuzzy search. The query can be anything:
- "find AI video editors" — search for tools matching a use case
- "find alternatives to Copilot" — search for competitors to a known tool
- "find cheap image generators" — search with constraints
- "find tools for podcast editing" — search for a niche

### Step 1: Interpret the query
Parse what the user is looking for:
- **Use case search**: "find AI video editors" → search for tools that do video editing
- **Alternative search**: "find alternatives to X" → identify what X does, find competitors
- **Constrained search**: "find cheap X" → search with pricing filter
- **Niche search**: "find tools for Y" → explore a specific niche

### Step 2: Check existing tools first
```
npx tsx openclaw-skill/cli.ts load-tools
npx tsx openclaw-skill/pulse-cli.ts pulse-load
```
Search both datasets for matches. Report any existing tools that match the query.

### Step 3: Research the web
- Search for terms derived from the query (e.g., "best AI video editing tools 2026")
- Visit 3-5 top results
- Extract tool information from each
- For "alternatives to X" queries, also check alternativeto.net and similar comparison sites

### Step 4: Save any new tools found
Save each new tool using the appropriate CLI.

### Step 5: Report findings
Reply with results tailored to the query:
```
🔍 **Find: "AI video editors"**
Found 6 matches (2 already tracked, 4 new):

**Already tracking:**
• Runway — Buzz: 85 | ★★★★½
• Pika — Buzz: 72 | ★★★★

**New finds:**
• ToolA — Does X ($15/mo) — Added to Discovery
• ToolB — Does Y (Free tier) — Added to Discovery
• ToolC — Does Z (Enterprise) — Added to Discovery
• ToolD — Does W (Freemium) — Added to Discovery

**Recommendation:** Brief take on which tools stand out and why.
```

## Compare Command (`compare <platform> vs <platform>`)

When a user says "compare X vs Y" (e.g., "compare Google vs Microsoft"):

### Step 1: Identify tools under each platform
```
npx tsx openclaw-skill/cli.ts load-tools
npx tsx openclaw-skill/pulse-cli.ts pulse-load
```
Filter tools by `parentPlatform` for each platform. If a platform has no tools yet, research it first (see Platform Crawling below).

### Step 2: Research any gaps
If either platform has few or no tracked tools, crawl the platform's AI product pages to discover and save sub-tools before comparing.

### Step 3: Report comparison
```
⚔️ **Compare: Google vs Microsoft**

**Google** (8 tools tracked)
• NotebookLM — Research — Buzz: 82 ▲
• Gemini — Coding — Buzz: 90 ▲
• AI Studio — Coding — Buzz: 65 —
• Illuminate — Research — Buzz: 58 —
...
Avg Buzz: 72 | Avg Rating: ★★★★ (4.1)
Categories: Coding (3), Research (3), Productivity (2)

**Microsoft** (7 tools tracked)
• Copilot — Coding — Buzz: 88 ▲
• Azure OpenAI — Coding — Buzz: 75 —
• Designer — Design — Buzz: 55 —
...
Avg Buzz: 68 | Avg Rating: ★★★½ (3.8)
Categories: Coding (3), Productivity (2), Design (2)

**Verdict:** Brief comparison of strengths, coverage, and momentum.
```

## Platform Crawling

When researching tools, check if a tool belongs to a larger platform. If so, set `parentPlatform` and crawl the platform for sibling tools.

### Known platforms to crawl into
- **Google**: Google Labs, Google AI, Google Cloud AI — look for NotebookLM, Gemini, AI Studio, Illuminate, Veo, Imagen, MusicFX, etc.
- **Microsoft**: Azure AI, Microsoft 365 Copilot, Bing AI — look for Copilot, Azure OpenAI Service, Designer, Recall, etc.
- **Meta**: Meta AI — look for Llama, Segment Anything, AudioCraft, Make-A-Video, etc.
- **Amazon**: AWS AI/ML — look for Bedrock, CodeWhisperer, Titan, Rekognition, Polly, etc.
- **Apple**: Apple Intelligence — look for on-device AI tools
- **Adobe**: Adobe Sensei, Firefly — look for Firefly, Podcast, Enhance Speech, etc.
- **Salesforce**: Einstein AI — look for Einstein GPT, Einstein Copilot, etc.

### How to tag platform tools
When saving a tool that belongs to a platform, include `parentPlatform`:
```
echo '{"name":"NotebookLM","url":"https://notebooklm.google.com","category":"Research","parentPlatform":"Google","description":"AI research assistant","features":["notebook","sources"],"pricing":"Free","buzzScore":82,"reviewRating":4.5,"sourceUrls":["https://source.com"]}' | npx tsx openclaw-skill/cli.ts save-tool
```

For Market Pulse:
```
echo '{"name":"NotebookLM","url":"https://notebooklm.google.com","parentPlatform":"Google","buzzScore":82,"reviewRating":4.5,"sourceCount":6}' | npx tsx openclaw-skill/pulse-cli.ts pulse-save-tool
```

### During full research cycles
In Step 2 (Browse each source), when you encounter a tool that belongs to a known platform:
1. Tag it with `parentPlatform`
2. If you haven't crawled that platform yet in this cycle, visit the platform's AI products page and extract all sub-tools
3. Save each sub-tool with the same `parentPlatform`

## Trending Detection

A tool is trending if it appears across 3+ distinct sources within 48 hours.
Trending flag clears after 7 days without new appearances.

## Category Rules

Valid categories: Writing, Image Gen, Coding, Audio, Video, Productivity, Data, Agents, Marketing, Design, Research, Other.

Assign the most specific category that fits. Use "Other" only when nothing else applies.

## Concurrency

Only one research run at a time. If already running, tell the user.
