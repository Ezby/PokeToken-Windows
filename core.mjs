import { readdir, open } from 'node:fs/promises';
import path from 'node:path';

export const LINES = [
  { name: '이상해씨', ids: [1, 2, 3], names: ['이상해씨', '이상해풀', '이상해꽃'] },
  { name: '파이리', ids: [4, 5, 6], names: ['파이리', '리자드', '리자몽'] },
  { name: '꼬부기', ids: [7, 8, 9], names: ['꼬부기', '어니부기', '거북왕'] },
];
export const TARGETS = [5_000_000, 25_000_000, 62_500_000, 100_000_000];
export const BALANCE_VERSION = 2;

// Retain stage progress from the original, much faster 1/250-scale curve.
export function migrateBalance(state) {
  if ((state.balanceVersion ?? 1) >= BALANCE_VERSION) return false;
  state.growth = Math.min(state.growth, 400_000) * 250;
  state.balanceVersion = BALANCE_VERSION;
  return true;
}

export function tokenTotal(line) {
  try {
    const record = JSON.parse(line);
    if (record.type !== 'event_msg' || record.payload?.type !== 'token_count') return null;
    const usage = record.payload.info?.total_token_usage;
    const value = usage?.total_tokens ?? (usage ? usage.input_tokens + usage.output_tokens : null);
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  } catch { return null; }
}

export function stage(growth, lineIndex = 0) {
  const line = LINES[lineIndex] || LINES[0];
  const index = TARGETS.findIndex(t => growth < t);
  if (index === -1) return { name: line.names[2], id: line.ids[2], level: 4, progress: 100, next: null, remaining: 0 };
  const floor = index === 0 ? 0 : TARGETS[index - 1];
  return { name: index === 0 ? '포켓몬 알' : line.names[index - 1], id: index === 0 ? null : line.ids[index - 1], level: index,
    progress: Math.min(100, (growth - floor) / (TARGETS[index] - floor) * 100),
    next: index === 0 ? '부화' : index === 3 ? '졸업' : '진화', remaining: TARGETS[index] - growth };
}

export async function logFiles(root) {
  const files = [];
  async function visit(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(full);
    }
  }
  await visit(root);
  return files;
}

// Cache byte offsets and only read appended bytes. Never store conversation text.
export async function scanUsage(root, cache) {
  const files = await logFiles(root);
  const active = new Set(files);
  for (const key of Object.keys(cache)) if (!active.has(key)) delete cache[key];
  let delta = 0;
  for (const file of files) {
    let handle;
    try {
      handle = await open(file, 'r');
      const stat = await handle.stat();
      let item = cache[file];
      if (!item || item.offset > stat.size) item = cache[file] = { offset: 0, last: 0 };
      if (item.offset === stat.size) continue;
      let pending = Buffer.alloc(0);
      const stream = handle.createReadStream({ start: item.offset, autoClose: false });
      for await (const chunk of stream) {
        pending = Buffer.concat([pending, chunk]);
        let split;
        while ((split = pending.indexOf(10)) !== -1) {
          const row = pending.subarray(0, split);
          item.offset += split + 1;
          pending = pending.subarray(split + 1);
          const total = tokenTotal(row.toString('utf8'));
          if (total === null) continue;
          // A decreasing counter denotes a new usage segment after a reset.
          delta += total >= item.last ? total - item.last : total;
          item.last = total;
        }
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    finally { await handle?.close(); }
  }
  return { delta, files: files.length };
}
