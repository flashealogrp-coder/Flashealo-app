import test from 'node:test';
import assert from 'node:assert/strict';
import { formatoBytes } from './bytes.js';

test('formatoBytes en español', () => {
  assert.equal(formatoBytes(0), '0 B');
  assert.equal(formatoBytes(850 * 1024 ** 2), '850 MB');
  assert.equal(formatoBytes(12.4 * 1024 ** 3), '12,4 GB');
  assert.equal(formatoBytes(50 * 1024 ** 3), '50,0 GB');
  assert.equal(formatoBytes(1.5 * 1024 ** 4), '1,5 TB');
  assert.equal(formatoBytes(null), '0 B');
  assert.equal(formatoBytes(-1), '—');
});
