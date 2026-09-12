#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { InstantReplyClient } from './client.js';
import { tools } from './tools.js';
import { prompts } from './prompts.js';
import { encodeResourceId } from './resource-security.js';
import { readStoredApiKey, requestDeviceCode, waitForApproval, fetchConnectionGuide } from './setup.js';

// Zero-key start: an env var wins if set (CI, Docker, power users), else fall
// back to whatever a previous `start_setup` run already stored locally, so
// `npx @instantreply/mcp` works with nothing configured at all — the whole
// point of a friendly first run is not making someone find a settings page
// before the agent can do anything.
const API_KEY = process.env.INSTANTREPLY_API_KEY ?? readStoredApiKey();

const client = API_KEY ? new InstantReplyClient(API_KEY) : null;

const server = new McpServer({
  name: 'instantreply',
  version: '0.2.0',
});

// ── Connection guide ──────────────────────────────────────────────────────────
// Registered in BOTH modes. Before pairing it tells the agent what to
// recommend; after pairing it tells the user what to click. It needs no key
// either way, so gating it behind one would only make onboarding worse.

server.tool(
  'get_connection_guide',
  'Get how to connect each channel (Instagram, WhatsApp, Messenger, Telegram, Shopify, calendars): where the user clicks, what Meta requires first, and how long it really takes. Call this before advising anyone which channel to set up — Instagram works same-day, WhatsApp needs 2-6 weeks of Meta Business Verification.',
  {},
  { readOnlyHint: true, destructiveHint: false },
  async () => {
    try {
      const guide = await fetchConnectionGuide();
      return { content: [{ type: 'text' as const, text: JSON.stringify(guide, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tools ────────────────────────────────────────────────────────────────────

if (client) {
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.shape,
      { readOnlyHint: tool.readOnly, destructiveHint: tool.destructive },
      async (input: Record<string, unknown>) => {
        try {
          const result = await tool.handler(client, input);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
            isError: true,
          };
        }
      },
    );
  }
} else {
  // No key anywhere — this is a brand new install. Expose only the setup
  // handshake so the agent's first move is guiding the human through it,
  // not a wall of "missing API key" errors on every other tool.
  server.tool(
    'start_setup',
    'Start connecting this AI agent to InstantReply. Call this first if no other tools are available. Returns a short code and a link — tell the user to open the link, sign up or log in (takes under a minute), and approve the code. Then call check_setup.',
    { platform: z.enum(['instagram', 'whatsapp', 'messenger', 'full']).default('instagram')
      .describe('Which channel the user wants to connect. Instagram needs no Meta review and works same-day; WhatsApp needs Meta Business Verification, which takes 2-6 weeks, so prefer instagram unless the user specifically needs WhatsApp.') },
    { readOnlyHint: false, destructiveHint: false },
    async ({ platform }) => {
      try {
        const grant = await requestDeviceCode(platform);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              instructions: `Tell the user to open this link and approve: ${grant.verification_uri_complete}`,
              code: grant.user_code,
              link: grant.verification_uri_complete,
              expires_in_seconds: grant.expires_in,
              next_step: `Call check_setup with device_code="${grant.device_code}" after the user says they approved it, or to wait for them.`,
              device_code: grant.device_code,
              poll_interval_seconds: grant.interval,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'check_setup',
    'Check whether the user has approved the setup link from start_setup, and wait a short while if not. Once approved, the AI agent has a live InstantReply connection — tell the user to restart or reconnect this MCP server so the rest of the tools load.',
    { device_code: z.string().min(1).describe('The device_code returned by start_setup') },
    { readOnlyHint: false, destructiveHint: false },
    async ({ device_code }) => {
      try {
        const result = await waitForApproval(device_code, 5, 12);
        if (result.status === 'approved') {
          return {
            content: [{
              type: 'text' as const,
              text: 'Connected. Restart this MCP server (or reconnect in your client) to load the full tool set — conversations, messages, contacts, templates, and journeys.',
            }],
          };
        }
        if (result.status === 'expired') {
          return { content: [{ type: 'text' as const, text: 'That code expired. Call start_setup again for a new one.' }], isError: true };
        }
        if (result.status === 'denied') {
          return { content: [{ type: 'text' as const, text: 'Setup was cancelled in the browser. Call start_setup again to retry.' }], isError: true };
        }
        return {
          content: [{ type: 'text' as const, text: 'Still waiting — the user has not approved it yet. Ask them to open the link, or call check_setup again in a bit.' }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}

// ── Resources ─────────────────────────────────────────────────────────────────
// Only meaningful once paired — nothing to read before there's a workspace.

if (client) {
  const authedClient = client;

  server.resource(
    'conversation',
    new ResourceTemplate('conversation://{id}', { list: undefined }),
    async (uri, { id }) => {
      const data = await authedClient.get<unknown>(`/conversations/${encodeResourceId(id)}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        }],
      };
    },
  );

  server.resource(
    'contact',
    new ResourceTemplate('contact://{id}', { list: undefined }),
    async (uri, { id }) => {
      const data = await authedClient.get<unknown>(`/contacts/${encodeResourceId(id)}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        }],
      };
    },
  );
}

// ── Prompts ───────────────────────────────────────────────────────────────────

for (const prompt of prompts) {
  server.prompt(
    prompt.name,
    prompt.description,
    prompt.arguments.reduce<Record<string, z.ZodType>>((acc, arg) => {
      const value = z.string().max(50_000, 'Prompt input exceeds the 50,000 character limit');
      acc[arg.name] = arg.required ? value : value.optional();
      return acc;
    }, {}),
    (args) => ({
      messages: [{
        role: 'user',
        content: { type: 'text', text: prompt.template(args as Record<string, string>) },
      }],
    }),
  );
}

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
