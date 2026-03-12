# AI Tools Research

Research and catalog trending AI tools from across the web.

## Commands

- `research now` — Run a full research cycle: check seed sources, discover new tools, update tools.json, push to GitHub, and report findings.
- `status` — Report current tool count, last research run time, and source stats.
- `add source <url>` — Add a new URL to the monitored sources list.

## Behavior

When running research:
1. Load `data/sources.json` and `data/tools.json` from the repo
2. Check each source (seeds first, then discovered sources sorted by quality score)
3. For each source, browse the page and extract AI tool mentions
4. Follow links up to 2 levels deep to discover tool pages and new sources
5. For each tool found, extract: name, URL, category, description, features, pricing
6. Deduplicate against existing tools by normalized name + root domain
7. Update existing tools if metadata has changed
8. Add newly discovered sources to sources.json with quality scores
9. Stop after 200 pages or 30 minutes, whichever comes first
10. Commit and push updated JSON files to GitHub
11. Report findings via Discord

## Trending Detection

A tool is marked trending if it appears across 3+ distinct sources within 48 hours.
Trending flag clears after 7 days without new appearances.

## Category Rules

Valid categories: Writing, Image Gen, Coding, Audio, Video, Productivity, Data, Agents, Marketing, Design, Research, Other.
New categories may be introduced only when 3+ tools would belong to the proposed category.

## Concurrency

Only one research run at a time. If already running, respond with current run status.
