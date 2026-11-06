export function initializeRewards(state, now = Date.now()) {
  state.berries ??= 0;
  state.affection ??= 0;
  state.rewardedWindows ??= {};
  state.rewardsSince ??= now;
  state.limits ??= {};
}

// Use Codex's recorded quota events, never infer a quota from token counts.
export function applyLimits(state, record, now = Date.now()) {
  const limits = record.payload?.rate_limits;
  const observed = Date.parse(record.timestamp);
  if (!limits || (limits.limit_id && limits.limit_id !== 'codex') || !Number.isFinite(observed)) return;
  for (const [slot, minutes, reward] of [['primary', 300, 1], ['secondary', 10080, 5]]) {
    const quota = limits[slot];
    if (!quota || quota.window_minutes !== minutes || !Number.isFinite(quota.used_percent) || quota.used_percent < 0 || quota.used_percent > 100 || !Number.isSafeInteger(quota.resets_at)) continue;
    if (observed < (state.limits[slot]?.observed ?? 0)) continue;
    state.limits[slot] = { used: quota.used_percent, resetsAt: quota.resets_at, observed };
    const key = `${slot}:${quota.resets_at}`;
    if (observed >= state.rewardsSince && quota.resets_at * 1000 > now && quota.used_percent === 100 && !state.rewardedWindows[key]) {
      state.berries += reward;
      state.rewardedWindows[key] = true;
    }
  }
}

export function feedBerry(state, hatched) {
  if (!hatched) return '알은 아직 열매를 먹을 수 없어요.';
  if (state.affection >= 100) return '이미 호감도가 가득 찼어요.';
  if (state.berries < 1) return '열매가 없어요. Codex 한도를 채우면 받을 수 있어요.';
  state.berries -= 1;
  state.affection = Math.min(100, state.affection + 10);
  return null;
}
