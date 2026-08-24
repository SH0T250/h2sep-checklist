#!/usr/bin/env node
/* Builds research/ref-rooms/mockbook.html - the reference-room mock book Austin
 * approves from. Reads only. Writes exactly one file: mockbook.html.
 *
 *   node research/ref-rooms/build_mockbook.mjs
 *
 * Sources (all READ ONLY):
 *   platform/data/ref-rooms-staged.json   the staged mock-ups
 *   platform/data/floor1-staged.json      the approved LIVE floor-1 build (donors)
 *   tools/out/backups/crew-ref-rooms-snapshot.json  the crew app snapshot
 *   data/project.sqlite                   conflicts table, verbatim
 *   research/ref-rooms/mockbook.data.mjs  hand-authored copy + verifier output
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  TYPES, OWNERS, FLAG_OWNER_BY_KEY, FLAG_OWNER_BY_ROOM_KEY, GATED_OWNER,
  GAP_OWNER, EXTRA_CARRIED, VERIFIER, BUY_STOPPERS, ROUND1, ROUND2, ROUND3,
  ROUND_RAISED,
} from './mockbook.data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const REF = rd('platform/data/ref-rooms-staged.json');
const LIVE = rd('platform/data/floor1-staged.json');
const CREW = rd('tools/out/backups/crew-ref-rooms-snapshot.json');

/* conflicts table and this room's own rows, pulled verbatim at build time. */
const DB = JSON.parse(execFileSync('python3', ['-c', `
import sqlite3, json
c = sqlite3.connect(${JSON.stringify(path.join(ROOT, 'data/project.sqlite'))})
cur = c.cursor()
cur.execute("select conflict_id, status, topic, positions, source from conflicts")
conflicts = {r[0]: {"status": r[1], "topic": r[2], "positions": r[3], "source": r[4]} for r in cur.fetchall()}
cur.execute("select room_no, item_id, tag, category, reliability, primary_sheet, instance_note, note "
            "from room_items where room_no in ('202','217','230','238')")
rows = [dict(zip(['room','itm','tag','cat','rel','sheet','inst','note'], r)) for r in cur.fetchall()]
print(json.dumps({"conflicts": conflicts, "rows": rows}))
`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const CONFLICTS = DB.conflicts;
const DBROWS = DB.rows;

const SEV = { FLAGGED: 0, MEDIUM: 1, HIGH: 2 };

/* ------------------------------------------------- open-conflict carriage
 * The conflicts table names fixture and furniture marks. A room's own sqlite
 * rows carry marks too, often several on one row ("SH-1 / SH-4"). This walks
 * both sides mark by mark and reports, for every OPEN entry that names a mark
 * this room actually holds, whether the entry rides on the line that carries
 * that mark. Nothing here is typed by hand, so it stays true after the next
 * fix round instead of going stale. Only hyphenated marks are read (SH-1,
 * GR-318, L-2). A bare mark such as 905 or W4 is not read, so this table can
 * only ever under-report, never accuse. */
const MARK_RUN = /\b([A-Z]{1,3})-(\d+(?:\.\d+)?)((?:\s*\/\s*(?:[A-Z]{1,3}-)?\d+(?:\.\d+)?)*)/g;
function marksIn(text) {
  const out = new Set();
  if (!text) return out;
  MARK_RUN.lastIndex = 0;
  let m;
  while ((m = MARK_RUN.exec(text))) {
    out.add(m[1] + '-' + m[2]);
    if (!m[3]) continue;
    for (const seg of m[3].split('/')) {
      const s = seg.trim();
      if (!s) continue;
      out.add(/^[A-Z]{1,3}-/.test(s) ? s : m[1] + '-' + s);
    }
  }
  return out;
}

/* What note n_conflicts claims an entry names, as opposed to what the entry
 * says when it is quoted in full two clauses later. */
function claimedMarks(room, id) {
  const n = (REF.docs[room].notes.n_conflicts || {}).text || '';
  const re = new RegExp('(?:^|\\|\\|)\\s*' + id.replace(/\./g, '\\.') + '\\s*\\[[^\\]]*\\]\\s*names\\s+([^]*?)\\s+-\\s+topic');
  const m = n.match(re);
  return m ? marksIn(m[1]) : new Set();
}

function conflictCarriage(room) {
  const mine = DBROWS.filter((r) => r.room === room);
  const roomMarks = new Map();
  for (const r of mine) {
    for (const t of marksIn(r.tag)) {
      if (!roomMarks.has(t)) roomMarks.set(t, []);
      roomMarks.get(t).push(r);
    }
  }
  const lines = items(room).concat(items(room + '-MEP'));
  const lineMarks = new Map();
  for (const l of lines) {
    const set = marksIn(l.code || '');
    if (/^db_itm\d+$/.test(l.key)) {
      const id = 'ITM-' + l.key.slice(6);
      for (const r of mine.filter((x) => x.itm === id)) for (const t of marksIn(r.tag)) set.add(t);
    }
    for (const t of set) {
      if (!lineMarks.has(t)) lineMarks.set(t, []);
      lineMarks.get(t).push(l);
    }
  }
  const out = [];
  for (const [id, c] of Object.entries(CONFLICTS)) {
    if (c.status !== 'OPEN') continue;
    const named = marksIn((c.topic || '') + ' ' + (c.positions || ''));
    const shared = [...named].filter((t) => roomMarks.has(t)).sort();
    if (!shared.length) continue;
    const claimed = claimedMarks(room, id);
    const marks = shared.map((t) => {
      const ls = lineMarks.get(t) || [];
      const rides = ls.filter((l) => (l.instanceNote || '').includes('CONFLICT ' + id));
      return {
        mark: t,
        rows: roomMarks.get(t),
        lines: ls,
        rides,
        claimed: claimed.has(t),
        state: rides.length ? 'RIDES' : (ls.length ? 'ON A LINE, NOT FLAGGED' : 'ON NO LINE AT ALL'),
      };
    });
    out.push({ id, c, marks, gaps: marks.filter((m) => m.state !== 'RIDES') });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/* Every reference-database row that stands behind one staged line. */
function dbRowsFor(room, item) {
  const mine = DBROWS.filter((r) => r.room === room);
  if (/^db_itm\d+$/.test(item.key)) {
    const id = 'ITM-' + item.key.slice(6);
    return mine.filter((r) => r.itm === id);
  }
  if (item.code) return mine.filter((r) => r.tag === item.code);
  return [];
}

/* What the database says about this line, where it is not already on the line. */
function dbVoice(room, item) {
  const rows = dbRowsFor(room, item);
  if (!rows.length) return null;
  const worst = rows.reduce((a, r) => (SEV[r.rel] < SEV[a] ? r.rel : a), 'HIGH');
  const shipped = item.instanceNote || '';
  const seen = new Set();
  const notes = [];
  for (const r of rows) {
    const t = (r.note || '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    if (shipped.includes(t)) continue;
    notes.push({ itm: r.itm, rel: r.rel, sheet: r.sheet, text: t });
  }
  return { rows, worst, notes, downgraded: SEV[worst] < SEV[item.reliability] };
}

/* A condensed MEP punch line is one of the lines Austin approved under D10 and
 * D26; its confidence is his ruling, not the transcriber's row. */
const isCondensedMep = (key) => /^(mech_|elec_|plmb_|fp_|lv_)/.test(key);

function confidenceGaps(room) {
  const out = [];
  for (const doc of [room, room + '-MEP']) {
    for (const i of items(doc)) {
      const v = dbVoice(room, i);
      if (!v || !v.downgraded) continue;
      const note = i.instanceNote || '';
      let why = null;
      if (/Flag closed|submittal governs|Approved submittal|ruling D\d+|AJ ruling/i.test(note)) {
        why = 'Closed by your own ruling, and the line says so.';
      } else if (isCondensedMep(i.key)) {
        why = 'Condensed MEP punch line. You approved this band under rulings D10 and D26.';
      }
      out.push({ doc, item: i, v, why });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ utils */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const relClass = { HIGH: 'r-high', MEDIUM: 'r-med', FLAGGED: 'r-flag' };
const relWord = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', FLAGGED: 'FLAGGED' };

const items = (doc) => Object.entries(REF.docs[doc].items)
  .map(([k, v]) => ({ key: k, ...v }))
  .sort((a, b) => a.sort - b.sort);

const liveItems = (doc) => Object.entries(LIVE.docs[doc].items)
  .filter(([, v]) => !v.deleted)
  .map(([k, v]) => ({ key: k, ...v }));

/* --------------------------------------------------- note text extraction */
function splitNote(text, preambleEndsWith) {
  if (!text) return [];
  const parts = text.split(/\s{2}\|\|\s{2}/);
  const cut = parts[0].indexOf(preambleEndsWith);
  if (cut >= 0) parts[0] = parts[0].slice(cut + preambleEndsWith.length);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function gatedRows(room) {
  const n = REF.docs[room].notes.n_gategaps;
  if (!n) return [];
  return splitNote(n.text, "not this tool's. ").map((entry) => {
    const m = entry.match(/^(.+?)\s\[([^\]]+)\]\s(ITM-\d+)/);
    return {
      tag: m ? m[1] : '(unparsed)',
      meta: m ? m[2] : '',
      itm: m ? m[3] : '',
      text: entry,
    };
  });
}

function gapRows(room) {
  const n = REF.docs[room].notes.n_gaps;
  if (!n) return [];
  return splitNote(n.text, 'added to the checklist. ').map((entry) => {
    const m = entry.match(/^(PH-[A-Z]{2}-\d+)\s\(([^)]*)\)/);
    return { id: m ? m[1] : '', topic: m ? m[2] : '', text: entry };
  });
}

/* ------------------------------------------------------------ field state */
function crewCounts(room) {
  const doc = (CREW[room] || {}).doc || {};
  const it = doc.items || {};
  let checked = 0, issues = 0;
  for (const v of Object.values(it)) { if (v.checked) checked++; if (v.issue) issues++; }
  return { lines: Object.keys(it).length, checked, issues, notes: Object.keys(doc.notes || {}).length };
}

function stagedCounts(room) {
  const ff = items(room), mep = items(room + '-MEP');
  const all = ff.concat(mep);
  const cnt = (rel) => all.filter((i) => i.reliability === rel).length;
  return {
    ff: ff.length,
    mep: mep.length,
    flagged: cnt('FLAGGED'),
    medium: cnt('MEDIUM'),
    checked: all.filter((i) => i.checked).length,
    issues: all.filter((i) => i.issue).length,
    gated: gatedRows(room).length,
    gaps: gapRows(room).length,
  };
}

/* ------------------------------------------------------------------ diffs */
function diff(refDoc, liveDoc) {
  const A = items(refDoc);
  const B = liveItems(liveDoc);
  const bm = new Map(B.map((i) => [i.key, i]));
  const am = new Map(A.map((i) => [i.key, i]));
  return {
    added: A.filter((i) => !bm.has(i.key)),
    dropped: B.filter((i) => !am.has(i.key)),
    qty: A.filter((i) => bm.has(i.key) && i.qty !== bm.get(i.key).qty)
      .map((i) => ({ ...i, was: bm.get(i.key).qty })),
    rel: A.filter((i) => bm.has(i.key) && i.reliability !== bm.get(i.key).reliability)
      .map((i) => ({ ...i, was: bm.get(i.key).reliability })),
  };
}

/* ----------------------------------------------------------------- render */
function ownerBlock(ownerKey) {
  const o = OWNERS[ownerKey];
  if (!o) {
    return `<div class="owes owes-none"><span class="owes-tag">OWNER NOT ASSIGNED</span>
      <div class="owes-body">Nobody is named on this one yet. Decide who chases it before the type generates at scale.</div></div>`;
  }
  return `<div class="owes"><span class="owes-tag">${esc(o.who)} OWES THE ANSWER</span>
    <div class="owes-body"><p>${esc(o.line)}</p>${o.also ? `<p class="owes-also">${esc(o.also)}</p>` : ''}</div></div>`;
}

function fieldCell(i) {
  const bits = [];
  if (i.checked) {
    const d = (i.checkedAtLocal || '').slice(0, 10);
    bits.push(`<div><span class="chk chk-on" title="checked in the crew app">&#10003;</span>
      <span class="who">${esc(i.initials || '--')}</span><span class="when">${esc(d)}</span></div>`);
  } else {
    bits.push(`<div><span class="chk chk-off"></span>${i.issue ? '' : '<span class="none">not started</span>'}</div>`);
  }
  /* a line can be both ticked and carrying an open issue; both are shown */
  if (i.issue) {
    bits.push(`<div class="issue">${i.checked ? '<span class="stillopen">still open</span> ' : ''}${esc(i.issue)}
      ${i.issueResolved ? '<span class="resolved">resolved</span>' : ''}</div>`);
  }
  return bits.join('');
}

function itemRows(doc) {
  const rows = items(doc);
  let out = '';
  let band = null;
  for (const i of rows) {
    if (i.category !== band) {
      band = i.category;
      const n = rows.filter((r) => r.category === band).length;
      out += `<tr class="band"><th colspan="6"><span class="band-name">${esc(band)}</span>
        <span class="band-n">${n} line${n === 1 ? '' : 's'}</span></th></tr>`;
    }
    const cls = [
      'row',
      i.reliability === 'FLAGGED' ? 'is-flag' : '',
      i.reliability === 'MEDIUM' ? 'is-med' : '',
      i.issue ? 'is-issue' : '',
      i.checked ? 'is-checked' : '',
    ].filter(Boolean).join(' ');
    const qty = (i.qty === undefined || i.qty === null)
      ? '<span class="noqty" title="ships with no quantity on purpose">--</span>'
      : esc(i.qty);
    const att = (i.attachments || []).map((a) =>
      `<a class="sub" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.label)}</a>`).join('');
    out += `<tr class="${cls}">
      <td class="c-tag"><code>${esc(i.code || '--')}</code></td>
      <td class="c-qty">${qty}</td>
      <td class="c-item"><div class="lbl">${esc(i.label)}</div>${att ? `<div class="atts">${att}</div>` : ''}</td>
      <td class="c-src"><span class="src">${esc(i.src || '')}</span></td>
      <td class="c-rel"><span class="rel ${relClass[i.reliability]}">${relWord[i.reliability]}</span></td>
      <td class="c-field">${fieldCell(i)}</td>
    </tr>`;
    if (i.instanceNote) {
      out += `<tr class="noterow ${i.reliability === 'FLAGGED' ? 'is-flag' : ''}">
        <td></td><td></td><td colspan="4"><div class="note clamped">${esc(i.instanceNote)}</div></td></tr>`;
    }
  }
  return out;
}

function tableFor(doc, title, sub) {
  const n = items(doc).length;
  return `<div class="doc">
    <div class="doc-head">
      <h4>${esc(title)}</h4>
      <div class="doc-meta"><span class="pill">doc <code>${esc(doc)}</code></span>
        <span class="pill">${n} lines</span><span class="doc-sub">${esc(sub)}</span></div>
    </div>
    <div class="tablewrap"><table class="checklist">
      <thead><tr><th class="c-tag">Tag</th><th class="c-qty">Qty</th><th class="c-item">Item</th>
        <th class="c-src">Source sheet</th><th class="c-rel">Confidence</th><th class="c-field">Field</th></tr></thead>
      <tbody>${itemRows(doc)}</tbody>
    </table></div>
  </div>`;
}

function flagBlocks(room) {
  const all = items(room).concat(items(room + '-MEP'))
    .filter((i) => i.reliability !== 'HIGH');
  /* group identical conflicts so the page does not repeat one conflict ten times */
  const groups = new Map();
  for (const i of all) {
    const ownerKey = FLAG_OWNER_BY_ROOM_KEY[room + ':' + i.key]
      || FLAG_OWNER_BY_KEY[i.key] || null;
    const gk = ownerKey || ('key:' + i.key);
    if (!groups.has(gk)) groups.set(gk, { ownerKey, lines: [], notes: [] });
    const g = groups.get(gk);
    g.lines.push(i);
    g.notes.push(i.instanceNote || '');
  }
  let out = '';
  let n = 0;
  for (const [, g] of groups) {
    n++;
    /* the clearest statement of the conflict, not the longest: the long ones
     * trail pages of citation bookkeeping the field does not need */
    const cand = g.notes.filter(Boolean).sort((a, b) => a.length - b.length);
    g.note = cand.find((t) => t.length >= 200) || cand[cand.length - 1] || '';
    const worst = g.lines.some((l) => l.reliability === 'FLAGGED') ? 'FLAGGED' : 'MEDIUM';
    /* what the reference database says about these same lines, where the line
     * does not already carry it */
    const extra = [];
    const seen = new Set();
    for (const l of g.lines) {
      const v = dbVoice(room, l);
      if (!v) continue;
      for (const nt of v.notes) {
        if (seen.has(nt.text)) continue;
        seen.add(nt.text);
        extra.push({ ...nt, tag: l.code || l.key });
      }
    }
    out += `<div class="flag ${worst === 'FLAGGED' ? 'flag-red' : 'flag-amber'}">
      <div class="flag-head">
        <span class="flag-n">FLAG ${String(n).padStart(2, '0')}</span>
        <span class="rel ${relClass[worst]}">${worst}</span>
        <h5>${esc(flagTitle(g))}</h5>
      </div>
      <div class="flag-lines"><span class="k">Lines it sits on</span>
        <div>${g.lines.map((l) => `<span class="fline"><code>${esc(l.code || l.key)}</code> ${esc(l.label.slice(0, 70))}${l.label.length > 70 ? '…' : ''} <em>qty ${l.qty === undefined ? '--' : l.qty}</em></span>`).join('')}</div>
      </div>
      <div class="verbatim"><span class="k">What the checklist line carries today</span>
        <blockquote>${esc(g.note || '(this line carries no note of its own)')}</blockquote>
        ${extra.length ? `<span class="k">What data/project.sqlite records for room ${esc(room)}, and the line does not</span>
          ${extra.map((e) => `<blockquote class="dbvoice"><span class="dbmeta">${esc(e.itm)}
            <span class="rel ${relClass[e.rel]}">${esc(e.rel)}</span> ${esc(e.tag)}
            ${e.sheet ? '&middot; ' + esc(e.sheet) : ''}</span>${esc(e.text)}</blockquote>`).join('')}` : ''}
      </div>
      ${ownerBlock(g.ownerKey)}
    </div>`;
  }
  return out;
}

function confidenceBlock(room) {
  const rows = confidenceGaps(room);
  if (!rows.length) return '';
  const open = rows.filter((r) => !r.why);
  return `<div class="subblock">
    <h4>Lines that ship more confident than the database <span class="count">${rows.length}</span></h4>
    <p class="lede">Every line here sits on at least one reference-database row at a LOWER confidence than the line
      itself carries. Most of them are that way because you closed the flag yourself, by ruling or by approved
      submittal, and the line says so. ${open.length
        ? `<strong>${open.length} of them ${open.length === 1 ? 'carries' : 'carry'} no such explanation</strong> and ${open.length === 1 ? 'is the one' : 'are the ones'} worth your eye.`
        : 'All of them carry that explanation.'}</p>
    <div class="tablewrap"><table class="difftable">
      <thead><tr><th class="c-sym"></th><th class="c-tag">Tag</th><th class="c-qty">Ships</th>
        <th class="c-item">Lowest row behind it, verbatim</th><th class="c-note">Why it still ships that way</th></tr></thead>
      <tbody>${rows.map((r) => {
        const low = r.v.rows.filter((x) => x.rel === r.v.worst);
        const txt = low.map((x) => `${x.itm}: ${x.note || x.inst || '(no note)'}`).join('  //  ');
        return `<tr class="${r.why ? 'd-qty' : 'd-drop'}">
          <td class="c-sym">${r.why ? '≈' : '!'}</td>
          <td class="c-tag"><code>${esc(r.item.code || r.item.key)}</code>
            <div class="tiny">${esc(r.doc)}</div></td>
          <td class="c-qty"><span class="rel ${relClass[r.item.reliability]}">${esc(r.item.reliability)}</span>
            <div class="tiny">db ${esc(r.v.worst)}</div></td>
          <td class="c-item">${esc(txt.length > 300 ? txt.slice(0, 300) + '…' : txt)}</td>
          <td class="c-note">${r.why ? esc(r.why) : '<strong class="bad">Not explained on the line. The independent check calls this out.</strong>'}</td>
        </tr>`;
      }).join('')}</tbody></table></div>
  </div>`;
}

function flagTitle(g) {
  const map = {
    bathing: 'Bathing configuration: TUB or ROLL-IN, unresolved',
    ptac_mark: 'PTAC mark is not stated anywhere and is left blank',
    heads: 'Sprinkler head count is not verified for this type',
    workingwall: 'Working wall tag: GR-308 as drawn, GR-305 / GR-309 in the spec',
    gr404: 'GR-403 and GR-404 are alternates, not a pair',
    microwave: 'Countertop microwave is an inference, not a documented item',
    a532_accessory: 'Bath accessories are not drawn on the roll-in elevations',
    a533_medium: 'Accessible bath accessory counts are MEDIUM with no reason recorded',
    elevation_count: 'Count came off an elevation, which is not a takeoff',
    ptac_count: 'Two PTAC units, and the sub-assembly is transcribed once',
    b31: 'Fixture marks: P401 / P402 against the P104 schedule, open',
    b42: 'GR-905 and the 905 telephone tag: two live positions',
    b45: 'GR tags are ambiguous without A530, open before final takeoff',
    gr905: 'GR-905 is described in no legend and no spec',
    grille_material: 'Room grille material is unsettled across three documents',
    bath_exhaust: 'Bath exhaust: fan or grille, and the regulator count',
    wc02: 'Accessible bath finish palette: A533 against A532',
  };
  if (g.ownerKey && map[g.ownerKey]) return map[g.ownerKey];
  return g.lines[0].label.slice(0, 90);
}

function gatedBlock(room) {
  const rows = gatedRows(room);
  if (!rows.length) return '';
  return `<div class="subblock">
    <h4>Conflicts recorded in the room note only <span class="count">${rows.length}</span></h4>
    <p class="lede">These rows sit in categories Austin's approved checklist gate keeps out of both documents
      (Paint, Drywall, Flooring, Doors, Stone / Surround, Wall Covering, FF&amp;E - Misc), which is how every
      approved floor-1 room already works. The conflict is kept here so it is not lost with the line.
      Widening the gate is Austin's call.</p>
    ${rows.map((r) => `<div class="flag flag-grey">
      <div class="flag-head"><span class="flag-n">NOTE ONLY</span>
        <h5><code>${esc(r.tag)}</code> <span class="gmeta">${esc(r.meta)}</span> <span class="gitm">${esc(r.itm)}</span></h5></div>
      <div class="verbatim"><blockquote>${esc(r.text)}</blockquote></div>
      ${ownerBlock(GATED_OWNER[r.tag])}
    </div>`).join('')}
  </div>`;
}

function gapBlock(room) {
  const rows = gapRows(room);
  if (!rows.length) return '';
  return `<div class="subblock">
    <h4>Document gaps raised against this type <span class="count">${rows.length}</span></h4>
    <p class="lede">Nothing here was filled in and nothing here was added to the checklist. These are holes in
      the drawing set, quoted from the reference database.</p>
    ${rows.map((r) => `<div class="flag flag-grey">
      <div class="flag-head"><span class="flag-n">GAP</span>
        <h5><code>${esc(r.id)}</code> ${esc(r.topic)}</h5></div>
      <div class="verbatim"><blockquote>${esc(r.text)}</blockquote></div>
      ${ownerBlock(GAP_OWNER[r.id])}
    </div>`).join('')}
  </div>`;
}

const CONFLICT_OWNER = { 'B3.1': 'b31', 'B4.2': 'b42', 'B4.5': 'b45' };

function carriageBlock(room) {
  const entries = conflictCarriage(room);
  const extra = EXTRA_CARRIED[room] || [];
  if (!entries.length && !extra.length) return '';
  const gapTotal = entries.reduce((a, e) => a + e.gaps.length, 0);
  const markRow = (m) => {
    const cls = m.state === 'RIDES' ? 'd-qty' : (m.lines.length ? 'd-drop' : 'd-rel');
    const sym = m.state === 'RIDES' ? '&#10003;' : '!';
    const where = m.rides.length
      ? m.rides.map((l) => `<code>${esc(l.key)}</code>`).join(' ')
      : (m.lines.length
        ? `<span class="bad">on ${m.lines.map((l) => `<code>${esc(l.key)}</code>`).join(' ')}, and the entry is not on it</span>`
        : '<span class="bad">no line in this package carries this mark</span>');
    return `<tr class="${cls}">
      <td class="c-sym">${sym}</td>
      <td class="c-tag"><code>${esc(m.mark)}</code></td>
      <td class="c-qty">${m.rows.map((r) => `<span class="tiny">${esc(r.itm)} <span class="rel ${relClass[r.rel]}">${esc(r.rel)}</span></span>`).join(' ')}
        <div class="tiny">${esc(m.rows[0].tag || '')}</div></td>
      <td class="c-item">${where}</td>
      <td class="c-note">${m.claimed
        ? 'named in the room note\'s own list'
        : '<strong class="bad">not in the room note\'s own list of the tags this entry names</strong>'}</td>
    </tr>`;
  };
  const blocks = entries.map((e) => `<div class="flag ${e.gaps.length ? 'flag-red' : 'flag-amber'}">
    <div class="flag-head">
      <span class="flag-n">${e.gaps.length ? 'PARTLY CARRIED' : 'CARRIED'}</span>
      <span class="rel ${e.gaps.length ? 'r-flag' : 'r-med'}">${esc(e.c.status)}</span>
      <h5><code>${esc(e.id)}</code> ${esc(e.c.topic)}</h5>
    </div>
    <div class="verbatim"><span class="k">Positions, verbatim from the conflicts table</span>
      <blockquote>${esc(e.c.positions)}</blockquote>
      <span class="k">Source</span><blockquote class="thin">${esc(e.c.source)}</blockquote></div>
    <div class="tablewrap"><table class="difftable">
      <thead><tr><th class="c-sym"></th><th class="c-tag">Mark the entry names</th>
        <th class="c-qty">This room's own row</th><th class="c-item">Where the entry rides</th>
        <th class="c-note">Room note n_conflicts</th></tr></thead>
      <tbody>${e.marks.map(markRow).join('')}</tbody></table></div>
    ${ownerBlock(CONFLICT_OWNER[e.id] || null)}
  </div>`).join('');
  const extras = extra.map((k) => `<div class="flag flag-grey">
    <div class="flag-head"><span class="flag-n">CARRIED IN A NOTE</span>
      <h5>The 438 versus 118 sheet split (A551 / A552)</h5></div>
    ${ownerBlock(k)}
  </div>`).join('');
  return `<div class="subblock">
    <h4>Open conflicts, mark by mark, and where each one actually landed
      <span class="count">${entries.length}</span></h4>
    <p class="lede">This table is built at render time, not typed. It reads every OPEN entry in the
      data/project.sqlite conflicts table, splits out every fixture and furniture mark the entry names, keeps the
      ones this room's own rows also carry, and then checks whether the entry is really on the line that holds the
      mark. ${gapTotal
        ? `<strong>${gapTotal} mark${gapTotal === 1 ? '' : 's'} did not land where the package says every mark lands.</strong>
           The independent check found the same thing and its wording is in the section above.`
        : 'Every mark landed on the line that carries it.'}
      Only hyphenated marks are read here, so this can under-report and never over-report.</p>
    ${blocks}${extras}
  </div>`;
}

function diffBlock(t) {
  const ff = diff(t.id, t.donor);
  const mep = diff(t.id + '-MEP', t.donor + '-MEP');
  const sect = (title, d, docA, docB) => {
    const row = (cls, sym, i, extra) => `<tr class="${cls}">
      <td class="c-sym">${sym}</td>
      <td class="c-tag"><code>${esc(i.code || '--')}</code></td>
      <td class="c-qty">${i.qty === undefined ? '--' : esc(i.qty)}</td>
      <td class="c-item">${esc(i.label.length > 120 ? i.label.slice(0, 120) + '…' : i.label)}</td>
      <td class="c-note">${extra}</td></tr>`;
    const body = [
      ...d.added.map((i) => row('d-add', '+', i, 'not in ' + docB)),
      ...d.dropped.map((i) => row('d-drop', '−', i, 'in ' + docB + ', not here')),
      ...d.qty.map((i) => row('d-qty', '≈', i, 'was qty ' + (i.was === undefined ? '--' : i.was) + ' in ' + docB)),
      ...d.rel.map((i) => row('d-rel', '!', i, 'was ' + i.was + ' in ' + docB)),
    ].join('');
    if (!body) return `<p class="same"><strong>${esc(title)}</strong> is line for line identical to ${esc(docB)}.</p>`;
    const n = d.added.length + d.dropped.length + d.qty.length + d.rel.length;
    return `<div class="doc">
      <div class="doc-head"><h4>${esc(title)}</h4>
        <div class="doc-meta"><span class="pill">${n} difference${n === 1 ? '' : 's'}</span>
        <span class="doc-sub">${esc(docA)} against LIVE ${esc(docB)}</span></div></div>
      <div class="tablewrap"><table class="difftable">
        <thead><tr><th class="c-sym"></th><th class="c-tag">Tag</th><th class="c-qty">Qty</th>
          <th class="c-item">Item</th><th class="c-note">Against the approved room</th></tr></thead>
        <tbody>${body}</tbody></table></div></div>`;
  };
  return `<div class="subblock">
    <h4>What is different from the nearest approved room</h4>
    <p class="lede">The nearest approved room is LIVE room ${esc(t.donor)} (${esc(t.donorType)}), which is on floor 1
      and already carries Austin's approval. Soft-deleted history lines in the approved room are excluded, so this
      compares what is actually on the two checklists today.</p>
    ${sect('FF&E checklist', ff, t.id, t.donor)}
    ${sect('MEP punch', mep, t.id + '-MEP', t.donor + '-MEP')}
  </div>`;
}

function notesBlock(room) {
  const notes = REF.docs[room].notes || {};
  const order = ['n_type', 'n_dbroom', 'n_config', 'n_d22', 'n_gaps', 'n_gategaps'];
  const keys = Object.keys(notes).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return `<div class="subblock">
    <h4>Room notes as they will appear in the app <span class="count">${keys.length}</span></h4>
    <p class="lede">Notes ride on the room, not on a line. Notes written by the crew keep their initials.</p>
    ${keys.map((k) => {
      const n = notes[k];
      const crew = !!n.by;
      return `<details class="notecard ${crew ? 'crewnote' : ''}"${crew ? ' open' : ''}>
        <summary><code>${esc(k)}</code>
          <span class="nflag ${n.flag === 'issue' ? 'nf-issue' : 'nf-info'}">${esc(n.flag)}</span>
          ${crew ? `<span class="who">${esc(n.by)}</span><span class="crewtag">from the crew app</span>` : ''}
          <span class="nprev">${esc(n.text.slice(0, 90))}${n.text.length > 90 ? '…' : ''}</span>
        </summary><div class="notebody">${esc(n.text)}</div></details>`;
    }).join('')}
  </div>`;
}

const sevClass = (w) => (/HIGH|SEVERE|MAJOR|MATERIAL/.test(w || '') ? 'v-hi'
  : /LOW/.test(w || '') ? 'v-lo' : /MEDIUM|MODERATE/.test(w || '') ? 'v-mid' : 'v-mid');

const openDefects = (room) => VERIFIER[room].defects.filter((d) => d.state === 'OPEN');
const priorFor = (room) => ROUND3.filter((r) => r.room === room);
/* A verdict is a word, and the colour has to follow the word rather than a
 * hard-coded class - otherwise a page that stops saying FAIL still paints red. */
const verdictClass = (w) => (/^FAIL$/i.test(w) ? 'verdict-fail'
  : /^PASS$/i.test(w) ? 'verdict-pass' : 'verdict-pending');

function verifierBlock(room) {
  const v = VERIFIER[room];
  if (!v) return '';
  const open = openDefects(room).length;
  const prior = priorFor(room);
  return `<div class="subblock verifier ${v.pending ? 'verifier-pending' : ''}">
    <h4>Independent check, round ${v.round}: <span class="${verdictClass(v.verdict)}">${esc(v.verdict)}</span>
      <span class="count">${open} finding${open === 1 ? '' : 's'} raised</span></h4>
    <p class="lede"><b>Round ${v.round} read this file and failed this type.</b> A checker with no knowledge of
      how the package was assembled read the rebuilt seed &mdash; the same file this page renders &mdash; and
      returned <span class="${verdictClass(v.verdict)}">${esc(v.verdict)}</span> with
      ${open} finding${open === 1 ? '' : 's'} on this type. All ${open} are printed below <b>word for word</b>,
      and <b>none of them is fixed</b>: no line, note or rule named below has been changed since the checker read
      it. That is deliberate. The fix-and-recheck loop ran three times, and this page is the end of it: you are
      being shown the file as it stands together with what the last reader said about it, rather than a fourth
      round of the fixing side's own assurances.</p>
    <p class="lede">Round ${v.priorRound} was the check before this one. It read the previous seed and returned
      <span class="${verdictClass(v.priorVerdict)}">${esc(v.priorVerdict)}</span> on this type with
      ${prior.length} finding${prior.length === 1 ? '' : 's'}. All ${prior.length} were worked in
      <code>platform/tools/build_ref_rooms.mjs</code>, the four rooms were rebuilt from
      <code>data/project.sqlite</code>, and the crew's work was carried again and reconciled exactly. Round
      ${v.round} did not raise any of those ${prior.length} again in the same words &mdash; but it did not
      re-verify them one by one either, so the state column on each of them still reads ADDRESSED &middot; NOT
      RE-VERIFIED, and it is left that way. The mechanism claimed for each is under
      &ldquo;<a href="#round1">What the earlier checks found</a>&rdquo;, in the checker's words and ours side by
      side.</p>
    ${prior.length ? `<div class="vprior"><span class="k">Round ${v.priorRound} on this type</span>
      ${prior.map((d, idx) => `<div class="vprior-row"><span class="vnum">${idx + 1}</span>
        <span class="vsev ${sevClass(d.sev)}">${esc(d.sev || 'DEFECT')}</span>
        <span class="vprior-t">${esc(d.text.slice(0, 190))}${d.text.length > 190 ? '&hellip;' : ''}</span></div>`).join('')}
      <div class="tiny">Each one in full, with the mechanism that answered it, is in
        &ldquo;<a href="#round1">What the earlier checks found</a>&rdquo;.</div></div>` : ''}
    ${v.defects.map((d, idx) => `<div class="vdef">
        <div class="vdef-head"><span class="vnum">${idx + 1}</span>
          <span class="vsev ${sevClass(d.sev)}">${esc(d.sev || 'DEFECT')}</span></div>
        <div class="vbody">${esc(d.text)}</div>
        ${d.owner ? ownerBlock(d.owner) : ''}
      </div>`).join('')}
  </div>`;
}

function roundOneBlock() {
  const byState = (s) => ROUND1.filter((r) => r.state === s).length;
  return `<div class="tablewrap"><table class="summary r1">
    <thead><tr><th>Room</th><th>What round 1 found</th><th>State</th><th>What was done</th></tr></thead>
    <tbody>${ROUND1.map((r) => `<tr>
      <td><code class="rep">${esc(r.room)}</code></td>
      <td>${esc(r.finding)}</td>
      <td class="s-state"><span class="${r.state === 'CLOSED' ? 'ok' : 'warn'}">${esc(r.state)}</span></td>
      <td class="s-eff">${esc(r.how)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="lede" style="margin-top:12px">${byState('CLOSED')} of the ${ROUND1.length} rows above are closed
      in the data. The one that is not is recorded as disclosed rather than closed, because closing it would have
      meant the tool overruling the reference database. <b>A number that does not reconcile, said plainly:</b>
      the round-1 checkpoint records <b>${ROUND_RAISED[1]}</b> findings and the write-up kept here carries
      ${ROUND1.length} rows. Nothing in this repository reconciles the two, so neither number is quietly dropped;
      the ${ROUND1.length} rows are what was written down at the time and the ${ROUND_RAISED[1]} is what the
      checkpoint counted.</p>`;
}

/* Round 2's findings, kept in full. They are HISTORY - but they are not
 * deleted, because round 3 re-opened two of the closures claimed here and the
 * reader needs both sides. */
function roundTwoBlock() {
  /* Counted off the round-3 findings themselves: the ones that name a round-2
   * closure and say it did not hold. Nothing is asserted that the checker did
   * not write. */
  const reopened = ROUND3.filter((d) => /CLOSED BY THE ROUND-3 FIX|Round 3 fixed the/.test(d.text || '')).length;
  /* The collateral rows: the same finding raised once per type, that the
   * DELIVERED mockbook.html was a stale pre-fix render. Counted, not asserted. */
  const stale = ROUND2.filter((d) => /mockbook\.html/.test(d.text || '')).length;
  return `<div class="tablewrap"><table class="summary r1">
    <thead><tr><th>Room</th><th>Severity</th><th>What round 2 found</th><th>State after the round-3 fix</th>
      <th>What was done</th></tr></thead>
    <tbody>${ROUND2.map((r) => `<tr>
      <td><code class="rep">${esc(r.room)}</code></td>
      <td class="s-state">${r.sev ? `<span class="vsev ${sevClass(r.sev)}">${esc(r.sev)}</span>` : ''}</td>
      <td>${esc(r.text)}</td>
      <td class="s-state"><span class="${/CLOSED/.test(r.state) ? 'ok' : 'warn'}">${esc(r.state)}</span></td>
      <td class="s-eff">${esc(r.how || '')}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="lede" style="margin-top:12px">All ${ROUND2.length} rows above were worked, most of them by
      changing <code>platform/tools/build_ref_rooms.mjs</code> rather than by patching a line. That work is real
      and it is checkable against the generator. It did not make the package pass: the round-3 check read the
      rebuilt file and failed all four types again, and ${reopened} of its ${ROUND3.length} findings name a
      closure claimed in this very table and say it did not hold &mdash; the fix corrected the mark on the 238
      bathing lines and left the citation asserting the donor's. Both accounts are on this page, unedited, so you
      can judge the closure yourself rather than take it. <b>A closure claimed in a table like this one is an
      account of a code change, never a verdict &mdash; which is exactly what round ${ROUND} went on to
      demonstrate again.</b> On the counts: the round-2 checkpoint records ${ROUND_RAISED[2]} findings and this
      table carries ${ROUND2.length} rows, of which ${stale} are the separate collateral finding &mdash; raised
      once per type &mdash; that the delivered <code>mockbook.html</code> was a stale pre-fix render at the time.
      ${ROUND2.length} less ${stale} is ${ROUND2.length - stale}, which is where the checkpoint's
      ${ROUND_RAISED[2]} lands.</p>`;
}

/* Round 3's findings, in full, with what the round-4 fix did about each. This is
 * the fixing side's account of its own work, printed beside the checker's words
 * so the two can be read against each other and against the generator. */
function roundThreeBlock() {
  return `<div class="tablewrap"><table class="summary r1">
    <thead><tr><th>Room</th><th>Severity</th><th>What round 3 found</th><th>State</th>
      <th>What the round-4 fix did</th></tr></thead>
    <tbody>${ROUND3.map((r) => `<tr>
      <td><code class="rep">${esc(r.room)}</code></td>
      <td class="s-state">${r.sev ? `<span class="vsev ${sevClass(r.sev)}">${esc(r.sev)}</span>` : ''}</td>
      <td>${esc(r.text)}</td>
      <td class="s-state"><span class="warn">${esc(r.state)}</span></td>
      <td class="s-eff">${esc(r.how || '')}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="lede" style="margin-top:12px">All ${ROUND3.length} round-3 findings were worked, and the column on
      the right is the mechanism, not a claim of success. Every one of them names the function in
      <code>platform/tools/build_ref_rooms.mjs</code> that changed, so it can be checked against the generator and
      against the rebuilt seed rather than taken on trust. <b>The state column still says ADDRESSED &middot; NOT
      RE-VERIFIED on every row, and that is not an oversight.</b> Round ${ROUND} has now read the rebuilt file and
      did not raise any of these ${ROUND3.length} again in the same words &mdash; but it was a fresh read of the
      whole package, not a line-by-line re-test of these ${ROUND3.length} fixes, so a finding it did not repeat is
      evidence and not proof. It is left as ADDRESSED. Round ${ROUND} raised ${R4_TOTAL} findings of its own and
      failed all four types; three of those ${R4_TOTAL} turn on the very sentence this fix round added to
      <code>meta.donorRule</code>, which is the plainest measure of how far the work below got. The
      fix round also added <code>platform/tools/assert_ref_claims.mjs</code>, which walks every note and every
      meta rule in the seed and fails the run on a room-wide negative, on a meta claim with no code behind it, on
      a note that restates a reliability or a quantity its own field already carries, and on a line with no
      SOURCE sentence &mdash; because that class of defect, not the data, is what the last three rounds kept
      catching.</p>`;
}

function approveBox(t) {
  const open = openDefects(t.id).length;
  return `<div class="approve">
    <div class="approve-head">APPROVE / CHANGES &middot; ${esc(t.type)}
      <span class="approve-state">independent check: <span class="${verdictClass(VERIFIER[t.id].verdict)}">${esc(VERIFIER[t.id].verdict)}</span>,
        round ${VERIFIER[t.id].round} &middot; ${open} finding${open === 1 ? '' : 's'} open and unfixed</span></div>
    <div class="approve-body">
      <div class="ab-row"><span class="box"></span>
        <div><strong>APPROVE the shape.</strong> The bands, the tags, the line wording and the flag handling are right
        for this type. Generate the remaining ${t.rooms.length - 1} key${t.rooms.length - 1 === 1 ? '' : 's'}
        (${esc(t.rooms.filter((r) => r !== t.rep).join(', '))}) from this package${open
          ? ` once the ${open} open finding${open === 1 ? '' : 's'} above ${open === 1 ? 'is' : 'are'} fixed and the
        check comes back clean`
          : ` once an independent re-check comes back clean on the rebuilt data — all
        ${priorFor(t.id).length} round-${VERIFIER[t.id].priorRound} findings on this type are answered in the
        generator, and nobody outside this build has re-verified that yet`}.</div></div>
      <div class="ab-row"><span class="box"></span>
        <div><strong>APPROVE with changes.</strong> Write them here. Anything you mark gets applied to the reference room
        first, re-verified, and only then generated at scale.</div></div>
      <div class="ab-row"><span class="box"></span>
        <div><strong>HOLD.</strong> Do not generate this type yet. Name what has to be answered first.</div></div>
      <div class="ab-write"><span class="k">Changes, in your words</span><div class="rule"></div><div class="rule"></div>
        <div class="rule"></div><div class="rule"></div></div>
      <div class="ab-sign"><div><span class="k">Signed</span><div class="rule"></div></div>
        <div><span class="k">Date</span><div class="rule"></div></div></div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------- page */
function summaryTable() {
  return `<div class="tablewrap"><table class="summary">
    <thead><tr>
      <th>Type</th><th>Keys on the type</th><th>Reference room</th>
      <th class="num">FF&amp;E lines</th><th class="num">MEP lines</th>
      <th class="num">Flagged</th><th class="num">Medium</th>
      <th class="num">Note-only conflicts</th><th class="num">Document gaps</th>
      <th class="num">Crew check-offs</th><th class="num">Crew open issues</th>
      <th>Independent check</th>
    </tr></thead><tbody>
    ${TYPES.map((t) => {
      const s = stagedCounts(t.id);
      const v = VERIFIER[t.id];
      return `<tr>
        <td class="s-type"><a href="#t${t.id}">${esc(t.type)}</a><span class="s-n">${esc(t.n)}</span></td>
        <td class="s-rooms">${t.rooms.map((r) => `<code class="${r === t.rep ? 'rep' : ''}">${esc(r)}</code>`).join('')}</td>
        <td class="num"><code class="rep">${esc(t.rep)}</code></td>
        <td class="num">${s.ff}</td><td class="num">${s.mep}</td>
        <td class="num ${s.flagged ? 'hot' : ''}">${s.flagged}</td>
        <td class="num ${s.medium ? 'warm' : ''}">${s.medium}</td>
        <td class="num">${s.gated}</td><td class="num">${s.gaps}</td>
        <td class="num">${s.checked}</td><td class="num ${s.issues ? 'warm' : ''}">${s.issues}</td>
        <td class="num"><span class="${verdictClass(v.verdict)}">${esc(v.verdict)}</span>
          <span class="vcount">round ${v.round} &middot; ${openDefects(t.id).length} open</span></td>
      </tr>`;
    }).join('')}
    <tr class="totals"><td>All four</td><td>${TYPES.reduce((a, t) => a + t.rooms.length, 0)} keys</td>
      <td class="num">4 rooms</td>
      ${(() => {
        const tot = TYPES.map((t) => stagedCounts(t.id));
        const sum = (f) => tot.reduce((a, s) => a + s[f], 0);
        return `<td class="num">${sum('ff')}</td><td class="num">${sum('mep')}</td>
          <td class="num hot">${sum('flagged')}</td><td class="num warm">${sum('medium')}</td>
          <td class="num">${sum('gated')}</td><td class="num">${sum('gaps')}</td>
          <td class="num">${sum('checked')}</td><td class="num warm">${sum('issues')}</td>`;
      })()}
      <td class="num"><span class="${verdictClass(VERIFIER[TYPES[0].id].verdict)}">4 ${esc(VERIFIER[TYPES[0].id].verdict)}</span>
        <span class="vcount">round ${VERIFIER[TYPES[0].id].round} &middot; ${TYPES.reduce((a, t) => a + openDefects(t.id).length, 0)} open</span></td></tr>
    </tbody></table></div>`;
}

function carryTable() {
  return `<div class="tablewrap"><table class="summary carry">
    <thead><tr><th>Room</th><th class="num">Lines in the crew app</th><th class="num">Crew check-offs</th>
      <th class="num">Crew open issues</th><th class="num">Crew notes</th>
      <th class="num">Carried onto this mock-up</th><th>Result</th></tr></thead><tbody>
    ${TYPES.map((t) => {
      const c = crewCounts(t.id);
      const s = stagedCounts(t.id);
      const lost = c.issues - s.issues;
      return `<tr>
        <td><code class="rep">${esc(t.id)}</code> ${esc(t.type)}</td>
        <td class="num">${c.lines}</td><td class="num">${c.checked}</td>
        <td class="num">${c.issues}</td><td class="num">${c.notes}</td>
        <td class="num">${s.checked} checks / ${s.issues} issues</td>
        <td>${lost === 0
          ? '<span class="ok">exact</span>'
          : `<span class="bad">${lost} issue${lost === 1 ? '' : 's'} did not carry</span>`}</td>
      </tr>`;
    }).join('')}
    </tbody></table></div>`;
}

function buyStoppers() {
  return `<div class="tablewrap"><table class="summary stoppers">
    <thead><tr><th>Where</th><th>Line</th><th>What is wrong</th><th>What it costs you</th>
      <th>Who owes the answer</th></tr></thead>
    <tbody>${BUY_STOPPERS.map((b) => {
      const o = OWNERS[b.owner];
      return `<tr>
        <td><code class="rep">${esc(b.room)}</code></td>
        <td class="s-line">${esc(b.line)}</td>
        <td>${esc(b.what)}</td>
        <td class="s-eff">${esc(b.effect)}</td>
        <td class="s-owner"><span class="owes-tag">${esc(o ? o.who : 'NOT ASSIGNED')}</span>
          <div class="tiny">${esc(o ? o.line : 'Nobody is named on this one yet.')}</div></td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function section(t) {
  const s = stagedCounts(t.id);
  const c = crewCounts(t.id);
  return `<section id="t${t.id}" class="type">
    <div class="type-head">
      <div class="type-n">${esc(t.n)}</div>
      <div class="type-id">
        <h2>${esc(t.type)}</h2>
        <div class="type-rooms">${t.rooms.map((r) => `<code class="${r === t.rep ? 'rep' : ''}">${esc(r)}</code>`).join('')}
          <span class="repnote">reference room ${esc(t.rep)}</span></div>
      </div>
      <div class="type-verdict"><span class="${verdictClass(VERIFIER[t.id].verdict)}">${esc(VERIFIER[t.id].verdict)}</span>
        <span class="vcount">round ${VERIFIER[t.id].round} &middot; ${openDefects(t.id).length} open &middot;
          round ${VERIFIER[t.id].priorRound} was ${esc(VERIFIER[t.id].priorVerdict)}</span></div>
    </div>

    <p class="story">${esc(t.story)}</p>
    <p class="context">${esc(t.context)}</p>

    <div class="stats">
      <div class="stat"><span class="v">${s.ff}</span><span class="k">FF&amp;E lines</span></div>
      <div class="stat"><span class="v">${s.mep}</span><span class="k">MEP punch lines</span></div>
      <div class="stat ${s.flagged ? 'hot' : ''}"><span class="v">${s.flagged}</span><span class="k">flagged lines</span></div>
      <div class="stat ${s.medium ? 'warm' : ''}"><span class="v">${s.medium}</span><span class="k">medium lines</span></div>
      <div class="stat"><span class="v">${s.gated}</span><span class="k">note-only conflicts</span></div>
      <div class="stat"><span class="v">${s.gaps}</span><span class="k">document gaps</span></div>
      <div class="stat"><span class="v">${s.checked}</span><span class="k">crew check-offs carried</span></div>
      <div class="stat ${s.issues ? 'warm' : ''}"><span class="v">${s.issues}</span><span class="k">crew issues carried</span></div>
    </div>

    <div class="sheetline"><span class="k">Sheets</span> ${esc(t.sheets)}</div>
    <div class="sheetline"><span class="k">Package text leans on</span> LIVE room ${esc(t.donor)} (${esc(t.donorType)}) for shared tags only.
      Any tag with no counterpart there ships from data/project.sqlite verbatim, with its own confidence.</div>
    <div class="sheetline"><span class="k">Crew app holds</span> ${c.lines} lines, ${c.checked} check-offs,
      ${c.issues} open issues, ${c.notes} note${c.notes === 1 ? '' : 's'} on room ${esc(t.id)} today.</div>

    ${verifierBlock(t.id)}

    <div class="subblock">
      <h4>FF&amp;E checklist and MEP punch, as the crew will see them</h4>
      <p class="lede">Bands, tag order and sort are the app's own. A tick with initials is work the crew already
        recorded; the red text is an open issue they wrote in the field. Click any grey note to open it.</p>
      ${tableFor(t.id, 'FF&E checklist', 'room ' + t.id)}
      ${tableFor(t.id + '-MEP', 'MEP punch', 'room ' + t.id + ', condensed per rulings D10 and D26, plus D27 hot and cold water')}
    </div>

    <div class="subblock">
      <h4>Open flags on the checklist <span class="count">${s.flagged + s.medium}</span></h4>
      <p class="lede">Every conflict is carried and flagged. Nothing here was resolved by the build.
        Each block quotes the document and names who owes the answer.</p>
      ${flagBlocks(t.id)}
    </div>

    ${confidenceBlock(t.id)}
    ${gatedBlock(t.id)}
    ${gapBlock(t.id)}
    ${carriageBlock(t.id)}
    ${diffBlock(t)}
    ${notesBlock(t.id)}
    ${approveBox(t)}
  </section>`;
}

const CSS = `
:root{
  --ink:#101820; --ink2:#3C4854; --ink3:#6B7885;
  --paper:#FFFFFF; --field:#EEF2F5; --rule:#D7DEE5; --rule2:#E8EDF1;
  --rail:#0D141C; --rail2:#16212D; --rail-ink:#AEBDCC; --rail-dim:#63748A;
  --cyan:#02A9DE; --cyan-d:#0286B1;
  --red:#B02318; --red-bg:#FCF1EF; --red-rule:#E9C4BF;
  --amber:#9A6408; --amber-bg:#FDF6EA; --amber-rule:#EBD7B2;
  --green:#25693F;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--field);color:var(--ink);font-family:var(--sans);
  font-size:15px;line-height:1.5;font-variant-numeric:tabular-nums}
code,.mono{font-family:var(--mono);font-size:.92em}
a{color:var(--cyan-d);text-decoration:none;border-bottom:1px solid rgba(2,169,222,.35)}
a:hover{border-bottom-color:var(--cyan)}

/* ---- rail ---- */
.rail{position:fixed;top:0;left:0;bottom:0;width:246px;background:var(--rail);color:var(--rail-ink);
  padding:22px 18px;overflow-y:auto;z-index:20}
.rail .stamp{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;color:var(--rail-dim);
  text-transform:uppercase;line-height:1.7}
.rail .stamp strong{color:#E6EDF4;display:block;font-size:12px;letter-spacing:.1em;margin-bottom:4px}
.rail .status{margin:18px 0;padding:9px 10px;border:1px solid #2E3B49;border-left:3px solid var(--cyan);
  background:var(--rail2);font-family:var(--mono);font-size:10.5px;letter-spacing:.09em;color:#CDDAE6;line-height:1.6}
.rail nav{margin-top:14px}
.rail nav a{display:block;padding:8px 10px;margin:2px -10px;color:var(--rail-ink);border:0;
  font-size:13px;border-left:2px solid transparent}
.rail nav a:hover{background:var(--rail2);color:#fff}
.rail nav a.on{background:var(--rail2);color:#fff;border-left-color:var(--cyan)}
.rail nav a .rn{font-family:var(--mono);font-size:10px;color:var(--rail-dim);margin-right:8px}
.rail nav a.on .rn{color:var(--cyan)}
.rail nav .grp{font-family:var(--mono);font-size:10px;letter-spacing:.14em;color:var(--rail-dim);
  text-transform:uppercase;margin:18px 0 6px}
.rail .foot{margin-top:26px;font-size:11px;color:var(--rail-dim);line-height:1.6}

/* ---- shell ---- */
.wrap{margin-left:246px;padding:0 40px 100px}
.inner{max-width:1120px;margin:0 auto}

/* ---- title block ---- */
.titleblock{background:var(--paper);border:1px solid var(--rule);border-top:4px solid var(--rail);
  margin:34px 0 26px;padding:26px 30px}
.titleblock h1{margin:0 0 4px;font-size:30px;letter-spacing:-.015em;line-height:1.16}
.titleblock .sub{color:var(--ink2);font-size:16px;margin:0 0 20px}
.tbgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;border-top:1px solid var(--rule)}
.tbgrid div{padding:11px 14px 11px 0;border-right:1px solid var(--rule2)}
.tbgrid div:last-child{border-right:0}
.tbgrid .k{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;
  color:var(--ink3);text-transform:uppercase;margin-bottom:3px}
.tbgrid .v{font-size:14px;color:var(--ink)}
.notlive{margin-top:18px;padding:11px 14px;background:#0D141C;color:#E6EDF4;
  font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;line-height:1.7}
.notlive b{color:var(--cyan)}
.notlive.round{margin-top:8px;background:#16212D;border-left:3px solid var(--red)}

h2{font-size:23px;margin:0;letter-spacing:-.01em}
h3{font-size:17px;margin:0 0 6px;letter-spacing:.01em}
h4{font-size:15px;margin:0 0 6px}
h5{font-size:14px;margin:0}

section.block{background:var(--paper);border:1px solid var(--rule);padding:26px 30px;margin:0 0 26px}
section.block>h3{border-bottom:2px solid var(--rail);padding-bottom:8px;margin-bottom:14px;
  display:flex;align-items:baseline;gap:10px}
section.block>h3 .hn{font-family:var(--mono);font-size:11px;letter-spacing:.14em;color:var(--cyan-d)}
.lede{color:var(--ink2);font-size:14px;margin:0 0 14px;max-width:78ch}

/* ---- tables ---- */
.tablewrap{overflow-x:auto;border:1px solid var(--rule);background:var(--paper)}
table{border-collapse:collapse;width:100%;font-size:13.5px}
thead th{background:#F5F8FA;border-bottom:2px solid var(--rule);text-align:left;
  padding:9px 10px;font-family:var(--mono);font-size:10px;letter-spacing:.11em;
  text-transform:uppercase;color:var(--ink3);white-space:nowrap;position:sticky;top:0;z-index:2}
td{padding:8px 10px;border-bottom:1px solid var(--rule2);vertical-align:top}
.num,th.num{text-align:right}
.summary td{font-size:13.5px}
.summary .s-type a{border:0;font-weight:600}
.summary .s-n{font-family:var(--mono);font-size:10px;color:var(--ink3);margin-left:8px}
.summary .s-rooms code{margin-right:5px}
code.rep{background:var(--rail);color:#fff;padding:1px 5px;border-radius:2px}
.summary tr.totals td{border-top:2px solid var(--rule);font-weight:600;background:#F5F8FA}
.num.hot{color:var(--red);font-weight:600}
.num.warm{color:var(--amber);font-weight:600}
.verdict-fail{background:var(--red);color:#fff;font-family:var(--mono);font-size:10px;
  letter-spacing:.1em;padding:2px 7px;border-radius:2px}
.verdict-pending{background:var(--amber);color:#fff;font-family:var(--mono);font-size:10px;
  letter-spacing:.1em;padding:2px 7px;border-radius:2px}
.verdict-pass{background:var(--green);color:#fff;font-family:var(--mono);font-size:10px;
  letter-spacing:.1em;padding:2px 7px;border-radius:2px}
.vcount{font-family:var(--mono);font-size:11px;color:var(--ink3);margin-left:6px}
.carry .ok{color:var(--green);font-weight:600}
.carry .bad{color:var(--red);font-weight:600}
.stoppers .s-line{font-family:var(--mono);font-size:12px}
.stoppers .s-eff{color:var(--red);}
.stoppers .s-owner{width:210px}
.stoppers .s-owner .owes-tag{white-space:nowrap}
.stoppers td{font-size:13px}
.r1 .s-state{white-space:nowrap;width:130px}
.r1 .s-state .ok{color:var(--green);font-weight:600;font-family:var(--mono);font-size:11px;letter-spacing:.06em}
.r1 .s-state .warn{color:var(--amber);font-weight:600;font-family:var(--mono);font-size:11px;letter-spacing:.06em}
.r1 .s-eff{color:var(--ink2)}
.r1 td{font-size:13px}

/* ---- type section ---- */
section.type{background:var(--paper);border:1px solid var(--rule);margin:0 0 30px;padding:0}
.type-head{display:flex;align-items:center;gap:18px;padding:22px 30px;background:var(--rail);color:#fff}
.type-n{font-family:var(--mono);font-size:34px;color:var(--cyan);line-height:1}
.type-id{flex:1}
.type-id h2{color:#fff}
.type-rooms{margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.type-rooms code{background:#22303E;color:#C7D5E2;padding:2px 6px;border-radius:2px;font-size:12px}
.type-rooms code.rep{background:var(--cyan);color:#06222E;font-weight:700}
.type-rooms .repnote{font-family:var(--mono);font-size:10px;letter-spacing:.1em;
  color:var(--rail-dim);text-transform:uppercase;margin-left:6px}
.type-verdict{text-align:right}
.type-verdict .vcount{display:block;margin:5px 0 0;color:var(--rail-dim)}
.story{margin:24px 30px 8px;font-size:18px;line-height:1.5;color:var(--ink);max-width:88ch}
.context{margin:0 30px 20px;font-size:14.5px;color:var(--ink2);max-width:88ch}

.stats{display:flex;flex-wrap:wrap;gap:0;margin:0 30px 18px;border:1px solid var(--rule)}
.stat{flex:1 1 118px;padding:11px 14px;border-right:1px solid var(--rule2)}
.stat:last-child{border-right:0}
.stat .v{display:block;font-size:24px;font-weight:600;line-height:1.1}
.stat .k{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.09em;
  color:var(--ink3);text-transform:uppercase;margin-top:3px}
.stat.hot .v{color:var(--red)} .stat.warm .v{color:var(--amber)}
.sheetline{margin:0 30px 8px;font-size:13.5px;color:var(--ink2)}
.sheetline .k{font-family:var(--mono);font-size:9.5px;letter-spacing:.11em;color:var(--ink3);
  text-transform:uppercase;margin-right:8px}

.subblock{margin:26px 30px 0;padding-top:20px;border-top:1px solid var(--rule)}
.subblock>h4{font-size:16px;display:flex;align-items:baseline;gap:9px;margin-bottom:8px}
.subblock .count{font-family:var(--mono);font-size:11px;color:#fff;background:var(--ink2);
  padding:1px 7px;border-radius:9px}

/* ---- checklist ---- */
.doc{margin:0 0 18px}
.doc-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:14px 0 7px}
.doc-head h4{font-size:14px;letter-spacing:.02em}
.doc-meta{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pill{font-family:var(--mono);font-size:10px;letter-spacing:.08em;background:#EDF2F6;
  border:1px solid var(--rule);padding:1px 7px;color:var(--ink2)}
.doc-sub{font-size:12px;color:var(--ink3)}
.checklist .band th{background:var(--rail);color:#fff;padding:7px 10px;position:static;
  border-bottom:0;letter-spacing:.13em;font-size:10px}
.checklist .band .band-name{color:#fff}
.checklist .band .band-n{float:right;color:var(--rail-dim);font-weight:400}
.checklist .c-tag{width:92px}
.checklist .c-tag code{background:#EDF2F6;border:1px solid var(--rule);padding:1px 5px;
  border-radius:2px;white-space:nowrap}
.checklist .c-qty{width:46px;text-align:right;font-family:var(--mono);font-weight:600}
.checklist .noqty{color:var(--amber);font-weight:700}
.checklist .c-src{width:190px}
.checklist .c-src .src{font-family:var(--mono);font-size:10.5px;color:var(--ink3);
  display:block;max-height:2.9em;overflow:hidden}
.checklist .c-rel{width:86px}
.checklist .c-field{width:210px}
.checklist .lbl{max-width:52ch}
.rel{font-family:var(--mono);font-size:9.5px;letter-spacing:.09em;padding:2px 6px;
  border-radius:2px;white-space:nowrap;display:inline-block}
.r-high{background:#EDF2F6;color:var(--ink3);border:1px solid var(--rule)}
.r-med{background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-rule)}
.r-flag{background:var(--red);color:#fff;border:1px solid var(--red)}
tr.is-flag>td{background:var(--red-bg)}
tr.is-med>td{background:#FDFAF4}
.chk{display:inline-block;width:14px;height:14px;border:1.5px solid var(--ink3);
  border-radius:2px;margin-right:7px;text-align:center;line-height:11px;font-size:11px;vertical-align:-2px}
.chk-on{background:var(--green);border-color:var(--green);color:#fff}
.c-field .who{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--green);margin-right:7px}
.c-field .when{font-family:var(--mono);font-size:10.5px;color:var(--ink3)}
.c-field .issue{color:var(--red);font-size:12px;font-weight:600}
.c-field .none{color:#A9B4BF;font-size:12px}
.c-field .issue{display:block;margin-top:2px}
.stillopen{font-family:var(--mono);font-size:9px;letter-spacing:.09em;background:var(--red);
  color:#fff;padding:1px 5px;border-radius:2px;vertical-align:1px}
.resolved{font-family:var(--mono);font-size:9px;letter-spacing:.09em;background:#EAF5EE;
  color:var(--green);border:1px solid #CFE4D7;padding:1px 5px;border-radius:2px}
.atts{margin-top:4px}
.sub{display:inline-block;font-size:11px;font-family:var(--mono);background:#E8F6FC;
  border:1px solid #B5E3F5;color:var(--cyan-d);padding:1px 6px;margin:2px 4px 0 0;border-radius:2px}
.noterow td{border-bottom:1px solid var(--rule2);padding-top:0}
.note{font-size:12px;color:var(--ink2);background:#F6F8FA;border-left:2px solid var(--rule);
  padding:6px 10px;cursor:pointer;white-space:pre-wrap}
.noterow.is-flag .note{background:var(--red-bg);border-left-color:var(--red)}
.note.clamped{max-height:3.3em;overflow:hidden;position:relative}
.note.clamped::after{content:"click to open";position:absolute;right:8px;bottom:2px;
  font-family:var(--mono);font-size:9px;letter-spacing:.08em;color:var(--ink3);
  background:linear-gradient(90deg,rgba(246,248,250,0),#F6F8FA 40%);padding-left:22px}
.noterow.is-flag .note.clamped::after{background:linear-gradient(90deg,rgba(252,241,239,0),var(--red-bg) 40%)}

/* ---- flags ---- */
.flag{border:1px solid var(--rule);border-left:4px solid var(--ink3);
  background:var(--paper);margin:0 0 14px;padding:14px 16px}
.flag-red{border-left-color:var(--red);background:var(--red-bg);border-color:var(--red-rule)}
.flag-amber{border-left-color:var(--amber);background:var(--amber-bg);border-color:var(--amber-rule)}
.flag-grey{background:#F7F9FB}
.flag-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px}
.flag-n{font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;color:#fff;
  background:var(--ink2);padding:2px 7px;border-radius:2px}
.flag-red .flag-n{background:var(--red)}
.flag-head h5{flex:1 1 320px}
.gmeta{font-family:var(--mono);font-size:10.5px;color:var(--ink3)}
.gitm{font-family:var(--mono);font-size:10.5px;color:var(--ink3)}
.flag .k{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;
  color:var(--ink3);text-transform:uppercase;margin:0 0 5px}
.flag-lines{margin-bottom:10px}
.fline{display:block;font-size:12.5px;color:var(--ink2);padding:2px 0}
.fline code{background:#fff;border:1px solid var(--rule);padding:1px 5px;border-radius:2px;margin-right:7px}
.fline em{font-family:var(--mono);font-style:normal;font-size:11px;color:var(--ink3);margin-left:6px}
.verbatim blockquote{margin:0 0 8px;padding:9px 12px;background:#fff;border:1px solid var(--rule);
  font-size:12.5px;line-height:1.6;color:var(--ink);white-space:pre-wrap;
  max-height:15em;overflow-y:auto}
.verbatim blockquote.thin{font-family:var(--mono);font-size:11px;color:var(--ink3);max-height:none}
.verbatim blockquote.dbvoice{border-left:3px solid var(--cyan);background:#F4FBFE}
.dbmeta{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;
  color:var(--ink3);margin-bottom:5px}
.tiny{font-family:var(--mono);font-size:9.5px;color:var(--ink3);margin-top:3px}
.bad{color:var(--red)}
.owes{display:flex;gap:12px;align-items:flex-start;background:#0D141C;color:#DCE6EF;
  padding:10px 13px;margin-top:4px}
.owes-tag{font-family:var(--mono);font-size:10px;letter-spacing:.11em;color:#06222E;
  background:var(--cyan);padding:3px 8px;border-radius:2px;white-space:nowrap;flex:0 0 auto}
.owes-body{font-size:12.5px;line-height:1.6}
.owes-body p{margin:0 0 5px}
.owes-body p:last-child{margin:0}
.owes-also{color:#9FB0C1}
.owes-none .owes-tag{background:var(--amber);color:#241703}

/* ---- verifier ---- */
.verifier{border-top:3px solid var(--red)}
.verifier-pending{border-top-color:var(--amber)}
.verifier h4 .verdict-fail,.verifier h4 .verdict-pending,.verifier h4 .verdict-pass{margin:0 4px}
.vprior{border:1px solid var(--rule);background:#F7FAFC;padding:11px 13px;margin:0 0 10px}
.vprior>.k{font-family:var(--mono);font-size:10px;letter-spacing:.11em;color:var(--ink3);display:block;margin-bottom:8px}
.vprior-row{display:flex;align-items:flex-start;gap:9px;margin-bottom:7px}
.vprior-t{font-size:12px;line-height:1.55;color:var(--ink2)}
.vdef{border:1px solid var(--red-rule);background:var(--red-bg);margin:0 0 10px;padding:12px 14px}
.vdef-head{display:flex;align-items:center;gap:9px;margin-bottom:7px}
.vnum{font-family:var(--mono);font-size:11px;color:#fff;background:var(--ink2);
  width:20px;height:20px;line-height:20px;text-align:center;border-radius:2px}
.vsev{font-family:var(--mono);font-size:9.5px;letter-spacing:.11em;padding:2px 7px;border-radius:2px}
.v-hi{background:var(--red);color:#fff}
.v-mid{background:var(--amber);color:#fff}
.v-lo{background:#E4EAF0;color:var(--ink2)}
.v-ok{background:var(--green);color:#fff}
.vbody{font-size:12.5px;line-height:1.65;color:var(--ink);white-space:pre-wrap}
.vdef-closed{border-color:#CFE4D7;background:#F3F9F5}
.vdef-closed .vbody{color:var(--ink2)}
.vclosed{margin-top:10px;padding:9px 12px;background:#fff;border:1px solid #CFE4D7;
  font-size:12.5px;line-height:1.6;color:var(--ink2)}
.vclosed .k{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;
  color:var(--green);text-transform:uppercase;margin-bottom:4px}
.vdef .owes{margin-top:10px}
.count-ok{font-family:var(--mono);font-size:11px;color:#fff;background:var(--green);
  padding:2px 7px;border-radius:2px;margin-left:7px;letter-spacing:.08em}

/* ---- diffs ---- */
.difftable .c-sym{width:26px;text-align:center;font-family:var(--mono);font-weight:700}
.difftable .c-tag{width:96px}
.difftable .c-qty{width:44px;text-align:right;font-family:var(--mono)}
.difftable .c-note{width:210px;font-size:12px;color:var(--ink3)}
.d-add .c-sym{color:var(--green)} .d-drop .c-sym{color:var(--red)}
.d-qty .c-sym{color:var(--amber)} .d-rel .c-sym{color:var(--red)}
.d-add>td{background:#F3F9F5} .d-drop>td{background:#FAF4F3}
.d-qty>td,.d-rel>td{background:#FDF9F1}
.same{font-size:14px;color:var(--ink2);background:#F3F9F5;border:1px solid #CFE4D7;padding:10px 13px}

/* ---- notes ---- */
.notecard{border:1px solid var(--rule);background:#F7F9FB;margin:0 0 8px}
.notecard summary{cursor:pointer;padding:9px 12px;display:flex;gap:9px;align-items:center;
  flex-wrap:wrap;font-size:12.5px;list-style:none}
.notecard summary::-webkit-details-marker{display:none}
.notecard summary::before{content:"\\25B8";font-size:10px;color:var(--ink3)}
.notecard[open] summary::before{content:"\\25BE"}
.notecard summary code{background:#fff;border:1px solid var(--rule);padding:1px 5px;border-radius:2px}
.nflag{font-family:var(--mono);font-size:9px;letter-spacing:.1em;padding:2px 6px;border-radius:2px}
.nf-issue{background:var(--red);color:#fff} .nf-info{background:#E4EAF0;color:var(--ink2)}
.notecard .who{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--green)}
.crewtag{font-family:var(--mono);font-size:9px;letter-spacing:.09em;color:var(--green);
  background:#EAF5EE;border:1px solid #CFE4D7;padding:1px 6px;border-radius:2px}
.nprev{color:var(--ink3);flex:1 1 260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.notebody{padding:12px 14px;border-top:1px solid var(--rule);background:#fff;
  font-size:12.5px;line-height:1.7;white-space:pre-wrap}
.crewnote{border-left:3px solid var(--green)}

/* ---- approve ---- */
.approve{margin:28px 30px 30px;border:2px solid var(--rail)}
.approve-head{background:var(--rail);color:#fff;padding:11px 18px;font-family:var(--mono);
  font-size:12px;letter-spacing:.14em;display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;
  justify-content:space-between}
.approve-state{font-size:10px;letter-spacing:.1em;color:var(--rail-ink);text-transform:uppercase}
.approve-state .verdict-fail{background:var(--red);color:#fff;padding:1px 6px;border-radius:2px}
.approve-body{padding:18px 20px}
.ab-row{display:flex;gap:13px;align-items:flex-start;margin-bottom:13px;font-size:14px;color:var(--ink2)}
.ab-row strong{color:var(--ink)}
.box{flex:0 0 auto;width:19px;height:19px;border:2px solid var(--rail);margin-top:1px}
.ab-write{margin-top:16px}
.ab-write .k,.ab-sign .k{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;
  color:var(--ink3);text-transform:uppercase;margin-bottom:9px}
.rule{border-bottom:1px solid var(--ink3);height:26px}
.ab-sign{display:flex;gap:30px;margin-top:20px}
.ab-sign>div:first-child{flex:2} .ab-sign>div:last-child{flex:1}

/* ---- controls ---- */
.controls{position:sticky;top:0;z-index:15;background:rgba(238,242,245,.96);
  backdrop-filter:blur(6px);border-bottom:1px solid var(--rule);
  margin:0 -40px 0;padding:9px 40px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.controls .lab{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;
  color:var(--ink3);text-transform:uppercase;margin-right:4px}
.btn{font-family:var(--mono);font-size:11px;letter-spacing:.06em;background:var(--paper);
  border:1px solid var(--rule);color:var(--ink2);padding:5px 11px;cursor:pointer;border-radius:2px}
.btn:hover{border-color:var(--ink3)}
.btn.on{background:var(--rail);border-color:var(--rail);color:#fff}
body.only-flags tr.row:not(.is-flag):not(.is-med){display:none}
body.only-flags tr.noterow:not(.is-flag){display:none}
body.only-issues tr.row:not(.is-issue){display:none}
body.only-issues tr.noterow{display:none}
body.open-notes .note.clamped{max-height:none}
body.open-notes .note.clamped::after{display:none}

.closing{background:var(--paper);border:1px solid var(--rule);border-top:4px solid var(--cyan);
  padding:26px 30px;margin:0 0 40px}
.closing ul{margin:0 0 14px;padding-left:20px;color:var(--ink2);font-size:14px}
.closing li{margin-bottom:7px}
.foot{color:var(--ink3);font-size:12px;font-family:var(--mono);line-height:1.8;
  border-top:1px solid var(--rule);padding-top:16px}

@media (max-width:1000px){
  .rail{position:static;width:auto;height:auto}
  .wrap{margin-left:0;padding:0 18px 60px}
  .controls{margin:0 -18px;padding:9px 18px}
  .story,.context,.stats,.sheetline,.subblock,.approve{margin-left:18px;margin-right:18px}
  .type-head{padding:18px}
}
@media print{
  .rail,.controls{display:none}
  body{background:#fff;font-size:10.5pt}
  .wrap{margin:0;padding:0}
  section.type{page-break-before:always;border:0}
  section.type:first-of-type{page-break-before:auto}
  .approve{page-break-inside:avoid}
  .flag,.vdef,.doc{page-break-inside:avoid}
  .note.clamped{max-height:none}
  .note.clamped::after{display:none}
  .verbatim blockquote{max-height:none;overflow:visible}
  .notecard{page-break-inside:avoid}
  .notebody{display:block !important}
  thead th{position:static}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

const JS = `
(function(){
  var b=document.body;
  function tog(id,cls){var el=document.getElementById(id);if(!el)return;
    el.addEventListener('click',function(){b.classList.toggle(cls);el.classList.toggle('on');});}
  tog('f-flags','only-flags'); tog('f-issues','only-issues'); tog('f-notes','open-notes');
  var p=document.getElementById('f-print');
  if(p) p.addEventListener('click',function(){window.print();});
  document.addEventListener('click',function(e){
    var n=e.target.closest && e.target.closest('.note');
    if(n) n.classList.toggle('clamped');
  });
  var links=[].slice.call(document.querySelectorAll('.rail nav a[href^="#"]'));
  var secs=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));});
  function spy(){
    var y=window.scrollY+140,best=0;
    for(var i=0;i<secs.length;i++){ if(secs[i]&&secs[i].offsetTop<=y) best=i; }
    links.forEach(function(a,i){a.classList.toggle('on',i===best);});
  }
  window.addEventListener('scroll',spy,{passive:true}); spy();
})();
`;

const totals = TYPES.map((t) => stagedCounts(t.id));
const sum = (f) => totals.reduce((a, s) => a + s[f], 0);
const totalDefects = TYPES.reduce((a, t) => a + VERIFIER[t.id].defects.length, 0);
const openTotal = TYPES.reduce((a, t) => a + openDefects(t.id).length, 0);
/* Whatever findings the CURRENT round carries are live. Kept as an assertion so
 * a future round that carries closed findings fails loudly here instead of
 * printing them as open. */
if (totalDefects !== openTotal) {
  throw new Error(`VERIFIER carries ${totalDefects - openTotal} non-OPEN finding(s); `
    + 'the page prose says every finding is open. Reconcile before rendering.');
}
/* AND THE VERDICT WORD HAS TO MATCH WHAT THE PAGE CAN SHOW. A round with no
 * findings may not be called PASS or FAIL by this side of the work: PASS is a
 * checker's word and FAIL needs findings to point at. */
for (const t of TYPES) {
  const v = VERIFIER[t.id];
  if (!v.defects.length && !/^UNVERIFIED$/i.test(v.verdict)) {
    throw new Error(`VERIFIER[${t.id}] says ${v.verdict} with no findings; only UNVERIFIED is honest there.`);
  }
  if (/^UNVERIFIED$/i.test(v.verdict) && !v.pending) {
    throw new Error(`VERIFIER[${t.id}] is UNVERIFIED but not marked pending.`);
  }
  /* A FAIL is a CHECKER'S word and it has to point at findings. A round that
   * was actually run is not pending, and this page may never paint PASS - that
   * word is not the fixing side's to write. */
  if (/^FAIL$/i.test(v.verdict) && !v.defects.length) {
    throw new Error(`VERIFIER[${t.id}] says FAIL with no findings to point at.`);
  }
  if (/^FAIL$/i.test(v.verdict) && v.pending) {
    throw new Error(`VERIFIER[${t.id}] says FAIL and is also marked pending; a round is one or the other.`);
  }
  if (/^PASS$/i.test(v.verdict)) {
    throw new Error(`VERIFIER[${t.id}] says PASS. PASS is a checker's word and this generator does not write it.`);
  }
}
const ROUND = VERIFIER[TYPES[0].id].round;
const PRIOR = VERIFIER[TYPES[0].id].priorRound;
const PRIOR_TOTAL = ROUND3.length;
/* The trajectory, printed on the front page. The first three come from the
 * round checkpoints (ROUND_RAISED, sourced in mockbook.data.mjs); round 4's is
 * counted off the findings this page actually prints, so it cannot drift. */
const R4_TOTAL = openTotal;
const R4_BY_ROOM = TYPES.map((t) => `${t.id}: ${openDefects(t.id).length}`).join(' &middot; ');
const TRAJECTORY = `${ROUND_RAISED[1]} &rarr; ${ROUND_RAISED[2]} &rarr; ${ROUND_RAISED[3]} &rarr; ${R4_TOTAL}`;
const ALL_FAIL = TYPES.every((t) => /^FAIL$/i.test(VERIFIER[t.id].verdict));

/* The page carries the seed's own build stamp, not today's clock, so that two
 * runs of this tool on the same seed produce a byte-identical file. */
const STAMP = String(REF.meta.builtAt || '').slice(0, 10);
const CARRIED = String(REF.meta.fieldStateCarriedAt || REF.meta.builtAt || '').slice(0, 10);

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>H2SEP Reference Room Mock Book</title>
<style>${CSS}</style>
</head><body>

<aside class="rail">
  <div class="stamp"><strong>H2SEP</strong>
    Home2 Suites by Hilton<br>Eagle Pass, TX<br>Triun job 24030</div>
  <div class="status">STAGED FOR APPROVAL<br>NOT LIVE &middot; NOT PUSHED<br>NOTHING WRITTEN TO THE CREW APP</div>
  <nav>
    <div class="grp">Start here</div>
    <a href="#summary"><span class="rn">00</span>Summary</a>
    <a href="#round1"><span class="rn">00</span>Rounds 1, 2 and 3</a>
    <a href="#stoppers"><span class="rn">00</span>Fix before live</a>
    <div class="grp">Room types</div>
    ${TYPES.map((t) => `<a href="#t${t.id}"><span class="rn">${esc(t.n)}</span>${esc(t.type)}</a>`).join('')}
    <div class="grp">Close</div>
    <a href="#next"><span class="rn">05</span>What happens next</a>
  </nav>
  <div class="foot">Rendered from the seed stamped ${esc(STAMP)},<br>
    field state carried ${esc(CARRIED)}.<br>
    Sources: platform/data/ref-rooms-staged.json<br>and data/project.sqlite</div>
</aside>

<div class="wrap"><div class="inner">

<div class="controls">
  <span class="lab">View</span>
  <button class="btn" id="f-flags">Flags only</button>
  <button class="btn" id="f-issues">Open field issues only</button>
  <button class="btn" id="f-notes">Open every note</button>
  <button class="btn" id="f-print">Print</button>
</div>

<div class="titleblock">
  <h1>Reference Room Mock Book</h1>
  <p class="sub">The four guest room types with no approved reference room, one representative room each,
    full FF&amp;E checklist and MEP punch, for your approval.</p>
  <div class="tbgrid">
    <div><span class="k">Types</span><span class="v">4</span></div>
    <div><span class="k">Keys covered</span><span class="v">${TYPES.reduce((a, t) => a + t.rooms.length, 0)}</span></div>
    <div><span class="k">Reference rooms</span><span class="v">202 &middot; 217 &middot; 230 &middot; 238</span></div>
    <div><span class="k">Lines drawn up</span><span class="v">${sum('ff') + sum('mep')}</span></div>
    <div><span class="k">Flagged lines</span><span class="v">${sum('flagged')}</span></div>
    <div><span class="k">Crew work carried</span><span class="v">${sum('checked')} checks &middot; ${sum('issues')} of ${TYPES.reduce((a, t) => a + crewCounts(t.id).issues, 0)} issues</span></div>
    <div><span class="k">Independent check</span><span class="v"><span class="${verdictClass(VERIFIER[TYPES[0].id].verdict)}">round ${ROUND}: ${ALL_FAIL ? 'ALL FOUR FAIL' : 'MIXED'}</span> &middot; ${R4_TOTAL} findings open and unfixed (${R4_BY_ROOM}) &middot; findings per round ${TRAJECTORY}</span></div>
  </div>
  <div class="notlive">THIS IS A MOCK-UP. It lives in one staged file and <b>nothing has been pushed, deployed or written
    to Firestore</b>. The crew app was read and never written. Approve it, mark it up, or hold it. Nothing generates
    at scale until you say so (ruling D24).</div>
  <div class="notlive round">ROUND ${ROUND} FAILED ALL FOUR TYPES. An independent checker read this exact file
    and returned <span class="verdict-fail">FAIL</span> on every one of them:
    ${TYPES.map((t) => `<b>${esc(t.id)} ${esc(t.type)} &mdash; FAIL, ${openDefects(t.id).length}
      finding${openDefects(t.id).length === 1 ? '' : 's'}</b>`).join('; ')}.
    <b>${R4_TOTAL} findings in total, and not one of them is fixed.</b> They are printed in full inside each
    type's section, word for word, and nothing on the four checklists was changed after the checker read it.
    <br><br>
    THE ROUND TRAJECTORY, PLAINLY: round 1 raised <b>${ROUND_RAISED[1]}</b> findings, round 2 raised
    <b>${ROUND_RAISED[2]}</b>, round ${PRIOR} raised <b>${ROUND_RAISED[3]}</b>, and round ${ROUND} raised
    <b>${R4_TOTAL}</b> (${R4_BY_ROOM}). Every round failed all four types. The count fell from
    ${ROUND_RAISED[3]} to ${R4_TOTAL} and the character changed again &mdash; round 1 was material data loss,
    crew work dropped and flags erased, while
    ${(() => {
      const rules = ['donorRule', 'citationRule', 'mepSource'];
      const n = TYPES.reduce((a, t) => a + openDefects(t.id)
        .filter((d) => rules.some((r) => d.text.includes(r))).length, 0);
      return `${n} of round ${ROUND}'s ${R4_TOTAL} findings`;
    })()} name a <code>meta</code> rule at the top of the seed that promises more than the generator
    delivers, and three of those turn on a sentence the round-${ROUND} fix wrote itself. No round-${ROUND}
    finding says a crew check-off, a field issue or a document conflict was lost. <b>That is progress, it is
    still a FAIL, and this page calls it a FAIL.</b>
    <br><br>
    The loop stops here by design: the round-${PRIOR} checkpoint set round ${ROUND} as the last one and said that
    if it failed, you get the book with the honest verdict trail rather than another fix round. So this is not a
    clean package and it is not offered as one. Rounds 1, 2 and ${PRIOR} are printed further down in full &mdash;
    the checker's words and the mechanism claimed against each, side by side &mdash; so you can judge the work
    instead of taking it. The DOCUMENT conflicts underneath all of this are still open and no fix to this tool
    can close them.</div>
</div>

<section class="block" id="summary">
  <h3><span class="hn">00</span>Summary</h3>
  <p class="lede">One row per type. "Note-only conflicts" are rows whose category your approved checklist gate keeps
    off both documents; the conflict is kept in a room note instead of being lost. "Document gaps" are holes in the
    drawing set that were deliberately not filled in. The last column is an independent check run by an agent that
    did not build these packages.</p>
  ${summaryTable()}

  <h4 style="margin-top:26px">The crew's existing work, carried across</h4>
  <p class="lede">Ruling D24 is standing law: when floors 2, 3 and 4 are built, every note, check-off, initial,
    timestamp and issue from the old crew app comes with them and nothing is deleted. Here is how that carry
    landed on these four rooms.</p>
  ${carryTable()}
</section>

<section class="block" id="round1">
  <h3><span class="hn">00</span>What the earlier checks found, and what happened to it</h3>
  <p class="lede">Three independent checks came before round ${ROUND}. All three failed all four types, all three
    had every finding worked, and none of them is deleted here. This section is the record of that work &mdash;
    the checker's words on the left, the mechanism that answered each finding on the right, so both can be read
    against <code>platform/tools/build_ref_rooms.mjs</code> and against the data. It is NOT a verdict and it is
    not the current one: <b>round ${ROUND}'s verdict is FAIL on all four types with ${R4_TOTAL} open findings</b>,
    and those are inside each type's own section. Read in order, the four rounds raised ${TRAJECTORY} findings.</p>
  <h4>Round 1</h4>
  <p class="lede">Round 1 read the four packages and failed all four. Every finding it raised is below with its
    current state, and every "closed" was re-checked against the staged file before it was written here. Most of
    it landed; one item was deliberately disclosed instead of changed.</p>
  ${roundOneBlock()}
  <h4 style="margin-top:26px">Round 2</h4>
  <p class="lede">Round 2 read the fixed file and failed all four types again, raising ${ROUND2.length} findings.
    Each one is printed word for word with the mechanism that was written to close it, so the closure can be
    checked against <code>platform/tools/build_ref_rooms.mjs</code> and against the data rather than taken on
    trust. Round 3 took two of these closures apart, and says so in its own words below.</p>
  ${roundTwoBlock()}
  <h4 style="margin-top:26px">Round ${PRIOR} &mdash; the last independent read, and what answered it</h4>
  <p class="lede">Round ${PRIOR} read the round-${PRIOR} seed and failed all four types, raising
    ${PRIOR_TOTAL} findings. Every one is printed WORD FOR WORD, with the round-${ROUND} mechanism beside it.
    Read the two columns against each other: the left is the checker's, the right is ours, and the right is an
    account of a change to the generator rather than a claim that the package is now clean. <b>The state column
    reads ADDRESSED &middot; NOT RE-VERIFIED on every row and stays that way until somebody outside this build
    reads the rebuilt file.</b></p>
  ${roundThreeBlock()}
</section>

<section class="block" id="stoppers">
  <h3><span class="hn">00</span>Read this before you approve anything</h3>
  <p class="lede">All four types came back <span class="verdict-fail">FAIL</span> on round ${ROUND}, with
    ${R4_TOTAL} findings (${R4_BY_ROOM}), and <b>none of them is fixed</b>. They are defects in
    <code>platform/tools/build_ref_rooms.mjs</code> and in the prose it writes &mdash; a note that quotes a
    citation the row does not carry, a <code>meta</code> rule that promises a check the code skips, a note that
    restates the quantity beside it &mdash; and every one is printed in full inside its type's section. They are
    ours, not yours, and they are the reason <b>the generate-at-scale step stays held</b>. Round ${PRIOR} before
    it also failed all four, with ${PRIOR_TOTAL} findings, all of them worked; see
    &ldquo;<a href="#round1">What the earlier checks found</a>&rdquo; for the mechanism, finding by finding.
    What follows is the different list: the questions the DOCUMENTS have not answered, which no fix to this tool
    can close. These are the ones that change what gets bought or where the crew is sent, each with the person
    who owes the answer.</p>
  ${buyStoppers()}
  <p class="lede" style="margin-top:16px">Nothing on this list was invented by the mock-up. Every item is quoted
    from data/project.sqlite - its conflicts table, its placeholders, or the room's own rows - and every one of
    them is OPEN in the documents, not in the tool. The recommendation is unchanged: approve or mark up the
    <em>shape</em> now, and hold the generate-at-scale step until an independent check comes back clean on the
    rebuilt file.</p>
</section>

${TYPES.map(section).join('')}

<section class="block closing" id="next">
  <h3><span class="hn">05</span>What happens on your word</h3>
  <p class="lede">Each type has its own APPROVE / CHANGES box at the end of its section, so you can rule on one
    type without ruling on the other three. The three choices are the same everywhere.</p>
  <ul>
    <li><strong>APPROVE THE SHAPE.</strong> That is a ruling on the bands, the tags, the line wording and the
      flag handling, not a certificate that the file is clean &mdash; and it is not clean. Round ${ROUND} read
      this file and returned FAIL on all four types with ${R4_TOTAL} findings, none of them fixed. Approving the
      shape tells us the structure is right and worth fixing; it does not release anything. The
      ${R4_TOTAL} findings get fixed and re-checked first, and only then do the remaining
      ${TYPES.reduce((a, t) => a + t.rooms.length, 0) - 4} keys generate.</li>
    <li><strong>APPROVE WITH CHANGES.</strong> Your marks go onto the reference room first, one room per type,
      and get re-verified before anything multiplies.</li>
    <li><strong>HOLD.</strong> The package sits where it is. Nothing generates, nothing seeds, nothing deploys.</li>
  </ul>
  <p class="lede">Two of these types cannot be bought from until you rule on the bathroom. Rooms 217 and 238 both
    carry a full TUB package and a full ROLL-IN package side by side, every line flagged, because A533 says tub and
    A554 / A103 / A532.1 draw a roll-in. Ruling D19 put room 118 on the roll-in and named no other room, and
    ruling D26 has the 118 RFI on hold at your instruction. The checklists are honest about it and the crew can
    still walk the room; nobody should order a bath package for those five keys.</p>
  <div class="foot">
    Sources, all read only: platform/data/ref-rooms-staged.json (the staged mock-ups) &middot;
    platform/data/floor1-staged.json (the approved LIVE floor 1) &middot;
    data/project.sqlite (the reference database, quoted verbatim) &middot;
    tools/out/backups/crew-ref-rooms-snapshot.json (the crew app, read only).<br>
    Firestore was not written. Nothing was pushed. Nothing was deployed. No personal contact data, no photographs
    and no crew names appear on this page; field work shows initials only.
  </div>
</section>

</div></div>
<script>${JS}</script>
</body></html>
`;

const out = path.join(ROOT, 'research/ref-rooms/mockbook.html');
fs.writeFileSync(out, html);
console.log('wrote ' + out + '  (' + (html.length / 1024).toFixed(1) + ' KB)');
console.log('types=' + TYPES.length
  + ' ffe=' + sum('ff') + ' mep=' + sum('mep')
  + ' flagged=' + sum('flagged') + ' medium=' + sum('medium')
  + ' defects=' + totalDefects);
