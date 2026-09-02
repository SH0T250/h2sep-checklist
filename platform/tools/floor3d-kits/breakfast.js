/* ===========================================================================
   BREAKFAST KIT: Servery 009 + Breakfast 006 (one open room on A100) and
   Food Prep 007.

   Sources (full record in research/floor1-3d/commons/breakfast.json):
   - A100 room extents (MEASURED): 009/006 is U 166.07-186.57, V 35.96-51.78;
     007 is U 153.50-165.50, V 35.96-51.78.
   - A514 Enlarged Breakfast and Servery, 1/2 in = 1 ft: every plan POSITION in
     009/006 is SCALED off the sheet (pixel position mapped onto the A100 walls).
   - A513 Enlarged Food Prep and Dry Storage, 1/2 in = 1 ft: every plan
     POSITION in 007 is SCALED the same way.
   - PA-802.1 (RK large servery shop drawing) and PA-802.2 (small servery /
     breakfast bar): millwork sizes MEASURED.
   - Submittals: dishmachine H50-ST 24.61 x 25 x 32.48 in; convection oven
     Moffat E27M3 on SK2731U stand 31 1/8 x 30 x 23 7/8 in.

   Basis rule used here: a piece is SCALED if ANY of its numbers is scaled, so
   every piece below is SCALED (the positions all are) even where the size is
   measured; each comment says which is which.

   Heights that no reached source gives (the Clevenger cut-sheet package is
   over the download limit and the custom stainless has no shop drawing) are
   NOT guessed: a floor-standing fixture with no height is drawn at the scene's
   own generic Appliance block height (CAT 'Appliance' h = 3.0 ft, the same
   block the generic massing draws), and a counter-top item with no height is
   drawn as its footprint plus a block up to the plan cut (ctx.MASSCAP), the
   way the scene caps every tall piece. Both are drawing conventions, not
   dimensions, and the comments say so piece by piece.

   Not drawn, on purpose: there are no dining tables or chairs inside 006 on
   ID-1.7 or A514 (guest seating is in Lobby 003, the lobby kit); the large
   servery's upper cabinet run (64 to 98 in AFF) and the high-mount wall
   shelves 06, 07, 12, 15, 17 sit above the 4'-0" plan cut; the M5 bussing
   counter (A901.1) is not located on any plan; A514 tag 34 has no schedule
   row.
   =========================================================================== */
KITS['breakfast'] = {
  spaces: ['009', '007'],
  basis:  'SCALED',
  source: 'A514 and A513 equipment plans (positions scaled), PA-802.1 and PA-802.2 shop drawings and the dishmachine and oven submittals (sizes measured), room extents A100',
  build:  function(ctx){
    var CAP = ctx.MASSCAP;
    /* The generic Appliance block height the scene already uses (CAT table in
       floor3d.src.html). Used ONLY for fixtures whose real height is in no
       reached source; see the header. */
    var APPL_H = 3.0;
    /* Pieces stop a hair short of the A100 wall lines so nothing shares a face
       with a wall box. */
    var GAP = 0.06;

    if (ctx.sp.no === '009'){
      /* ---------------- Servery 009 + Breakfast 006 ---------------- */

      /* LARGE SERVERY COUNTER, PA-802 (PA-802.1). Base 36 in deep x 36 in high
         (MEASURED, PA-802.1 section: 914 mm base, 914 mm deep). Runs wall to
         wall along U: PA-802.1 gives 246 1/4 in and the RK note says it is
         sandwiched between the two room walls, so U 166.07-186.57 (A100,
         MEASURED). The V band 45.05-48.20 is SCALED off A514, center V 46.62.
         Light wood-grain laminate base (Wilsonart 7970K-18), 2 in white quartz
         top (Daltile One Quartz, PA-802.1). */
      ctx.box({u:176.32, v:46.62, du:20.50 - 2*GAP, dv:3.00, y0:0, y1:3.00, mat:'wood', basis:'SCALED'});
      ctx.plate({u:176.32, v:46.62, du:20.50 - 2*GAP, dv:3.04, y:3.00, t:0.17, mat:'counter', basis:'SCALED'});
      /* The 18 in deep upper cabinet run sits 64 to 98 in AFF (PA-802.1
         section), above the 4'-0" plan cut, so it is not drawn. */

      /* Counter-top line on the large servery, low U to high U, A514 tags.
         Footprints SCALED off the A514 symbols; heights are in no reached
         source, so each is its footprint plus a block from the counter top
         (3.17 ft) up to the plan cut, per the header. */
      var TOP = 3.17;
      /* 23 Batter mix starter kit, round symbol, about 0.7 ft across, U 167.99. */
      ctx.cyl({u:167.99, v:46.62, r:0.35, y0:TOP, y1:CAP, mat:'metal', basis:'SCALED'});
      /* 24 Waffle maker Wells BWB-1SE, 0.8 x 1.2 ft, U 169.09. */
      ctx.box({u:169.09, v:46.62, du:0.80, dv:1.20, y0:TOP, y1:CAP, mat:'appl', basis:'SCALED'});
      /* 25 Waffle maker Wells BWB-1SE (future), 0.8 x 1.2 ft, U 170.29. */
      ctx.box({u:170.29, v:46.62, du:0.80, dv:1.20, y0:TOP, y1:CAP, mat:'appl', basis:'SCALED'});
      /* 29 Warming kettle Vollrath 72017, round symbol 1.05 ft across, U 172.91. */
      ctx.cyl({u:172.91, v:46.62, r:0.52, y0:TOP, y1:CAP, mat:'metal', basis:'SCALED'});
      /* 27 Display showcase Equipex WD780B-2/1, 2.6 x 1.75 ft, U 176.71, V 46.71.
         Glass case, drawn in the glass finish. */
      ctx.box({u:176.71, v:46.71, du:2.60, dv:1.75, y0:TOP, y1:CAP, mat:'glass', basis:'SCALED'});
      /* 26 Conveyor toaster APW Wyott ECO 4000, 1.3 x 2.1 ft, U 180.85. */
      ctx.box({u:180.85, v:46.62, du:1.30, dv:2.10, y0:TOP, y1:CAP, mat:'appl', basis:'SCALED'});
      /* 28 Juice dispenser Bunn JDF-4, 1.3 x 2.3 ft, U 184.51. */
      ctx.box({u:184.51, v:46.62, du:1.30, dv:2.30, y0:TOP, y1:CAP, mat:'applDk', basis:'SCALED'});

      /* BREAKFAST BAR (small servery), PA-802 (PA-802.2). 96 in wide x 31 in
         deep, 34 in counter (MEASURED, PA-802.2 title block and FF&E spec page
         143). Against the west wall V 35.96 (A100, MEASURED); its U run
         172.3-180.3, centered between the two doors on that wall, is SCALED
         off A514. Same laminate and quartz as the large counter. */
      var BAR_V0 = 35.96 + GAP, BAR_D = 2.58, BAR_H = 2.83, BAR_U = 176.31;
      ctx.box({u:BAR_U, v:BAR_V0 + BAR_D/2, du:8.00, dv:BAR_D, y0:0, y1:BAR_H, mat:'wood', basis:'SCALED'});
      ctx.plate({u:BAR_U, v:BAR_V0 + BAR_D/2 + 0.02, du:8.00, dv:BAR_D + 0.04, y:BAR_H, t:0.17, mat:'counter', basis:'SCALED'});
      /* Yogurt machine hutch at the low-U end of the bar: 708 x 660 mm
         (27 7/8 x 26 in, MEASURED, PA-802.2 sections), 62 3/4 in to its top,
         capped at the plan cut. Low-U end is SCALED from A514, which tags the
         refrigerator bay there under it. */
      ctx.box({u:172.31 + 1.16, v:BAR_V0 + 1.08, du:2.32, dv:2.17, y0:BAR_H + 0.17, y1:CAP, mat:'wood', basis:'SCALED'});
      /* 31 Undercounter display refrigerator True TUC-27G-ADA-HC in the low-U
         end bay: opening 26 3/8 W x 29 1/8 D x 31 in H (MEASURED, PA-802.2);
         bay position SCALED off A514 (tag 31). Drawn a hair proud of the bar
         face so its glass door reads. */
      ctx.box({u:173.42, v:BAR_V0 + BAR_D/2 + 0.03, du:2.20, dv:BAR_D + 0.06, y0:0.05, y1:2.58, mat:'appl', basis:'SCALED'});
      /* 39 Yogurt machine / food warmer in the 12 in round cutout 49 in from
         the high-U end (MEASURED cutout, PA-802.2 plan G-G; which end is SCALED
         off A514). No height in any reached source: footprint plus a block to
         the plan cut. */
      ctx.cyl({u:176.21, v:BAR_V0 + BAR_D/2, r:0.50, y0:BAR_H + 0.17, y1:CAP, mat:'metal', basis:'SCALED'});
      /* 30 Cereal dispenser Server Products 88920 (triple), three-tube symbol
         1.4 x 0.8 ft SCALED off A514 at U 178.28. No height reached: footprint
         plus a block to the plan cut. */
      ctx.box({u:178.28, v:BAR_V0 + BAR_D/2, du:1.40, dv:0.80, y0:BAR_H + 0.17, y1:CAP, mat:'glass', basis:'SCALED'});
    }

    if (ctx.sp.no === '007'){
      /* ---------------- Food Prep 007 (A513 tags) ---------------- */

      /* 05 Undercounter dishmachine, high temp. Submittal H50-ST 24.61 W x
         25 D x 32.48 in H (MEASURED, Dishmachine.pdf page 10; A513 schedules
         Champion UH-100B). North-west corner, SCALED off A513: U 153.5-155.6,
         V 36.0-38.1. Dishtable rack shelf 06 hangs above it, above the cut. */
      ctx.box({u:153.50 + GAP + 1.03, v:35.96 + GAP + 1.04, du:2.05, dv:2.08, y0:0, y1:2.71, mat:'appl', basis:'SCALED'});
      /* 08 Dish / pot washing sinks, custom fabricated, with pre-rinse faucet
         09. Along the north wall U 153.5-155.6, V 38.1-45.4, 2.14 x 7.3 ft
         SCALED off A513. No height in any reached source: drawn at the
         generic Appliance block height. Stainless, so the metal finish. */
      ctx.box({u:153.50 + GAP + 1.07, v:41.83, du:2.14, dv:7.30, y0:0, y1:APPL_H, mat:'metal', basis:'SCALED'});
      /* Two sink bowls in that run, the 2 x 2 dashed squares on A513 at about
         V 39.3 and 43.2 (SCALED). Drawn as dark wells in the top. */
      ctx.box({u:153.50 + GAP + 1.07, v:39.60, du:1.60, dv:1.70, y0:APPL_H, y1:APPL_H + 0.06, mat:'applDk', basis:'SCALED'});
      ctx.box({u:153.50 + GAP + 1.07, v:43.60, du:1.60, dv:1.70, y0:APPL_H, y1:APPL_H + 0.06, mat:'applDk', basis:'SCALED'});
      /* Utensil rack 12 and the three high-mount wall shelves 07 hang on the
         wall above sink 08, above the plan cut: not drawn. */

      /* 13 Worktable with sink, custom fabricated. Along the east wall,
         U 153.5-159.8, V 49.6-51.7, 6.23 x 2.1 ft SCALED off A513. No height
         reached: generic Appliance block height, stainless. */
      ctx.box({u:156.66, v:51.78 - GAP - 1.05, du:6.23, dv:2.10, y0:0, y1:APPL_H, mat:'metal', basis:'SCALED'});
      /* 14 Coffee maker Fetco CBS-2152XTS (operator furnished), 1.82 x 1.53 ft
         SCALED off A513 on worktable 13 at U 156.9. No height reached:
         footprint plus a block to the plan cut. */
      ctx.box({u:156.90, v:50.53, du:1.82, dv:1.53, y0:APPL_H, y1:CAP, mat:'applDk', basis:'SCALED'});
      /* 22 Microwave Amana HDC12A2 on its shelf, 1.82 x 1.67 ft SCALED off
         A513 at the high-U end of the worktable. No height reached: footprint
         plus a block to the plan cut. */
      ctx.box({u:158.72, v:50.74, du:1.82, dv:1.67, y0:APPL_H, y1:CAP, mat:'appl', basis:'SCALED'});
      /* Wall shelves 15 and 17 above worktable 13 are above the cut: not drawn. */

      /* 03 Hand sink Advance Tabco 7-PS-87 with soap and towel dispenser, on
         the east wall at U 160.56, 1.35 x 1.2 ft SCALED off A513. No height
         reached: generic Appliance block height. */
      ctx.box({u:160.56, v:51.78 - GAP - 0.60, du:1.35, dv:1.20, y0:0, y1:APPL_H, mat:'metal', basis:'SCALED'});
      ctx.box({u:160.56, v:51.78 - GAP - 0.60, du:1.00, dv:0.85, y0:APPL_H, y1:APPL_H + 0.06, mat:'applDk', basis:'SCALED'});

      /* 04 Mobile work table, custom fabricated, the dashed island in the room
         center: 2.03 x 4.88 ft with the long axis along V, SCALED off A513
         (about 24 x 60 in). No height reached: generic Appliance block
         height. Stainless top over an open base. */
      ctx.box({u:159.38, v:43.59, du:1.80, dv:4.60, y0:0, y1:APPL_H - 0.10, mat:'applDk', basis:'SCALED'});
      ctx.plate({u:159.38, v:43.59, du:2.03, dv:4.88, y:APPL_H - 0.10, t:0.10, mat:'metal', basis:'SCALED'});

      /* 18 Worktop refrigerator True TWT-67-HC, marked (R): against the west
         wall U 159.8-165.4, V 36.0-38.8, 5.66 x 2.79 ft SCALED off A513. No
         height reached: generic Appliance block height. */
      ctx.box({u:162.60, v:35.96 + GAP + 1.40, du:5.66, dv:2.79, y0:0, y1:APPL_H, mat:'appl', basis:'SCALED'});
      /* 16 Convection oven, ventless. Submittal Moffat E27M3 on SK2731U stand,
         31 1/8 W x 30 D x 23 7/8 in H (MEASURED, Convection Oven.pdf page 2;
         A513 schedules E33D5H2). On top of refrigerator 18 at U 161.89,
         SCALED off A513; capped at the plan cut. */
      ctx.box({u:161.89, v:37.62, du:2.59, dv:2.50, y0:APPL_H, y1:CAP, mat:'applDk', basis:'SCALED'});
      /* 20 Convection oven, ventless, marked OPTIONAL on A513: same unit
         beside 16 at U 164.13, SCALED. Drawn in the lighter ghost finish so
         the option reads as an option. */
      ctx.box({u:164.13, v:37.62, du:2.59, dv:2.50, y0:APPL_H, y1:CAP, mat:'ghost', basis:'SCALED'});

      /* 19 Storage shelving Metro Metromax Q, the one unit drawn inside 007
         (A513 shows qty 4 in the walk-in schedule, the rest are in Dry Storage
         008): against the south wall next to the servery door, 1.82 x 3.07 ft
         SCALED off A513. No height reached: generic Appliance block height,
         wire shelving so the metal finish. */
      ctx.box({u:165.50 - GAP - 0.91, v:46.78, du:1.82, dv:3.07, y0:0, y1:APPL_H, mat:'metal', basis:'SCALED'});

      /* 10 Eye wash station Haws 7360BT-7460BT on the south wall between the
         two doors, round symbol 0.9 ft across at U 164.8, V 44.43, SCALED off
         A513. Mount height in no reached source: drawn from the floor to the
         generic Appliance block height as a wall-hung post. */
      ctx.cyl({u:165.50 - GAP - 0.45, v:44.43, r:0.45, y0:0, y1:APPL_H, mat:'metal', basis:'SCALED'});
      /* Speed rack 21 and the walk-in items 02, 11, 32, 33 are outside 007. */
    }
    return ctx.tally();
  }
};
