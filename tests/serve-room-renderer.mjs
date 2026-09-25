// Isolated viewer QA only: never loads the operational app or its backend.
// Open http://127.0.0.1:8438/?room=104&mode=software (or mode=gpu).
import http from 'node:http';
import { readFileSync } from 'node:fs';
const viewer = new URL('../platform/room3d.html', import.meta.url);
http.createServer((req,res) => {
  const url = new URL(req.url,'http://127.0.0.1:8438');
  if (url.pathname === '/phone') {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end('<!doctype html><title>Phone viewer QA</title><iframe title="Phone model" style="width:390px;height:844px;border:0" src="/?room=104&amp;mode=software&amp;view=iso"></iframe>');
    return;
  }
  if (url.pathname !== '/') {res.writeHead(404).end(); return;}
  let html = readFileSync(viewer,'utf8');
  const disable = url.searchParams.get('mode') === 'software';
  const setup = `<script>
    window.testErrors=[];
    addEventListener('error', e => testErrors.push(e.message));
    ${disable ? `const originalContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type,...args){
      return /webgl/.test(type) ? null : originalContext.call(this,type,...args);
    };` : ''}
  </script>`;
  const report = `<script>
    addEventListener('load',()=>{
      const panel=document.createElement('div'); panel.id='qa-report';
      panel.style.cssText='position:fixed;bottom:4px;left:4px;z-index:80;background:#fff;color:#111;padding:8px;font:12px monospace;max-width:98vw';
      const result=document.createElement('span');panel.append(result);
      const loss=document.createElement('button');loss.textContent='Simulate GPU loss';panel.append(loss);
      loss.onclick=()=>{const c=document.querySelector('#stage canvas');const gl=c?.getContext('webgl2')||c?.getContext('webgl');gl?.getExtension('WEBGL_lose_context')?.loseContext();};
      const update=document.createElement('button');update.textContent='Check renderer';panel.append(update);
      update.onclick=()=>{result.textContent=JSON.stringify({renderer:document.querySelector('#stage > div')?.dataset.renderer,paths:document.querySelectorAll('#stage svg path').length,items:document.querySelectorAll('.row[data-id]').length,errors:window.testErrors,room:document.title})+' ';};
      document.body.append(panel);update.click();
    });
  </script>`;
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(setup+html+report);
}).listen(8438,'127.0.0.1',()=>console.log('Isolated renderer QA: http://127.0.0.1:8438/?room=104&mode=software'));
