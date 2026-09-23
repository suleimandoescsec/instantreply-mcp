import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// setup.ts reads homedir() at import time to build CONFIG_PATH, so point
// HOME/USERPROFILE at a scratch dir before importing — a real run must never
// touch the developer's actual ~/.instantreply/config.json.
const scratchHome = mkdtempSync(join(tmpdir(), 'instantreply-mcp-test-'));
process.env.HOME = scratchHome;
process.env.USERPROFILE = scratchHome;

const { readStoredApiKey, pollDeviceToken, requestDeviceCode } = await import('./setup.js');

test('readStoredApiKey returns undefined when no config file exists yet', () => {
  assert.equal(readStoredApiKey(), undefined);
});

test('pollDeviceToken surfaces authorization_pending as a typed pending status, not a thrown error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: false, error: { code: 'authorization_pending' } }), { status: 400 })
  ) as typeof fetch;

  try {
    const result = await pollDeviceToken('fake-device-code');
    assert.deepEqual(result, { status: 'pending' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('pollDeviceToken throws on a genuinely unexpected server error rather than silently pending forever', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response('', { status: 500 })) as typeof fetch;

  try {
    await assert.rejects(() => pollDeviceToken('fake-device-code'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requestDeviceCode passes persona through only when given', async () => {
  const originalFetch = globalThis.fetch;
  const bodies: any[] = [];
  globalThis.fetch = (async (_url: unknown, init: any) => {
    bodies.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ success: true, data: { device_code: 'd', user_code: 'U', verification_uri: 'v', verification_uri_complete: 'vc', expires_in: 1, interval: 1 } }), { status: 201 });
  }) as typeof fetch;

  try {
    await requestDeviceCode('whatsapp', 'business');
    await requestDeviceCode('instagram');
    assert.equal(bodies[0].persona, 'business');
    assert.equal(bodies[0].requested_platform, 'whatsapp');
    assert.equal('persona' in bodies[1], false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test.after(() => {
  rmSync(scratchHome, { recursive: true, force: true });
});
