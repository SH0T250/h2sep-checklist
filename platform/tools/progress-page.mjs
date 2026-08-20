// Build the floor-1 buildout progress page from live state.
//
// Re-runnable: reads the staging seed, the workflow journals, the demo room photo
// index and whatever renders exist, and writes one self-contained HTML page.
// Nothing here talks to Firestore or to the live site.
//
// Usage: node platform/tools/progress-page.mjs [outPath]
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const OUT = process.argv[2] || resolve(repo, 'progress.html');
const WF = '/root/.claude/projects/-home-user-h2sep-checklist/18be7c92-db26-548f-a957-ab5e606c8fa1/subagents/workflows';
const PHOTOS = '/tmp/demo-room';
const RENDERS = '/tmp/king';

const read = p => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const json = p => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

// ---- gather ----
const seed = json(resolve(root, 'data/floor1-staged.json')) || { docs: {} };
const approved = json(resolve(root, 'data/slice-f1.json')) || { docs: {} };
const photoIndex = json(`${PHOTOS}/index.json`);

const results = [];
if (existsSync(WF)) {
  for (const dir of readdirSync(WF)) {
    const jp = `${WF}/${dir}/journal.jsonl`;
    const txt = read(jp);
    if (!txt) continue;
    for (const line of txt.split('\n')) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        if (j.type === 'result' && j.result && typeof j.result === 'object') results.push(j.result);
      } catch { /* partial line while a workflow is mid write */ }
    }
  }
}
const verdictFor = key => {
  const hit = results.filter(r => (r.room === key || r.area === key || r.view === key) && (r.verdict || r.canTellItIsARender !== undefined));
  return hit.length ? hit[hit.length - 1] : null;
};

// ---- the piece list ----
const ROOM_TYPES = {
  '101': 'QQ Wide Connecting', '103': 'QQ Connecting',
  '105': 'Queen-Queen', '107': 'Queen-Queen', '109': 'Queen-Queen',
  '111': 'Queen-Queen', '113': 'Queen-Queen', '115': 'Queen-Queen',
  '104': 'King Studio', '106': 'King Studio', '108': 'King Studio',
  '110': 'King Studio', '112': 'King Studio', '114': 'King Studio',
  '116': 'King Studio Connecting', '118': 'King Studio Acc.',
};
const APPROVED = new Set(['101', '103', '105']);

const liveItems = doc => Object.values(doc?.items || {}).filter(i => !i.deleted).length;

const rooms = Object.entries(ROOM_TYPES).map(([no, type]) => {
  const doc = seed.docs[no];
  const mep = seed.docs[`${no}-MEP`];
  const v = verdictFor(no);
  let state = 'notbuilt';
  if (APPROVED.has(no)) state = 'approved';
  else if (doc && v?.verdict === 'PASS') state = 'pass';
  else if (doc && v?.verdict === 'FAIL') state = 'fail';
  else if (doc) state = 'built';
  return { no, type, ffe: liveItems(doc), mep: liveItems(mep), state, defect: v?.biggestDefect || '' };
});

const spaces = Object.keys(seed.docs)
  .filter(k => k.startsWith('S') && !k.endsWith('-M'))
  .map(k => ({ id: k, name: seed.docs[k]?.typeLabel || seed.docs[k]?.type || k, ffe: liveItems(seed.docs[k]), mep: liveItems(seed.docs[`${k}-M`]) }));

// ---- image embedding: downscale so the page stays well under the size cap ----
function embed(path, width) {
  if (!existsSync(path)) return null;
  try {
    const tmp = `/tmp/_emb_${basename(path).replace(/\W/g, '_')}.jpg`;
    execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open(${JSON.stringify(path)}).convert('RGB')
w = ${width}
im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im.save(${JSON.stringify(tmp)}, 'JPEG', quality=76, optimize=True)
`]);
    const b = readFileSync(tmp);
    return `data:image/jpeg;base64,${b.toString('base64')}`;
  } catch { return null; }
}

const VIEWS = ['entry', 'lounge', 'bed', 'working', 'kitchen', 'bath-vanity', 'bath-shower'];
const scenes = VIEWS.map(v => {
  const photoFile = photoIndex?.bestFor?.[v];
  const photoPath = photoFile ? `${PHOTOS}/${photoFile}` : null;
  const renderPath = `${RENDERS}/${v}.png`;
  const crit = verdictFor(v);
  return {
    view: v,
    photo: photoPath && existsSync(photoPath) ? embed(photoPath, 760) : null,
    render: existsSync(renderPath) ? embed(renderPath, 760) : null,
    verdict: crit?.verdict || null,
    confidence: crit?.confidence || null,
    gap: crit?.biggestGap || '',
    photoFile: photoFile || 'no matching photograph',
  };
});

// ---- render ----
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const now = new Date();
const stamp = `${now.toLocaleDateString('en-US')} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

const STATE_LABEL = {
  approved: ['Approved', 'ok'], pass: ['Verified', 'ok'], fail: ['Defects found', 'bad'],
  built: ['Built, verifying', 'mid'], notbuilt: ['Not built', 'off'],
};
const counts = {
  built: rooms.filter(r => r.state !== 'notbuilt').length,
  pass: rooms.filter(r => r.state === 'pass' || r.state === 'approved').length,
  fail: rooms.filter(r => r.state === 'fail').length,
  spaces: spaces.length,
};

const html = `<title>Floor One Buildout</title>
<style>
:root{
  --deck:#0A161D; --card:#131C22; --raise:#18242C; --hair:#202D35; --hair2:#2A3942;
  --ink:#E9EEF1; --muted:#93A1AA; --subtle:#6F7E88;
  --cy:#2FBBE9; --cy-dim:rgba(47,187,233,.13);
  --ok:#57C690; --ok-bg:rgba(87,198,144,.13); --ok-bd:rgba(87,198,144,.34);
  --bad:#F0906F; --bad-bg:rgba(240,144,111,.13); --bad-bd:rgba(240,144,111,.34);
  --mid:#5BC4EA; --mid-bg:rgba(91,196,234,.13); --mid-bd:rgba(91,196,234,.34);
  --off:#8B98A1; --off-bg:rgba(139,152,161,.12); --off-bd:rgba(139,152,161,.28);
  --hold:#F2C566; --hold-bg:rgba(242,197,102,.12); --hold-bd:rgba(242,197,102,.32);
  --sans:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box;margin:0}
body{background:var(--deck);color:var(--ink);font:15px/1.55 var(--sans);-webkit-font-smoothing:antialiased;
  padding:clamp(18px,4vw,44px);max-width:1240px;margin:0 auto}
h1{font-size:clamp(24px,4vw,34px);font-weight:750;letter-spacing:-.02em;text-wrap:balance}
h2{font-size:17px;font-weight:700;letter-spacing:-.01em}
.lbl{font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--subtle)}
.num{font-variant-numeric:tabular-nums}

.titleblock{display:flex;flex-wrap:wrap;gap:1px;background:var(--hair);border:1px solid var(--hair);
  border-radius:10px;overflow:hidden;margin:18px 0 26px}
.titleblock>div{background:var(--card);padding:11px 15px;flex:1 1 150px}
.titleblock b{display:block;font:700 13px var(--mono);letter-spacing:.02em;margin-top:3px}

.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1px;background:var(--hair);
  border:1px solid var(--hair);border-radius:10px;overflow:hidden;margin-bottom:30px}
.kpi{background:var(--card);padding:15px 17px}
.kpi .v{font-size:32px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:5px}
.kpi .v small{font-size:14px;color:var(--subtle);font-weight:500}
.kpi .c{font-size:12px;color:var(--muted);margin-top:2px}

section{margin-bottom:34px}
.shead{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding-bottom:9px;
  border-bottom:1px solid var(--hair2);margin-bottom:16px}
.shead .cap{color:var(--muted);font-size:13px}
.spacer{flex:1}

.chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px;
  font:600 11px var(--sans);border:1px solid}
.chip i{width:6px;height:6px;border-radius:50%;background:currentColor}
.chip.ok{color:var(--ok);background:var(--ok-bg);border-color:var(--ok-bd)}
.chip.bad{color:var(--bad);background:var(--bad-bg);border-color:var(--bad-bd)}
.chip.mid{color:var(--mid);background:var(--mid-bg);border-color:var(--mid-bd)}
.chip.off{color:var(--off);background:var(--off-bg);border-color:var(--off-bd)}
.chip.hold{color:var(--hold);background:var(--hold-bg);border-color:var(--hold-bd)}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.rm{background:var(--card);border:1px solid var(--hair);border-radius:9px;padding:12px 14px}
.rm .n{font:700 19px var(--mono);letter-spacing:-.01em}
.rm .t{font-size:12px;color:var(--muted);margin:2px 0 9px}
.rm .cts{font:600 11.5px var(--mono);color:var(--subtle);margin-top:8px}
.rm .df{font-size:11.5px;color:var(--bad);margin-top:7px;line-height:1.4}

table{width:100%;border-collapse:collapse;font-size:13.5px}
.tw{overflow-x:auto;border:1px solid var(--hair);border-radius:9px;background:var(--card)}
th{text-align:left;font:600 10px var(--mono);letter-spacing:.12em;text-transform:uppercase;
  color:var(--subtle);padding:10px 14px;border-bottom:1px solid var(--hair2);white-space:nowrap}
td{padding:9px 14px;border-top:1px solid var(--hair)}
td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;color:var(--muted)}
tr:first-child td{border-top:0}

.scene{background:var(--card);border:1px solid var(--hair);border-radius:11px;overflow:hidden;margin-bottom:14px}
.scene .hd{display:flex;align-items:center;gap:11px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--hair)}
.scene .hd b{font-size:14.5px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--hair)}
.pane{background:var(--raise);position:relative;min-height:150px;display:flex;flex-direction:column}
.pane img{width:100%;height:auto;display:block}
.pane .tag{position:absolute;top:9px;left:9px;font:600 9.5px var(--mono);letter-spacing:.12em;
  text-transform:uppercase;background:rgba(10,22,29,.82);color:var(--ink);padding:3px 8px;border-radius:5px;
  border:1px solid var(--hair2)}
.pane .none{padding:34px 16px;color:var(--subtle);font-size:12.5px;text-align:center;margin:auto}
.scene .ft{padding:11px 16px;font-size:13px;color:var(--muted);border-top:1px solid var(--hair)}
.scene .ft b{color:var(--bad);font-weight:600}
@media (max-width:700px){.pair{grid-template-columns:1fr}}

.note{background:var(--card);border:1px solid var(--hair);border-left:3px solid var(--hold);
  border-radius:8px;padding:13px 16px;font-size:13.5px;color:var(--muted);margin-bottom:14px}
.note b{color:var(--ink)}
ul{margin:7px 0 0 18px}li{margin:4px 0;font-size:13.5px;color:var(--muted)}
.foot{color:var(--subtle);font-size:12px;border-top:1px solid var(--hair2);padding-top:14px;margin-top:8px}
</style>

<h1>Floor One Buildout</h1>
<div class="titleblock">
  <div><span class="lbl">Project</span><b>H2SEP</b></div>
  <div><span class="lbl">Job</span><b>TRIUN 24030</b></div>
  <div><span class="lbl">Scope</span><b>FLOOR 1 &middot; 16 ROOMS + COMMONS</b></div>
  <div><span class="lbl">Status</span><b>STAGED, NOT LIVE</b></div>
  <div><span class="lbl">Updated</span><b>${esc(stamp)}</b></div>
</div>

<div class="note"><b>Nothing here is live.</b> Every room below is built into a staging file and a
preview build. The live site and the live database are untouched and stay that way until you approve.</div>

<div class="kpis">
  <div class="kpi"><span class="lbl">Guest rooms built</span><div class="v num">${counts.built}<small> of 16</small></div><div class="c">into the staging seed</div></div>
  <div class="kpi"><span class="lbl">Verified clean</span><div class="v num">${counts.pass}</div><div class="c">passed an independent check</div></div>
  <div class="kpi"><span class="lbl">Defects open</span><div class="v num">${counts.fail}</div><div class="c">found by the verifiers, being fixed</div></div>
  <div class="kpi"><span class="lbl">Common areas</span><div class="v num">${counts.spaces}<small> of 39</small></div><div class="c">plan numbering, per your ruling</div></div>
</div>

<section>
  <div class="shead"><h2>Guest rooms</h2><span class="cap">each one built, then handed to a separate agent whose only job is to fail it</span></div>
  <div class="grid">
  ${rooms.map(r => {
    const [label, cls] = STATE_LABEL[r.state];
    return `<div class="rm">
      <div class="n num">${esc(r.no)}</div>
      <div class="t">${esc(r.type)}</div>
      <span class="chip ${cls}"><i></i>${esc(label)}</span>
      <div class="cts">${r.ffe ? `FF&amp;E ${r.ffe} &middot; MEP ${r.mep}` : 'no lines yet'}</div>
      ${r.defect ? `<div class="df">${esc(String(r.defect).slice(0, 150))}${String(r.defect).length > 150 ? '…' : ''}</div>` : ''}
    </div>`;
  }).join('')}
  </div>
</section>

<section>
  <div class="shead"><h2>The render against the room</h2>
    <span class="cap">a fresh critic sees one image and is asked to prove it is a render</span></div>
  ${scenes.map(s => `
  <div class="scene">
    <div class="hd">
      <b>${esc(s.view)}</b>
      ${s.verdict ? `<span class="chip ${s.verdict === 'WOWED' ? 'ok' : s.verdict === 'CONVINCING' || s.verdict === 'CLOSE' ? 'mid' : 'bad'}">${esc(s.verdict)}</span>` : '<span class="chip off"><i></i>Scene building</span>'}
      ${s.confidence ? `<span class="chip off">spotted ${esc(s.confidence)}</span>` : ''}
      <span class="spacer"></span>
      <span class="lbl">${esc(s.photoFile)}</span>
    </div>
    <div class="pair">
      <div class="pane"><span class="tag">Render</span>
        ${s.render ? `<img src="${s.render}" alt="render of the ${esc(s.view)} view"/>` : '<div class="none">The King Studio scene is still being built. This room type has never had 3D geometry, so it is being authored from A550 and from your photographs.</div>'}</div>
      <div class="pane"><span class="tag">Room 110</span>
        ${s.photo ? `<img src="${s.photo}" alt="photograph of the ${esc(s.view)} view"/>` : '<div class="none">No photograph matches this view.</div>'}</div>
    </div>
    ${s.gap ? `<div class="ft"><b>Biggest gap:</b> ${esc(s.gap)}</div>` : ''}
  </div>`).join('')}
</section>

<section>
  <div class="shead"><h2>Common areas</h2><span class="cap">${counts.spaces} of 39 spaces carry a checklist</span></div>
  <div class="tw"><table>
    <tr><th>Space</th><th>Name</th><th>FF&amp;E</th><th>MEP</th></tr>
    ${spaces.map(s => `<tr><td class="num">${esc(s.id)}</td><td>${esc(String(s.name).replace(/^space-/, '').replace(/-/g, ' '))}</td><td class="num">${s.ffe || '&mdash;'}</td><td class="num">${s.mep || '&mdash;'}</td></tr>`).join('')}
  </table></div>
</section>

<section>
  <div class="shead"><h2>Waiting on you</h2></div>
  <ul>
    <li>Rooms 105 to 115 carry GR-308, the connector working wall, when your FF&amp;E installation sheet proves they should carry GR-305. This touches room 105, which you already approved, so I have not changed it.</li>
    <li>The 3D viewer hardcodes a 9 foot ceiling. A550 and A555 both say 8 feet 3 and 3/8 inches, and the keynote makes that a minimum. That affects all 47 approved Queen-Queen rooms, not just floor 1.</li>
    <li>Your live QC Deficiency Tracker has 298 punch rows on floor 1 that nothing is reading. Say the word and they come into the app.</li>
    <li>Working wall handedness on the six plain King Studios. Your FF&amp;E sheet splits them 3 left and 3 right, but no drawing says which room is which.</li>
  </ul>
</section>

<div class="foot">Generated from the staging seed, the verifier results and the room 110 photographs.
Regenerate with <span style="font-family:var(--mono)">node platform/tools/progress-page.mjs</span>.
Triun Construction &amp; Engineering.</div>`;

writeFileSync(OUT, html);
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`wrote ${OUT} (${kb} KB) | rooms built ${counts.built}/16, spaces ${counts.spaces}, scenes with renders ${scenes.filter(s => s.render).length}/${scenes.length}`);
