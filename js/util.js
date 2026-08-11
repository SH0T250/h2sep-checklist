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

// Common-area spaces live in the same rooms collection as guest rooms (the
// architect numbers both from one series, so ids never collide) and are told
// apart by their type slug. This is THE discriminator — every list that means
// "guest rooms" filters with it, and the Common Areas screens invert it.
export function isSpaceDoc(r) {
  return String((r && r.type) || '').startsWith('space-');
}

// MEP PUNCH docs. A guest room carries TWO checklists that must never mix: the
// FF&E turnover list (doc id "105") and the MEP punch list (doc id "105-MEP").
// Different trades, different days, different progress — one crew checking off
// a toilet must not move the FF&E bar, and re-seeding one must never touch the
// other. They live in the same collection because the floor listeners, the
// offline cache and the security rules already work there; the type slug is
// what keeps them apart, exactly as it does for common-area spaces.
export function isMepDoc(r) {
  return String((r && r.type) || '') === 'mep-punch';
}
// "105-MEP" -> "105". Returns null for anything that is not an MEP doc id, so
// callers can use it as both a test and a conversion.
export function mepParent(number) {
  const m = /^(\d+)-MEP$/.exec(String(number || ''));
  return m ? m[1] : null;
}
export function mepIdFor(roomNumber) { return String(roomNumber) + '-MEP'; }

// The five punch groups, in the order a walker moves through a room: the box
// on the wall first, then what is wired, then what is piped, then life safety,
// then the jacks. Mirrors CATEGORY_ORDER's spirit but is its own list — an MEP
// sheet must never inherit FF&E ordering.
export const MEP_CATEGORY_ORDER = [
  'Mechanical', 'Electrical', 'Plumbing', 'Fire Protection', 'Low Voltage',
];
// Single-letter chips for the collapsed group headers (Austin's "it has a
// letter that says Mechanical, Electrical, and Plumbing").
export const MEP_LETTER = {
  'Mechanical': 'M', 'Electrical': 'E', 'Plumbing': 'P',
  'Fire Protection': 'FP', 'Low Voltage': 'LV',
};

// Canonical trade/category order for full-trade sheets: crew work from the
// ceiling down the walls to the floor, trades before FF&E. Exact string match;
// unknown categories append alphabetically after these; uncategorized ad-hoc
// adds go last. Shared by the room screen and the printable sheets — and must
// stay in step with CAT_SORT in tools/gen_spaces.py.
export const CATEGORY_ORDER = [
  'Drywall', 'Paint', 'Wall Covering', 'Ceiling', 'Flooring',
  'Stone / Surround', 'Doors', 'Electrical', 'Mechanical', 'Plumbing',
  'Fire Sprinkler', 'Fire Alarm', 'Low Voltage', 'Bath Accessory',
  'Appliance', 'FF&E - Casegoods', 'FF&E - Bedding', 'FF&E - Seating',
  'FF&E - Lighting', 'FF&E - Window', 'FF&E - Art / Mirror', 'FF&E - Misc',
];

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
