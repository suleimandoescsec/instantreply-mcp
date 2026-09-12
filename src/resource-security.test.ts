import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeResourceId } from './resource-security.js';

test('resource ids must be UUIDs before entering API paths', () => {
  const id = 'cb787175-3771-40ab-a57a-2f1bbb9bc56b';
  assert.equal(encodeResourceId(id), id);
  assert.throws(() => encodeResourceId('../developer/limits'), /valid UUID/);
  assert.throws(() => encodeResourceId(['cb787175-3771-40ab-a57a-2f1bbb9bc56b']), /single UUID/);
});
