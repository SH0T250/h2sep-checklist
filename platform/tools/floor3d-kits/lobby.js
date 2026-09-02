/* ===========================================================================
   LOBBY KIT: Lobby 003, Market 005, Reception 004 (Vestibule 001 holds no
   FF&E other than roller shades, so nothing is drawn in it).

   The scene keeps all four numbers as ONE open volume, COMMON entry FOH, so
   this kit claims FOH and furnishes it from research/floor1-3d/commons/
   lobby.json and lobby.md.

   Sources (Drive ids in lobby.json):
     ID-1.7 Enlarged Lobby Furniture and Equipment Plan, RK Hospitality
       07/04/2025, 3/16 in = 1 ft, split sheet FF&E Locations_sheet8.pdf.
       Fitted to the A100 frame on the south face (U 246.46) and the east face
       (V 65.59) at 13.5 pt/ft; the four Fitness 023 wall faces then land
       within 0.1 ft of A100. Symbol centers were read on a 0.5 ft grid, so
       every POSITION below is SCALED, good to about half a foot.
     PA-801 Reception Desk shop drawing, approved 2025/04/01.
     PA-800 Perch Table shop drawing. PA-803 Coffee and Hydration Station
       shop drawing.
     Home2-Dynamic FF&E Specifications, Public Areas (the spec book), for
       every PA tagged seat and table.
     Dukers DSM-41R and Coldline D12-B submittals for the market cooler and
       freezer.

   How the basis is assigned. A piece is MEASURED (drawn crisp) when its SIZE
   is printed on an approved shop drawing, a submittal or the spec book. A
   piece is SCALED (drawn lighter) when its size had to be scaled off ID-1.7
   or assumed because no card gives it: the PA-316 market shelving, the
   communal work table, the two PA-307 accessible tables and the PA-505 wall
   art. Positions are SCALED off ID-1.7 for every piece; the card line and the
   comment on each piece say so.

   Counting. Each helper call counts one piece, so one call is made per
   furniture item (the top of a table, the seat of a chair, the body of a
   cabinet) and the item's other parts are raw, uncounted meshes. The tally
   the card reports is therefore items, not meshes: 101 placements on ID-1.7.

   Rotation convention read off the ID-1.7 chair symbols against their
   tables: rotDeg 0 faces +V, 90 faces +U, 180 faces -V, 270 faces -U. All
   four are axis-aligned, so nothing here uses the rot option.

   Where this kit disagrees with the scene's plate: ID-1.7 shows the lobby
   starting at the A100 gross-envelope face U 178.78, with the restroom band
   (Womens 019 / Mens 020 / Engineer 021) ending there. The scene draws the
   FOH plate from U 187 and extends the 019/020/021 band to U 187 (both
   SCALED). The coffee station, both focus booths and the highback lounge
   group sit between U 178.8 and 188 as the sheet draws them, so they overlap
   that band on the current plate. That is reported to the scene owner, not
   hidden by moving the pieces.
   =========================================================================== */
KITS['lobby'] = {
  spaces: ['FOH'],
  basis:  'MIXED',
  source: 'ID-1.7 lobby FF&E plan (every position SCALED, about 0.5 ft) with approved shop drawings, submittals and the Home2 public-area spec book (sizes MEASURED)',
  build:  function(ctx){
    var sp = ctx.sp, G = sp.group, CAP = ctx.MASSCAP;
    var M = 'MEASURED', S = 'SCALED';

    /* Raw, uncounted parts of a counted piece. Same finish rule as the helpers:
       MEASURED crisp, SCALED through massMat. Capped at MASSCAP like everything. */
    function fin(name, basis){ return ctx.massMat(name, basis === S); }
    function raw(u0,v0,u1,v1,y0,y1,name,basis){
      y1 = Math.min(y1, CAP); if (y1 - y0 < 0.01) return null;
      var m = ctx.bx(u0,v0,u1,v1,y0,y1,fin(name,basis),G); if (m) ctx.pick(m, sp); return m;
    }
    function rawCyl(u,v,r,y0,y1,name,basis){
      y1 = Math.min(y1, CAP); if (y1 - y0 < 0.01) return null;
      var m = ctx.cylAt(u,v,r,y0,y1,fin(name,basis),G); ctx.pick(m, sp); return m;
    }

    /* A dining chair or stool: w across the seat, d front to back, seat is the
       seat plane, h the back height. The seat is the counted piece; a wood
       frame block under it and a thin back slab on the rear edge are raw. The
       seat planes of PA-101 and PA-106 are not printed on their cards, so they
       are drawn at 1.5 ft, a stylized plane, and labeled so in the calls. */
    function chair(u, v, w, d, seat, h, rot, basis, frame){
      var alongU = (rot === 90 || rot === 270);
      var du = alongU ? d : w, dv = alongU ? w : d, t = 0.15;
      ctx.box({u:u, v:v, du:du, dv:dv, y0:seat-0.3, y1:seat, mat:'uphol', basis:basis});
      raw(u-du/2+0.3, v-dv/2+0.3, u+du/2-0.3, v+dv/2-0.3, 0, seat-0.3, frame || 'wood', basis);
      if (rot === 0)   raw(u-du/2, v-dv/2,   u+du/2, v-dv/2+t, seat, h, frame || 'wood', basis);
      if (rot === 180) raw(u-du/2, v+dv/2-t, u+du/2, v+dv/2,   seat, h, frame || 'wood', basis);
      if (rot === 90)  raw(u-du/2,   v-dv/2, u-du/2+t, v+dv/2, seat, h, frame || 'wood', basis);
      if (rot === 270) raw(u+du/2-t, v-dv/2, u+du/2,   v+dv/2, seat, h, frame || 'wood', basis);
    }
    /* A rectangular table: top plate counted, black metal base raw. */
    function rectTable(u, v, du, dv, h, basis, topMat){
      ctx.plate({u:u, v:v, du:du, dv:dv, y:h-0.08, t:0.08, mat:topMat || 'wood', basis:basis});
      var bu = Math.max(0.3, du*0.45), bv = Math.max(0.3, dv*0.45);
      raw(u-bu/2, v-bv/2, u+bu/2, v+bv/2, 0, h-0.08, 'metal', basis);
    }
    /* A round pedestal table: top counted, post and foot raw. */
    function roundTable(u, v, r, h, basis){
      ctx.cyl({u:u, v:v, r:r, y0:h-0.08, y1:h, mat:'wood', basis:basis});
      rawCyl(u, v, 0.12, 0.05, h-0.08, 'metal', basis);
      rawCyl(u, v, Math.min(0.6, r*0.5), 0, 0.06, 'metal', basis);
    }

    /* ------------------------------------------------------------------
       RECEPTION 004
       ------------------------------------------------------------------ */
    /* PA-801 reception desk. MEASURED size off the approved shop drawing
       p22-p26: 138 in main run, 24 in deep counters, 90 in north return and
       47 in south return, 42 in quartz transaction top (ST-01). Position
       SCALED: ID-1.7 draws the front face on V 36.2 from U 205.5 to 217.0
       with the returns running east (+V) toward the Work Stations wall at
       about V 44.4. The plan symbol is a symmetric U; the shop drawing
       governs. The 36 in work surface inside the U has no depth on the
       record, so it is not drawn. */
    ctx.box({u:211.25, v:37.2, du:11.5, dv:2.0, y0:0, y1:3.42, mat:'woodDk', basis:M});
    raw(205.5, 38.2, 207.5, 43.7, 0, 3.42, 'woodDk', M);          /* north return, 90 in */
    raw(215.0, 38.2, 217.0, 40.12, 0, 3.42, 'woodDk', M);         /* south return, 47 in */
    raw(205.4, 36.1, 217.1, 38.3, 3.42, 3.5, 'counter', M);       /* quartz top, main run */
    raw(205.4, 38.3, 207.6, 43.8, 3.42, 3.5, 'counter', M);       /* quartz top, north return */
    raw(214.9, 38.3, 217.1, 40.22, 3.42, 3.5, 'counter', M);      /* quartz top, south return */

    /* ------------------------------------------------------------------
       MARKET 005
       ------------------------------------------------------------------ */
    /* PA-314 large retail table, 52 x 24 x 36 in MEASURED off the spec book,
       racetrack quartz top on a laminate plinth. Position SCALED off ID-1.7. */
    ctx.plate({u:194.0, v:37.5, du:4.33, dv:2.0, y:2.92, t:0.08, mat:'counter', basis:M});
    raw(192.4, 36.9, 195.6, 38.1, 0, 2.92, 'woodDk', M);
    /* PA-315 small round retail table, 34 in dia x 31 in MEASURED off the spec
       book, on a laminate cylinder base. Position SCALED off ID-1.7. */
    ctx.cyl({u:191.0, v:36.5, r:1.42, y0:2.5, y1:2.58, mat:'counter', basis:M});
    rawCyl(191.0, 36.5, 0.9, 0, 2.5, 'woodDk', M);
    /* PA-316 wall shelving, four bays. SCALED: length 8.4 ft and depth 1.2 ft
       off the ID-1.7 vectors (U 188.8 to 197.2 against the market back wall
       at about V 44.4); no sheet gives its height, so it runs to the plan cut.
       Held inside the FOH plate edge at V 44.22. */
    ctx.box({u:193.0, v:44.14, du:8.42, dv:0.16, y0:0, y1:6.0, mat:'woodDk', basis:S});   /* back panel */
    for (var b = 0; b <= 4; b++)
      raw(188.8 + b*2.105 - 0.05, 43.05, 188.8 + b*2.105 + 0.05, 44.06, 0, 6.0, 'wood', S);  /* uprights */
    [0.3, 1.4, 2.5, 3.6].forEach(function(y){ raw(188.85, 43.05, 197.15, 44.06, y, y+0.06, 'wood', S); });
    /* Two door reach-in cooler, Dukers DSM-41R: 47 1/4 W x 31 7/8 D x 80 3/8 H
       MEASURED off the submittal. Position SCALED: ID-1.7 draws it with its
       back on the market west wall, doors facing +U, V 35.6 to 40.1; the
       drawn symbol is 54 in wide, the submitted unit 47.25 in, centered on the
       symbol. Back set at U 187.0 to clear the Servery wall face at 186.99. */
    ctx.box({u:188.33, v:37.9, du:2.66, dv:3.94, y0:0, y1:6.7, mat:'applDk', basis:M});
    raw(189.62, 36.1, 189.7, 39.7, 0.3, 6.7, 'glass', M);          /* glass door face */
    /* Single glass door freezer, Coldline D12-B: 27.2 W x 26.2 D x 83.7 H
       MEASURED off the submittal. Position SCALED: ID-1.7 draws it beside the
       cooler, V 40.2 to 42.5, door facing +U. */
    ctx.box({u:188.09, v:41.4, du:2.18, dv:2.27, y0:0, y1:6.98, mat:'applDk', basis:M});
    raw(189.14, 40.5, 189.22, 42.3, 0.3, 6.98, 'glass', M);

    /* ------------------------------------------------------------------
       LOBBY 003, west wall (the lobby's north wall in the A100 frame, U 178.8)
       ------------------------------------------------------------------ */
    /* PA-803 coffee and hydration station. MEASURED: shop drawing p36 title
       234 W x 24 D x 34 H (p35 reads 220 3/4); the ID-1.7 vector agrees with
       234 in and is measured directly: U 178.8 to 180.7, V -0.2 to 19.3, back
       on the wall face at U 178.8. Quartz top (ST-01) over gray oak cabinets. */
    ctx.box({u:179.75, v:9.55, du:1.9, dv:19.5, y0:0, y1:2.75, mat:'woodDk', basis:M});
    raw(178.8, -0.25, 180.78, 19.35, 2.75, 2.83, 'counter', M);
    /* PA-105 focus booths, 80 W x 37 D x 54 H MEASURED off the spec book,
       high back surround, open side facing +U. Positions SCALED. Booth 1 was
       re-read off the sheet raster at 40 px/ft: outline V 23.0 to 29.6 at
       U 178.85 to 181.93, just south of the guest corridor face (V 30.16).
       Booth 2 (south) is drawn 58 in long at V -5.1 to -0.3; the 80 in spec
       does not fit between the exterior wall face at V -6.8 and the coffee
       counter at V -0.2, so it is drawn 78 in, V -6.75 to -0.25. */
    [[23.0, 29.6], [-6.75, -0.25]].forEach(function(vv){
      ctx.box({u:180.0, v:(vv[0]+vv[1])/2, du:1.0, dv:vv[1]-vv[0]-1.0, y0:0.3, y1:1.5, mat:'uphol', basis:M});   /* seat */
      raw(178.85, vv[0], 179.35, vv[1], 0, 4.5, 'uphol', M);                                                   /* back */
      raw(178.85, vv[0], 181.93, vv[0]+0.5, 0, 4.5, 'uphol', M);                                                /* end wing */
      raw(178.85, vv[1]-0.5, 181.93, vv[1], 0, 4.5, 'uphol', M);                                                /* end wing */
    });
    /* PA-306 booth tables, 42 W x 36 D MEASURED off the spec book (height not
       captured, 30 in assumed per the research record). Positions SCALED off
       the raster: table rectangle U 179.1 to 182.1 in each booth, centered
       V 26.25 (north booth) and V -3.0 (south booth). */
    [26.25, -3.0].forEach(function(v){
      ctx.plate({u:180.6, v:v, du:3.0, dv:3.5, y:2.42, t:0.08, mat:'wood', basis:M});
      rawCyl(180.9, v, 0.12, 0.05, 2.42, 'metal', M);
      rawCyl(180.9, v, 0.6, 0, 0.06, 'metal', M);
    });
    /* PA-104 highback lounge chairs, 30 1/2 W x 29 1/2 D x 46 H MEASURED off
       the spec book, backs toward the coffee wall, facing +U. Positions
       SCALED: ID-1.7 reads the four at U 187.0, V 5.0 / 6.6 / 11.1 / 12.8
       with the PA-303 tea table at V 9.0 between the pairs. Two 30.5 in
       chairs cannot sit 1.6 ft apart, so the group is spread to its measured
       widths over the drawn extent: V 4.1 / 6.65 / 11.35 / 13.9. */
    [4.1, 6.65, 11.35, 13.9].forEach(function(v){
      ctx.box({u:187.0, v:v, du:2.46, dv:2.54, y0:1.0, y1:1.5, mat:'uphol', basis:M});
      raw(185.77, v-1.27, 186.1, v+1.27, 1.5, 3.83, 'uphol', M);      /* wing back */
      raw(185.77, v-1.27, 187.6, v-1.27+0.25, 1.5, 2.2, 'uphol', M);  /* arms */
      raw(185.77, v+1.27-0.25, 187.6, v+1.27, 1.5, 2.2, 'uphol', M);
      raw(186.0, v-1.0, 188.0, v+1.0, 0, 1.0, 'wood', M);              /* light wood base */
    });
    /* PA-303 tea height round tables, 24 in dia x 27 in MEASURED off the spec
       book. Positions SCALED: the first at U 187.1 V 9.0 between the highback
       pairs; the second is not clearly drawn (research: low confidence at
       V 19.3) and sits at V 17.0 in the open arc so it clears the PA-103
       chairs, which the sheet packs above it. */
    roundTable(187.1, 9.0, 1.0, 2.25, M);
    roundTable(187.1, 17.0, 1.0, 2.25, M);
    /* PA-304 laptop tables, 20 W x 15 D x 25 H MEASURED off the spec book, C
       base. Positions SCALED off ID-1.7 at U 189.3, V 16.6 and 14.2. */
    [16.6, 14.2].forEach(function(v){
      ctx.plate({u:189.3, v:v, du:1.67, dv:1.25, y:2.0, t:0.08, mat:'wood', basis:M});
      raw(188.5, v-0.08, 188.66, v+0.08, 0.05, 2.0, 'metal', M);
      raw(188.5, v-0.55, 189.9, v+0.55, 0, 0.05, 'metal', M);
    });
    /* PA-103 lounge chairs with handle, 32 W x 32 D x 37 H, seat 18 in,
       MEASURED off the spec book, barrel form facing +U at the market edge.
       Positions SCALED: ID-1.7 reads U 188.0, V 24.9 / 23.2 / 21.4, which
       overlaps three 32 in chairs, so they are spread at their measured width
       over the drawn group: V 25.3 / 22.6 / 19.9. */
    [25.3, 22.6, 19.9].forEach(function(v){
      ctx.cyl({u:188.0, v:v, r:1.33, y0:0.25, y1:1.5, mat:'uphol', basis:M});
      raw(186.67, v-1.33, 187.1, v+1.33, 1.5, 3.08, 'uphol', M);      /* barrel back */
      raw(186.9, v-1.33, 188.6, v-1.08, 1.5, 2.2, 'uphol', M);        /* arms */
      raw(186.9, v+1.08, 188.6, v+1.33, 1.5, 2.2, 'uphol', M);
      rawCyl(188.0, v, 1.0, 0, 0.25, 'wood', M);                      /* light wood base */
    });

    /* ------------------------------------------------------------------
       LOBBY 003, storefront wall (V -7.38)
       ------------------------------------------------------------------ */
    /* PA-800 perch table, 197 W x 21 D x 34 H in four 46 3/4 in bays MEASURED
       off the shop drawing p21, gray oak top on square tube legs. Position
       SCALED: ID-1.7 draws it along the storefront wall U 195.2 to 211.6,
       V -6.9 to -5.2, stools on the +V side. */
    ctx.plate({u:203.41, v:-6.025, du:16.42, dv:1.75, y:2.75, t:0.08, mat:'wood', basis:M});
    for (var L = 0; L <= 4; L++){
      var lu = 195.3 + L*3.896;
      raw(lu-0.08, -5.5, lu+0.08, -5.34, 0, 2.75, 'metal', M);
    }
    raw(195.2, -6.9, 211.62, -6.75, 0.5, 0.62, 'metal', M);            /* black support tube at the wall */
    /* PA-107 counter stools, 19 W x 20 D x 37 H, seat 24 in, MEASURED off the
       spec book; eight per the ID-1.7 tag. Positions SCALED: V -4.2, U 196.4
       to 210.4 on 2 ft centers, facing the perch (-V). */
    for (var s = 0; s < 8; s++) chair(196.4 + s*2.0, -4.2, 1.58, 1.67, 2.0, 3.08, 180, M);

    /* ------------------------------------------------------------------
       LOBBY 003, dining and work seating
       ------------------------------------------------------------------ */
    /* Communal work table with center power trough. SCALED: untagged on
       ID-1.7, no spec card; racetrack outline scaled off the sheet, width
       1.6 ft; height 30 in assumed per the research record. Runs along V 13.9
       to 15.7 (the raster read; the research grid read is 14.3 to 15.9) from
       U 190.6 to the banquette back at U 202.8, where the sheet ends it. */
    ctx.plate({u:196.7, v:14.8, du:12.2, dv:1.6, y:2.42, t:0.08, mat:'wood', basis:S});
    raw(191.6, 14.6, 201.9, 15.0, 2.5, 2.55, 'applDk', S);            /* power trough */
    raw(191.0, 14.1, 191.2, 15.5, 0, 2.42, 'woodDk', S);              /* end supports */
    raw(200.2, 14.1, 200.4, 15.5, 0, 2.42, 'woodDk', S);
    /* PA-302 rectangular 4-tops, 48 x 24 x 30 in MEASURED off the spec book,
       black metal base; ID-1.7 draws all four with the long axis along V.
       Positions SCALED. */
    [[198.0, 29.3], [210.4, 23.45], [192.8, 1.9], [210.4, 10.8]].forEach(function(p){
      rectTable(p[0], p[1], 2.0, 4.0, 2.5, M);
    });
    /* PA-106 dining chairs, 23.2 W x 24.4 D x 31.7 H MEASURED off the spec
       book (Supplier B), 24 per the tags. Positions SCALED, the drawn chair
       symbols at each table. Two at V 28.3 (U 194.4 and 196.3 as read) sat
       0.1 ft into each other and are moved 0.1 ft apart. */
    [[196.3,28.3,90],[196.3,30.3,90],[199.7,28.3,270],[199.7,30.3,270],
     [208.7,22.5,90],[208.7,24.5,90],[212.1,22.5,270],[212.1,24.5,270],
     [191.1,0.9,90],[191.1,2.9,90],[194.5,0.9,270],[194.5,2.9,270],
     [208.7,9.7,90],[208.7,11.9,90],[212.1,9.7,270],[212.1,11.9,270],
     [190.2,28.3,90],[194.3,28.3,270],[202.1,28.3,90],[206.3,28.3,270],
     [208.7,19.0,90],[212.1,19.0,270],[204.2,2.5,90],[207.5,2.5,270]
    ].forEach(function(c){ chair(c[0], c[1], 1.93, 2.03, 1.5, 2.64, c[2], M); });
    /* PA-300 square 2-tops, 24 x 24 x 29 in MEASURED off the spec book, black
       X base; twelve per the tags. Positions SCALED. */
    [[192.2,28.3],[204.1,28.3],[192.6,24.5],[198.0,24.5],[203.9,24.5],[210.4,19.0],
     [192.4,6.7],[198.3,6.7],[204.4,6.6],[192.2,12.3],[196.0,12.3],[198.8,12.3]
    ].forEach(function(p){
      ctx.plate({u:p[0], v:p[1], du:2.0, dv:2.0, y:2.34, t:0.08, mat:'wood', basis:M});
      rawCyl(p[0], p[1], 0.12, 0.05, 2.34, 'metal', M);
      raw(p[0]-0.7, p[1]-0.08, p[0]+0.7, p[1]+0.08, 0, 0.05, 'metal', M);   /* X base feet */
      raw(p[0]-0.08, p[1]-0.7, p[0]+0.08, p[1]+0.7, 0, 0.05, 'metal', M);
    });
    /* PA-101 dining chairs at the 2-tops, 21.7 W x 21.7 D x 32.5 H MEASURED
       off the spec book (Supplier B), twelve per the tags. Positions SCALED. */
    [[191.2,24.5,90],[194.0,24.5,270],[196.6,24.5,90],[199.4,24.5,270],[202.5,24.5,90],[205.3,24.5,270],
     [191.0,6.7,90],[193.8,6.7,270],[196.9,6.7,90],[199.7,6.7,270],[203.0,6.7,90],[205.8,6.7,270]
    ].forEach(function(c){ chair(c[0], c[1], 1.81, 1.81, 1.5, 2.71, c[2], M); });
    /* PA-301 round 2-tops, 27 1/2 in dia x 29 H MEASURED off the spec book,
       pedestal base, four per the tag. Positions SCALED off the ID-1.7 vector
       circles: two west of the banquette, two on its east seat. */
    [[193.09,17.73],[197.11,17.73],[204.88,16.99],[205.07,12.66]].forEach(function(p){
      roundTable(p[0], p[1], 1.146, 2.42, M);
    });
    /* PA-102 dining chairs at the round tables, 19 W x 22 D x 33 H, seat 19 in,
       MEASURED off the spec book, eight per the tag. Positions SCALED. The two
       south of the west pair are read at V 15.9, which puts their backs inside
       the communal table's top; they sit at V 16.65 so the back clears it. */
    [[193.1,19.6,180],[197.1,19.6,180],[193.1,16.65,0],[197.1,16.65,0],
     [206.6,18.0,270],[206.6,16.0,270],[206.6,13.7,270],[206.6,11.6,270]
    ].forEach(function(c){ chair(c[0], c[1], 1.58, 1.83, 1.58, 2.75, c[2], M); });
    /* PA-100 central banquette, 198 W x 52 D x 44 H, seat 18 in, MEASURED off
       the spec book, double sided, running along V. Position SCALED: the
       ID-1.7 leader lands on the spine at U 204.9, V 15.3, and the drawn spine
       is narrower than 52 in. The PA-301 tops on its east side start at
       U 203.73, so the 52 in body is centered at U 203.25 (back slab U 202.8
       to 203.7) and the tables ride over its seats as the sheet draws them. */
    ctx.box({u:203.25, v:15.3, du:4.34, dv:16.5, y0:0, y1:0.4, mat:'plinth', basis:M});   /* laminate base */
    raw(201.08, 7.05, 202.8, 23.55, 0.4, 1.5, 'uphol', M);           /* west seat */
    raw(203.7, 7.05, 205.42, 23.55, 0.4, 1.5, 'uphol', M);           /* east seat */
    raw(202.8, 7.05, 203.7, 23.55, 1.5, 3.6, 'uphol', M);            /* pixel-pattern back */
    raw(202.75, 7.0, 203.75, 23.6, 3.6, 3.67, 'wood', M);            /* laminate top deck */
    /* PA-307 accessible 2-top tables, T base. SCALED: top 3.0 x 2.5 ft scaled
       off the ID-1.7 rectangles (the spec card's printed size did not come
       through); 29 in high assumed per the research record. Drawn over the
       banquette's west seat as the sheet has them, with the T post at the free
       (west) end. */
    [[202.15, 19.15], [202.1, 12.3]].forEach(function(p){
      ctx.plate({u:p[0], v:p[1], du:3.0, dv:2.5, y:2.34, t:0.08, mat:'wood', basis:S});
      raw(200.85, p[1]-0.08, 201.0, p[1]+0.08, 0.05, 2.34, 'metal', S);
      raw(200.75, p[1]-0.8, 201.05, p[1]+0.8, 0, 0.05, 'metal', S);
    });

    /* ------------------------------------------------------------------
       LOBBY 003, south end (fitness room wall and the corridor to the elevators)
       ------------------------------------------------------------------ */
    /* PA-505 guest engagement wall artwork. SCALED: the dashed 87 x 105 in
       rectangle on ID-1.7 (V 12.3 to 21.1) with its leader on the lobby face
       of the fitness room wall at U 221.2; the spec card gives no size. Drawn
       6 in above the floor to the plan cut, the mounting height being on no
       sheet read. Flush on the wall face (Fitness 023 north wall, U 221.37). */
    ctx.box({u:221.29, v:16.7, du:0.16, dv:8.75, y0:0.5, y1:7.25, mat:'art', basis:S});
    /* PA-311 food delivery pick-up console, 48 W x 20 D x 42 H MEASURED off
       the spec book, quartz top. Position SCALED: ID-1.7 draws it against the
       fitness room's east wall in the corridor by the guest laundry, U 222.0
       to 223.7, V 28.9 to 32.9; moved 0.8 ft east so its back sits on the
       measured wall face at V 29.60 instead of inside the wall. */
    ctx.box({u:222.85, v:31.7, du:1.67, dv:4.0, y0:0, y1:3.42, mat:'woodDk', basis:M});
    raw(221.98, 29.65, 223.72, 33.75, 3.42, 3.5, 'counter', M);

    return ctx.tally();
  }
};
