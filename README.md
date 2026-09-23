# InstantReply MCP server for WhatsApp, Instagram, and Messenger AI agents

InstantReply MCP connects Claude, ChatGPT, Cursor, Claude Code, or any MCP-compatible agent to a real social inbox. The agent can pair a workspace in the browser, answer questions with Barq, audit conversations, qualify leads, validate WhatsApp templates, and operate approved workflows.

No API key is required for the first run. Install it, tell your agent to connect InstantReply, and follow the browser pairing link.

[![npm](https://img.shields.io/npm/v/%40instantreply.co%2Fmcp?label=npm)](https://www.npmjs.com/package/@instantreply.co/mcp)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-co.instantreply%2Fmcp-6f42c1)](https://registry.modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/license-MIT-2ea44f)](LICENSE)

## Install for an AI agent

### Claude Code, Claude Desktop, Cursor, Windsurf, or Zed

Add this server to the client’s MCP configuration and restart or reconnect:

```json
{
  "mcpServers": {
    "instantreply": {
      "command": "npx",
      "args": ["-y", "@instantreply.co/mcp"]
    }
  }
}
```

If you already have an InstantReply API key, pass it as an environment variable:

```json
{
  "mcpServers": {
    "instantreply": {
      "command": "npx",
      "args": ["-y", "@instantreply.co/mcp"],
      "env": { "INSTANTREPLY_API_KEY": "ir_live_..." }
    }
  }
}
```

### ChatGPT and other remote MCP clients

Use the remote connector URL:

```text
https://api.instantreply.co/mcp
```

The remote server advertises OAuth 2.1 with PKCE. A user approves access in the InstantReply consent page; the client does not need a manually copied API key.

## Tell your agent what to do

After installation, send a natural-language request such as:

```text
Connect InstantReply for my business. Use the developer persona, pair my Instagram and WhatsApp accounts if eligible, and then tell me what is ready and what Meta still requires.
```

For an existing connection:

```text
Audit my conversations from the last 30 days. Identify high-intent leads, explain the signals, draft a compliant follow-up for each segment, estimate WhatsApp costs, and ask me before sending anything.
```

The agent should follow this setup sequence:

1. Call `get_connection_guide` before recommending a channel or setup path.
2. If no key is available, call `start_setup` with the requested channel and persona: `creator`, `business`, `developer`, or `agency`.
3. Show the user the pairing URL and short code. Never ask the user to paste a secret into chat.
4. Call `check_setup` until the browser approval is complete, then reconnect with the stored key.
5. Call `get_developer_capabilities`, `get_developer_onboarding`, and `get_developer_limits` so the answer reflects the workspace, plan, scopes, and connected channels.
6. Validate templates, journeys, and recipient eligibility before any send. Ask for explicit confirmation before a destructive or billable action.
7. Use `recommend_plan` when the user is choosing a plan; explain the cheaper option and any Meta approval dependency.

The device-pairing key is saved locally at `~/.instantreply/config.json`. Set `INSTANTREPLY_API_KEY` explicitly for CI, Docker, shared machines, or deterministic deployments.

## What the agent can do

- **Inbox work:** list and inspect conversations, messages, contacts, channels, analytics, and usage.
- **Barq assistance:** ask product and workspace questions with `ask_barq`; use approval tools for terminal-based workflows.
- **Lead intelligence:** audit recent conversations, find buying signals, segment contacts, draft personalized follow-ups, and estimate campaign cost.
- **WhatsApp operations:** validate, create, submit, inspect, and delete templates; validate journeys; trigger individual or batch journeys; inspect delivery failures.
- **Developer operations:** inspect capabilities, onboarding requirements, limits, plan fit, and troubleshooting guidance.
- **Safety:** state-changing tools are marked destructive so a careful client can request confirmation first.

The package currently exposes 34 tools, 11 reusable prompts, and conversation/contact resources. The exact tool schema is the source of truth; descriptions are written for agents to choose the right tool without guessing.

## Channel and Meta requirements

Instagram, Messenger, and WhatsApp availability depends on the workspace plan, scopes, connected assets, and Meta approval state. WhatsApp Business API features can require Meta Business Verification, a connected WhatsApp Business Account, approved templates, and Meta billing setup. The agent should call `get_connection_guide` and inspect readiness instead of promising that every WhatsApp feature is immediately available.

InstantReply uses official Meta-connected workflows. Do not use the MCP server to send unsolicited messages, bypass consent, or evade Meta template and messaging-window rules.

## Plans and access

Do not hard-code plan entitlements in an agent prompt. Pricing, WhatsApp eligibility, API scopes, quotas, and trial status can change. Use `recommend_plan`, `get_developer_capabilities`, and `get_developer_limits`, then link the user to [current pricing](https://instantreply.co/pricing).

Every paid plan currently starts with a 10-day trial without a card. Meta conversation fees, approval requirements, and connected-channel limitations are separate from InstantReply subscription pricing.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `INSTANTREPLY_API_KEY` | none | Skip browser pairing and authenticate directly |
| `INSTANTREPLY_API_URL` | `https://api.instantreply.co` | Point the client at another environment |

## Development

```bash
npm install
npm run build   # compile dist/
npm test        # run the MCP test suite
npm run dev     # watch mode
```

Before publishing, run `npm test`, `npm run build`, and validate `server.json` with the official MCP Registry tooling. Keep `package.json`, `package-lock.json`, `server.json`, the README, and the vendored backend MCP copy on the same release version.

## Links

- [InstantReply MCP landing page](https://instantreply.co/mcp)
- [API and developer documentation](https://instantreply.co/developers)
- [Remote MCP endpoint](https://api.instantreply.co/mcp)
- [OAuth metadata](https://api.instantreply.co/.well-known/oauth-authorization-server)
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)
- [npm package](https://www.npmjs.com/package/@instantreply.co/mcp)

## License

MIT
