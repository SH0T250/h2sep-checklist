/* Fitness Room 023 (the Spin2Cycle fitness room in the south-west corner).

   LAYOUT SOURCE: ID-1.7 Enlarged Lobby Furniture and Equipment Plan (RK
   Hospitality, 07/04/2025, 3/16 in = 1 ft), read from the split sheet
   "FF&E Locations_sheet8.pdf". The sheet was fitted to the A100 frame from
   its own wall vectors: the fitness face of the lobby wall (U 221.79) and the
   inside of the south exterior wall (U 246.39) are 332.2 pt apart on the
   sheet, which is 13.50 pt/ft for the room's 24.60 ft, and the fitness face
   of the guest laundry wall gives V 29.18. Every footprint below is the
   bounding box of the equipment symbol's vectors in that frame, so each one
   is SCALED, good to about half a foot. No equipment cutsheet exists in the
   project Drive (searched for treadmill, elliptical, recumbent), so no
   cardio or strength piece has a MEASURED size.

   NAMES: A510.3 Enlarged Lobby Furniture and Equipment Plan (architect, bid
   set 04/20/2023, revised 08/09/24) carries the furnishing list that names the
   pieces: 801 water and cup dispenser, 803 treadmill, 804 elliptical, 805
   recumbent cycle, 806 free weights and rack, 807 weight bench, 808 strength
   system, 809 medicine balls and rack, 810 exercise ball, 811 exercise mat,
   813 wall mounted television, 817 wall mounted mirror (keyed note 2: the GC
   provides the plate mirror). A510.3's 2023 layout differs from ID-1.7's
   2025 layout; ID-1.7 governs the loose equipment, A510.3 supplies the
   mirror and the television, which ID-1.7 does not draw in plan.

   HEIGHTS: no sheet prints an equipment height. The heights here are
   stylized massing and are called SCALED with the piece. Everything is
   capped at ctx.MASSCAP by the helpers.

   Room extents are A100 (research/floor1-3d/a100-layout.json). The room's
   north-west corner is notched: the lobby corridor pocket at U 221.8 to
   230.6, V 25.7 to 29.2 is outside the room, and nothing is placed there.
   Source record: research/floor1-3d/commons/fitness.json. */
KITS['fitness'] = {
  spaces: ['023'],
  basis:  'MIXED',
  source: 'ID-1.7 fitness layout (07/04/2025), A510.3 furnishing list, PA-310 spec; room extents A100',
  build:  function(ctx){
    var i, u, v;

    /* ---- CARDIO ROW along the south window wall ------------------------
       Four treadmills (803) in a row, each facing the windows (+U). Symbol
       bounding box on ID-1.7: U 237.74 to 245.92 (8.2 ft, motor hood at the
       window end), 2.93 ft wide, at V 16.84-19.77, 12.75-15.69, 8.67-11.60
       and 4.58-7.52 (a 4.08 ft pitch). All SCALED off ID-1.7. Deck, hood
       and the two handrails are stylized. */
    var TREAD_V = [18.30, 14.22, 10.13, 6.05];
    for (i = 0; i < TREAD_V.length; i++){
      v = TREAD_V[i];
      /* running deck, SCALED */
      ctx.box({u:241.1, v:v, du:6.6, dv:2.6, y0:0.15, y1:0.72, mat:'applDk', basis:'SCALED'});
      /* motor hood and console at the window end, SCALED */
      ctx.box({u:245.15, v:v, du:1.5, dv:2.9, y0:0, y1:3.4, mat:'appl', basis:'SCALED'});
      /* handrails, SCALED */
      ctx.box({u:242.9, v:v - 1.28, du:3.4, dv:0.12, y0:2.7, y1:2.9, mat:'metal', basis:'SCALED'});
      ctx.box({u:242.9, v:v + 1.28, du:3.4, dv:0.12, y0:2.7, y1:2.9, mat:'metal', basis:'SCALED'});
    }

    /* Two ellipticals (804) below the treadmills, same orientation. ID-1.7
       symbol boxes: U 238.04 to 245.68 (7.6 ft), V -1.38 to 1.01 and
       V -5.44 to -2.57. SCALED. Rail, drive housing and two arm posts. */
    var ELL = [{v:-0.19, w:2.39}, {v:-4.0, w:2.4}];
    for (i = 0; i < ELL.length; i++){
      v = ELL[i].v;
      ctx.box({u:241.85, v:v, du:7.6, dv:ELL[i].w - 0.2, y0:0, y1:0.5, mat:'applDk', basis:'SCALED'});
      ctx.box({u:244.7, v:v, du:1.8, dv:ELL[i].w, y0:0.5, y1:2.6, mat:'appl', basis:'SCALED'});
      ctx.cyl({u:243.0, v:v - 0.9, r:0.12, y0:0.5, y1:3.8, mat:'metal', basis:'SCALED'});
      ctx.cyl({u:243.0, v:v + 0.9, r:0.12, y0:0.5, y1:3.8, mat:'metal', basis:'SCALED'});
    }

    /* Recumbent cycle (805) at the north-east end of the row, beside the
       accessible clear floor space ID-1.7 draws dashed above it. Symbol box
       U 240.25 to 246.20, V 22.08 to 25.57 (the width takes in the
       handlebars). SCALED. Rail, seat, seat back, pedal and console housing. */
    ctx.box({u:243.1, v:23.8, du:5.4, dv:0.8, y0:0, y1:0.5, mat:'applDk', basis:'SCALED'});
    ctx.box({u:241.3, v:23.8, du:1.4, dv:1.6, y0:0.5, y1:1.7, mat:'uphol', basis:'SCALED'});
    ctx.box({u:240.6, v:23.8, du:0.4, dv:1.6, y0:1.7, y1:3.0, mat:'uphol', basis:'SCALED'});
    ctx.box({u:245.1, v:23.8, du:1.6, dv:1.6, y0:0.5, y1:3.3, mat:'appl', basis:'SCALED'});

    /* ---- FREE WEIGHTS on the lobby wall ----------------------------------
       Dumbbell rack (806): three-tier rack against the lobby wall, symbol box
       U 222.08 to 224.60 (2.5 ft deep), V 5.60 to 12.70 (7.1 ft). SCALED.
       Base frame plus three stepped rows of dumbbells rising toward the wall. */
    ctx.box({u:223.35, v:9.15, du:2.5, dv:7.1, y0:0, y1:0.3, mat:'metal', basis:'SCALED'});
    ctx.box({u:224.15, v:9.15, du:0.85, dv:6.9, y0:0.3, y1:1.1, mat:'applDk', basis:'SCALED'});
    ctx.box({u:223.35, v:9.15, du:0.85, dv:6.9, y0:1.1, y1:1.9, mat:'applDk', basis:'SCALED'});
    ctx.box({u:222.55, v:9.15, du:0.85, dv:6.9, y0:1.9, y1:2.7, mat:'applDk', basis:'SCALED'});

    /* Wall mounted mirror (817) on the fitness face of the lobby wall behind
       the rack. A510.3 draws it as two panels 3.75 ft long with a 4 in gap,
       V 4.86 to 8.61 and V 8.94 to 12.69, and keyed note 2 has the GC
       provide the plate mirror. The run is SCALED off A510.3's vectors; the
       sill height is not on any plan sheet (ID-3.2 views 4 to 7 hold the
       elevation) and is stylized at 0.9 ft. */
    ctx.box({u:221.85, v:6.735, du:0.1, dv:3.75, y0:0.9, y1:3.86, mat:'counter', basis:'SCALED'});
    ctx.box({u:221.85, v:10.815, du:0.1, dv:3.75, y0:0.9, y1:3.86, mat:'counter', basis:'SCALED'});

    /* Weight bench (807): flat bench with an upright rack at its foot,
       symbol box U 226.71 to 230.78, V 7.85 to 10.40. SCALED. Pad, leg
       frame, two uprights and their base bar. */
    ctx.box({u:228.35, v:9.55, du:3.1, dv:1.1, y0:1.3, y1:1.55, mat:'uphol', basis:'SCALED'});
    ctx.box({u:228.35, v:9.55, du:2.4, dv:0.3, y0:0, y1:1.3, mat:'metal', basis:'SCALED'});
    ctx.box({u:230.4, v:9.15, du:0.8, dv:2.5, y0:0, y1:0.15, mat:'metal', basis:'SCALED'});
    ctx.cyl({u:230.4, v:8.05, r:0.1, y0:0, y1:3.5, mat:'metal', basis:'SCALED'});
    ctx.cyl({u:230.4, v:10.25, r:0.1, y0:0, y1:3.5, mat:'metal', basis:'SCALED'});

    /* Strength piece in the south-west corner: ID-1.7 draws one strength
       machine turned 45 degrees inside the box U 222.58 to 227.52, V -5.81 to
       -0.89 (a 5.0 by 2.0 ft frame on the diagonal). It carries no tag on
       ID-1.7; A510.3's list has 808 strength system, so it is drawn as that
       and named honestly in the record. Position and size SCALED, turned
       with its long axis running toward +U and -V as drawn. */
    ctx.box({u:225.05, v:-3.35, du:5.0, dv:2.0, rot:-45, y0:0, y1:1.4, mat:'metal', basis:'SCALED'});
    ctx.box({u:225.05, v:-3.35, du:2.2, dv:1.0, rot:-45, y0:1.4, y1:1.7, mat:'uphol', basis:'SCALED'});

    /* Medicine ball rack (809) against the west exterior wall, symbol box
       U 231.90 to 236.46, V -6.32 to -2.90, four balls on a two-post frame.
       SCALED. Base, two posts, top bar, four balls. */
    ctx.box({u:234.18, v:-4.6, du:4.6, dv:3.4, y0:0, y1:0.15, mat:'metal', basis:'SCALED'});
    ctx.cyl({u:232.15, v:-4.6, r:0.12, y0:0.15, y1:3.5, mat:'metal', basis:'SCALED'});
    ctx.cyl({u:236.2, v:-4.6, r:0.12, y0:0.15, y1:3.5, mat:'metal', basis:'SCALED'});
    ctx.box({u:234.18, v:-4.6, du:4.3, dv:0.15, y0:3.3, y1:3.45, mat:'metal', basis:'SCALED'});
    for (i = 0; i < 4; i++)
      ctx.cyl({u:232.5 + i * 1.15, v:-5.3, r:0.5, y0:0.3, y1:1.3, mat:'uphol', basis:'SCALED'});

    /* Untagged 2.3 ft square floor item at U 232.84 to 235.18, V -1.60 to
       0.75 on ID-1.7, beside the ball rack (its plan symbol is a rounded
       square with a circle at each corner). Not named on either sheet;
       drawn as the low block the symbol is. SCALED. */
    ctx.box({u:234.0, v:-0.42, du:2.3, dv:2.3, y0:0, y1:0.6, mat:'plinth', basis:'SCALED'});

    /* ---- TOWEL AND WATER by the entry door on the lobby wall -------------
       PA-310 Towel Station at Fitness (Home2 Dynamic public-area spec, page
       70): 72 in W x 18 in D x 64 in H, plastic laminate PL-01, a shelf
       tower beside a lower counter with two 10 in grommets for the laundry
       basket. Overall size MEASURED off the spec; the split between tower
       and counter and the counter height are read off the spec's sketch and
       are stylized. Position SCALED off ID-1.7 (symbol V 19.92 to 25.60 on
       the lobby wall, tag PA-310 leader to it). Sits 18 in off the wall face
       U 221.79, ending 0.1 ft short of the corridor pocket wall at V 25.7. */
    ctx.box({u:222.54, v:20.8, du:1.5, dv:2.4, y0:0, y1:3.86, mat:'wood', basis:'MEASURED'});
    ctx.box({u:222.54, v:23.8, du:1.5, dv:3.6, y0:0, y1:2.75, mat:'wood', basis:'MEASURED'});
    ctx.plate({u:222.54, v:23.8, du:1.5, dv:3.6, y:2.75, t:0.08, mat:'counter', basis:'SCALED'});

    /* Water and cup dispenser (801): the 1.4 ft square floor unit on the
       lobby wall just south of the towel station, U 222.0 to 223.4, V 18.0
       to 19.4 on ID-1.7 (A510.3 tags the same symbol 801). SCALED. */
    ctx.box({u:222.7, v:18.7, du:1.4, dv:1.4, y0:0, y1:3.5, mat:'appl', basis:'SCALED'});

    /* ---- TELEVISION on the guest laundry wall -----------------------------
       Wall mounted television (813): both sheets draw a 3.16 ft wide, 3 in
       deep rectangle on the fitness face of the guest laundry wall, U 235.92
       to 239.08 (A510.3 tag 813 leads to it). Run SCALED off the vectors.
       Its mounting height is above the 4 ft plan cut, so it is shown as a
       dark plate against the wall at the cap. */
    ctx.box({u:237.5, v:29.05, du:3.16, dv:0.25, y0:3.2, y1:3.86, mat:'applDk', basis:'SCALED'});

    return ctx.tally();
  }
};
