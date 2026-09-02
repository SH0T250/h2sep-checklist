/**
 * mep_punch_template.mjs - the simplified guest room MEP punch (ruling D49).
 *
 * H2SEP / Home2 Suites by Hilton, Eagle Pass TX - Triun Construction & Engineering.
 *
 * Austin, 2026-09-02: "revise the MEP punch on all floors. Simplify the items
 * ... I just need PTAC installed/working." Then, line by line:
 *   - Electrical: add "Receptacle covers" and "Receptacle"; "Breaker Box
 *     Labeled" on every guest room.
 *   - Fire alarm: no single fire alarm line; break the smoke detector and the
 *     horn strobe out as "installed" and "working".
 *   - Fire sprinkler: "FS Escutcheon", "Flush", and "Touchup around", the
 *     touch-up staying with the finishes so the painter sees it.
 *   - Plumbing, sinks and showers: "Hot water working", "Cold water working",
 *     "Water pressure good".
 *   - Door hardware: "Rework closer" under the closer on ALL doors, checked
 *     only when the rework was needed; "Key card installed" and "Key card
 *     working" next to the closer and lock.
 *
 * WHAT THIS MODULE DOES
 *   simplifyMepDoc(doc, room, stamp) rewrites a built <room>-MEP doc so that
 *   its live lines are exactly the template below, one device per line, in
 *   plain words. Nothing is thrown away:
 *     - field state on a line that maps to a new line (see `from`) is carried
 *       across untouched: checked, initials, timestamps, company, issue;
 *     - every old live line that is not the same key as a new line is kept in
 *       the doc as an archived row (deleted: true), exactly what the rollout
 *       does live, so the history and any check against it survive;
 *     - the old spec text a new line replaces is folded into the new line's
 *       instanceNote, so the tap-to-expand detail still cites the sheets.
 *   The FF&E door hardware lines live in RULED_LINE_ADDITIONS in the two
 *   builders (build_floor1.mjs and build_ref_rooms.mjs), which must stay
 *   byte-identical; DOOR_LINES here is the same list, exported for the audit.
 *
 * "IF NEEDED" LINES
 *   A line with optional: true is a rework line. It does not count toward the
 *   room's total until someone checks it or raises an issue on it. The app
 *   (platform/js/core/store.js roomStats and the tracking module) reads the
 *   flag; the Firestore rules do not constrain item keys, so the flag ships
 *   inside the item like every other field.
 */

export const RULING = 'D49';
const RULED_SRC = 'D49 (AJ 2026-09-02)';
/* Every line carries a SOURCE sentence, the documentation discipline the
 * mockup builder enforces on every line it writes. */
const SOURCE_SENTENCE = 'SOURCE. This line is Austin ruling D49 (2026-09-02): the MEP punch simplified to one ' +
  'device per line in plain words. The spec lines it covers are listed above when the room had them, and ' +
  'their sheet citations are carried in src.';

/* Field state a newly born line carries, and the fields that travel when a
 * line is carried across. Same list the rollout protects. */
export const CLEAN_STATE = {
  checked: false, initials: '', checkedAt: null, checkedAtLocal: null,
  issue: '', issueResolved: false,
};
const STATE_FIELDS = ['checked', 'initials', 'checkedAt', 'checkedAtLocal', 'checkedByCo', 'issue', 'issueResolved'];

/** Which family a sqlite room row belongs to. Every predicate reads the row,
 *  never a guess: rooms.accessible and rooms.connecting are printed columns,
 *  room_type is the display type. */
export function roomFlags(room) {
  const r = room || {};
  const type = String(r.room_type || r.typeLabel || '');
  return {
    accessible: String(r.accessible) === '1' || /\b(Acc\.?|Accessible|ADA)\b/i.test(type),
    connecting: String(r.connecting) === '1' || /Connect/i.test(type),
    oneBedroom: /One Bedroom/i.test(type),
  };
}

/* ----------------------------------------------------------------- MEP lines
 * key       stable item id (existing keys are reused so floor-1 state carries)
 * from      old live keys whose state and spec text fold into this line
 * match     old live labels that fold their spec text into this line
 * applies   'accessible' | 'oneBedroom' | undefined (every room)
 * inheritCode  keep the donor line's own mark (may be blank) instead of `code`
 * The sort bands keep the walk order: Mechanical 1000s, Electrical 2000s,
 * Plumbing 3000s, Fire Alarm 4000s, Fire Sprinkler 4500s, Finishes 4800s,
 * Low Voltage 5000s. */
export const MEP_LINES = [
  /* Mechanical */
  { key: 'mech_ptac', category: 'Mechanical', code: 'PTAC', sort: 1010,
    label: 'PTAC installed and working', from: ['mech_ptac'], match: /^PTAC\b(?!.*(sleeve|louver|grille|access panel|filter|fresh|low-ambient|drain kit|edge|stool))/i },
  { key: 'mech_ptac_kit', category: 'Mechanical', code: 'PTAC-K', sort: 1011,
    label: 'PTAC sleeve, grilles, filter and drain kit complete', from: ['mech_grille_rm'],
    match: /PTAC.*(sleeve|louver|grille|access panel|filter|fresh-air|low-ambient|drain kit)|wall grille at the PTAC/i },
  { key: 'mech_tstat', category: 'Mechanical', code: 'TSTAT', sort: 1012,
    label: 'Thermostat working', from: ['mech_tstat'], match: /thermostat|energy-management|wall controller/i },
  { key: 'mech_grille_bath', category: 'Mechanical', code: 'EF', sort: 1013,
    label: 'Bath exhaust fan working', from: ['mech_grille_bath'],
    match: /exhaust|volume damper|constant-airflow|make-up air|wall air grille/i },
  { key: 'mech_access_a', category: 'Mechanical', code: 'AP', sort: 1014,
    label: 'Bath ceiling access panel installed', match: /access panel in the bath|fire \/ radiation damper|radiation damper/i },

  /* Electrical */
  { key: 'elec_panel_label_a', category: 'Electrical', code: 'PNL-L', sort: 2010,
    label: 'Breaker box labeled', match: /panelboard.*labeled|panel directory/i },
  { key: 'elec_panel', category: 'Electrical', code: 'PNL', sort: 2011,
    label: 'Breaker box installed, cover on', from: ['elec_panel'], match: /panelboard|AFCI/i },
  { key: 'elec_lights', category: 'Electrical', code: 'LTG', sort: 2012,
    label: 'Lights and switches working', from: ['elec_lights'],
    match: /lighting switch|lighting fixture|welcome|wall switches|shade/i },
  { key: 'elec_nightlight_a', category: 'Electrical', code: 'NL', sort: 2013,
    label: 'Bath night light working', match: /night ?light/i },
  { key: 'elec_gfci', category: 'Electrical', code: 'GFCI', sort: 2014,
    label: 'Bath GFCI working', from: ['elec_gfci'], match: /GFCI/i },
  { key: 'elec_outlets', category: 'Electrical', code: 'REC', sort: 2015,
    label: 'Receptacles installed and working', from: ['elec_outlets'],
    match: /convenience.*receptacle|receptacles throughout|wiring devices/i },
  { key: 'elec_covers_a', category: 'Electrical', code: 'REC-C', sort: 2016,
    label: 'Receptacle covers installed', match: /cover plate/i },
  { key: 'elec_kitch_a', category: 'Electrical', code: 'KIT', sort: 2017,
    label: 'Kitchenette outlets working (counter, fridge, microwave, dishwasher)',
    match: /countertop receptacle|small-appliance|refrigerator receptacle|microwave|dishwasher appliance|dishwasher connection|appliance receptacles|undercabinet|J-box/i },
  { key: 'elec_sink_sw', category: 'Electrical', code: 'SW', sort: 2018,
    label: 'Disposal and dishwasher switches working', from: ['elec_sink_sw'], match: /disposal switch|dishwasher disconnect|dishwasher switch/i },
  { key: 'elec_sconces_a', category: 'Electrical', code: 'SC', sort: 2019,
    label: 'Sconces installed and working (vanity, nightstand, wall hook)', match: /sconce/i },
  { key: 'elec_bathlights_a', category: 'Electrical', code: 'BL', sort: 2020,
    label: 'Bath and shower lights working', match: /bath ceiling|downlight|wet-location|over the shower|over the bathing/i },
  { key: 'elec_welcome_a', category: 'Electrical', code: 'WS', sort: 2110, applies: 'accessible',
    label: 'Welcome switch at bed working', match: /welcome/i },
  { key: 'elec_reach_a', category: 'Electrical', code: 'ADA-R', sort: 2111, applies: 'accessible',
    label: 'Reach heights checked (outlet and data 15 to 48 in)', match: /reach/i },
  { key: 'elec_dining_a', category: 'Electrical', code: 'LTG-D', sort: 2112, applies: 'oneBedroom',
    label: 'Dining light working', match: /dining/i },

  /* Plumbing */
  { key: 'plmb_wc_a', category: 'Plumbing', code: 'WC', sort: 3010,
    label: 'Toilet installed and working, no leaks', from: ['plmb_wc_a'], match: /water closet/i },
  { key: 'plmb_lavfaucet_a', category: 'Plumbing', code: 'LAV', sort: 3011,
    label: 'Sink and faucet installed and working, no leaks', from: ['plmb_lavfaucet_a'],
    match: /lavatory|P-trap cover|supply-line wrap/i },
  { key: 'plmb_shower_a', category: 'Plumbing', code: 'SH-V', sort: 3012,
    label: 'Shower valve and head installed and working, no leaks', from: ['plmb_shower_a', 'plmb_showerhead_a'],
    match: /^shower,|shower head|pressure-balancing|anti-scald|diverter/i },
  { key: 'plmb_shencl_a', category: 'Plumbing', code: 'SH-D', sort: 3013,
    label: 'Shower door installed and working', from: ['plmb_shencl_a'], match: /shower enclosure|glass door/i },
  { key: 'plmb_fd_a', category: 'Plumbing', code: 'FD', sort: 3014,
    label: 'Floor drain and trap guard installed', from: ['plmb_fd_a', 'plmb_trapguard_a'], match: /floor drain|trap guard|trap primer/i },
  { key: 'plmb_cond_a', category: 'Plumbing', code: 'CD', sort: 3015,
    label: 'PTAC condensate drain installed', match: /condensate/i },
  { key: 'plmb_valves_a', category: 'Plumbing', code: 'GV', sort: 3016,
    label: 'Shut-off valves accessible', match: /gate valve|shut-?off/i },
  { key: 'plmb_ksink_a', category: 'Plumbing', code: 'SK', sort: 3017,
    label: 'Kitchenette sink installed and working, no leaks', from: ['plmb_ksink_a'], match: /kitchenette.*sink|wet-bar sink/i },
  { key: 'plmb_hot_a', category: 'Plumbing', code: 'HW', sort: 3018,
    label: 'Hot water working', from: ['plmb_hotcold_a'], match: /hot and cold/i },
  { key: 'plmb_cold_a', category: 'Plumbing', code: 'CW', sort: 3019,
    label: 'Cold water working', from: ['plmb_hotcold_a'] },
  { key: 'plmb_press_a', category: 'Plumbing', code: 'PSI', sort: 3020,
    label: 'Water pressure good' },
  { key: 'plmb_tubroll_a', category: 'Plumbing', code: 'ADA-T', sort: 3115, applies: 'accessible',
    label: 'Tub or roll-in shower installed per room configuration', match: /CONFIGURATION|bathtub|roll-in/i },
  { key: 'plmb_handshower_a', category: 'Plumbing', code: 'ADA-H', sort: 3116, applies: 'accessible',
    label: 'Hand shower installed and working', match: /hand shower/i },

  /* Fire alarm */
  { key: 'fp_smoke_a', category: 'Fire Alarm', code: 'SD-I', sort: 4010,
    label: 'Smoke detector installed', from: ['fp_smoke_a'], match: /smoke detector/i },
  { key: 'fa_smoke_work_a', category: 'Fire Alarm', code: 'SD-W', sort: 4011,
    label: 'Smoke detector working' },
  { key: 'fa_smoke2_inst_a', category: 'Fire Alarm', code: 'SD2-I', sort: 4012, applies: 'oneBedroom',
    label: 'Second smoke detector installed', match: /detector 2 of 2|BEDROOM/ },
  { key: 'fa_smoke2_work_a', category: 'Fire Alarm', code: 'SD2-W', sort: 4013, applies: 'oneBedroom',
    label: 'Second smoke detector working' },
  { key: 'fa_horn_inst_a', category: 'Fire Alarm', code: 'H-I', sort: 4014,
    label: 'Horn strobe installed', match: /fire horn|horn-strobe|horn \/ horn/i },
  { key: 'fa_horn_work_a', category: 'Fire Alarm', code: 'H-W', sort: 4015,
    label: 'Horn strobe working' },
  { key: 'fa_strobe_inst_a', category: 'Fire Alarm', code: 'ST-I', sort: 4016, applies: 'accessible',
    label: 'Ceiling strobes installed', match: /ceiling strobe|visual notification/i },
  { key: 'fa_strobe_work_a', category: 'Fire Alarm', code: 'ST-W', sort: 4017, applies: 'accessible',
    label: 'Ceiling strobes working' },

  /* Fire sprinkler */
  { key: 'fp_heads_a', category: 'Fire Sprinkler', code: 'FS-H', sort: 4510, inheritCode: true,
    label: 'Sprinkler heads installed', from: ['fp_heads_a'], match: /sprinkler head/i },
  { key: 'fs_esc_inst_a', category: 'Fire Sprinkler', code: 'FS-E', sort: 4511,
    label: 'FS escutcheon installed', match: /escutcheon/i },
  { key: 'fs_esc_flush_a', category: 'Fire Sprinkler', code: 'FS-F', sort: 4512,
    label: 'FS escutcheon flush' },

  /* Finishes (the painter's line) */
  { key: 'fin_esc_touchup_a', category: 'Finishes', code: 'PT', sort: 4810,
    label: 'Touch-up around FS escutcheon' },

  /* Low voltage */
  { key: 'lv_tvdata', category: 'Low Voltage', code: 'TV', sort: 5010,
    label: 'TV outlet working', from: ['lv_tvdata'], match: /TV outlet|television/i },
  { key: 'lv_tv2_a', category: 'Low Voltage', code: 'TV2', sort: 5011, applies: 'oneBedroom',
    label: 'Second TV outlet working', match: /SECOND TV/i },
  { key: 'lv_data_a', category: 'Low Voltage', code: 'DATA', sort: 5012,
    label: 'Data outlets working', match: /data outlet|wired data|desktop grommet/i },
  { key: 'lv_phone_db', category: 'Low Voltage', code: 'PH', sort: 5013,
    label: 'Phone outlet installed', from: ['lv_phone_db'], match: /telephone/i },
  { key: 'lv_wap', category: 'Low Voltage', code: 'WAP', sort: 5014,
    label: 'Wireless access point installed', from: ['lv_wap'], match: /access point|WAP/i },
  { key: 'lv_ctrl_a', category: 'Low Voltage', code: 'CR', sort: 5015,
    label: 'Room controller installed', match: /edge controller|connected room/i },
  { key: 'lv_doorbell_a', category: 'Low Voltage', code: 'DB', sort: 5016, applies: 'accessible',
    label: 'Doorbell switch installed', match: /doorbell/i },
];

/* ---------------------------------------------------------------- door lines
 * The FF&E "Door Hardware" additions, in RULED_LINE_ADDITIONS shape. The two
 * builders carry this exact list inside their own RULED_LINE_ADDITIONS (the
 * ref-rooms builder asserts byte-identity with build_floor1.mjs); it is
 * repeated here only so the audit can name every D49 key. */
export const DOOR_LINES = [
  { ruling: 'D49', doc: 'ffe', key: 'dh_rework_a', category: 'Door Hardware', sort: 21005,
    code: 'DH-1R', qty: 1, optional: true,
    label: 'Rework closer (if needed)',
    src: 'D49 (AJ 2026-09-02)',
    note: 'Added by Austin ruling D49. Check this line only when the closer needed rework: adjust it ' +
      'so the door self-closes and latches from any open position. It does not count toward the ' +
      'room total until it is checked.' },
  { ruling: 'D49', doc: 'ffe', key: 'dh_keycard_inst_a', category: 'Door Hardware', sort: 21020,
    code: 'DH-3', qty: 1,
    label: 'Key card installed',
    src: 'D49 (AJ 2026-09-02); A600 hardware set 1 (Advance Card Lock)',
    note: 'Added by Austin ruling D49. The electronic card lock is mounted on the entry door with its ' +
      'reader and bezel flush and its supply connected.' },
  { ruling: 'D49', doc: 'ffe', key: 'dh_keycard_work_a', category: 'Door Hardware', sort: 21030,
    code: 'DH-4', qty: 1,
    label: 'Key card working',
    src: 'D49 (AJ 2026-09-02)',
    note: 'Added by Austin ruling D49. Present a working card: the lock reads, unlatches and relatches; ' +
      'the deadbolt throws; the privacy latch holds.' },
  { ruling: 'D49', doc: 'ffe', key: 'dh_conn_closer_a', category: 'Door Hardware', sort: 21040,
    code: 'DH-5', qty: 1,
    label: 'Connecting door closer installed',
    src: 'D49 (AJ 2026-09-02); A600 door GR-3, hardware set 3',
    note: 'Added by Austin ruling D49 (rework closer on ALL doors). The GR-3 connecting door is a 45 minute ' +
      'rated leaf on hardware set 3 per A600. Check the closer is installed and the leaf self-closes and ' +
      'latches. The set 3 contents were not readable in this pass; if set 3 carries no closer, mark N/A.',
    scope: 'the connecting rooms (rooms.connecting = 1)',
    applies: (room) => String((room || {}).connecting) === '1' },
  { ruling: 'D49', doc: 'ffe', key: 'dh_conn_rework_a', category: 'Door Hardware', sort: 21045,
    code: 'DH-5R', qty: 1, optional: true,
    label: 'Rework connecting door closer (if needed)',
    src: 'D49 (AJ 2026-09-02)',
    note: 'Added by Austin ruling D49. Check this line only when the connecting door closer needed rework.',
    scope: 'the connecting rooms (rooms.connecting = 1)',
    applies: (room) => String((room || {}).connecting) === '1' },
];

/** Every key ruling D49 may add to a room or its MEP punch (for the audit). */
export const D49_KEYS = new Set([...MEP_LINES.map((l) => l.key), ...DOOR_LINES.map((l) => l.key)]);

/** Keys of old MEP lines that D49 archives on every room (for the audit). */
export const D49_RETIRED_KEYS = new Set(['mech_grille_rm', 'plmb_showerhead_a', 'plmb_trapguard_a', 'plmb_hotcold_a']);

const lineApplies = (line, flags) => !line.applies || !!flags[line.applies];

function foldedDetail(line, oldLive, consumed) {
  const parts = [];
  for (const [k, it] of oldLive) {
    const fromHit = (line.from || []).includes(k);
    const matchHit = line.match && line.match.test(String(it.label || ''));
    if (!fromHit && !matchHit) continue;
    consumed.add(k);
    const code = it.code ? String(it.code).trim() + ': ' : '';
    parts.push(code + String(it.label || '').replace(/\s+/g, ' ').trim());
  }
  if (!parts.length) return '';
  let text = 'Covers these spec lines: ' + parts.join(' · ');
  if (text.length > 1200) text = text.slice(0, 1197).trimEnd() + '...';
  return text;
}

/**
 * Rewrite doc.items in place. `room` is the sqlite rooms row (room_type,
 * accessible, connecting). Returns a report; never touches anything but items
 * and updatedAt.
 */
export function simplifyMepDoc(doc, room, stamp) {
  const flags = roomFlags(room);
  const old = doc.items || {};
  const oldLive = Object.entries(old).filter(([, it]) => !it.deleted);
  const consumed = new Set();
  const items = {};
  let carried = 0;

  for (const line of MEP_LINES) {
    if (!lineApplies(line, flags)) continue;
    const item = {
      category: line.category, code: line.code, label: line.label, qty: 1, sort: line.sort,
      src: RULED_SRC, reliability: 'HIGH', trade: '', derived: 0, deleted: false, id: line.key,
      ...CLEAN_STATE,
    };
    const detail = foldedDetail(line, oldLive, consumed);
    item.instanceNote = (detail ? detail + ' ' : '') + SOURCE_SENTENCE;
    /* Carry the sheet citations of the lines this one replaces. */
    const srcs = [];
    for (const k of line.from || []) {
      const o = old[k];
      if (o && !o.deleted && o.src) srcs.push(String(o.src));
      if (o && !o.deleted && Number(o.qty) > 1 && line.key === k) item.qty = Number(o.qty);
    }
    if (srcs.length) item.src = RULED_SRC + '; ' + [...new Set(srcs)].join('; ');
    /* Carry a person's work: the first `from` line that was checked or has an
     * issue wins, and a line that keeps its own key always carries itself. */
    const donors = [line.key, ...(line.from || [])].map((k) => old[k]).filter((o) => o && !o.deleted);
    const donor = donors.find((o) => o.checked || (o.issue && !o.issueResolved)) || donors.find((o) => o.issue);
    if (donor) {
      for (const f of STATE_FIELDS) if (donor[f] !== undefined) item[f] = donor[f];
      if (donor.checked || donor.issue) carried++;
    }
    /* The sprinkler line keeps whatever mark treatment its donor had: the
     * floor-1 rooms print 'FP', the mockups deliberately carry no mark. */
    if (line.inheritCode && old[line.key] && !old[line.key].deleted) item.code = old[line.key].code || '';
    if (line.optional) item.optional = true;
    items[line.key] = item;
  }

  /* Archive every old live line that did not keep its key. Deleted history
   * rows ride along untouched. */
  let archived = 0;
  for (const [k, it] of Object.entries(old)) {
    if (items[k]) continue;
    if (it.deleted) { items[k] = it; continue; }
    items[k] = { ...it, deleted: true };
    archived++;
  }

  doc.items = items;
  if (stamp) doc.updatedAt = stamp;
  return {
    ruling: RULING,
    lines: MEP_LINES.filter((l) => lineApplies(l, flags)).length,
    carriedState: carried,
    archived,
    unfolded: oldLive.filter(([k]) => !consumed.has(k) && !items[k]?.deleted === false && !MEP_LINES.some((l) => l.key === k)).map(([k, it]) => k + ': ' + String(it.label || '').slice(0, 60)),
  };
}
