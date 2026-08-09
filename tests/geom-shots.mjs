import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT='/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/geom';
mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1100,height:820},deviceScaleFactor:1.5});
const p=await ctx.newPage();
for (const [room,view] of [['101','top'],['103','top'],['101','iso'],['103','iso']]) {
  await p.goto(`http://localhost:8322/room-3d.html?room=${room}&view=${view}`,{waitUntil:'load',timeout:90000});
  await p.waitForTimeout(5000);
  await p.screenshot({path:`${OUT}/${room}-${view}.png`});
}
await b.close(); console.log('done');
