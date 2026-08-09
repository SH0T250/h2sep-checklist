import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8322/index.html?demo=1',{waitUntil:'load'});
await p.waitForTimeout(1500);
const inp=p.locator('input[type=text]');
if(await inp.count()>=2){await inp.nth(0).fill('QA Tester');await inp.nth(1).fill('AJ');await p.locator('button:has-text("Start")').first().click();await p.waitForTimeout(900);}
await p.goto('http://localhost:8322/index.html?demo=1#/room/101',{waitUntil:'load'});
await p.waitForTimeout(1200);
console.log({
  rows: await p.locator('.item-row').count(),
  checkedBefore: await p.locator('.item-row.checked').count(),
  readonlyStrip: await p.locator('.readonly-strip').count(),
  gr403exists: await p.locator('.item-row[data-item="gr403_a"]').count(),
  gr403checked: await p.locator('.item-row[data-item="gr403_a"].checked').count(),
});
await p.locator('.item-row[data-item="gr403_a"] .box').click();
await p.waitForTimeout(900);
console.log('after click:', {
  checked: await p.locator('.item-row.checked').count(),
  gr403checked: await p.locator('.item-row[data-item="gr403_a"].checked').count(),
  ink: await p.locator('.item-row[data-item="gr403_a"] .ink').count(),
  toast: await p.locator('.toast').count(),
  sheetOpen: await p.locator('.scrim').count(),
});
await b.close();
