#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createInstantReplyServer } from './server.js';
import { readStoredApiKey } from './setup.js';

// Zero-key start: an env var wins if set (CI, Docker, power users), else fall
// back to whatever a previous `start_setup` run already stored locally, so
// `npx @instantreply.co/mcp` works with nothing configured at all — the whole
// point of a friendly first run is not making someone find a settings page
// before the agent can do anything.
const apiKey = process.env.INSTANTREPLY_API_KEY ?? readStoredApiKey();

await createInstantReplyServer({ apiKey }).connect(new StdioServerTransport());
