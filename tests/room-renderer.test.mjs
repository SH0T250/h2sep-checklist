import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { patchRoomRenderer } from '../tools/room3d-renderer-build.mjs';

const source = readFileSync(new URL('../js/room-renderer.js', import.meta.url), 'utf8');
function fixture(failures = 0, mobile = false) {
  const nodes = [], attempts = [], events = {}, renderers = [];
  const element = () => {
    const node = { style: {}, dataset: {}, events: {}, children: [],
      appendChild(child) { this.children.push(child); },
      replaceChildren(child) { this.children = [child]; },
      setAttribute() {}, addEventListener(type, cb) { this.events[type] = cb; } };
    nodes.push(node);
    return node;
  };
  function Renderer(options) {
    if (options) { attempts.push(options); if (attempts.length <= failures) throw new Error('No WebGL'); }
    Object.assign(this, {domElement: element(), shadowMap: {}, draws: 0,
      setPrecision() {}, setSize(w,h) { this.size = [w,h]; },
      setPixelRatio(n) { this.ratio = n; }, setClearColor(c) { this.color = c; },
      render() { this.draws++; }, dispose() { this.disposed = true; },
      forceContextLoss() { this.lost = true; this.domElement.events.webglcontextlost?.({preventDefault(){}}); }
    });
    renderers.push(this);
  }
  let time = 100;
  const context = vm.createContext({
    THREE: {WebGLRenderer: Renderer, WebGL1Renderer: Renderer, SVGRenderer: Renderer, AmbientLight: function() {}},
    document: {createElement: element, createTextNode: text => ({text}), getElementById: id => nodes.find(n => n.id === id), head:element(), body:element()},
    window: {addEventListener: (name, fn) => events[name] = fn, location: {reload(){}}},
    performance: {now: () => time += 60}, console: {warn() {}}
  });
  vm.runInContext(source, context);
  const api = context.createRoomRenderer(mobile);
  const scene = {add() {}}, camera = {position:{toArray: () => [0,0,0]}, quaternion:{toArray: () => [0,0,0,1]}, projectionMatrix:{elements:[1,0,0,1]}};
  return {api, attempts, events, renderers, nodes, scene, camera};
}

test('GPU startup uses the browser default adapter and retains the mobile pixel budget after resize', () => {
  const {api, attempts, renderers} = fixture(0, true);
  assert.equal(attempts[0].powerPreference, 'default');
  assert.equal(attempts[0].antialias, false);
  api.setPixelRatio(3); api.setSize(900, 600);
  assert.equal(renderers[0].ratio, 1.75);
  assert.equal(api.software, false);
});
test('a rejected first profile retries without antialiasing', () => {
  const {api, attempts} = fixture(1);
  assert.equal(api.software, false);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[1].antialias, false);
});
test('WebGL 1 gets a final attempt before software fallback', () => {
  const {api, attempts} = fixture(2);
  assert.equal(api.software, false);
  assert.equal(attempts.length, 3);
});
test('complete WebGL failure keeps an interactive surface and renders changes only', () => {
  const {api, renderers, scene, camera, nodes} = fixture(3);
  assert.equal(api.software, true);
  assert.equal(api.domElement.dataset.renderer, 'svg');
  assert.ok(nodes.some(node => node.id === 'render-status'));
  api.render(scene,camera); api.render(scene,camera);
  assert.equal(renderers[0].draws,1);
  api.invalidate(); api.render(scene,camera);
  assert.equal(renderers[0].draws,2);
  camera.position.toArray = () => [1,0,0]; api.render(scene,camera);
  assert.equal(renderers[0].draws,3);
});
test('context loss preserves the controls surface, dimensions and selected color', () => {
  const {api, renderers} = fixture();
  const surface = api.domElement;
  api.setSize(1280,720); api.setClearColor(0xfafafa);
  let prevented = false;
  renderers[0].domElement.events.webglcontextlost({preventDefault(){prevented=true;}});
  assert.ok(prevented);
  assert.equal(api.domElement,surface);
  assert.equal(api.software,true);
  assert.deepEqual(renderers[1].size,[1280,720]);
  assert.equal(renderers[1].color,0xfafafa);
});
test('navigation frees the GPU context; BFCache navigation preserves it', () => {
  const {events, renderers, api} = fixture();
  events.pagehide({persisted:true}); assert.equal(renderers[0].disposed,undefined);
  events.pagehide({persisted:false}); assert.ok(renderers[0].disposed && renderers[0].lost);
  assert.equal(api.software,false);
});
test('both published viewers retain all geometry and the patch survives repeated builds', () => {
  const block = /\/\* H2SEP renderer compatibility start \*\/[\s\S]*?\/\* H2SEP renderer compatibility end \*\//;
  for (const path of ['room-3d.html','platform/room3d.html']) {
    const actual = readFileSync(path,'utf8').replace(/\r\n/g,'\n');
    const before = actual.replace(block,"var renderer = new THREE.WebGLRenderer({antialias: !MOBILE, powerPreference: 'high-performance'});")
      .replace('function requestRenderIfFrozen(){\n  renderer.invalidate();','function requestRenderIfFrozen(){');
    const after = patchRoomRenderer(before);
    assert.equal(patchRoomRenderer(after),after);
    assert.equal(after.replace(block,"var renderer = new THREE.WebGLRenderer({antialias: !MOBILE, powerPreference: 'high-performance'});")
      .replace('function requestRenderIfFrozen(){\n  renderer.invalidate();','function requestRenderIfFrozen(){'), before);
    assert.equal(actual,after);
    for (const script of after.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) new vm.Script(script[1]);
  }
});
test('the model cache is invalidated and the service worker version matches the app', () => {
  const sw=readFileSync('sw.js','utf8'), config=readFileSync('js/config.js','utf8');
  const version=config.match(/APP_VERSION = '([^']+)'/)[1];
  assert.ok(sw.includes("const VERSION = 'h2sep-v"+version+"'"));
  assert.ok(sw.includes("const MODEL_CACHE = 'h2sep-model-8'"));
});
