// Project contacts (contacts.html) — the "who do I call about this" screen.
//
// Read-only by design: data/contacts.json is generated from the tracked
// workbook by tools/build_contacts_json.py, so the spreadsheet stays the one
// place a contact is edited and the app can never drift into being a second
// source of truth. Precached in the app shell, so it works in a dead zone —
// which is the whole point of carrying it on the phone.
//
// Every number is a tap-to-call link and every address opens in maps, because
// the field use of this page is "standing in a room, need the fire guy now".
import { esc } from './util.js';

const $ = (id) => document.getElementById(id);
const tel = (s) => s.replace(/[^\d+]/g, '');

let DATA = null;

// A contact is searchable by everything on its card — a super typing "fire"
// or "830" or "chutes" should land on the same row either way.
function haystack(c) {
  return [c.category, c.org, c.scope, c.name, c.title, c.address, c.notes,
    ...c.phones.map(p => p.value), ...c.emails.map(e => e.value)]
    .join(' ').toLowerCase();
}

function contactCard(c) {
  const phones = c.phones.map(p => `
    <a class="ct-line" href="tel:${esc(tel(p.value))}">
      <span class="ct-ico">📞</span>
      <span class="ct-val">${esc(p.value)}${p.label ? `<span class="ct-lbl">${esc(p.label)}</span>` : ''}</span>
    </a>`).join('');

  const emails = c.emails.map(e => `
    <a class="ct-line" href="mailto:${esc(e.value)}">
      <span class="ct-ico">✉</span>
      <span class="ct-val">${esc(e.value)}${e.label ? `<span class="ct-lbl">${esc(e.label)}</span>` : ''}</span>
    </a>`).join('');

  const address = c.address ? `
    <a class="ct-line" href="https://maps.google.com/?q=${encodeURIComponent(c.address)}"
       target="_blank" rel="noopener">
      <span class="ct-ico">📍</span><span class="ct-val">${esc(c.address)}</span>
    </a>` : '';

  // Missing phone AND email is worth showing rather than hiding — it mirrors
  // the yellow "fill this in" cells on the spreadsheet.
  const gap = (!c.phones.length && !c.emails.length)
    ? `<div class="ct-gap">No phone or email yet</div>` : '';

  const notes = c.notes ? `<div class="ct-note">${esc(c.notes)}</div>` : '';
  const scope = c.scope ? `<span class="ct-scope">${esc(c.scope)}</span>` : '';

  return `
    <article class="ct-card">
      <div class="ct-org">${esc(c.org) || '<span class="ct-dim">(no company)</span>'}${scope}</div>
      ${c.name ? `<div class="ct-name">${esc(c.name)}</div>` : ''}
      ${c.title ? `<div class="ct-title">${esc(c.title)}</div>` : ''}
      ${phones}${emails}${address}${gap}${notes}
    </article>`;
}

function render(term = '') {
  const t = term.trim().toLowerCase();
  const hits = t ? DATA.contacts.filter(c => haystack(c).includes(t)) : DATA.contacts;

  $('count').textContent = t ? `${hits.length}/${DATA.contacts.length}` : DATA.contacts.length;

  if (!hits.length) {
    $('body').innerHTML = `<div class="ct-none">Nothing matches “${esc(term)}”.</div>`;
    return;
  }

  const byCat = new Map();
  for (const c of hits) {
    const k = c.category || 'Uncategorized';
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(c);
  }
  // Spreadsheet order first, then anything the workbook grew since.
  const cats = [...DATA.categoryOrder.filter(c => byCat.has(c)),
    ...[...byCat.keys()].filter(c => !DATA.categoryOrder.includes(c))];

  $('body').innerHTML = cats.map(cat => `
    <section class="ct-sec">
      <h2 class="ct-head">${esc(cat)} · ${byCat.get(cat).length}</h2>
      ${byCat.get(cat).map(contactCard).join('')}
    </section>`).join('');
}

(async () => {
  try {
    const res = await fetch('./data/contacts.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    DATA = await res.json();
  } catch (e) {
    $('body').innerHTML = `<div class="empty">Could not load contacts — reload once
      you have signal, or open the app from the Home Screen so it's cached.</div>`;
    return;
  }
  render();
  let timer = null;
  $('q').addEventListener('input', (e) => {
    clearTimeout(timer);
    const v = e.target.value;
    timer = setTimeout(() => render(v), 90);
  });
})();
