import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeRewards, applyLimits, feedBerry } from './rewards.mjs';
const now = Date.parse('2026-11-07T00:00:00Z');
function record(used, options = {}) {
  return { timestamp: new Date(now).toISOString(), payload: { rate_limits: { limit_id: 'codex', primary: { used_percent: used, window_minutes: 300, resets_at: now / 1000 + 3600 }, ...options } } };
}
test('quota rewards survive restart and cannot repeat within a reset window', () => {
  let state = {}; initializeRewards(state, now);
  applyLimits(state, record(99), now); assert.equal(state.berries, 0);
  applyLimits(state, record(100), now); assert.equal(state.berries, 1);
  state = JSON.parse(JSON.stringify(state)); initializeRewards(state, now);
  for (const used of [100, 90, 100, 100]) applyLimits(state, record(used), now);
  assert.equal(state.berries, 1);
  applyLimits(state, record(100, { secondary: { used_percent: 100, window_minutes: 10080, resets_at: now / 1000 + 604800 } }), now);
  assert.equal(state.berries, 6);
  applyLimits(state, record(100, { primary: { used_percent: 100, window_minutes: 300, resets_at: now / 1000 + 7200 } }), now);
  assert.equal(state.berries, 7);
});
test('old, expired, malformed, and unrelated quota records do not reward berries', () => {
  const state = {}; initializeRewards(state, now + 1);
  applyLimits(state, record(100), now); assert.equal(state.berries, 0);
  initializeRewards(state, now); state.rewardsSince = now;
  applyLimits(state, record(100), now + 3600001);
  applyLimits(state, record(100, { limit_id: 'another-provider' }), now);
  applyLimits(state, record(101), now);
  applyLimits(state, { timestamp: 'invalid', payload: record(100).payload }, now);
  applyLimits(state, record(100, { primary: { used_percent: 100, window_minutes: 60, resets_at: now / 1000 + 3600 } }), now);
  assert.equal(state.berries, 0);
});
test('feeding requires a hatched companion, consumes one berry, caps friendship', () => {
  const state = { berries: 2, affection: 95 }; initializeRewards(state, now);
  assert.ok(feedBerry(state, false)); assert.equal(state.berries, 2);
  assert.equal(feedBerry(state, true), null); assert.equal(state.affection, 100); assert.equal(state.berries, 1);
  assert.ok(feedBerry(state, true)); assert.equal(state.berries, 1);
  state.affection = 0; state.berries = 0;
  assert.ok(feedBerry(state, true)); assert.equal(state.affection, 0);
});
