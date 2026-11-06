import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import { scanUsage, stage, LINES } from './core.mjs';

const base = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.POKETOKEN_DATA_DIR || path.join(base, 'data');
const root = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');
const port = Number(process.env.POKETOKEN_PORT || 32145);
const origin = `http://127.0.0.1:${port}`;
const savePath = path.join(dataDir, 'save.json');
await mkdir(dataDir, { recursive: true });
let state;
try { state = JSON.parse(await readFile(savePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') {
    console.error('Save could not be read. Original file preserved. Restore data/save.json.bak if needed.');
    process.exit(1);
  }
  state = { version: 1, initialized: false, growth: 0, line: 0, collection: [], cache: {}, total: 0, started: new Date().toISOString() };
}
if (state.version !== 1 || !Number.isSafeInteger(state.growth) || !state.cache || !Array.isArray(state.collection)) throw new Error('Unsupported save format');
let status = { files: 0, error: null, updated: null };
async function save() {
  try { await copyFile(savePath, savePath + '.bak'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await writeFile(savePath + '.tmp', JSON.stringify(state), 'utf8');
  await rename(savePath + '.tmp', savePath);
}
let busy = null;
function refresh() {
  if (busy) return busy;
  busy = (async () => {
    try {
      const result = await scanUsage(root, state.cache);
      // Existing history establishes a baseline; new tokens feed this companion.
      if (state.initialized) { state.growth += result.delta; state.total += result.delta; }
      state.initialized = true;
      await save();
      status = { files: result.files, error: null, updated: new Date().toISOString() };
    } catch (error) { status.error = `사용량을 읽지 못했어요 (${error.code || '오류'}). 새로고침으로 다시 시도해 주세요.`; }
  })().finally(() => { busy = null; });
  return busy;
}
function view() { return { app: 'poketoken-windows', growth: state.growth, total: state.total, line: state.line, collection: state.collection,
  stage: stage(state.growth, state.line), lines: LINES, ...status }; }
const server = http.createServer(async (req, res) => {
  const json = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  if (req.headers.host !== `127.0.0.1:${port}`) return json(403, { error: 'Invalid host' });
  try {
    if (req.method === 'GET' && req.url === '/api/state') return json(200, view());
    if (req.method === 'POST') {
      if (req.headers.origin !== origin) return json(403, { error: 'Invalid origin' });
      if (req.url === '/api/refresh') { await refresh(); return json(200, view()); }
      if (req.url === '/api/graduate') {
        await refresh();
        if (state.growth < 400000) return json(409, { error: '아직 졸업할 수 없어요.' });
        state.collection.push({ ...stage(state.growth, state.line), date: new Date().toISOString() });
        state.growth = 0; state.line = (state.line + 1) % LINES.length;
        await save(); return json(200, view());
      }
      return json(404, { error: 'Not found' });
    }
    const file = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] }[req.url];
    if (req.method !== 'GET' || !file) return json(404, { error: 'Not found' });
    const body = await readFile(path.join(base, 'public', file[0]));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' https://raw.githubusercontent.com; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
    res.end(body);
  } catch { json(500, { error: '저장 또는 처리에 실패했어요. 앱 폴더의 쓰기 권한을 확인해 주세요.' }); }
});
await refresh();
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Already running: ${origin}` : error.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log(`PokeToken Windows: ${origin}`));
setInterval(refresh, 15000).unref();
