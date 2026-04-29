const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const viewer = document.getElementById('viewer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pasteBtn = document.getElementById('pasteBtn');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const bookmarkPanel = document.getElementById('bookmarkPanel');
const bmCloseBtn = document.getElementById('bmCloseBtn');
const bmAddBtn = document.getElementById('bmAddBtn');
const bmList = document.getElementById('bmList');
const bmEmpty = document.getElementById('bmEmpty');

const STORAGE_KEY = 'lastUrl';
const BOOKMARKS_KEY = 'bookmarks';

function loadUrl(url) {
  if (!url) return;
  urlInput.value = url;
  viewer.src = url;
  try { localStorage.setItem(STORAGE_KEY, url); } catch (_) {}
}

urlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loadUrl(urlInput.value.trim());
});

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  urlInput.value = saved;
  viewer.src = saved;
}

const PATTERNS = [
  { regex: /第(\d+)話/, prefix: '第', suffix: '話', kind: 'ascii' },
  { regex: /第([０-９]+)話/, prefix: '第', suffix: '話', kind: 'fullwidth' },
  { regex: /%E7%AC%AC(\d+)%E8%A9%B1/i, prefix: '%E7%AC%AC', suffix: '%E8%A9%B1', kind: 'encoded' },
];

function toFullWidth(s) {
  return s.replace(/[0-9]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}
function toHalfWidth(s) {
  return s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

function navigateEpisode(delta) {
  const url = urlInput.value;
  if (!url) return;
  for (const p of PATTERNS) {
    const m = url.match(p.regex);
    if (!m) continue;
    const n = parseInt(p.kind === 'fullwidth' ? toHalfWidth(m[1]) : m[1], 10);
    const next = n + delta;
    if (next < 1) return;
    const nextStr = p.kind === 'fullwidth' ? toFullWidth(String(next)) : String(next);
    const newUrl = url.replace(p.regex, p.prefix + nextStr + p.suffix);
    loadUrl(newUrl);
    return;
  }
}

prevBtn.addEventListener('click', () => navigateEpisode(-1));
nextBtn.addEventListener('click', () => navigateEpisode(1));

pasteBtn.addEventListener('click', async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) return;
    loadUrl(text);
  } catch (_) {
    urlInput.focus();
    alert('クリップボードにアクセスできませんでした。入力欄に直接ペーストしてください。');
  }
});

function getBookmarks() {
  try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]'); }
  catch { return []; }
}
function saveBookmarks(list) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}
function renderBookmarks() {
  const list = getBookmarks();
  bmList.innerHTML = '';
  bmEmpty.hidden = list.length > 0;
  for (const url of list) {
    const li = document.createElement('li');
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'bm-link';
    link.textContent = url;
    link.addEventListener('click', () => {
      loadUrl(url);
      closeBookmarks();
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'bm-del';
    del.textContent = '✕';
    del.setAttribute('aria-label', '削除');
    del.addEventListener('click', () => {
      saveBookmarks(getBookmarks().filter(u => u !== url));
      renderBookmarks();
    });
    li.append(link, del);
    bmList.append(li);
  }
}
function openBookmarks() {
  renderBookmarks();
  bookmarkPanel.hidden = false;
}
function closeBookmarks() {
  bookmarkPanel.hidden = true;
}

bookmarkBtn.addEventListener('click', openBookmarks);
bmCloseBtn.addEventListener('click', closeBookmarks);
bmAddBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) return;
  const list = getBookmarks();
  if (!list.includes(url)) {
    list.unshift(url);
    saveBookmarks(list);
  }
  renderBookmarks();
});

document.addEventListener('touchmove', (e) => {
  if (e.target.closest('#bmList')) return;
  e.preventDefault();
}, { passive: false });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
