import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, appendFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('real server baselines history, grows, graduates, and restores without recounting', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'poketoken-server-'));
  const sessions = path.join(dir, 'sessions');
  await mkdir(sessions);
  const log = path.join(sessions, 'synthetic.jsonl');
  const event = n => JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: n } } } }) + '\n';
  await writeFile(log, event(50000));
  const port = 33000 + Math.floor(Math.random() * 10000);
  const origin = `http://127.0.0.1:${port}`;
  let child;
  async function start() {
    child = spawn(process.execPath, ['server.mjs'], {
      cwd: path.dirname(fileURLToPath(import.meta.url)),
      env: { ...process.env, CODEX_HOME: dir, POKETOKEN_DATA_DIR: path.join(dir, 'data'), POKETOKEN_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await Promise.race([
      new Promise((resolve, reject) => { child.stdout.on('data', text => { if (text.toString().includes('PokeToken Windows:')) resolve(); }); child.once('error', reject); child.once('exit', code => reject(Error('Server exited: ' + code))); }),
      new Promise((_, reject) => { const timer = setTimeout(() => reject(Error('Startup timed out')), 10000); timer.unref(); }),
    ]);
  }
  async function stop() { const exited = once(child, 'exit'); child.kill(); await exited; child = null; }
  async function post(route, headers = { Origin: origin }) { return fetch(origin + route, { method: 'POST', headers }); }
  try {
    await start();
    let state = await (await fetch(origin + '/api/state')).json();
    assert.equal(state.total, 0); assert.equal(state.files, 1);
    assert.equal((await post('/api/refresh', { Origin: 'https://example.com' })).status, 403);
    assert.equal((await post('/api/graduate')).status, 409);
    assert.equal((await post('/api/feed')).status, 409);
    const quotaEvent = n => JSON.stringify({ timestamp: new Date().toISOString(), type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: n } }, rate_limits: { limit_id: 'codex', primary: { used_percent: 100, window_minutes: 300, resets_at: Math.floor(Date.now() / 1000) + 3600 } } } }) + '\n';
    const rewardRecord = quotaEvent(50000);
    await appendFile(log, rewardRecord + rewardRecord);
    state = await (await post('/api/refresh')).json();
    assert.equal(state.berries, 1);
    assert.equal((await post('/api/feed')).status, 409);
    assert.equal((await post('/api/feed', { Origin: 'https://example.com' })).status, 403);
    await appendFile(log, event(450000));
    state = await (await post('/api/refresh')).json();
    assert.equal(state.stage.id, null);
    assert.equal((await post('/api/graduate')).status, 409);
    await appendFile(log, event(100050000));
    state = await (await post('/api/refresh')).json();
    assert.equal(state.growth, 100000000); assert.equal(state.stage.level, 4);
    state = await (await post('/api/feed')).json();
    assert.equal(state.berries, 0); assert.equal(state.affection, 10);
    assert.equal((await post('/api/feed')).status, 409);
    state = await (await post('/api/graduate')).json();
    assert.equal(state.collection[0].id, 3); assert.equal(state.growth, 0); assert.equal(state.line, 1);
    assert.equal(state.collection[0].affection, 10); assert.equal(state.affection, 0);
    await stop(); await start();
    state = await (await fetch(origin + '/api/state')).json();
    assert.equal(state.total, 100000000); assert.equal(state.collection.length, 1); assert.equal(state.growth, 0);
    assert.equal((await fetch(origin + '/data/save.json')).status, 404);
    assert.equal((await fetch(origin + '/')).status, 200);
  } finally {
    if (child) await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
