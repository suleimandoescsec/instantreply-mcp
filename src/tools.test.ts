import assert from 'node:assert/strict';
import test from 'node:test';
import { tools } from './tools.js';

test('all state-changing and outbound MCP tools declare destructiveHint', () => {
  const incorrectlyAnnotated = tools
    .filter((tool) => !tool.readOnly && !tool.destructive)
    .map((tool) => tool.name);

  assert.deepEqual(incorrectlyAnnotated, []);
});
