/* Inlined by tools/room3d-renderer-build.mjs: also works offline and in srcdoc. */
function createRoomRenderer(mobile) {
  var active, gpu, software = false, dirty = true, lastCamera = '', lastDraw = 0;
  var width = 1, height = 1, pixelRatio = 1, clearColor = 0x0b0f13;
  var ambient, disposed = false;
  // Keep the event target stable if a GPU context is lost while orbiting.
  var surface = document.createElement('div');
  surface.style.cssText = 'width:100%;height:100%;touch-action:none';
  var profiles = [
    [THREE.WebGLRenderer, {antialias: !mobile, powerPreference: 'default'}],
    [THREE.WebGLRenderer, {antialias: false, powerPreference: 'low-power'}],
    [THREE.WebGL1Renderer, {antialias: false, powerPreference: 'default'}]
  ];
  for (var i = 0; i < profiles.length; i++) {
    try {
      active = new profiles[i][0](profiles[i][1]);
      gpu = active;
      break;
    } catch (error) {
      // A failed context must not abort the room geometry and item-list setup.
      console.warn('Room 3D graphics profile ' + (i + 1) + ' unavailable:', error.message);
    }
  }

  function showSoftwareNotice() {
    var notice = document.getElementById('render-status');
    if (notice) return;
    var style = document.createElement('style');
    style.textContent = '#render-status{position:fixed;z-index:18;top:70px;right:12px;left:330px;max-width:530px;padding:9px 12px;border:1px solid #56899b;border-radius:6px;background:#10212bea;color:#eef8fc;font:12px/1.4 system-ui}#render-status button{margin-left:8px;min-height:32px;padding:4px 9px;border:1px solid #56899b;border-radius:4px;color:inherit;background:#203541;cursor:pointer}@media(max-width:900px){#render-status{top:112px;left:10px;right:10px;font-size:11px}}';
    document.head.appendChild(style);
    notice = document.createElement('div');
    notice.id = 'render-status';
    notice.setAttribute('role', 'status');
    notice.appendChild(document.createTextNode('Compatibility 3D · WebGL is unavailable. Same room and items, simpler lighting; no shadows. '));
    var retry = document.createElement('button');
    retry.textContent = 'Retry graphics';
    retry.addEventListener('click', function () { window.location.reload(); });
    notice.appendChild(retry);
    document.body.appendChild(notice);
  }

  function useSoftware() {
    if (software || disposed) return;
    active = new THREE.SVGRenderer();
    active.setPrecision(2);
    active.setSize(width, height);
    active.setClearColor(clearColor);
    software = true;
    surface.dataset.renderer = 'svg';
    active.domElement.style.cssText = 'display:block;touch-action:none';
    surface.replaceChildren(active.domElement);
    dirty = true;
    showSoftwareNotice();
  }

  if (active) {
    surface.dataset.renderer = 'webgl';
    surface.appendChild(active.domElement);
    active.domElement.addEventListener('webglcontextlost', function (event) {
      event.preventDefault();
      useSoftware();
    });
  } else {
    useSoftware();
  }

  var api = {
    domElement: surface,
    shadowMap: gpu ? gpu.shadowMap : {},
    get software() { return software; },
    setPixelRatio: function (value) {
      pixelRatio = Math.min(value, mobile ? 1.75 : 2);
      active.setPixelRatio(software ? 1 : pixelRatio);
      dirty = true;
    },
    setSize: function (w, h) {
      width = w; height = h;
      active.setSize(w, h);
      dirty = true;
    },
    setClearColor: function (color, alpha) {
      clearColor = color;
      active.setClearColor(color, alpha);
      dirty = true;
    },
    invalidate: function () { dirty = true; },
    render: function (scene, camera) {
      if (disposed) return;
      if (software) {
        // SVGRenderer supports directional/ambient lighting, not hemisphere.
        if (!ambient) {
          ambient = new THREE.AmbientLight(0xffffff, 0.55);
          scene.add(ambient);
        }
        var key = camera.position.toArray().concat(camera.quaternion.toArray(), camera.projectionMatrix.elements).join(',');
        if (!dirty && key === lastCamera) return;
        var now = performance.now();
        if (lastDraw && now - lastDraw < 50) return;
        lastDraw = now;
        lastCamera = key;
        dirty = false;
      }
      active.render(scene, camera);
    },
    dispose: function () {
      disposed = true;
      if (gpu) {
        gpu.dispose();
        gpu.forceContextLoss();
      }
    }
  };
  window.addEventListener('pagehide', function (event) {
    // A BFCache page may come back; release contexts only on real navigation.
    if (!event.persisted) api.dispose();
  });
  return api;
}
