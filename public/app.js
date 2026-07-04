const STORAGE_KEY = 'stream-wall:v2';
const PRESET_KEY = 'stream-wall:presets:v1';

const state = {
  streams: [],
  parked: [],
  settings: {
    columns: 'auto',
    compact: false,
    muteNew: true
  }
};

const form = document.querySelector('#addForm');
const platform = document.querySelector('#platform');
const streamInput = document.querySelector('#streamInput');
const grid = document.querySelector('#grid');
const parkedSection = document.querySelector('#parkedSection');
const parkedGrid = document.querySelector('#parkedGrid');
const notice = document.querySelector('#notice');
const columns = document.querySelector('#columns');
const compactMode = document.querySelector('#compactMode');
const muteNew = document.querySelector('#muteNew');
const emptyTemplate = document.querySelector('#emptyTemplate');
const viewerMode = document.querySelector('#viewerMode');
const exitViewerMode = document.querySelector('#exitViewerMode');
const copyLink = document.querySelector('#copyLink');
const reloadAll = document.querySelector('#reloadAll');
const clearStreams = document.querySelector('#clearStreams');
const presetList = document.querySelector('#presetList');
const savePreset = document.querySelector('#savePreset');
const loadPreset = document.querySelector('#loadPreset');
const deletePreset = document.querySelector('#deletePreset');

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = !message;
}

function snapshot() {
  return {
    streams: state.streams,
    parked: state.parked,
    settings: state.settings
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
}

function encodeLayout(data) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeLayout(value) {
  return JSON.parse(decodeURIComponent(escape(atob(value))));
}

function applySnapshot(data) {
  if (!data || !Array.isArray(data.streams)) return false;
  state.streams = data.streams.map(normalizeStream);
  state.parked = Array.isArray(data.parked) ? data.parked.map(normalizeStream) : [];
  if (data.settings) state.settings = { ...state.settings, ...data.settings };
  return true;
}

function normalizeStream(stream) {
  return {
    localId: stream.localId || uid(),
    type: stream.type,
    id: stream.id,
    label: stream.label || `${stream.type} ${stream.id}`,
    muted: Boolean(stream.muted)
  };
}

function restore() {
  const params = new URLSearchParams(window.location.search);
  const shared = params.get('layout');

  if (shared) {
    try {
      if (applySnapshot(decodeLayout(shared))) {
        persist();
        if (params.get('view') === '1') document.body.classList.add('viewer');
        return;
      }
    } catch {
      showNotice('공유된 배치를 불러오지 못했습니다.');
    }
  }

  try {
    applySnapshot(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {}
}

function getPresets() {
  try {
    const presets = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
    return Array.isArray(presets) ? presets : [];
  } catch {
    return [];
  }
}

function setPresets(presets) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

function renderPresets() {
  const current = presetList.value;
  presetList.innerHTML = '<option value="">프리셋 선택</option>';
  for (const preset of getPresets()) {
    const option = document.createElement('option');
    option.value = preset.name;
    option.textContent = preset.name;
    presetList.append(option);
  }
  presetList.value = current;
}

function cleanInput(raw) {
  return raw.trim().replace(/^https?:\/\/mul\.live\//i, '').replace(/^\/+|\/+$/g, '');
}

function splitStreamInputs(raw) {
  const trimmed = raw.trim();
  const cleaned = cleanInput(trimmed);
  if (!cleaned) return [];

  const isUrl = /^https?:\/\//i.test(trimmed) && !/^https?:\/\/mul\.live\//i.test(trimmed);
  if (isUrl) return [trimmed];

  return cleaned.split('/').map((part) => part.trim()).filter(Boolean);
}

function parseYouTubeId(value) {
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v');
      return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
    }
  } catch {}

  return null;
}

function detectPlatform(value, selected) {
  if (selected !== 'auto') return selected;
  if (value.startsWith('y:') || value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
  if (value.startsWith('t:') || value.includes('twitch.tv')) return 'twitch';
  if (value.includes('chzzk.naver.com') || /^[0-9a-f]{32}$/i.test(value)) return 'chzzk';
  if (value.includes('sooplive') || value.includes('afreecatv') || /^(?:[as]c?:)?[a-z0-9]{3,12}$/i.test(value)) return 'soop';
  return 'url';
}

function extractPathId(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts.at(-1) || value;
  } catch {
    return value;
  }
}

function normalizeTwitch(value) {
  const cleaned = value.replace(/^t:/i, '').trim();
  try {
    const url = new URL(cleaned);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[0] || '';
  } catch {
    return cleaned;
  }
}

function normalizeSoop(value) {
  const cleaned = value.replace(/^(?:[as]c?:)/i, '').trim();
  try {
    const url = new URL(cleaned);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[0] || parts.at(-1) || '';
  } catch {
    return cleaned;
  }
}

function buildFrame(stream) {
  const mute = stream.muted ? '1' : '0';
  const parent = window.location.hostname || 'localhost';

  switch (stream.type) {
    case 'youtube':
      return `https://www.youtube.com/embed/${encodeURIComponent(stream.id)}?autoplay=1&mute=${mute}`;
    case 'chzzk':
      return `https://chzzk.naver.com/live/${encodeURIComponent(stream.id)}`;
    case 'soop':
      return `https://play.sooplive.com/${encodeURIComponent(stream.id)}/direct?fromApi=1`;
    case 'twitch':
      return `https://player.twitch.tv/?channel=${encodeURIComponent(stream.id)}&parent=${encodeURIComponent(parent)}&muted=${stream.muted ? 'true' : 'false'}`;
    default:
      return stream.id;
  }
}

function buildOriginalUrl(stream) {
  switch (stream.type) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${encodeURIComponent(stream.id)}`;
    case 'chzzk':
      return `https://chzzk.naver.com/live/${encodeURIComponent(stream.id)}`;
    case 'soop':
      return `https://play.sooplive.com/${encodeURIComponent(stream.id)}`;
    case 'twitch':
      return `https://www.twitch.tv/${encodeURIComponent(stream.id)}`;
    default:
      return stream.id;
  }
}

async function createStream(raw, selectedPlatform) {
  const value = cleanInput(raw);
  const type = detectPlatform(value, selectedPlatform);

  if (!value) throw new Error('주소 또는 ID를 입력해주세요.');

  if (type === 'youtube') {
    const target = value.replace(/^y:/i, '');
    const directId = parseYouTubeId(target);
    if (directId) {
      return { localId: uid(), type, id: directId, label: `YouTube ${directId}`, muted: state.settings.muteNew };
    }

    showNotice('유튜브 채널의 현재 라이브 영상을 찾는 중입니다.');
    const res = await fetch(`/api/youtube-live?target=${encodeURIComponent(target)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '유튜브 라이브 영상을 찾지 못했습니다.');
    return { localId: uid(), type, id: data.id, label: `YouTube ${target}`, muted: state.settings.muteNew };
  }

  if (type === 'chzzk') {
    const id = extractPathId(value);
    if (!/^[0-9a-f]{32}$/i.test(id)) throw new Error('치지직은 32자리 채널 UID가 필요합니다.');
    return { localId: uid(), type, id, label: `CHZZK ${id}`, muted: state.settings.muteNew };
  }

  if (type === 'soop') {
    const id = normalizeSoop(value);
    if (!/^[a-z0-9]{3,12}$/i.test(id)) throw new Error('SOOP 아이디 형식이 맞지 않습니다.');
    return { localId: uid(), type, id, label: `SOOP ${id}`, muted: state.settings.muteNew };
  }

  if (type === 'twitch') {
    const id = normalizeTwitch(value);
    if (!/^[a-z0-9_]{4,25}$/i.test(id)) throw new Error('트위치 아이디 형식이 맞지 않습니다.');
    return { localId: uid(), type, id, label: `Twitch ${id}`, muted: state.settings.muteNew };
  }

  try {
    const url = new URL(value);
    return { localId: uid(), type: 'url', id: url.href, label: url.hostname, muted: state.settings.muteNew };
  } catch {
    throw new Error('플랫폼을 자동 감지하지 못했습니다.');
  }
}

function reloadFrames() {
  for (const tile of grid.querySelectorAll('.tile')) {
    const stream = state.streams.find((item) => item.localId === tile.dataset.id);
    const iframe = tile.querySelector('iframe');
    if (stream && iframe) iframe.src = buildFrame(stream);
  }
}

function moveStream(localId, direction) {
  const index = state.streams.findIndex((stream) => stream.localId === localId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.streams.length) return;
  const [stream] = state.streams.splice(index, 1);
  state.streams.splice(nextIndex, 0, stream);
  syncTileOrder();
  persist();
  applyGridLayout();
}

function syncTileOrder() {
  for (const stream of state.streams) {
    const tile = grid.querySelector(`[data-id="${CSS.escape(stream.localId)}"]`);
    if (tile) grid.append(tile);
  }
}

function pinStream(localId) {
  const index = state.streams.findIndex((stream) => stream.localId === localId);
  if (index <= 0) {
    state.settings.columns = 'auto';
    applyGridLayout();
    persist();
    return;
  }

  const [stream] = state.streams.splice(index, 1);
  state.streams.unshift(stream);
  state.settings.columns = 'auto';
  syncTileOrder();
  applyGridLayout();
  columns.value = state.settings.columns;
  persist();
}

function renameStream(stream, title) {
  stream.label = title;
  persist();
}

function cycleColumns() {
  const values = ['auto', '1', '2', '3', '4'];
  const index = values.indexOf(state.settings.columns);
  state.settings.columns = values[(index + 1) % values.length];
  persist();
  render();
}

function enterViewerMode() {
  document.body.classList.add('viewer');
  if (document.fullscreenEnabled && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function exitViewer() {
  document.body.classList.remove('viewer');
}

function render() {
  grid.innerHTML = '';
  applyGridLayout();

  columns.value = state.settings.columns;
  compactMode.checked = state.settings.compact;
  muteNew.checked = state.settings.muteNew;

  if (state.streams.length === 0) {
    grid.append(emptyTemplate.content.cloneNode(true));
    renderParked();
    return;
  }

  for (const stream of state.streams) {
    grid.append(createTile(stream));
  }
  renderParked();
}

function applyGridLayout() {
  const count = state.streams.length;
  const useSmartLayout = state.settings.columns === 'auto' && count >= 1 && count <= 9;

  grid.className = 'stream-grid';
  grid.classList.toggle('compact', state.settings.compact);
  grid.classList.toggle('fixed', state.settings.columns !== 'auto');
  grid.classList.toggle('smart-layout', useSmartLayout);

  if (useSmartLayout) {
    grid.classList.add(`count-${count}`);
    grid.style.removeProperty('--columns');
  } else {
    grid.style.setProperty('--columns', state.settings.columns === 'auto' ? 'auto-fit' : state.settings.columns);
  }
}

function createTile(stream) {
  const tile = document.createElement('article');
  tile.className = 'tile';
  tile.dataset.id = stream.localId;

  const header = document.createElement('div');
  header.className = 'tile-header';

  const title = document.createElement('div');
  title.className = 'tile-title';
  title.textContent = stream.label;

  const actions = document.createElement('div');
  actions.className = 'tile-actions';

  const original = document.createElement('button');
  original.type = 'button';
  original.title = '원본 페이지 열기';
  original.className = 'text-action';
  original.textContent = '원본';
  original.addEventListener('click', () => {
    window.open(buildOriginalUrl(stream), '_blank', 'noopener,noreferrer');
  });

  const rename = document.createElement('button');
  rename.type = 'button';
  rename.title = '제목 변경';
  rename.textContent = 'T';
  rename.addEventListener('click', () => {
    const nextTitle = prompt('타일 제목', stream.label);
    if (!nextTitle) return;
    renameStream(stream, nextTitle.trim());
    title.textContent = stream.label;
  });

  const wide = document.createElement('button');
  wide.type = 'button';
  wide.title = '큰 화면으로 고정';
  wide.textContent = 'W';
  wide.addEventListener('click', () => {
    pinStream(stream.localId);
    showNotice(`${stream.label} 타일을 큰 화면으로 고정했습니다.`);
  });

  const fullscreen = document.createElement('button');
  fullscreen.type = 'button';
  fullscreen.title = '타일 전체화면';
  fullscreen.textContent = 'F';
  fullscreen.addEventListener('click', () => {
    if (tile.requestFullscreen) tile.requestFullscreen().catch(() => {});
  });

  const up = document.createElement('button');
  up.type = 'button';
  up.title = '왼쪽/위로 이동';
  up.textContent = '<';
  up.addEventListener('click', () => moveStream(stream.localId, -1));

  const down = document.createElement('button');
  down.type = 'button';
  down.title = '오른쪽/아래로 이동';
  down.textContent = '>';
  down.addEventListener('click', () => moveStream(stream.localId, 1));

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.title = '새로고침';
  reload.textContent = 'R';
  reload.addEventListener('click', () => {
    const iframe = tile.querySelector('iframe');
    iframe.src = buildFrame(stream);
  });

  const toggleMute = document.createElement('button');
  toggleMute.type = 'button';
  toggleMute.title = stream.muted ? '다음 로드부터 소리 켜기' : '다음 로드부터 음소거';
  toggleMute.textContent = stream.muted ? 'M' : 'A';
  toggleMute.addEventListener('click', () => {
    stream.muted = !stream.muted;
    toggleMute.title = stream.muted ? '다음 로드부터 소리 켜기' : '다음 로드부터 음소거';
    toggleMute.textContent = stream.muted ? 'M' : 'A';
    persist();
  });

  const park = document.createElement('button');
  park.type = 'button';
  park.title = '보관한 방송으로 내리기';
  park.className = 'text-action';
  park.textContent = '보관';
  park.addEventListener('click', () => parkStream(stream.localId, tile));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.title = '삭제';
  remove.className = 'remove';
  remove.textContent = 'X';
  remove.addEventListener('click', () => {
    state.streams = state.streams.filter((item) => item.localId !== stream.localId);
    tile.remove();
    if (state.streams.length === 0) render();
    else applyGridLayout();
    persist();
  });

  actions.append(original, rename, wide, fullscreen, up, down, reload, toggleMute, park, remove);
  header.append(title, actions);

  const wrap = document.createElement('div');
  wrap.className = 'frame-wrap';

  const iframe = document.createElement('iframe');
  iframe.src = buildFrame(stream);
  iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.title = stream.label;

  wrap.append(iframe);
  tile.append(header, wrap);
  return tile;
}

function renderParked() {
  parkedGrid.innerHTML = '';
  parkedSection.hidden = state.parked.length === 0;

  for (const stream of state.parked) {
    parkedGrid.append(createParkedTile(stream));
  }
}

function createParkedTile(stream) {
  const tile = document.createElement('article');
  tile.className = 'parked-tile';
  tile.dataset.id = stream.localId;

  const title = document.createElement('strong');
  title.textContent = stream.label;

  const meta = document.createElement('span');
  meta.textContent = `${stream.type.toUpperCase()} / ${stream.id}`;

  const actions = document.createElement('div');
  actions.className = 'parked-actions';

  const restore = document.createElement('button');
  restore.type = 'button';
  restore.textContent = '복귀';
  restore.title = '다시 위 방송 목록으로 올리기';
  restore.addEventListener('click', () => restoreStream(stream.localId, tile));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '삭제';
  remove.title = '보관 목록에서 삭제';
  remove.className = 'remove';
  remove.addEventListener('click', () => {
    state.parked = state.parked.filter((item) => item.localId !== stream.localId);
    tile.remove();
    renderParked();
    persist();
  });

  actions.append(restore, remove);
  tile.append(title, meta, actions);
  return tile;
}

function parkStream(localId, tile) {
  const index = state.streams.findIndex((stream) => stream.localId === localId);
  if (index < 0) return;

  const [stream] = state.streams.splice(index, 1);
  state.parked.push(stream);
  tile.remove();
  if (state.streams.length === 0) render();
  else applyGridLayout();
  renderParked();
  persist();
  showNotice(`${stream.label} 방송을 아래 보관 목록으로 옮겼습니다.`);
}

function restoreStream(localId, tile) {
  const index = state.parked.findIndex((stream) => stream.localId === localId);
  if (index < 0) return;

  const [stream] = state.parked.splice(index, 1);
  const wasEmpty = state.streams.length === 0;
  state.streams.push(stream);
  tile.remove();

  if (wasEmpty) {
    render();
  } else {
    applyGridLayout();
    grid.append(createTile(stream));
    renderParked();
  }

  persist();
  showNotice(`${stream.label} 방송을 다시 위로 올렸습니다.`);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showNotice('');

  try {
    const parts = splitStreamInputs(streamInput.value);
    const created = [];
    const wasEmpty = state.streams.length === 0;

    for (const part of parts) {
      created.push(await createStream(part, platform.value));
    }

    state.streams.push(...created);
    streamInput.value = '';
    persist();
    if (wasEmpty) {
      render();
    } else {
      applyGridLayout();
      for (const stream of created) {
        grid.append(createTile(stream));
      }
    }
    showNotice(`${created.length}개 방송을 추가했습니다.`);
  } catch (error) {
    showNotice(error.message || '추가하지 못했습니다.');
  }
});

columns.addEventListener('change', () => {
  state.settings.columns = columns.value;
  persist();
  render();
});

compactMode.addEventListener('change', () => {
  state.settings.compact = compactMode.checked;
  persist();
  render();
});

muteNew.addEventListener('change', () => {
  state.settings.muteNew = muteNew.checked;
  persist();
});

clearStreams.addEventListener('click', () => {
  state.streams = [];
  state.parked = [];
  persist();
  render();
  showNotice('전체 목록을 비웠습니다.');
});

reloadAll.addEventListener('click', () => {
  reloadFrames();
  showNotice('전체 방송을 새로고침했습니다.');
});

copyLink.addEventListener('click', async () => {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('layout', encodeLayout(snapshot()));
  url.searchParams.set('view', '1');

  try {
    await navigator.clipboard.writeText(url.toString());
    showNotice('현재 배치 링크를 복사했습니다. 열면 영상만 보기 모드로 복원됩니다.');
  } catch {
    streamInput.value = url.toString();
    showNotice('클립보드가 막혀서 링크를 입력칸에 넣었습니다.');
  }
});

savePreset.addEventListener('click', () => {
  const name = prompt('프리셋 이름');
  if (!name) return;

  const presets = getPresets().filter((preset) => preset.name !== name);
  presets.push({ name, data: snapshot(), updatedAt: Date.now() });
  presets.sort((a, b) => a.name.localeCompare(b.name));
  setPresets(presets);
  renderPresets();
  presetList.value = name;
  showNotice(`프리셋을 저장했습니다: ${name}`);
});

loadPreset.addEventListener('click', () => {
  const preset = getPresets().find((item) => item.name === presetList.value);
  if (!preset) {
    showNotice('먼저 프리셋을 선택해주세요.');
    return;
  }
  applySnapshot(preset.data);
  persist();
  render();
  showNotice(`프리셋을 불러왔습니다: ${preset.name}`);
});

deletePreset.addEventListener('click', () => {
  if (!presetList.value) {
    showNotice('먼저 프리셋을 선택해주세요.');
    return;
  }
  setPresets(getPresets().filter((preset) => preset.name !== presetList.value));
  renderPresets();
  showNotice('프리셋을 삭제했습니다.');
});

viewerMode.addEventListener('click', enterViewerMode);
exitViewerMode.addEventListener('click', exitViewer);

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === 'Escape') {
    exitViewer();
  }
  if (event.key.toLowerCase() === 'v') enterViewerMode();
  if (event.key.toLowerCase() === 'r') reloadFrames();
  if (event.key.toLowerCase() === 'c') cycleColumns();
});

restore();
renderPresets();
render();
