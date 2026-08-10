import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const OUT='/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/desktop';
mkdirSync(OUT,{recursive:true});
const cfg=readFileSync(new URL('../js/config.js', import.meta.url),'utf8');
const KEY=cfg.match(/apiKey\s*:\s*["']([^"']+)["']/)[1];
const su=await(await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"returnSecureToken":true}'})).json();
const base='https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents/projects/h2sep/rooms/';
const dv=(v)=>{if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('nullValue'in v)return null;if('timestampValue'in v)return v.timestampValue;if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,dv(x)]));if('arrayValue'in v)return (v.arrayValue.values||[]).map(dv);return null;};
const rooms={};
for(const no of ['101','103','215','236','336','401','403','436']){
  const b=await(await fetch(base+no,{headers:{Authorization:'Bearer '+su.idToken}})).json();
  rooms[no]=Object.fromEntries(Object.entries(b.fields).map(([k,v])=>[k,dv(v)]));
}
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1.5});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8322/index.html?demo=1',{waitUntil:'load'});
await p.waitForTimeout(1500);
const inp=p.locator('input[type=text]');
if(await inp.count()>=2){await inp.nth(0).fill('QA Tester');await inp.nth(1).fill('AJ');await p.locator('button:has-text("Start")').first().click();await p.waitForTimeout(900);}
await p.evaluate((rs)=>{const db=JSON.parse(localStorage.getItem('h2sep-demo-db-v2'));Object.assign(db.rooms,rs);localStorage.setItem('h2sep-demo-db-v2',JSON.stringify(db));},rooms);
await p.goto('about:blank'); await p.goto('http://localhost:8322/index.html?demo=1',{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.screenshot({path:`${OUT}/50-desktop-home.png`});
await p.goto('about:blank'); await p.goto('http://localhost:8322/index.html?demo=1#/room/101',{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.screenshot({path:`${OUT}/51-desktop-room.png`});
// can a desktop browser actually check items? (iOS gate must not apply)
// Pick a row that is genuinely unchecked in the LIVE data — hard-coding one
// breaks the moment the crew checks it off for real.
const before=await p.locator('.item-row.checked').count();
const target=p.locator('.item-row:not(.checked):not(.issue)').first();
const tid=await target.getAttribute('data-item');
await target.locator('.box').click(); await p.waitForTimeout(900);
const after=await p.locator('.item-row.checked').count();
console.log(`desktop check-off on ${tid}: ${before} -> ${after} :`, after===before+1?'WORKS':'FAILED');
await p.goto('http://localhost:8322/dashboard.html?demo=1',{waitUntil:'load'}); await p.waitForTimeout(2500);
await p.screenshot({path:`${OUT}/52-desktop-dashboard.png`,fullPage:false});
await p.goto('http://localhost:8322/room-3d.html?room=101',{waitUntil:'load'}); await p.waitForTimeout(6000);
await p.screenshot({path:`${OUT}/53-desktop-3d.png`});
console.log('errors:',errs.length?errs.slice(0,2):'none');
await b.close();
