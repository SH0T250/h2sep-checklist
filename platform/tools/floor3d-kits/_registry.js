/* ===========================================================================
   FLOOR 1 FURNISHING KITS - REGISTRY AND HELPERS
   Inlined into platform/floor3d.html by build_floor3d.mjs at its KITS
   token, FIRST, ahead of every other file in this directory. Everything here
   is plain browser script: no modules, no imports. It runs after the scene's
   geometry helpers (bx, cylAt, wbx, V3), the MAT table, massMat and pick are
   defined and before the COMMON table is turned into spaces.

   A kit file registers itself like this:

     KITS['fitness'] = {
       spaces: ['023'],                       COMMON numbers this kit furnishes
       basis:  'MIXED',                       'MEASURED' | 'SCALED' | 'MIXED'
       source: 'ID-1.7 fitness plan, A100 room extents',
       build:  function(ctx){ ... return ctx.tally(); }
     };

   The contract is written up in README.md beside this file. Kit agents commit
   only their own <kit>.js; this file and the README belong to the scene.
   =========================================================================== */
var KITS = {};

/* The first registered kit whose spaces list names sp.no, or null. A space is
   furnished by at most one kit; if two kits claim the same number the one
   whose file sorts first wins and the other is ignored with a console warning
   so the clash is never silent. */
function kitFor(sp){
  var hit = null;
  for (var name in KITS){
    var k = KITS[name];
    if (!k || !k.spaces || k.spaces.indexOf(sp.no) < 0) continue;
    if (hit){ console.warn('floor3d kits: ' + name + ' also claims ' + sp.no + ', already taken by ' + hit.name); continue; }
    hit = {name:name, kit:k};
  }
  return hit;
}

/* Everything a kit's build(ctx) can reach. Every helper takes ABSOLUTE A100
   feet: u along the building from the north face, v across from the west face,
   y up from the finished floor. Pieces go into the space's own group so the
   EXPLODED view lifts them with their room, and every piece is hoverable for
   that space.

   Finish: pass mat as a MAT name ('wood', 'uphol', 'metal', 'counter', 'appl',
   'applDk', 'art', 'glass', 'linen', 'plinth', 'woodDk', 'ghost') plus basis
   'MEASURED' or 'SCALED'. MEASURED draws crisp; SCALED draws through massMat,
   the same lighter finish the generic massing uses. A ready THREE.Material is
   also accepted for the rare piece that needs its own.

   The plate is cut at WALLCUT (4'-0"). Pieces are capped at MASSCAP, just under
   the cut, the way the generic massing is, so a tall piece reads as its
   footprint plus a block and never pokes through the cut plane. */
function kitContext(sp, kitName){
  var n = {placed:0, measured:0, scaled:0};
  function finish(mat, basis){
    var scaled = basis === 'SCALED';
    if (basis !== 'MEASURED' && basis !== 'SCALED')
      throw new Error('floor3d kit ' + kitName + ': every piece needs basis MEASURED or SCALED (space ' + sp.no + ')');
    n.placed++; if (scaled) n.scaled++; else n.measured++;
    if (typeof mat === 'string'){
      if (!MAT[mat]) throw new Error('floor3d kit ' + kitName + ': no MAT named ' + mat);
      return massMat(mat, scaled);
    }
    return mat;
  }
  function place(m){ m.castShadow = true; m.receiveShadow = true; sp.group.add(m); pick(m, sp); return m; }
  function rotY(m, deg){ if (deg) m.rotation.y = deg * Math.PI / 180; return m; }
  function capped(y0, y1){ return Math.min(Math.max(y0, y1), MASSCAP); }
  var ctx = {
    THREE:THREE, sp:sp, kit:kitName,
    bx:bx, cylAt:cylAt, wbx:wbx, V3:V3, MAT:MAT, massMat:massMat, pick:pick,
    MASSCAP:MASSCAP, WALLCUT:WALLCUT,
    /* A box centred at (u, v): du feet along U, dv feet along V, y0 to y1 up.
       rot is degrees about the vertical; positive swings the piece's U axis
       toward +V, which is counterclockwise on the plan with north at the top.
       At rot 90 the piece's du runs along V. */
    box:function(o){
      var mat = finish(o.mat, o.basis);
      var y0 = o.y0 || 0, y1 = capped(y0, o.y1 === undefined ? y0 + 1 : o.y1);
      var m = new THREE.Mesh(BOX, mat);
      m.scale.set(Math.abs(o.dv), Math.max(0.01, y1 - y0), Math.abs(o.du));
      m.position.set(o.v, (y0 + y1) / 2, o.u);
      return place(rotY(m, o.rot));
    },
    /* A vertical cylinder centred at (u, v) with radius r, y0 to y1 up. */
    cyl:function(o){
      var mat = finish(o.mat, o.basis);
      var y0 = o.y0 || 0, y1 = capped(y0, o.y1 === undefined ? y0 + 1 : o.y1);
      var m = new THREE.Mesh(CYL, mat);
      m.scale.set(o.r, Math.max(0.01, y1 - y0), o.r);
      m.position.set(o.v, (y0 + y1) / 2, o.u);
      return place(m);
    },
    /* A thin horizontal plate (a counter top, a table top, a mat, a mirror
       laid flat): centred at (u, v), du by dv, bottom at y, thickness t
       (default 0.08 ft, about an inch), optional rot as for box. */
    plate:function(o){
      var mat = finish(o.mat, o.basis);
      var t = o.t === undefined ? 0.08 : o.t, y0 = o.y || 0, y1 = capped(y0, y0 + t);
      var m = new THREE.Mesh(BOX, mat);
      m.scale.set(Math.abs(o.dv), Math.max(0.01, y1 - y0), Math.abs(o.du));
      m.position.set(o.v, (y0 + y1) / 2, o.u);
      return place(rotY(m, o.rot));
    },
    /* The running count. build(ctx) can simply return ctx.tally(). */
    tally:function(){ return {placed:n.placed, measured:n.measured, scaled:n.scaled}; }
  };
  return ctx;
}
