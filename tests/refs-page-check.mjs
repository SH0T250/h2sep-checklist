// Verify the references page renders and its back link honours ?from=3d.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true, deviceScaleFactor:2.6 });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{ if(m.type()==='error' && !/404/.test(m.text())) errs.push(m.text()); });
await p.goto('http://localhost:8322/refs.html?room=101&from=3d&demo=1', { waitUntil:'load' });
await p.waitForTimeout(2000);
console.log({
  cards: await p.locator('.rp-card').count(),
  submittals: (await p.locator('.rp-sec').first().innerText()).split('\n')[0],
  plans: (await p.locator('.rp-sec').nth(1).innerText()).split('\n')[0],
  back: await p.locator('#back-link').getAttribute('href'),
});
await p.screenshot({ path:'/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/shots19/30-refs-page.png' });
// open a submittal -> popup
await p.locator('.rp-card').first().click();
await p.waitForTimeout(1200);
console.log('popup open:', await p.locator('.pop-scrim').count());
await p.screenshot({ path:'/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/shots19/31-refs-popup.png' });
console.log('errors:', errs.length?errs.slice(0,3):'none');
await b.close();
