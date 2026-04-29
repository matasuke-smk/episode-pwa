const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const viewer = document.getElementById('viewer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

const STORAGE_KEY = 'lastUrl';

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
