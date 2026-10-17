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

test('client surfaces the API message and code, not just the HTTP status text', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const answer = (status: number, statusText: string, body: unknown) => (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, statusText })) as typeof fetch;
  const client = new InstantReplyClient('test-key', { baseUrl: 'https://api.example.test' });

  // the shape the real API uses: top-level message (+ code when it is a specific one)
  globalThis.fetch = answer(403, 'Forbidden', { status: 'error', code: 'ERROR', message: 'Test keys can only use documented sandbox simulation endpoints. Use a live key for tenant data and live operations.' });
  await assert.rejects(client.get('/channels'), (e: Error) => e.message === 'InstantReply API error 403: Test keys can only use documented sandbox simulation endpoints. Use a live key for tenant data and live operations.');

  globalThis.fetch = answer(422, 'Unprocessable Entity', { status: 'error', code: 'API_KEY_LIMIT_REACHED', message: 'API key limit reached for this plan. Revoke an active key or upgrade.' });
  await assert.rejects(client.get('/keys'), (e: Error) => e.message === 'InstantReply API error 422: API key limit reached for this plan. Revoke an active key or upgrade. [API_KEY_LIMIT_REACHED]');

  // older nested shape still works
  globalThis.fetch = answer(400, 'Bad Request', { error: { message: 'to is required' } });
  await assert.rejects(client.get('/x'), /InstantReply API error 400: to is required$/);

  // request validation: which field is wrong and why, capped at three, so the agent can fix its call
  globalThis.fetch = answer(400, 'Bad Request', { status: 'error', code: 'VALIDATION_ERROR', message: 'Validation failed', errors: [{ field: 'message', message: 'String must contain at most 8000 character(s)' }, { message: 'Required' }, { field: 'a', message: 'x' }, { field: 'b', message: 'dropped' }, null, 7] });
  await assert.rejects(client.post('/agent/chat', {}), (e: Error) => e.message === 'InstantReply API error 400: Validation failed [VALIDATION_ERROR] (message: String must contain at most 8000 character(s); Required; a: x)');
  globalThis.fetch = answer(400, 'Bad Request', { message: 'Validation failed', errors: 'not-an-array' });
  await assert.rejects(client.get('/x'), /InstantReply API error 400: Validation failed$/);

  // no usable body: fall back to the status text, never throw a parse error or print "undefined"
  globalThis.fetch = answer(502, 'Bad Gateway', '<html>upstream</html>');
  await assert.rejects(client.get('/x'), /InstantReply API error 502: Bad Gateway$/);
  globalThis.fetch = answer(404, 'Not Found', { message: '' });
  await assert.rejects(client.get('/x'), /InstantReply API error 404: Not Found$/);
});

test('client treats 204 deletes as successful empty responses', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;
  const client = new InstantReplyClient('test-key', { baseUrl: 'https://api.example.test' });
  assert.equal(await client.delete('/channels/groups/group-1/providers/elevenlabs_tts'), undefined);
});
