import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await (await b.newContext({viewport:{width:900,height:700}})).newPage();
await p.goto('http://localhost:8322/room-3d.html?room=103',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(4000);
console.log(await p.evaluate(()=>{
  const hits=[...document.querySelectorAll('.lbl')].map(e=>e.innerHTML).filter(h=>/103|CONNECTING/.test(h));
  const leg=[...document.querySelectorAll('.legend div')].map(e=>e.textContent.trim()).filter(t=>/103/.test(t));
  const rows=[...document.querySelectorAll('#sb-scroll .nm')].map(e=>e.textContent).filter(t=>/Room 10/.test(t));
  return {labelHits:hits, legend:leg, rows};
}));
await b.close();
