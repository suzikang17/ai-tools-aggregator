export const prerender = false;

import type { APIRoute } from "astro";

const SLACK_CHANNEL = "C0AM1FQUSAF";

const HELP_TEXT = `*Available Commands:*
\`/research now\` — Run a full research cycle
\`/research <tool>\` — Deep-dive on a specific tool
\`/research <category>\` — Scan a category for tools
\`/find <query>\` — Fuzzy search (e.g., "AI video editors", "alternatives to Copilot")
\`/compare <platform> vs <platform>\` — Compare platforms side-by-side
\`/newcategory <name>\` — Create a category, reclassify tools, research new ones
\`/status\` — Current stats
\`/pulsestatus\` — Market Pulse leaderboard
\`/help\` — Show this message`;

// Slash commands are sent as application/x-www-form-urlencoded
async function parseForm(request: Request): Promise<Record<string, string>> {
  const text = await request.text();
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

export const POST: APIRoute = async ({ request }) => {
  const form = await parseForm(request);

  // Verify this came from Slack (signing secret check would be ideal,
  // but for now we check the token exists)
  const slackToken = form.token;
  if (!slackToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const command = form.command?.replace("/", "") || "";
  const text = form.text?.trim() || "";
  const channelId = form.channel_id || SLACK_CHANNEL;

  // /help — respond immediately, don't post to channel
  if (command === "help") {
    return new Response(JSON.stringify({
      response_type: "ephemeral",
      text: HELP_TEXT,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Map slash commands to the text the bot expects
  let botMessage: string;
  switch (command) {
    case "research":
      botMessage = text ? `research ${text}` : "research now";
      break;
    case "find":
      botMessage = `find ${text}`;
      break;
    case "compare":
      botMessage = `compare ${text}`;
      break;
    case "newcategory":
      botMessage = `new category ${text}`;
      break;
    case "status":
      botMessage = "status";
      break;
    case "pulsestatus":
      botMessage = "pulse status";
      break;
    default:
      return new Response(JSON.stringify({
        response_type: "ephemeral",
        text: `Unknown command: /${command}. Type /help for available commands.`,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
  }

  if ((command === "find" || command === "compare" || command === "newcategory") && !text) {
    return new Response(JSON.stringify({
      response_type: "ephemeral",
      text: `Usage: /${command} <${command === "compare" ? "platform vs platform" : command === "newcategory" ? "category name" : "query"}>`,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Post the message to Slack so the OpenClaw bot picks it up
  const botToken = import.meta.env.SLACK_BOT_TOKEN;
  if (!botToken) {
    return new Response(JSON.stringify({
      response_type: "ephemeral",
      text: "Bot not configured.",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: channelId,
      text: botMessage,
    }),
  });

  const slackData = await slackRes.json();

  if (!slackData.ok) {
    return new Response(JSON.stringify({
      response_type: "ephemeral",
      text: `Failed to send command: ${slackData.error}`,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    response_type: "in_channel",
    text: `Running: \`${botMessage}\``,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
