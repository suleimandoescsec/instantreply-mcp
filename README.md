# @instantreply/mcp

The InstantReply MCP server — connect an AI agent to a real Instagram, WhatsApp, or Messenger inbox. Works with Claude Code, Claude Desktop, Cursor, Windsurf, Zed, and any other MCP-compatible client.

No account yet? You don't need one before you start. Run it and the agent walks you through setup.

## Quick start

```json
{
  "mcpServers": {
    "instantreply": {
      "command": "npx",
      "args": ["-y", "@instantreply/mcp"]
    }
  }
}
```

Drop that into your MCP client's config (`claude_desktop_config.json`, Cursor's `mcp.json`, etc.) and reconnect. If you already have an API key, add it:

```json
{
  "mcpServers": {
    "instantreply": {
      "command": "npx",
      "args": ["-y", "@instantreply/mcp"],
      "env": { "INSTANTREPLY_API_KEY": "ir_live_..." }
    }
  }
}
```

## Zero-key setup

With no `INSTANTREPLY_API_KEY` set, the server starts with exactly two tools: `start_setup` and `check_setup`. Ask your agent to connect InstantReply, and it will:

1. Call `start_setup` with the channel you want (`instagram` is the fast path — no Meta app review needed for an account you own; `whatsapp` needs Meta Business Verification, which takes 2-6 weeks for a new business).
2. Show you a short code and a link. Open it, sign up or log in (captcha and consent apply, same as signing up on the website), and approve the code.
3. Call `check_setup`, which waits for your approval and then tells you to reconnect the MCP server.

The key it gets you is saved to `~/.instantreply/config.json`, so the next `npx` run skips setup entirely. Set `INSTANTREPLY_API_KEY` explicitly if you'd rather manage the key yourself (CI, Docker, a shared machine).

Get a key directly, any time, at [instantreply.co/dashboard/settings/api-keys](https://instantreply.co/dashboard/settings/api-keys).

## What's here

- **29 tools** — read and write conversations, messages, contacts, templates, journeys, campaigns, comments, tickets, and developer diagnostics. Every state-changing tool is marked `destructiveHint` so a cautious agent can ask before using it.
- **11 prompts** — reusable playbooks: draft a reply, summarize a conversation, find urgent unanswered messages, audit template cost, debug a delivery failure.
- **2 resources** — `conversation://{id}` and `contact://{id}` for direct reference by ID.
- **`recommend_plan`** — give it what you know about a business (channels, expected volume, team size, API needs) and it returns a plan recommendation with plain-language reasons, a cheaper alternative when one still fits, and a warning when WhatsApp's Meta Business Verification is the real bottleneck, not price.

## Plans

| Plan | Price | Channels | Notes |
|---|---:|---|---|
| Free | $0 | Instagram | Read-only API, read-only MCP |
| Dev Hobby | $19/mo | Instagram | Full API, MCP, 3 webhooks |
| Dev Pro | $49/mo | Instagram + Messenger | 5 API keys, 10 webhooks |
| Dev Scale | $149/mo | Instagram + Messenger | 25 keys, priority MCP routing |
| Starter / Growth / Pro | $59–$349/mo | + WhatsApp, Telegram | Team seats, CRM sync, campaigns |

Every paid plan starts with a 10-day trial. No card required. Full pricing: [instantreply.co/pricing](https://instantreply.co/pricing).

## Why Instagram first

Meta requires Business Verification — a human review of your registered legal entity — before you can send anything on the WhatsApp Business API. That takes 2-6 weeks and there's no way around it. Instagram DMs for an account you already own only need Standard Access, which requires no App Review at all. If you want something working today, start there; add WhatsApp once your business is verified.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `INSTANTREPLY_API_KEY` | none | Skips zero-key setup entirely |
| `INSTANTREPLY_API_URL` | `https://api.instantreply.co` | Point at a different environment |

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # node --test
npm run dev     # tsx watch
```

## License

MIT
