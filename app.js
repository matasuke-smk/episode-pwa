const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const viewer = document.getElementById('viewer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const prevDecBtn = document.getElementById('prevDecBtn');
const nextDecBtn = document.getElementById('nextDecBtn');
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
  { regex: /第(\d+)(?:[.．](\d+))?話/, prefix: '第', suffix: '話', kind: 'ascii' },
  { regex: /第([０-９]+)(?:[.．]([０-９]+))?話/, prefix: '第', suffix: '話', kind: 'fullwidth' },
  { regex: /%E7%AC%AC(\d+)(?:\.(\d+))?%E8%A9%B1/i, prefix: '%E7%AC%AC', suffix: '%E8%A9%B1', kind: 'encoded' },
];

function toFullWidth(s) {
  return s.replace(/[0-9]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}
function toHalfWidth(s) {
  return s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

function formatEpisodeStr(tenths, kind) {
  const intPart = Math.floor(tenths / 10);
  const decPart = tenths % 10;
  const intStr = String(intPart);
  const decStr = String(decPart);
  if (kind === 'fullwidth') {
    return decPart === 0
      ? toFullWidth(intStr)
      : toFullWidth(intStr) + '．' + toFullWidth(decStr);
  }
  return decPart === 0 ? intStr : `${intStr}.${decStr}`;
}

function navigateEpisode(deltaTenths, snapToInt) {
  const url = urlInput.value;
  if (!url) return;
  for (const p of PATTERNS) {
    const m = url.match(p.regex);
    if (!m) continue;
    const intStr = p.kind === 'fullwidth' ? toHalfWidth(m[1]) : m[1];
    const intPart = parseInt(intStr, 10);
    const decPart = m[2]
      ? parseInt(p.kind === 'fullwidth' ? toHalfWidth(m[2]) : m[2], 10)
      : 0;
    const tenths = intPart * 10 + decPart;

    let next;
    if (snapToInt) {
      if (deltaTenths > 0) {
        next = (intPart + 1) * 10;
      } else {
        next = decPart === 0 ? (intPart - 1) * 10 : intPart * 10;
      }
    } else {
      next = tenths + deltaTenths;
    }

    if (next < 10) return;

    const nextStr = formatEpisodeStr(next, p.kind);
    const newUrl = url.replace(p.regex, p.prefix + nextStr + p.suffix);
    loadUrl(newUrl);
    return;
  }
}

prevBtn.addEventListener('click', () => navigateEpisode(-10, true));
nextBtn.addEventListener('click', () => navigateEpisode(10, true));
prevDecBtn.addEventListener('click', () => navigateEpisode(-1, false));
nextDecBtn.addEventListener('click', () => navigateEpisode(1, false));

pasteBtn.addEventListener('click', async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) return;
    urlInput.value = text;
    urlInput.focus();
  } catch (_) {
    urlInput.focus();
    alert('クリップボードにアクセスできませんでした。入力欄に直接ペーストしてください。');
  }
});

function deriveTitle(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return url; }
  let path = parsed.pathname;
  try { path = decodeURIComponent(path); } catch {}
  const segments = path.split('/').filter(Boolean);
  let site;
  if (segments.length >= 2) site = segments[segments.length - 2];
  else if (segments.length === 1) site = segments[0];
  else site = parsed.hostname;
  site = site.replace(/-raw-free$/, '');
  const m = path.match(/第([\d０-９]+(?:[.．][\d０-９]+)?)話/);
  return m ? `${site} - 第${m[1]}話` : site;
}

function getBookmarks() {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    return raw.map(item =>
      typeof item === 'string' ? { title: deriveTitle(item), url: item } : item
    );
  } catch { return []; }
}
function saveBookmarks(list) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}
function renderBookmarks() {
  const list = getBookmarks();
  bmList.innerHTML = '';
  bmEmpty.hidden = list.length > 0;
  for (const bm of list) {
    const li = document.createElement('li');
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'bm-link';
    link.textContent = bm.title;
    link.addEventListener('click', () => {
      loadUrl(bm.url);
      closeBookmarks();
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'bm-del';
    del.textContent = '✕';
    del.setAttribute('aria-label', '削除');
    del.addEventListener('click', () => {
      saveBookmarks(getBookmarks().filter(b => b.url !== bm.url));
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
  if (!list.some(b => b.url === url)) {
    list.unshift({ title: deriveTitle(url), url });
    saveBookmarks(list);
  }
  renderBookmarks();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
