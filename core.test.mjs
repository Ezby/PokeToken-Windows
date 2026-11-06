import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, appendFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scanUsage, stage, tokenTotal } from './core.mjs';
const event = n => JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: n } } } });
test('only accepts valid cumulative token events', () => {
  assert.equal(tokenTotal(event(123)), 123);
  assert.equal(tokenTotal('invalid'), null);
  assert.equal(tokenTotal(event(-1)), null);
  assert.equal(tokenTotal('{"type":"message","total_tokens":900}'), null);
});
test('stage boundaries and graduation match growth', () => {
  assert.equal(stage(19999).id, null);
  assert.equal(stage(20000).id, 1);
  assert.equal(stage(100000, 1).id, 5);
  assert.equal(stage(250000, 2).id, 9);
  assert.equal(stage(400000).level, 4);
  assert.equal(stage(60000).progress, 50);
});
test('incremental scans survive partial writes, restarts, repeats, and counter resets', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'poketoken-test-'));
  try {
    const file = path.join(dir, 'session.jsonl'); const cache = {};
    await writeFile(file, event(100) + '\n' + event(150) + '\n');
    assert.equal((await scanUsage(dir, cache)).delta, 150);
    assert.equal((await scanUsage(dir, cache)).delta, 0);
    const row = event(200);
    await appendFile(file, row.slice(0, 20));
    assert.equal((await scanUsage(dir, cache)).delta, 0);
    await appendFile(file, row.slice(20) + '\n' + event(200) + '\n' + event(20) + '\n');
    assert.equal((await scanUsage(dir, JSON.parse(JSON.stringify(cache)))).delta, 70);
    await writeFile(file, event(10) + '\n');
    assert.equal((await scanUsage(dir, cache)).delta, 10);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
