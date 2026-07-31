// Shared helpers — no dependencies.

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function fmtWhen(ts) {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : (ts.toDate ? ts.toDate() : new Date(ts));
  if (isNaN(d)) return '';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function randomId(prefix = 'x_') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// code "GR-600.1" -> "gr6001"; instance suffix appended by caller
export function codeSlug(code) {
  return String(code).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function vibrate(ms = 10) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch (_) { /* unsupported */ }
}

let toastTimer = null;
export function toast(msg, opts = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `<span>${esc(msg)}</span>` +
    (opts.action ? `<button class="toast-action">${esc(opts.action)}</button>` : '');
  el.classList.add('show');
  if (opts.action && opts.onAction) {
    el.querySelector('.toast-action').addEventListener('click', () => {
      el.classList.remove('show');
      opts.onAction();
    }, { once: true });
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), opts.ms || 3000);
}

export const platform = (() => {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const inAppBrowser = /(FBAN|FBAV|Instagram|Line\/|Twitter|GSA\/|DuckDuckGo)/i.test(ua);
  return { isIOS, standalone, inAppBrowser };
})();

// Rooms sort numerically when possible, else lexically.
export function roomSort(a, b) {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b));
}

export function roomStats(room) {
  const items = Object.entries(room.items || {}).filter(([, it]) => !it.deleted);
  const total = items.length;
  const done = items.filter(([, it]) => it.checked).length;
  const issues = items.filter(([, it]) => it.issue && !it.issueResolved).length;
  const noteIssues = Object.values(room.notes || {})
    .filter(n => n.flag === 'issue' && !n.resolved).length;
  return { total, done, issues, noteIssues, openIssues: issues + noteIssues,
    pct: total ? Math.round(done / total * 100) : 0,
    complete: total > 0 && done === total && issues + noteIssues === 0 };
}

export function typeAbbrev(typeLabel = '') {
  let t = ' ' + typeLabel.toUpperCase() + ' ';
  const ada = /\b(ADA|ACC|ACCESSIBLE)\b/.test(t);
  t = t.replace(/\b(ADA|ACC|ACCESSIBLE)\b/g, ' ');
  t = t.replace(/\bQUEEN QUEEN\b/g, 'QQ').replace(/\bKING\b/g, 'K')
       .replace(/\bCONNECTOR\b/g, 'CONN').replace(/\bSTUDIO\b/g, 'STU')
       .replace(/\bONE BEDROOM\b/g, '1BR').replace(/\bWIDE\b/g, 'WIDE');
  t = t.replace(/\s+/g, ' ').trim();
  return { abbrev: t || '—', ada };
}
