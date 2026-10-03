import assert from 'node:assert/strict';
import test from 'node:test';
import { InstantReplyClient } from './client.js';

test('client aborts requests that exceed its timeout', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  })) as typeof fetch;

  const client = new InstantReplyClient('test-key', {
    baseUrl: 'https://api.example.test',
    timeoutMs: 1_000,
  });

  await assert.rejects(client.get('/health'), /timed out after 1000ms/);
});

test('client rejects unreasonable timeout configuration', () => {
  assert.throws(() => new InstantReplyClient('test-key', { timeoutMs: 0 }), /between 1000 and 60000/);
  assert.throws(() => new InstantReplyClient('test-key', { timeoutMs: 60_001 }), /between 1000 and 60000/);
});

test('client treats 204 deletes as successful empty responses', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;
  const client = new InstantReplyClient('test-key', { baseUrl: 'https://api.example.test' });
  assert.equal(await client.delete('/channels/groups/group-1/providers/elevenlabs_tts'), undefined);
});
