// The exhibit must not keep saying "Room 101" when opened from a sibling room.
import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:2.6});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
for (const room of ['101','336']) {
  await p.goto(`http://localhost:8322/room-3d.html?room=${room}`,{waitUntil:'load',timeout:90000});
  await p.waitForTimeout(5000);
  console.log(room, {
    back: (await p.locator('#bb-back').innerText()).trim(),
    backHref: (await p.locator('#bb-back').getAttribute('href')),
    refsHref: (await p.locator('#bb-refs').getAttribute('href')),
    sheetHref: (await p.locator('#bb-print').getAttribute('href')),
    drawer: (await p.locator('#drawerbar b').innerText()).trim(),
    title: await p.title(),
    caveat: (await p.locator('#caveat').innerText()).slice(0,52),
    canvas: await p.locator('#stage canvas').count(),
  });
  if (room==='336') await p.screenshot({path:'/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/shots19/60-3d-room336.png'});
}
console.log('errors:',errs.length?errs.slice(0,2):'none');
await b.close();
