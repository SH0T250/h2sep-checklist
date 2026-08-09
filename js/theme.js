// Per-device theme (light default / dark). index.html applies the stored
// choice inline before first paint (no flash); this module owns changes.
const KEY = 'h2sep-theme';

export function getTheme() {
  // The applied DOM attribute is the source of truth — index.html stamps it
  // before any module runs, and when localStorage writes fail (private mode)
  // it is the ONLY record of the current choice; reading storage first would
  // lock the toggle on 'dark' forever there.
  const a = document.documentElement.getAttribute('data-theme');
  if (a === 'dark' || a === 'light') return a;
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}

export function setTheme(t) {
  t = t === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem(KEY, t); } catch (_) { /* private mode — session-only */ }
  applyTheme(t);
  return t;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function applyTheme(t = getTheme()) {
  document.documentElement.setAttribute('data-theme', t);
}
