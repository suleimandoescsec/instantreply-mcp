# InstantReply MCP server for WhatsApp, Instagram, and Messenger AI agents

InstantReply MCP connects Claude, ChatGPT, Cursor, Codex, or any MCP-compatible agent to a real social inbox. The agent pairs a workspace through one browser link, answers questions with Barq, audits conversations, qualifies leads, validates WhatsApp templates, and operates approved workflows.

No API key is needed. Add the server, tell your agent to connect InstantReply, and open the link it gives you.

[![npm](https://img.shields.io/npm/v/%40instantreply.co%2Fmcp?label=npm)](https://www.npmjs.com/package/@instantreply.co/mcp)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-co.instantreply%2Fmcp-6f42c1)](https://registry.modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/license-MIT-2ea44f)](LICENSE)

## Set up in 60 seconds

**1. Add the server to your agent** (local package, nothing to install first):

| Client | How |
|---|---|
| Claude Code | `claude mcp add instantreply -- npx -y @instantreply.co/mcp` |
| Codex CLI | `codex mcp add instantreply -- npx -y @instantreply.co/mcp` |
| Claude Desktop | Settings, Developer, Edit config, paste the JSON below, restart |
| Cursor | Settings, MCP, Add server (or `~/.cursor/mcp.json`), paste the JSON below |
| VS Code | `.vscode/mcp.json`, use the `servers` JSON below |
| Windsurf | `~/.codeium/windsurf/mcp_config.json`, paste the JSON below |
| Anything else | Run the command `npx -y @instantreply.co/mcp` over stdio |

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

VS Code uses `"servers"` instead of `"mcpServers"` and needs `"type": "stdio"` next to `command`.

**Remote (ChatGPT and other hosted clients)** : add the connector URL `https://api.instantreply.co/mcp`. It uses OAuth 2.1 with PKCE; you approve access on an InstantReply consent page and never copy a key.

**2. Tell your agent:**

```text
Connect InstantReply for my business.
```

**3. What happens, and what the agent should say at each step**

| Step | Agent action | Say to the user |
|---|---|---|
| 1 | Call `get_connection_guide` | "Instagram connects same-day. WhatsApp needs Meta Business Verification (usually 2-6 weeks). Which do you want first?" |
| 2 | Call `start_setup` (platform, optional persona: creator, business, developer, agency) | "Open this link, sign in or sign up, connect your account and approve the code `ABCD-1234`. I will wait." |
| 3 | Call `check_setup` until approved | "Waiting for your approval. Tell me when you have clicked approve." |
| 4 | Ask the user to reconnect or restart the server so all tools load | "Connected. Please restart this MCP server once." |
| 5 | Call `list_channels` | "These accounts are live: ... Nothing else is connected yet." |
| 6 | Optional: `connect_channel` for another Instagram account, Messenger page or WhatsApp number | "Open this second link to connect another account." |
| 7 | Teach the business with `propose_knowledge_entry` | "I drafted these facts about your business. Approve them in your dashboard or tell me to approve." |

Never ask the user to paste a secret into chat. The pairing key is stored locally at `~/.instantreply/config.json` (file mode 0600). Set `INSTANTREPLY_API_KEY` for CI, Docker or shared machines.

## Skills that ship with the package

The `skills/` directory holds agent skills (SKILL.md with frontmatter) for the main jobs. Copy a folder into your agent's skills directory (for example `~/.claude/skills/`) or point your agent at the folder.

| Skill | Job |
|---|---|
| `instantreply-setup` | Pair, connect socials, verify what is live |
| `instantreply-inbox-triage` | Find urgent, unanswered and high-intent conversations and draft replies |
| `instantreply-campaigns` | Compliance-first outreach: opt-in, STOP, templates, the 24-hour window |
| `instantreply-brand-voice-and-kb` | Teach the AI your business, voice and facts, with owner approval |
| `instantreply-add-integration` | Connect your own system through a signed reply webhook, or add more channels |

Every skill references real tool names only; a test fails the build if one drifts.

## Add your own integration

- **Your backend answers customers:** `set_channel_ai_provider` with `provider: custom_reply_webhook`. InstantReply POSTs a signed request (`X-InstantReply-Timestamp`, `X-InstantReply-Signature: sha256=HMAC-SHA256(secret, timestamp + "." + body)`) to your HTTPS endpoint, which returns `{"reply": "..."}`. Replies still pass grounding checks.
- **More social accounts:** `connect_channel` returns a link; the owner approves Meta OAuth in the browser.
- **Events pushed to your server:** signed outbound webhooks are managed with the REST API (`/v1/webhooks`) or the dashboard; there is no MCP tool for that yet.

## What the agent can do

- **Inbox work:** list and inspect conversations, messages, contacts, channels, analytics, and usage.
- **Comments:** list, read, and publicly reply to Instagram/Facebook post comments; toggle AI comment auto-replies.
- **Per-channel control:** turn AI DM auto-replies on or off for one connected channel without touching the others.
- **Barq assistance:** ask product and workspace questions with `ask_barq`; risky actions come back as approvals you confirm with `decide_approval`.
- **Lead intelligence:** audit recent conversations, find buying signals, segment contacts, draft follow-ups, and estimate campaign cost.
- **WhatsApp operations:** validate, create, submit, inspect, and delete templates; validate journeys; trigger individual or batch journeys; inspect delivery failures.
- **Developer operations:** inspect capabilities, onboarding requirements, and limits; troubleshoot delivery.
- **Safety:** state-changing tools are marked destructive so a careful client can ask for confirmation first.

The package exposes 59 workspace tools, 3 setup and guide tools, 13 reusable prompts, and conversation/contact resources. The exact tool schema is the source of truth.

## Channel and Meta requirements

Instagram, Messenger, and WhatsApp availability depends on scopes, connected assets, and Meta approval state. WhatsApp Business API features can require Meta Business Verification, a connected WhatsApp Business Account, and approved templates. The agent should call `get_connection_guide` and inspect readiness instead of promising that every WhatsApp feature is immediately available.

InstantReply uses official Meta-connected workflows. Do not use the MCP server to send unsolicited messages, bypass consent, or evade Meta template and messaging-window rules. Honour STOP and unsubscribe requests immediately.

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

Before publishing, run `npm test`, `npm run build`, `npm pack --dry-run`, and validate `server.json` with the official MCP Registry tooling. Keep `package.json`, `package-lock.json`, `server.json`, the README, and the vendored backend MCP copy on the same release version.

## Links

- [InstantReply MCP landing page](https://instantreply.co/mcp)
- [API and developer documentation](https://instantreply.co/developers)
- [Remote MCP endpoint](https://api.instantreply.co/mcp)
- [OAuth metadata](https://api.instantreply.co/.well-known/oauth-authorization-server)
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)
- [npm package](https://www.npmjs.com/package/@instantreply.co/mcp)

## License

MIT
