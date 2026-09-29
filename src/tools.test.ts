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

test('knowledge and follow-up MCP tools submit proposals through Barq, never write directly', async () => {
  const calls: unknown[][] = [];
  const client: any = {
    post: async (...args: unknown[]) => { calls.push(args); return { pending_approvals: [{ id: 'approval-1' }] }; },
  };
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const knowledge = { type: 'faq', title: 'Pricing', content: 'Consultations start at AED 200.' };
  const followup = { name: 'Price follow-up', trigger_value: '2h', response_template: 'Answer using verified pricing.' };

  assert.equal(byName.propose_knowledge_entry?.destructive, true);
  assert.equal(byName.propose_follow_up_rule?.destructive, true);
  assert.deepEqual(await byName.propose_knowledge_entry!.handler(client, knowledge), { pending_approvals: [{ id: 'approval-1' }] });
  assert.deepEqual(await byName.propose_follow_up_rule!.handler(client, followup), { pending_approvals: [{ id: 'approval-1' }] });
  assert.equal(calls.length, 2);
  for (const [path, body, timeout] of calls) {
    assert.equal(path, '/agent/chat');
    assert.equal((body as any).persona, 'whatsapp');
    assert.match((body as any).message, /owner approval/i);
    assert.equal(timeout, 58_000);
  }
  assert.match((calls[0]![1] as any).message, /"title":"Pricing"/);
  assert.match((calls[1]![1] as any).message, /"trigger_value":"2h"/);
  assert.throws(() => byName.propose_follow_up_rule!.inputSchema.parse({ ...followup, trigger_value: 'soon' }));
});

test('keyword automation tools carry one channel scope through the API', async () => {
  const calls: unknown[][] = [];
  const client: any = {
    get: async (...args: unknown[]) => { calls.push(['get', ...args]); return { data: [] }; },
    post: async (...args: unknown[]) => { calls.push(['post', ...args]); return { id: 'rule-1' }; },
    patch: async (...args: unknown[]) => { calls.push(['patch', ...args]); return { id: 'rule-1' }; },
    delete: async (...args: unknown[]) => { calls.push(['delete', ...args]); return undefined; },
  };
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const channel = '11111111-1111-4111-8111-111111111111';
  const id = '22222222-2222-4222-8222-222222222222';
  await byName.list_keyword_automations!.handler(client, { integration_id: channel });
  await byName.create_keyword_automation!.handler(client, { name: 'Pricing', trigger_value: 'price', integration_id: channel, action_type: 'reply', response_template: 'Our prices start at AED 200.' });
  await byName.update_keyword_automation!.handler(client, { id, updates: { is_active: false } });
  await byName.delete_keyword_automation!.handler(client, { id });
  assert.equal(calls[0]![1], `/automations?integration_id=${channel}`);
  assert.deepEqual(calls[1], ['post', '/automations', { name: 'Pricing', trigger_value: 'price', integration_id: channel, action_type: 'reply', response_template: 'Our prices start at AED 200.', trigger_type: 'keyword' }]);
  assert.deepEqual(calls[2], ['patch', `/automations/${id}`, { is_active: false }]);
  assert.deepEqual(calls[3], ['delete', `/automations/${id}`]);
  assert.equal(byName.create_keyword_automation!.destructive, true);
  assert.throws(() => byName.create_keyword_automation!.inputSchema.parse({ name: 'Bad', trigger_value: 'x', integration_id: 'no', action_type: 'reply', response_template: 'x' }));
  assert.throws(() => byName.create_keyword_automation!.inputSchema.parse({ name: 'Unscoped button', trigger_type: 'postback', trigger_value: 'booking:ok', action_type: 'reply', response_template: 'Done.' }));
  await byName.create_keyword_automation!.handler(client, { name: 'Confirm booking', trigger_type: 'postback', trigger_value: 'booking:confirm:v1', integration_id: channel, action_type: 'reply', response_template: 'Confirmed.' });
  assert.deepEqual(calls[4], ['post', '/automations', { name: 'Confirm booking', trigger_type: 'postback', trigger_value: 'booking:confirm:v1', integration_id: channel, action_type: 'reply', response_template: 'Confirmed.' }]);
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
