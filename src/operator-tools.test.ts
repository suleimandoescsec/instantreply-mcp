import test from 'node:test';
import assert from 'node:assert/strict';
import { operatorTools } from './operator-tools.js';
const byName = Object.fromEntries(operatorTools.map(tool => [tool.name, tool]));

test('broadcast drafts cannot schedule sends or fabricate opt-in', async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const draft = { name: 'New offer', templateId: id, integrationId: id, audience: { kind: 'everyone' } };
  assert.equal(byName.create_broadcast_draft.inputSchema.safeParse({ ...draft, scheduledAt: '2030-01-01T00:00:00Z' }).success, false);
  const calls: unknown[][] = [];
  await byName.create_broadcast_draft.handler({ post: async (...args: unknown[]) => { calls.push(args); } } as any, draft);
  assert.deepEqual(calls, [['/broadcasts', draft]]);
  assert.equal(byName.launch_broadcast.inputSchema.safeParse({ id, approved: true, expectedEligibleCount: 10 }).success, false);
  assert.equal(byName.launch_broadcast.inputSchema.safeParse({ id, approved: false, expectedEligibleCount: 10, maxEstimatedCostUsd: 1 }).success, false);
});

test('workspace pane paths use real resources and returned data', async () => {
  const paths: string[] = [];
  const client = { get: async (path: string) => { paths.push(path); return { data: [{ id: 'from-api' }] }; } } as any;
  for (const view of ['inbox', 'comments', 'channels', 'automations', 'lead_magnets', 'broadcasts', 'leads', 'journeys']) {
    const result = await byName.open_workspace.handler(client, { view }) as any;
    assert.equal(result.view, view); assert.equal(result.snapshot.data[0].id, 'from-api');
  }
  assert.deepEqual(paths, ['/conversations?limit=20', '/comments?limit=20', '/channels', '/automations', '/lead-magnets', '/broadcasts', '/pipeline/leads?limit=20', '/journeys?status=all']);
});

test('post identifiers are encoded and previews never use the publish endpoint', async () => {
  const calls: unknown[][] = [];
  const client = { post: async (...args: unknown[]) => { calls.push(args); return {}; } } as any;
  await byName.pause_lead_magnet.handler(client, { postId: 'post/id?foo' });
  await byName.preview_lead_magnet.handler(client, { postId: 'p' });
  assert.deepEqual(calls, [['/lead-magnets/post%2Fid%3Ffoo/pause', {}], ['/lead-magnets/preview', { postId: 'p' }]]);
});

test('workspace pagination encodes cursors and refuses them on non-paginated views', async()=>{
  const paths:string[]=[];const client={get:async(path:string)=>{paths.push(path);return{data:[],next_cursor:null};}} as any;
  await byName.open_workspace.handler(client,{view:'comments',cursor:'v1.test&platform=other'});
  assert.equal(paths[0],'/comments?limit=20&cursor=v1.test%26platform%3Dother');
  await assert.rejects(()=>byName.open_workspace.handler(client,{view:'channels',cursor:'unexpected'}),/does not use cursor/);
  assert.equal(paths.length,1);
});
