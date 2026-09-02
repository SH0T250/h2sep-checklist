export const meta = {
  name: 'h2sep-floor1-3d-v4-rebuild',
  description: 'Rebuild the floor-1 3D scene after the restart, King rooms already verified (D41), every round-1 defect fixed at the source, pushed as it goes',
  phases: [
    { title: 'FloorScene', detail: 'assembled floor-1 scene, status paint, red-pin issue markers, honest datums' },
    { title: 'Commons', detail: 'furnish the 30 common areas; package the artifact correctly' },
    { title: 'Verify', detail: 'fresh dimension verifier and three fresh design critics' },
  ],
}

const BRANCH = 'claude/home2suites-construction-os-zzae5p'

const RULES = `
PROJECT: H2SEP Field Tracking Platform, Home2 Suites by Hilton, Eagle Pass TX, Triun job 24030.
Repo: /home/user/h2sep-checklist. Platform: /home/user/h2sep-checklist/platform.
AUSTIN'S ASK, verbatim: "complete all the 3D models, and ... add all the 3D models together to
complete one floor ... make this shit look epic." Then: "finish." Then, 2026-09-02: "ok start
the floor 1 3d scene rebuild."
STATE ON 2026-09-02 (ruling D41): every floor-1 key already renders in platform/room3d.html.
The King family (104-118) was cold-verified constant by constant against geometry-spec.json;
lessons V1 and V5 below are FIXED in room3d.html; research/floor1-3d/king-viewer-notes.json
records exactly what the room viewer draws so the floor scene can mirror it. platform/room3d.html
is READ-ONLY in this run: nobody edits it. platform/js/app.js MODEL_ROOMS lists all 16 floor-1
keys and platform/js/modules/bim/module.js already lists floor-1 rooms only in the 3D hub (floors
2 to 4 are live on the checklists with no models; do not add them to the scene). Floors 2 to 4
data files exist (floor2/3/4-staged.json) and are NOT inputs to this scene.
CONTEXT: a container restart destroyed the previous completed floor scene before it was committed.
Anything you write that is not pushed can vanish at any moment. So:
COMMIT AND PUSH DISCIPLINE (mandatory for build agents, forbidden for judges):
- At every working milestone and at the end: git add ONLY the exact files you own (named in your
  job), git commit, then git push -u origin ${BRANCH}. Never push any other branch, never main or
  gh-pages, never deploy, never write Firestore. If the push is rejected as non-fast-forward, run
  git pull --rebase origin ${BRANCH} and push again; never force-push. Other agents share this
  checkout: if git reports index.lock, wait a few seconds and retry; never delete the lock of a
  running command; never git add -A, never git stash, never git checkout or reset another file.
- Commit messages: plain English, American spelling, no em dashes, no model names. End every
  message with exactly these two lines:
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01RrYXu4qJy2zgz8SRfwaLHh
HARD RULES:
- NEVER touch /home/user/h2sep-checklist/room-3d.html or anything outside platform/, tests/,
  research/. room-3d.html is the LIVE CREW APP viewer and stays byte-identical.
- platform/room3d.html is a tracked platform file (force-added past the gitignore): git add works.
- NEVER guess a dimension. Every wall, door, window, fixture position cites a sheet. Ruling D7:
  every room renders its own CORRECT geometry or an honest hard-stop, never a relabeled shell.
  Anything not printed on a sheet is labelled SCALED or STYLIZED in code and in the hover card.
- No em dashes anywhere in files, labels, comments, or messages. Use a plain hyphen or a period.
- three.js r128 is inlined in platform/room3d.html; copy that library line, no network.
- Screenshots: playwright-core at
  /tmp/claude-0/-home-user-h2sep-checklist/18be7c92-db26-548f-a957-ab5e606c8fa1/scratchpad/node_modules/playwright-core
  (fallback: /opt/node22/lib/node_modules/playwright) with browser
  /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell. Serve with
  python3 -m http.server <port> --directory platform. Save shots under
  /tmp/claude-0/-home-user-h2sep-checklist/18be7c92-db26-548f-a957-ab5e606c8fa1/scratchpad/shots/
  (mkdir -p). LOOK at every screenshot with Read before claiming anything about it.
INPUTS (all committed, all proven, cite them):
- research/king-studio/geometry-spec.json: King Studio / King Studio Connecting / King Studio Acc.
  Mod. clear dims, ceilings, bath rectangle, entry leg, window, door centrelines, working-wall
  order, per-field citations, and conflicts C1/C2. All eight King rooms 104-118 are PROVEN
  (118 off A552, measured from the sheet vectors).
- research/floor1-3d/a100-layout.json: the A100 first-floor plan measured at a proven 6.75 pt/ft:
  guest-wing room order, module widths, connecting pairs (101/103 and 116/118), every common-area
  boundary in the sheet's U/V feet coordinates, the envelope, and an honest gap list.
- research/floor1-3d/king-spec-recon.json: the recon notes behind the spec.
- platform/data/floor1-staged.json: the live checklist state (81 docs) for status paint.
- platform/room3d.html: the QQ family (A555) and the King family (A550 / A552) both render
  correct geometry; read it for the builders and constants, never edit it in this run.
- research/floor1-3d/king-viewer-notes.json: the exact King treatment the floor scene mirrors
  (circle centers, radius, opacities, label texts; GR-3 datums; no wwShift anywhere).
DRIVE tools if a sheet must be re-read: ToolSearch select:mcp__Google_Drive__search_files,mcp__Google_Drive__read_file_content,mcp__Google_Drive__get_file_metadata
`

// Exact findings from the lost round. They are baked into the build prompts so the rebuild
// starts from the fixes instead of rediscovering them.
const LESSONS = `
LESSONS FROM THE LOST ROUND (an independent verifier failed the previous build on these; build
them in correctly from the start, do not reintroduce them):
V1 (FIXED in room3d.html on 2026-09-02; the floor scene must not reintroduce it). A constant
    "wwShift: 51*KIN" (exactly 4'-3") was encoded for the King Studio Connecting
    working-wall shift, but geometry-spec.json marks that shift UNPROVEN and says verbatim
    "Do not encode 4'-3" as a hard number." The constant was also dead code with a comment that
    claimed it was used. Rule: no unproven number becomes a constant; the connecting variant
    places the working-wall group against the proven GR-3 opening; comments describe what the
    code actually does.
V2. The room-118 proof narrative in the floor scene said the main-room leg is 18'-11" and equated
    an A100 partition "at V=18.85 from the west face" with an absolute coordinate V=18.89. Both
    wrong: spec conflict C2 says 18'-11" is ONE SEGMENT of the 30'-1 1/2" grid chain, not an
    overall; and the west inside face is at V=0.55, so a partition at absolute V=18.89 is 18.34 ft
    from it. The rendered geometry was right (bath partition at 128.5", main-room clear 219.5" =
    18'-3 1/2", matching A552's PRINTED main_room_clear_depth). Rule: proof text states the
    printed value it matches, names the datum (absolute sheet coordinate vs distance from a face),
    and never resurrects a debunked number.
V3. The 116/118 connecting opening was cut in three non-coincident places (116's wall from A550
    gr3CL 132", 118's wall from A552 gr3CL 132.82", the demising wall from A100's measured hole
    V 17.15-20.49), leaving slivers of wall in the hole. The QQ pair 101/103 already handles this
    correctly: room side walls solid, ONE datum (A100's measured hole) cuts the demising wall, and
    the A555-vs-A100 divergence is written up in the CONN_OPENINGS comment. Rule: the King pair
    uses the same single-datum mechanism as the QQ pair and documents the A550/A552/A100 spread.
V4. The packaged single-file artifact (platform/tools/build-artifact.mjs) never inlined
    floor3d.html; renderFloor in platform/js/modules/bim/module.js fell through to a relative URL
    that does not exist inside the bundle, so the Floor 1 screen was a silent blank iframe. Rule:
    the bundle inlines floor3d.html (window.__H2SEP_FLOOR_SRCDOC) AND the status data it fetches,
    or the screen shows an honest hard-stop; never a silent blank.
V5 (FIXED in room3d.html on 2026-09-02; mirror it). The second accessible clear-floor circle in
    118's main room was drawn at a 60" diameter at a proportional position and unlabelled, and not
    drawn at all in the floor scene. The spec gives it NO diameter and NO position. The room viewer
    now draws it at opacity 0.25 (the proven bath circle is 0.55) at x = W*0.62, z = bedCL - 6.2 ft,
    labelled "CLEAR FLOOR SPACE · STYLIZED · A552 PRINTS NO SIZE OR POSITION" beside the proven
    "60″ TURNING CIRCLE". Rule: the floor scene draws exactly that (king-viewer-notes.json), and
    anything without a printed size or position is labelled SCALED or STYLIZED on screen, never
    presented as a dimensioned clearance.
CRITIC FINDINGS (all three critics rated the lost build STRONG, not WOWED, for these):
C1. 30 of 46 spaces (every common area) were empty grey shells: floor, wall ring, cap, nothing
    inside. The FOH block (U 178.78-221.22, V -7.38-44.22) is the largest volume on the floor and
    sits in the upper-left third of the hero shot, so the eye lands on the unbuilt part first, the
    COMMON AREAS view had nothing in it, and EXPLODED exploded only the 16 guest rooms.
C2. The open-issue marker was a 0.55 ft tall box on the floor (14% of the 4'-0" wall cut), which
    reads as a rug or pillow, while the label-anchor pin (a marker for a non-room) got a proper
    vertical stem and head. The legend promised "red flag at the door" and the model drew no flag.
    Rule: open issues are a vertical red pin at the proven door position, stem to about wall-cut
    height, head scaled or badged by the open-issue count, so the plate reads as a heat map in two
    seconds and the legend is true.
A100 HONESTY (from the layout gap list; carry these, never paper over them):
- The pool deck is not on A100. Do not derive it from A100; note it as a known gap.
- Lobby 003, Market 005, Reception 004, Vestibule 001 are ONE open volume with no full-height
  walls: render one volume with label anchors, not four boxes.
- Womens 019 / Mens 020 / Engineer 021, Laundry Discharge 013, Closet 012, Unisex 027, Guest
  Laundry 024, Managers Office 011, Elev. Lobby 137, Work Stations 010 have label anchors only or
  unresolved boundaries: render lighter SCALED massing or label-only, never crisp invented walls.
  013/012/027 label boxes sit OUTSIDE the east face (V=65.59); do not place rooms at those labels.
- Ice Machine 139 / Open Storage 017 / Laundry 015 splits are SCALED. Gridline labels are not
  resolved. Stair 1 needs A430. Elevator 138 is not labelled on A100.
- A100 revision 5 (12/12/24, "REVISED PER RFI") postdates the sheet date; delta-5 clouds sit on
  both connecting pairs. Put the sheet issue and revision in the title block.
`

phase('FloorScene')
const floor = await agent(`${RULES}${LESSONS}
YOUR JOB: build the assembled FLOOR 1 scene. You own exactly: platform/tools/floor3d.src.html
(the hand-edited source), platform/tools/build_floor3d.mjs (inlines the three.js line from
room3d.html and writes platform/floor3d.html; never hand-edit the output), platform/floor3d.html,
platform/js/modules/bim/module.js (add a "Floor 1" entry to the Model section that frames
floor3d.html; no core edits), and tests/floor3d-ui.mjs (headless checks, pattern in
tests/floor1-ui.mjs). Layout comes from research/floor1-3d/a100-layout.json; King geometry from
geometry-spec.json and the notes in research/floor1-3d/king-viewer-notes.json; QQ geometry from
platform/room3d.html. King circle treatment must mirror king-viewer-notes.json exactly (V5).
BRIEF, Command Deck aesthetic (dark, print-calm, cyan #02A9DE rationed, tabular numerals):
(1) dollhouse 3/4 aerial, all 46 spaces: 16 guest rooms as roofless volumes with real interior
massing (King and QQ builders), corridor, and every common area in its measured place; proven
crisp, SCALED lighter; the FOH as one volume; A100 gaps handled as the honesty list says.
(2) LIVE STATUS PAINT from platform/data/floor1-staged.json fetched at load (accept an injected
window.__H2SEP_FLOOR_DATA first so the packaged artifact can inline it): floor tint by checklist
state, floating chip with done/total; open issues as the vertical red pin at the proven door
position, head scaled or badged by count (C2); the legend says exactly what the model draws.
(3) orbit/pan/zoom, hover card (number, type, progress, open issues, MEASURED or SCALED basis),
click to ../index.html#/room/<no> or #/space/<id>. (4) view bar Overview / Guest Wing / Common
Areas / Exploded with eased camera transitions; Exploded lifts every space, not only guest rooms.
(5) legend, Triun logo, FLOOR 1 title block with the A100 issue and revision.
Datums: the 116/118 connecting opening uses the single-datum mechanism of the QQ pair (V3); the
118 proof comment states the printed value and datum correctly (V2).
Verify: serve, screenshot every view plus a hover card, LOOK at each, iterate until strong; run
tests/floor3d-ui.mjs and tests/floor1-ui.mjs against a scratch copy to prove nothing broke.
Commit and push at three milestones: first full render, status paint working, final.`, {
  label: 'build:floor-scene', model: 'opus', phase: 'FloorScene', effort: 'max',
  schema: { type: 'object', required: ['built', 'pushedCommit', 'screenshots', 'wiredIntoNav'], properties: {
    built: { type: 'boolean' }, pushedCommit: { type: 'string' },
    screenshots: { type: 'array', items: { type: 'string' } },
    wiredIntoNav: { type: 'boolean' }, statusPaintWorks: { type: 'boolean' },
    clickThroughWorks: { type: 'boolean' }, uiSuitePassed: { type: 'boolean' },
    selfCritique: { type: 'array', items: { type: 'string' } } } },
})
log(`floor scene built=${floor?.built} nav=${floor?.wiredIntoNav} paint=${floor?.statusPaintWorks} pushed=${floor?.pushedCommit}`)

phase('Commons')
const [commons, artifact] = await parallel([
  () => agent(`${RULES}${LESSONS}
YOUR JOB: furnish the common areas (C1). You own exactly: platform/tools/floor3d.src.html,
platform/floor3d.html (regenerate with node platform/tools/build_floor3d.mjs, never hand-edit),
and research/floor1-3d/commons-sources.json. Do not touch any other file.
Build six kits as stylized massing with the SAME primitives and finish the guest-room builders use:
lobby seating groups plus the reception desk, market shelving, breakfast tables and chairs, the
servery and food-prep counter line, fitness equipment, and laundry machines (guest laundry and
back-of-house laundry). Source layouts from the interior sheets in the research pile
(research/**/ID-1.6, ID-1.7, ID-1.10, ID-1.11, PA200, PA201, PA205 and whatever else is there;
search Drive for the sheets if the local copies are thin). Every piece is either MEASURED (cite
sheet and value) or SCALED (say so in code and in the hover card basis); never invent a
dimension. Record every source and every SCALED call in research/floor1-3d/commons-sources.json.
Make the COMMON AREAS view and the EXPLODED view earn their names. Then screenshot Overview,
Common Areas, Exploded, and a lobby close-up, LOOK at each, iterate until the FOH reads as a real
hotel lobby at overview distance. Run tests/floor3d-ui.mjs. Commit and push at two milestones:
FOH kits done, all kits done.`, {
    label: 'build:commons', model: 'opus', phase: 'Commons', effort: 'max',
    schema: { type: 'object', required: ['kitsBuilt', 'pushedCommit', 'screenshots'], properties: {
      kitsBuilt: { type: 'array', items: { type: 'string' } }, pushedCommit: { type: 'string' },
      screenshots: { type: 'array', items: { type: 'string' } },
      scaledCalls: { type: 'array', items: { type: 'string' } },
      issues: { type: 'array', items: { type: 'string' } } } },
  }),
  () => agent(`${RULES}${LESSONS}
YOUR JOB: fix the packaged artifact (V4). You own exactly: platform/tools/build-artifact.mjs and
the renderFloor function in platform/js/modules/bim/module.js. Read floor3d.html, never edit it
(another agent owns it right now; read whatever version is on disk).
Make build-artifact.mjs inline platform/floor3d.html as window.__H2SEP_FLOOR_SRCDOC and inline
platform/data/floor1-staged.json so the framed floor scene gets its status data without a fetch
(the scene accepts window.__H2SEP_FLOOR_DATA; if it does not yet, do not edit floor3d - report it
and make the bundle inject the data into the srcdoc in a way the scene will pick up). If neither
is possible the Floor 1 screen must show an honest hard-stop, never a blank iframe.
Prove it: build the artifact to a scratch path, open it headless, screenshot the Floor 1 screen,
LOOK at it, confirm geometry and status paint render. Also confirm the existing room viewer path
(__H2SEP_VIEWER_SRCDOC) still works. Commit and push (git add platform/tools/build-artifact.mjs
platform/js/modules/bim/module.js). If the push is rejected, pull --rebase and push again.`, {
    label: 'fix:artifact', model: 'opus', phase: 'Commons', effort: 'high',
    schema: { type: 'object', required: ['fixed', 'pushedCommit', 'screenshots'], properties: {
      fixed: { type: 'boolean' }, pushedCommit: { type: 'string' },
      screenshots: { type: 'array', items: { type: 'string' } }, notes: { type: 'array', items: { type: 'string' } } } },
  }),
])
log(`commons kits: ${(commons?.kitsBuilt || []).join(',')} pushed=${commons?.pushedCommit} | artifact fixed=${artifact?.fixed} pushed=${artifact?.pushedCommit}`)

phase('Verify')
const [dims, ...critics] = await parallel([
  () => agent(`${RULES}${LESSONS}
INDEPENDENT VERIFIER (read-only: edit nothing, commit nothing). Assume the King rooms and the
floor scene are dimensionally wrong. Check every number in platform/room3d.html's King entries
and platform/tools/floor3d.src.html against research/king-studio/geometry-spec.json and
research/floor1-3d/a100-layout.json citations. Re-check each lesson V1-V5 specifically and hunt
for new defects of the same kind: unproven numbers encoded as constants, proof text that does not
match the rendered geometry, non-coincident openings, silent blanks, the two viewers disagreeing.
Screenshot rooms 104, 110, 116, 118, QQ 105, the floor overview, and the packaged artifact's
Floor 1 screen (build it to a scratch path). Confirm /home/user/h2sep-checklist/room-3d.html is
UNTOUCHED (git status and git diff origin/${BRANCH} -- room-3d.html empty) and that
platform/room3d.html was not edited in this run (git log -1 -- platform/room3d.html predates it;
no wwShift anywhere; the two 118 circles and their labels match king-viewer-notes.json). List every defect with
file:line; PASS only at zero.`, {
    label: 'verify:dimensions', model: 'opus', phase: 'Verify', effort: 'high',
    schema: { type: 'object', required: ['verdict', 'defects'], properties: {
      verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, defects: { type: 'array', items: { type: 'string' } },
      crewViewerUntouched: { type: 'boolean' }, evidence: { type: 'string' } } },
  }),
  ...['first-impression', 'usability', 'craft'].map((lens) => () =>
    agent(`${RULES}
DESIGN CRITIC, fresh eyes, lens: ${lens} (read-only: edit nothing, commit nothing). Austin's bar:
"make this shit look epic." He is a construction PM in his own command center; approved language
is Command Deck (dark, print-calm, cyan rationed). Serve platform/, open floor3d.html headless
1600x1000, screenshot EVERY view plus a hover card, LOOK at each; also King 110, King 118 and QQ
105 in room3d.html for coherence.
Lens: first-impression = does the overview make a PM say "damn" in two seconds, and does the
common-area half of the plate now hold its own against the guest wing; usability = find room
112's status in 3 seconds, read where the open issues are without hovering, click-through
discoverable, transitions orient, legend true to what is drawn; craft = alignment, label
collisions, z-fighting, aliasing, cyan discipline, SCALED-vs-proven distinction honest.
Verdict: WOWED / STRONG (one named fix) / FLAT / BROKEN plus THE single highest-leverage
improvement with file:line. Harsh; a false WOWED wastes everyone's time.`, {
      label: `critic:${lens}`, model: 'opus', phase: 'Verify', effort: 'high',
      schema: { type: 'object', required: ['verdict', 'biggestImprovement'], properties: {
        verdict: { type: 'string', enum: ['WOWED', 'STRONG', 'FLAT', 'BROKEN'] },
        biggestImprovement: { type: 'string' }, details: { type: 'array', items: { type: 'string' } } } },
    })),
])
log(`dims: ${dims?.verdict} (${(dims?.defects || []).length}) | critics: ${critics.filter(Boolean).map((c) => c.verdict).join('/')}`)

return {
  floorBuilt: floor?.built, floorPushed: floor?.pushedCommit, statusPaint: floor?.statusPaintWorks,
  uiSuitePassed: floor?.uiSuitePassed,
  commonsKits: commons?.kitsBuilt, commonsPushed: commons?.pushedCommit, scaledCalls: commons?.scaledCalls,
  artifactFixed: artifact?.fixed, artifactPushed: artifact?.pushedCommit,
  dimensionVerdict: dims?.verdict, dimensionDefects: (dims?.defects || []).slice(0, 12),
  crewViewerUntouched: dims?.crewViewerUntouched,
  critics: critics.filter(Boolean).map((c) => ({ verdict: c.verdict, fix: c.biggestImprovement })),
}
