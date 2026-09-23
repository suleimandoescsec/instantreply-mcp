import assert from 'node:assert/strict';
import test from 'node:test';
import { tools } from './tools.js';

test('all state-changing and outbound MCP tools declare destructiveHint', () => {
  const incorrectlyAnnotated = tools
    .filter((tool) => !tool.readOnly && !tool.destructive)
    .map((tool) => tool.name);

  assert.deepEqual(incorrectlyAnnotated, []);
});

test('Barq tools: ask_barq and decide_approval are destructive, list_pending_approvals is read-only', () => {
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  assert.equal(byName.ask_barq?.destructive, true);
  assert.equal(byName.decide_approval?.destructive, true);
  assert.equal(byName.list_pending_approvals?.readOnly, true);
});

test('Barq tools call the /agent endpoints with a long timeout for chat', async () => {
  const calls: unknown[][] = [];
  const client: any = {
    post: async (...args: unknown[]) => { calls.push(['post', ...args]); return {}; },
    get: async (...args: unknown[]) => { calls.push(['get', ...args]); return {}; },
  };
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const id = '11111111-1111-4111-8111-111111111111';

  await byName.ask_barq!.handler(client, byName.ask_barq!.inputSchema.parse({ message: 'hi' }));
  await byName.list_pending_approvals!.handler(client, byName.list_pending_approvals!.inputSchema.parse({}));
  await byName.decide_approval!.handler(client, byName.decide_approval!.inputSchema.parse({ approval_id: id, decision: 'decline' }));

  assert.deepEqual(calls[0], ['post', '/agent/chat', { message: 'hi' }, 58_000]);
  assert.deepEqual(calls[1], ['get', '/agent/approvals?status=pending&limit=20']);
  assert.deepEqual(calls[2], ['post', `/agent/approvals/${id}/decide`, { decision: 'decline' }]);
  assert.throws(() => byName.decide_approval!.inputSchema.parse({ approval_id: 'nope', decision: 'approve' }));
});
