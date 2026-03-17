export const prerender = false;

import type { APIRoute } from "astro";

const SLACK_CHANNEL = "C0AM1FQUSAF";
const MAX_TOOL_NAME_LENGTH = 100;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute

// In-memory rate limit (resets on cold start, which is fine for serverless)
const requestLog: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove entries outside the window
  while (requestLog.length > 0 && requestLog[0] <= now - RATE_LIMIT_WINDOW_MS) {
    requestLog.shift();
  }
  if (requestLog.length >= RATE_LIMIT_MAX) {
    return true;
  }
  requestLog.push(now);
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  // API key check
  const apiKey = import.meta.env.RESEARCH_API_KEY;
  if (apiKey) {
    const provided = request.headers.get("x-api-key");
    if (provided !== apiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Rate limiting
  if (isRateLimited()) {
    return new Response(JSON.stringify({ error: "Too many requests. Try again in a minute." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = import.meta.env.SLACK_BOT_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "Slack not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { tool?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const toolName = body.tool?.trim();
  if (!toolName || toolName.length > MAX_TOOL_NAME_LENGTH) {
    return new Response(JSON.stringify({ error: "Invalid tool name" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Sanitize: only allow alphanumeric, spaces, dots, hyphens, and common chars
  if (!/^[\w\s.\-+#/()]+$/.test(toolName)) {
    return new Response(JSON.stringify({ error: "Invalid characters in tool name" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: `research ${toolName}`,
    }),
  });

  const slackData = await slackRes.json();

  if (!slackData.ok) {
    return new Response(JSON.stringify({ error: "Slack API error", detail: slackData.error }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, tool: toolName }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
