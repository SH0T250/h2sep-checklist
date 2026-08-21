import { chromium } from '/tmp/claude-0/-home-user-h2sep-checklist/18be7c92-db26-548f-a957-ab5e606c8fa1/scratchpad/node_modules/playwright-core/index.mjs';
const EXE='/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const B='http://localhost:8343/';
const b=await chromium.launch({executablePath:EXE});
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
const p=await ctx.newPage();
const errs=[];
p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
let pass=0,fail=0;
const t=(name,cond,detail='')=>{ if(cond){pass++;console.log('  PASS  '+name);} else {fail++;console.log('  FAIL  '+name+(detail?'  '+detail:''));} };

await p.goto(B,{waitUntil:'networkidle'});
await p.evaluate(()=>{localStorage.setItem('h2sep-platform-user',JSON.stringify({name:'Austin Jones',initials:'AJ',company:'Triun, LLC'}));sessionStorage.setItem('h2sep-id-prompted','1');});
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(400);

console.log('\nSHELL AND NAV');
const nav=await p.$$eval('.nav a',n=>n.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
t('nav renders', nav.length>=8, nav.join(' | '));
t('Rooms count shows 16', nav.some(x=>/Rooms\s*16/.test(x)), nav.find(x=>x.includes('Rooms')));
t('Common Areas count shows 31', nav.some(x=>/Common Areas\s*31/.test(x)), nav.find(x=>x.includes('Common')));

console.log('\nROOMS');
await p.goto(B+'#/rooms',{waitUntil:'networkidle'}); await p.waitForTimeout(300);
const rows=await p.$$eval('.room-row .rno',n=>n.map(x=>x.textContent.trim()));
t('all 16 guest rooms listed', rows.length===16, rows.join(','));
t('includes the King rooms', ['104','106','108','110','112','114','116','118'].every(r=>rows.includes(r)));

console.log('\nA KING ROOM');
await p.goto(B+'#/room/110',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
t('room 110 opens', (await p.$eval('.h1',e=>e.textContent)).includes('110'));
const cats=await p.$$eval('.cat-head',n=>n.map(x=>x.textContent.replace(/\s+/g,' ').trim()));
t('FF&E categories render', cats.length>0, String(cats.length)+' groups');
const lines=await p.$$('.item-row');
t('FF&E lines render', lines.length>0, String(lines.length)+' lines');
await p.goto(B+'#/room/110?view=mep',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
const mepLines=await p.$$('.item-row');
t('MEP punch renders for a King room', mepLines.length>0, String(mepLines.length)+' lines');

console.log('\nTHE CORRECTED WORKING WALL');
await p.goto(B+'#/room/109',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
const has305=await p.$$eval('.item-row',n=>n.some(x=>x.textContent.includes('GR-305')));
const has308=await p.$$eval('.item-row',n=>n.some(x=>x.textContent.includes('GR-308')));
t('room 109 shows GR-305', has305);
t('room 109 does not show GR-308', !has308);

console.log('\nCOMMON AREAS');
await p.goto(B+'#/common',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
t('common areas screen is no longer a stub', !(await p.$('.coming')));
const sp=await p.$$eval('.room-row .rno',n=>n.map(x=>x.textContent.trim()));
t('31 spaces listed', sp.length===31, String(sp.length));
t('MEP-only spaces are visible', ['S001','S030','S032'].every(x=>sp.includes(x)), sp.filter(x=>['S001','S030','S032'].includes(x)).join(','));
await p.goto(B+'#/space/S003',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
t('a space opens with lines', (await p.$$('.item-row')).length>0);
t('space shows an MEP toggle', !!(await p.$('[data-v="mep"]')));
await p.goto(B+'#/space/S030',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
const s030=await p.$$('.item-row');
t('MEP-only space S030 shows its lines', s030.length>0, String(s030.length)+' lines');
await p.screenshot({path:'/tmp/shot-common.png',fullPage:false});

console.log('\nCHECK-OFF WRITES CORRECTLY');
// With the crew's real work loaded most lines are checked or flagged, so hunt
// for a room that still has a clean line to tap.
let tapped=false;
for(const rm of ['112','110','114','108','106','104','116','118','107','109']){
  await p.goto(B+'#/room/'+rm,{waitUntil:'networkidle'}); await p.waitForTimeout(300);
  tapped=await p.evaluate(()=>{
    const r=[...document.querySelectorAll('.item-row')].find(x=>!x.querySelector('.stamp.checked')&&!x.querySelector('.issue-pill'));
    if(!r) return false;
    r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:5,clientY:5}));
    r.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,clientX:5,clientY:5}));
    return true;
  });
  if(tapped) break;
}
t('found a clean line to check off', tapped);
await p.waitForTimeout(400);
const patch=await p.evaluate(()=>{const l=JSON.parse(localStorage.getItem('h2sep-platform-v1')||'[]');return l.length?l[l.length-1].patch:null});
const keys=patch?Object.keys(patch).map(k=>k.split('.').pop()):[];
t('check writes the complete group', ['checked','initials','checkedByCo','checkedAt','checkedAtLocal'].every(f=>keys.includes(f)), keys.join(','));

console.log('\nTHE CREW\'S WORK CARRIED IN');
const totChecked=await p.evaluate(async()=>{
  const res=await fetch('data/slice-f1.json'); const j=await res.json();
  let c=0,i=0,n=0;
  for(const d of Object.values(j.docs)){
    for(const v of Object.values(d.items)){ if(v.deleted) continue; if(v.checked)c++; if(v.issue&&!v.issueResolved)i++; }
    n+=Object.keys(d.notes||{}).length;
  }
  return {c,i,n};
});
t('382 crew check-offs present', totChecked.c===382, JSON.stringify(totChecked));
t('289 crew issues present', totChecked.i===289);
t('crew notes present', totChecked.n>=5);
await p.goto(B+'#/room/110',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
const stamps=await p.$$eval('.item-row .stamp.checked',n=>n.map(x=>x.textContent.trim()));
t('room 110 shows the crew initials on checked lines', stamps.length>0 && stamps.every(x=>/^[A-Z]{1,3}$/.test(x)), stamps.length+' stamps: '+[...new Set(stamps)].join(','));

console.log('\nPRINT SHEET');
await p.goto(B+'#/print/118',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
t('print sheet renders for the accessible room', !!(await p.$('.paper')));
t('print sheet has line rows', (await p.$$('.p-row')).length>0, String((await p.$$('.p-row')).length)+' rows');

console.log('\nMOBILE');
const m=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
await m.goto(B+'#/common',{waitUntil:'networkidle'});
await m.evaluate(()=>localStorage.setItem('h2sep-platform-user',JSON.stringify({name:'A',initials:'AJ',company:'Triun, LLC'})));
await m.reload({waitUntil:'networkidle'}); await m.waitForTimeout(400);
t('no horizontal overflow on mobile', await m.evaluate(()=>document.body.scrollWidth<=document.body.clientWidth+1),
  await m.evaluate(()=>document.body.scrollWidth+'/'+document.body.clientWidth));

console.log('\n'+'='.repeat(60));
console.log(`${pass} passed, ${fail} failed`);
console.log('console errors: '+(errs.length?('\n  '+errs.slice(0,8).join('\n  ')):'none'));
await b.close();
process.exit(fail||errs.length?1:0);
