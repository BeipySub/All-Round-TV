const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const media = [
  ['漫游星海', '科幻冒险 · 2026', '#718343', '#172015'],
  ['零点回声', '悬疑科幻 · 2024', '#95594d', '#251817'],
  ['流光之后', '太空剧情 · 2025', '#655985', '#171821'],
  ['冬日列车', '末日冒险 · 2025', '#59748d', '#182027'],
  ['风的密语', '奇幻剧情 · 2023', '#467d73', '#14241f'],
  ['星际来客', '科幻电影 · 2021', '#72566f', '#1b171d'],
];
const related = [
  ['群星彼岸', '同为科幻冒险', '#4d6842', '#172019'],
  ['深空回声', '相近太空题材', '#535c82', '#181a25'],
  ['远航者', '同类型热门', '#786044', '#211a14'],
  ['月海计划', '相近标签', '#456b71', '#152125'],
];
let episode = 3;
let source = '流光影视';
let markStarted = false;
let autoSkipTimer;

function mediaCard(item, index) {
  return `<button class="media-card" style="--i:${index}" data-action="open-detail"><span class="poster" style="--a:${item[2]};--b:${item[3]}">${item[0][0]}</span><h3>${item[0]}</h3><p>${item[1]}</p></button>`;
}

$('#homeGrid').innerHTML = media.map(mediaCard).join('');
$('#searchResults').innerHTML = media.map(mediaCard).join('');
$('#wideGrid').innerHTML = media.slice(1, 4).map((item) => `<article class="wide-card" style="--a:${item[2]};--b:${item[3]}"><small>${item[1]}</small><h3>${item[0]}</h3></article>`).join('');
$('#episodes').innerHTML = Array.from({ length: 12 }, (_, index) => `<button class="episode ${index < 2 ? 'watched' : ''} ${index === 2 ? 'active' : ''}" data-episode="${index + 1}">第 ${index + 1} 集</button>`).join('');
$('#sourceOptions').innerHTML = [
  ['流光影视', '线路 1 · 5 分钟前检测', '健康'],
  ['白鲸资源', '线路 2 · 12 分钟前检测', '健康'],
  ['远山影视', '线路 1 · 最近出现超时', '降级'],
].map((item, index) => `<button class="source-option ${index === 0 ? 'selected' : ''}" data-source="${item[0]}"><span><b>${item[0]}</b><small>${item[1]}</small></span><em>${item[2]}</em></button>`).join('');
$('#relatedList').innerHTML = related.map((item) => `<article class="related-card" tabindex="0" data-action="recommendation"><div class="related-thumb" style="--a:${item[2]};--b:${item[3]}">${item[0][0]}</div><div><small>${item[1]}</small><h3>${item[0]}</h3><p>进入详情查看可用来源</p></div></article>`).join('');

function announce(message) {
  $('#live').textContent = message;
}

function toast(message, duration = 2200) {
  clearTimeout(toast.timer);
  $('#toast').textContent = message;
  $('#toast').classList.remove('hidden');
  toast.timer = setTimeout(() => $('#toast').classList.add('hidden'), duration);
  announce(message);
}

function commitScreen(id) {
  $$('.screen').forEach((node) => node.classList.toggle('active', node.dataset.screenId === id));
  $$('[data-screen]').forEach((node) => node.classList.toggle('active', node.dataset.screen === id));
  const names = { home: '发现', search: '搜索', detail: '详情', player: '播放', favorites: '片单', history: '足迹' };
  $('#labState').textContent = names[id];
  $('#demoAd').classList.toggle('hidden', id !== 'player');
  $('#demoError').classList.toggle('hidden', id !== 'player');
  announce(`已进入${names[id]}`);
}

function showScreen(id) {
  if ($(`.screen[data-screen-id="${id}"]`).classList.contains('active')) return;
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(() => commitScreen(id));
  else commitScreen(id);
  scrollTo({ top: 0, behavior: 'smooth' });
}

function updateSelection() {
  $('#currentSelection').textContent = `${source} · 第 ${episode} 集`;
}

function resetPlayer() {
  $('#playerError').classList.add('hidden');
  $('#sessionLoading').classList.add('hidden');
  $('#adSkip').classList.add('hidden');
  $('#undoSkip').classList.add('hidden');
  $('#playbackReady').classList.remove('hidden');
  $('#currentTime').textContent = '18:42';
}

function enterAd() {
  clearTimeout(autoSkipTimer);
  resetPlayer();
  $('#currentTime').textContent = '19:02';
  if ($('#autoSkip').checked) {
    toast('高置信度广告区段：即将自动跳过', 1000);
    autoSkipTimer = setTimeout(skipAd, 1000);
  } else {
    $('#adSkip').classList.remove('hidden');
    announce('进入已确认广告区段，可以手动跳过');
  }
}

function skipAd() {
  $('#adSkip').classList.add('hidden');
  $('#currentTime').textContent = '19:36';
  $('#undoSkip').classList.remove('hidden');
  toast('已跳过 34 秒广告，可撤销', 2800);
  setTimeout(() => $('#undoSkip').classList.add('hidden'), 5000);
}

function reset() {
  episode = 3;
  source = '流光影视';
  markStarted = false;
  clearTimeout(autoSkipTimer);
  $$('.episode').forEach((node) => node.classList.toggle('active', Number(node.dataset.episode) === 3));
  $$('.source-option').forEach((node) => node.classList.toggle('selected', node.dataset.source === source));
  $('#markStart').classList.remove('hidden');
  $('#markEnd').classList.add('hidden');
  $('#markHint').textContent = '帮助自己和其他用户识别源内广告';
  $('#autoSkip').checked = false;
  $('#sourceSummary').classList.add('hidden');
  $('#sourcePanel').classList.add('hidden');
  $('#searchResults').classList.add('hidden');
  $('#searchLoading').classList.add('hidden');
  resetPlayer();
  updateSelection();
  showScreen('home');
}

document.addEventListener('click', (event) => {
  const control = event.target.closest('button,[data-action]');
  if (!control) return;
  if (control.dataset.screen) showScreen(control.dataset.screen);
  const action = control.dataset.action;
  if (action === 'reset') reset();
  if (action === 'open-detail') showScreen('detail');
  if (action === 'resume-play' || action === 'play') { resetPlayer(); showScreen('player'); }
  if (action === 'toggle-sources') $('#sourcePanel').classList.toggle('hidden');
  if (action === 'fail-playback') { resetPlayer(); $('#playbackReady').classList.add('hidden'); $('#playerError').classList.remove('hidden'); }
  if (action === 'retry') { resetPlayer(); toast('正在重试当前来源'); }
  if (action === 'choose-source') $('#sourceDialog').showModal();
  if (action === 'confirm-source') {
    event.preventDefault(); $('#sourceDialog').close(); resetPlayer(); $('#playbackReady').classList.add('hidden'); $('#sessionLoading').classList.remove('hidden');
    setTimeout(() => { $('#sessionLoading').classList.add('hidden'); $('#playbackReady').classList.remove('hidden'); $('#playingMeta').textContent = '第 3 集 · 白鲸资源 · 从 18:42 继续'; toast('已切换至白鲸资源并恢复进度'); }, 900);
  }
  if (action === 'enter-ad') enterAd();
  if (action === 'skip-ad') skipAd();
  if (action === 'undo-skip') { $('#undoSkip').classList.add('hidden'); $('#currentTime').textContent = '19:02'; toast('已返回广告段开始，本次不再自动跳过'); }
  if (action === 'mark-start') { markStarted = true; $('#markStart').classList.add('hidden'); $('#markEnd').classList.remove('hidden'); $('#markHint').textContent = '已记录开始 18:42，请在广告结束时点击结束'; toast('已记录广告开始时间 18:42'); }
  if (action === 'mark-end' && markStarted) $('#markerDialog').showModal();
  if (action === 'confirm-marker') { event.preventDefault(); $('#markerDialog').close(); markStarted = false; $('#markStart').classList.remove('hidden'); $('#markEnd').classList.add('hidden'); $('#markHint').textContent = '个人标记已保存：18:42–19:16'; toast('个人广告标记已保存，仅先对你生效'); }
  if (action === 'recommendation') { toast('推荐项先进入详情，不会直接播放'); setTimeout(() => showScreen('detail'), 500); }
  if (control.classList.contains('episode')) { episode = Number(control.dataset.episode); $$('.episode').forEach((node) => node.classList.toggle('active', node === control)); updateSelection(); }
  if (control.classList.contains('source-option')) { source = control.dataset.source; $$('.source-option').forEach((node) => node.classList.toggle('selected', node === control)); updateSelection(); }
});

$('#searchForm').addEventListener('submit', (event) => {
  event.preventDefault(); $('#searchResults').classList.add('hidden'); $('#sourceSummary').classList.add('hidden'); $('#sourcePanel').classList.add('hidden'); $('#searchLoading').classList.remove('hidden');
  setTimeout(() => { $('#searchLoading').classList.add('hidden'); $('#sourceSummary').classList.remove('hidden'); $('#searchResults').classList.remove('hidden'); announce('搜索完成，6 个结果，1 个来源超时'); }, 650);
});
$('#sourceDialog').addEventListener('change', (event) => $$('.candidate').forEach((node) => node.classList.toggle('selected', node.contains(event.target))));
$('#autoSkip').addEventListener('change', () => toast($('#autoSkip').checked ? '已开启可信广告自动跳过' : '已关闭广告自动跳过'));
document.addEventListener('keydown', (event) => { if (event.key === '/' && !/input|textarea|select/i.test(event.target.tagName)) { event.preventDefault(); showScreen('search'); setTimeout(() => $('#query').focus(), 50); } });
updateSelection();
