const titles = [
  ['流光之后', '2025 · 电影', '#5d557e', '#171d2e'],
  ['漫游星海', '2026 · 电视剧', '#6246b4', '#172740'],
  ['零点回声', '2024 · 电影', '#a05c4c', '#24191d'],
  ['风的密语', '2023 · 电视剧', '#3f7b77', '#15282a'],
  ['冬日列车', '2025 · 电影', '#5a718d', '#1a202b'],
];
const screenLabels = { home: '首页', search: '搜索', detail: '影视详情', player: '播放器', favorites: '收藏', history: '历史' };
const flowIndex = { home: 0, search: 0, detail: 1, player: 2 };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let selectedEpisode = 3;
let selectedSource = '流光影视';

function card([title, meta, colorA, colorB]) {
  return `<button class="media-card" data-action="open-detail" aria-label="查看${title}详情">
    <span class="poster" style="--poster1:${colorA};--poster2:${colorB}">${title.slice(0, 1)}</span>
    <h3>${title}</h3><p>${meta}</p>
  </button>`;
}

$('#homeGrid').innerHTML = titles.map(card).join('');
$('#searchResults').innerHTML = titles
  .concat([['星际来客', '2021 · 电影', '#7b5a72', '#191822']])
  .map(card)
  .join('');
$('#episodes').innerHTML = Array.from(
  { length: 12 },
  (_, index) => `<button class="episode ${index < 2 ? 'watched' : ''} ${index === 2 ? 'active' : ''}" data-episode="${index + 1}">第 ${index + 1} 集</button>`,
).join('');
$$('.stagger-grid').forEach((grid) => {
  [...grid.children].forEach((card, index) => card.style.setProperty('--stagger', index));
});

function updateFlow(screen) {
  const activeIndex = flowIndex[screen] ?? 0;
  $$('.prototype-steps span').forEach((step, index) => step.classList.toggle('active', index <= activeIndex));
  $('#triggerError').classList.toggle('hidden', screen !== 'player' || !$('#playerError').classList.contains('hidden'));
}

function commitScreen(id) {
  $$('.screen').forEach((screen) => screen.classList.toggle('active', screen.dataset.screenId === id));
  $$('[data-screen]').forEach((control) => control.classList.toggle('active', control.dataset.screen === id));
  $('#flowStep').textContent = screenLabels[id] || id;
  $('#motionStatus').textContent = `已进入${screenLabels[id] || id}`;
  updateFlow(id);
  const activeScreen = $(`.screen[data-screen-id="${id}"]`);
  activeScreen.classList.remove('screen-enter');
  requestAnimationFrame(() => activeScreen.classList.add('screen-enter'));
}

function showScreen(id) {
  if ($(`.screen[data-screen-id="${id}"]`).classList.contains('active')) return;
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(() => commitScreen(id));
  } else {
    commitScreen(id);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateSelection() {
  $('#currentSelection').textContent = `${selectedSource} · 线路 ${selectedSource === '白鲸资源' ? '2' : '1'} · 第 ${selectedEpisode} 集`;
  $('#stickySelection').textContent = `${selectedSource} · 第 ${selectedEpisode} 集`;
  $('.sticky-play').classList.remove('selection-updated');
  requestAnimationFrame(() => $('.sticky-play').classList.add('selection-updated'));
}

function resetPlayer() {
  $('#playerError').classList.add('hidden');
  $('#sessionLoading').classList.add('hidden');
  $('#playbackReady').classList.remove('hidden');
}

function reset() {
  selectedEpisode = 3;
  selectedSource = '流光影视';
  $$('.episode').forEach((episode) => episode.classList.toggle('active', Number(episode.dataset.episode) === 3));
  $$('.source-option').forEach((source) => source.classList.toggle('selected', source.dataset.source === selectedSource));
  updateSelection();
  $('#sourceSummary').classList.add('hidden');
  $('#sourcePanel').classList.add('hidden');
  $('#searchResults').classList.add('hidden');
  $('#searchLoading').classList.add('hidden');
  resetPlayer();
  showScreen('home');
}

function startPlayback() {
  resetPlayer();
  showScreen('player');
}

function failPlayback() {
  $('#playbackReady').classList.add('hidden');
  $('#sessionLoading').classList.add('hidden');
  $('#playerError').classList.remove('hidden');
  $('#triggerError').classList.add('hidden');
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  const bounds = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const diameter = Math.max(bounds.width, bounds.height);
  ripple.style.width = `${diameter}px`;
  ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - bounds.left}px`;
  ripple.style.top = `${event.clientY - bounds.top}px`;
  target.append(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  if (target.dataset.screen) showScreen(target.dataset.screen);

  const action = target.dataset.action;
  if (action === 'reset') reset();
  if (action === 'open-detail') showScreen('detail');
  if (action === 'resume-play' || action === 'play') startPlayback();
  if (action === 'fail-playback') failPlayback();
  if (action === 'retry') {
    resetPlayer();
    updateFlow('player');
    $('#toast').textContent = '正在重试流光影视 · 第 3 集';
    $('#toast').classList.remove('hidden');
    setTimeout(() => $('#toast').classList.add('hidden'), 1800);
  }
  if (action === 'choose-source') $('#sourceDialog').showModal();
  if (action === 'confirm-source') {
    event.preventDefault();
    $('#sourceDialog').close();
    $('#playerError').classList.add('hidden');
    $('#sessionLoading').classList.remove('hidden');
    setTimeout(() => {
      $('#sessionLoading').classList.add('hidden');
      $('#playbackReady').classList.remove('hidden');
      $('.player-topbar span').textContent = '第 3 集 · 白鲸资源 · 从 18:42 继续';
      $('#toast').textContent = '已切换至白鲸资源 · 第 3 集';
      $('#toast').classList.remove('hidden');
      $('.prototype-steps span:last-child').classList.add('active');
      setTimeout(() => $('#toast').classList.add('hidden'), 2200);
    }, 900);
  }
  if (action === 'toggle-sources') $('#sourcePanel').classList.toggle('hidden');

  if (target.classList.contains('episode')) {
    selectedEpisode = Number(target.dataset.episode);
    $$('.episode').forEach((episode) => episode.classList.toggle('active', episode === target));
    target.classList.remove('selection-pop');
    requestAnimationFrame(() => target.classList.add('selection-pop'));
    updateSelection();
  }
  if (target.classList.contains('source-option')) {
    selectedSource = target.dataset.source;
    $$('.source-option').forEach((source) => source.classList.toggle('selected', source === target));
    target.classList.remove('selection-pop');
    requestAnimationFrame(() => target.classList.add('selection-pop'));
    updateSelection();
  }
});

$('#searchForm').addEventListener('submit', (event) => {
  event.preventDefault();
  showScreen('search');
  $('#searchResults').classList.add('hidden');
  $('#sourceSummary').classList.add('hidden');
  $('#sourcePanel').classList.add('hidden');
  $('#searchLoading').classList.remove('hidden');
  setTimeout(() => {
    $('#searchLoading').classList.add('hidden');
    $('#sourceSummary').classList.remove('hidden');
    $('#searchResults').classList.remove('hidden');
    $('#motionStatus').textContent = '搜索完成：找到 6 个结果，1 个来源超时';
    $('#searchResults .media-card:nth-child(2)').focus();
  }, 650);
});

$('#sourceDialog').addEventListener('change', (event) => {
  $$('.candidate').forEach((candidate) => candidate.classList.toggle('selected', candidate.contains(event.target)));
});

updateSelection();
