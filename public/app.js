const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('ko-KR');
const sprite = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
let currentId;
function image(id, name) { const img = document.createElement('img'); img.src = sprite(id); img.alt = name; img.addEventListener('error', () => { img.replaceWith(document.createTextNode('🌿 ' + name)); }, { once: true }); return img; }
function render(data) {
  const s = data.stage;
  $('name').textContent = s.name;
  $('phase').textContent = ['알', '성장 중', '첫 진화', '최종 진화', '졸업 준비 완료'][s.level];
  $('species').textContent = s.id ? `NO. ${String(s.id).padStart(3, '0')} · YOUR CODING COMPANION` : 'YOUR NEXT ADVENTURE';
  $('flavor').textContent = s.id ? '오늘도 한 걸음, 함께 자라고 있어요.' : `${data.lines[data.line].name}와 만날 준비를 하고 있어요.`;
  if (currentId !== s.id) { if (s.id) $('creature').replaceChildren(image(s.id, s.name)); else $('creature').innerHTML = '<div class="egg"><i></i><b></b><em></em></div>'; currentId = s.id; }
  $('creature').setAttribute('aria-label', s.name);
  $('next').textContent = s.next ? `${s.next}까지` : '멋지게 자랐어요!';
  $('percent').textContent = `${s.progress.toFixed(1)}%`; $('progress').value = s.progress;
  $('remaining').textContent = s.next ? `${fmt(s.remaining)} tokens만큼의 시간이 더 필요해요` : '졸업하면 도감에 남고, 새로운 알을 만나요.';
  $('tokens').replaceChildren(document.createTextNode(fmt(data.total) + ' ')); const small = document.createElement('small'); small.textContent = 'tokens'; $('tokens').append(small);
  $('files').textContent = fmt(data.files) + '개';
  $('status').textContent = data.error || (data.files ? `${new Date(data.updated).toLocaleTimeString('ko-KR')} 확인 · 연결됨` : 'Codex를 사용하면 세션이 자동으로 연결돼요.');
  $('graduate').hidden = s.level !== 4;
  $('berry-count').textContent = fmt(data.berries);
  $('affection-value').textContent = `${data.affection} / 100`;
  $('affection').value = data.affection;
  $('feed').disabled = !s.id || data.berries < 1 || data.affection >= 100;
  $('berry-help').textContent = !s.id ? '부화한 뒤 열매를 먹일 수 있어요.' : data.affection >= 100 ? '마음이 가득 찼어요! ♥' : '열매 1개를 주면 호감도가 10 올라요.';
  for (const [slot, label] of [['primary', '5시간'], ['secondary', '주간']]) {
    const quota = data.limits[slot];
    const fresh = quota && quota.resetsAt * 1000 > Date.now();
    $(`limit-${slot}`).textContent = fresh ? `${label} ${quota.used}% · ${new Date(quota.resetsAt * 1000).toLocaleString('ko-KR')} 초기화` : `${label} 한도 · 새 Codex 기록을 기다리는 중`;
  }
  [...$('journey').children].forEach((el, i) => {
    el.classList.toggle('active', i <= s.level);
    if (i > 0) el.querySelector('small').textContent = `${fmt(data.targets[i - 1])} tokens`;
  });
  $('count').textContent = data.collection.length;
  if (data.collection.length) { $('collection').replaceChildren(...data.collection.map(p => { const el = document.createElement('div'); el.className = 'owned'; el.append(image(p.id, p.name)); const label = document.createElement('span'); label.textContent = `${p.name} · ♥ ${p.affection ?? 0}`; el.append(label); return el; })); }
}
async function request(action) {
  const options = action ? { method: 'POST' } : {};
  try { const response = await fetch(`/api/${action || 'state'}`, options); const data = await response.json(); if (!response.ok) throw Error(data.error); render(data); }
  catch (error) { $('status').textContent = error.message === 'Failed to fetch' ? '앱 연결이 끊겼어요. 실행 파일을 다시 열어 주세요.' : error.message; }
}
for (const [id, action] of [['refresh', 'refresh'], ['graduate', 'graduate'], ['feed', 'feed']]) $(id).onclick = async () => { $(id).disabled = true; try { await request(action); } finally { if (id !== 'feed') $(id).disabled = false; } };
request(); setInterval(() => request(), 15000);
