import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tools } from './tools.js';
import { prompts } from './prompts.js';
import { InstantReplyClient } from './client.js';
import { SERVER_INSTRUCTIONS, SETUP_SAY_TO_USER, SETUP_APPROVED_TEXT, withNotice } from './guide.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Nothing about money may reach an agent during the first 7 days; the end-of-period
// notice is injected server-side per org (backend), never shipped in static text.
const MONEY = /pric|paywall|trial|subscri|upgrade|\$\s?\d|\bpaid\b|\bbilling\b|checkout|\bfree period\b/i;

test('static tool descriptions, prompts, instructions and setup text never mention pricing or paywalls', () => {
  for (const tool of tools) assert.doesNotMatch(tool.description, MONEY, tool.name);
  for (const prompt of prompts) {
    const args = Object.fromEntries(prompt.arguments.map((a) => [a.name, 'x']));
    assert.doesNotMatch(prompt.description + prompt.template(args), MONEY, prompt.name);
  }
  for (const text of [SERVER_INSTRUCTIONS, SETUP_SAY_TO_USER, SETUP_APPROVED_TEXT]) assert.doesNotMatch(text, MONEY);
});

test('README says nothing about pricing, trials or subscriptions', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  assert.doesNotMatch(readme, MONEY);
  assert.match(readme, /Set up in 60 seconds/);
  for (const needle of ['npx', '-y', '@instantreply.co/mcp', 'https://api.instantreply.co/mcp', 'start_setup', 'check_setup', 'Claude Desktop', 'Claude Code', 'Cursor', 'VS Code', 'Windsurf', 'Codex']) {
    assert.ok(readme.includes(needle), needle);
  }
});

test('instructions guide the agent through pairing, channels and own integrations with real tools', () => {
  const names = new Set([...tools.map((t) => t.name), 'start_setup', 'check_setup', 'get_connection_guide']);
  for (const n of ['start_setup', 'check_setup', 'get_connection_guide', 'connect_channel', 'set_channel_ai_provider', 'list_channels']) {
    assert.ok(SERVER_INSTRUCTIONS.includes(n), n);
    assert.ok(names.has(n), `${n} is a real tool`);
  }
  assert.match(SERVER_INSTRUCTIONS, /STOP/);
  assert.match(SETUP_SAY_TO_USER, /link/i);
});

test('client captures the server notice header once and takeNotice clears it', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('{"ok":true}', {
    status: 200,
    headers: { 'x-instantreply-notice': encodeURIComponent('Hello, world & more') },
  })) as typeof fetch;
  try {
    const c = new InstantReplyClient('k', { baseUrl: 'http://x.test' });
    assert.equal(c.takeNotice(), null);
    await c.get('/channels');
    assert.equal(c.takeNotice(), 'Hello, world & more');
    assert.equal(c.takeNotice(), null);
  } finally { globalThis.fetch = original; }
});

test('withNotice appends one extra text block only when a notice exists', () => {
  const base = [{ type: 'text' as const, text: 'a' }];
  assert.deepEqual(withNotice(base, null), base);
  assert.deepEqual(withNotice(base, 'n'), [...base, { type: 'text', text: 'n' }]);
});

// ── skills ──
const skillsDir = join(root, 'skills');
const skillDirs = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];

test('the five required skills ship with valid frontmatter', () => {
  for (const n of ['instantreply-setup', 'instantreply-inbox-triage', 'instantreply-campaigns', 'instantreply-brand-voice-and-kb', 'instantreply-add-integration']) {
    assert.ok(skillDirs.includes(n), n);
    const md = readFileSync(join(skillsDir, n, 'SKILL.md'), 'utf8');
    const fm = /^---\r?\nname: (.+)\r?\ndescription: (.+)\r?\n---/.exec(md);
    assert.ok(fm, `${n} frontmatter`);
    assert.equal(fm![1].trim(), n);
    assert.ok(fm![2].length > 40);
  }
});

test('every snake_case identifier a SKILL.md puts in backticks is a real tool, tool parameter or prompt', () => {
  const known = new Set<string>(['start_setup', 'check_setup', 'get_connection_guide', 'device_code']);
  for (const t of tools) {
    known.add(t.name);
    for (const k of Object.keys(t.inputSchema.shape)) known.add(k);
  }
  // enum values such as custom_reply_webhook live in the schemas, so also accept any token in tools.ts itself
  for (const w of readFileSync(join(root, 'src', 'tools.ts'), 'utf8').split(/[^a-z0-9_]+/)) known.add(w);
  for (const p of prompts) known.add(p.name);
  const referenced = new Set<string>();
  for (const dir of skillDirs) {
    const md = readFileSync(join(skillsDir, dir, 'SKILL.md'), 'utf8');
    for (const m of md.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)) {
      referenced.add(m[1]);
      assert.ok(known.has(m[1]), `${dir}: \`${m[1]}\` is not a tool, parameter or prompt`);
    }
    assert.doesNotMatch(md, MONEY, dir);
    assert.match(md, /STOP|opt-in|consent/i, `${dir} must carry the compliance rules or point to them`);
  }
  assert.ok(referenced.has('start_setup') && referenced.has('list_channels') && referenced.has('set_channel_ai_provider'));
});

test('package files publish skills', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.files.includes('skills'));
});
