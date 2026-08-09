// Seed data parsed from Austin's paper sheet photo: ROOM #101, QQ STUDIO Connector.
// Used as demo-mode fixtures and as the canonical first REST seed payload.

export const FLOORS = {
  '1': { label: 'Level 1', sort: 1 },
  '2': { label: 'Level 2', sort: 2 },
  '3': { label: 'Level 3', sort: 3 },
  '4': { label: 'Level 4', sort: 4 },
};

// Paper order. qty>1 becomes instance ids _a/_b at expansion time.
const QQ_STUDIO_CONNECTOR = [
  ['GR-400',   'Window Treatment'],
  ['GR-202',   'Nightstand Sconce'],
  ['GR-319',   'Nightstand @ R'],
  ['GR-300',   'Queen Headboard'],
  ['GR-600',   'Q Mattress'],
  ['GR-600.1', 'Q Bedwrap'],
  ['GR-602',   'Q Bed Base'],
  ['GR-207',   'Nightstand Sconce @ QQ Center'],
  ['GR-322',   'Nightstand @ QQ'],
  ['GR-300',   'Queen Headboard'],
  ['GR-600',   'Q Mattress'],
  ['GR-600.1', 'Q Bedwrap'],
  ['GR-602',   'Q Bed Base'],
  ['GR-323',   'Nightstand @ L'],
  ['GR-202',   'Nightstand Sconce'],
  ['GR-402',   'Divider Drapery'],
  ['GR-402.1', 'Divider Drapery Hardware'],
  ['GR-205',   'Floor Lamp'],
  ['GR-101',   'Sleeper Sofa'],
  ['GR-500',   'Art Above Sofa'],
  ['GR-200',   'Side Table Lamp'],
  ['GR-318',   'Side Table @ Sofa'],
  ['GR-502',   'Full Length Mirror'],
  ['GR-403',   'Closet Drapery'],
  ['GR-100',   'Ottoman'],
  ['GR-308R',  'Working Wall @ QQ Connector'],
  ['GR-308R',  'Working Wall @ QQ Connector'],
  ['GR-103',   'Task Chair'],
  ['GR-201',   'Desk Lamp'],
  ['GR-204',   'Sconce @ Wall Hook'],
];

function slug(code) { return code.toLowerCase().replace(/[^a-z0-9]/g, ''); }

// Expand a [code,label] list into an ordered { id: {code,label,sort} } map with
// deterministic _a/_b instance ids (identical across devices -> idempotent merge).
export function expandTemplateItems(list) {
  const seen = {}, out = {};
  list.forEach(([code, label], i) => {
    const s = slug(code);
    seen[s] = (seen[s] || 0) + 1;
    const id = s + '_' + String.fromCharCode(96 + seen[s]); // _a, _b, ...
    out[id] = { code, label, sort: (i + 1) * 10 };
  });
  return out;
}

export function blankItem(tpl) {
  return {
    code: tpl.code, label: tpl.label, sort: tpl.sort,
    category: tpl.category || '', qty: tpl.qty || 1,
    reliability: tpl.reliability || 'HIGH', derived: tpl.derived || 0, src: tpl.src || '',
    instanceNote: tpl.instanceNote || '',
    checked: false, initials: '', checkedByName: '', checkedByUid: '',
    checkedAt: null, checkedAtLocal: null,
    issue: '', issueResolved: false, deleted: false,
  };
}

// Room 101 as it actually stands in Firestore after the template cutover:
// 40 deduped lines with categories and qty, the 14 carried check-offs, and the
// 6 open issues. Demo mode must show the REAL product, not the legacy paper
// shape — this fixture is also what the screenshots and smoke tests exercise.
// `ck` = carried initials, `iss` = open issue; both are stripped into item
// state by seedRooms() below.
const R101_ITEMS = {
  "901_a": { code: "901", label: "Refrigerator - Danby DFF101B1BSSDB, 10.1 cu ft apartment-size top-mount, stainless, 115 V / 160 W, R600a, ENERGY STAR", sort: 14000, category: "Appliance", derived: 1, src: "A550" },
  "902_a": { code: "902", label: "Dishwasher - Danby DDW18D1ESS (18\", 10 place settings) or DDW2404EBSS (24\", 12 place settings)", sort: 14010, category: "Appliance", reliability: "FLAGGED", derived: 1, src: "A550", instanceNote: "⚑ no submittal link — model (DDW18D1ESS 18\" vs DDW2404EBSS 24\") pending Austin ruling" },
  "903_a": { code: "903", label: "Television", sort: 14020, category: "Appliance", derived: 1, src: "A555" },
  "904_a": { code: "904", label: "Clock / radio", sort: 14030, category: "Appliance", derived: 1, src: "A550" },
  "905_a": { code: "905", label: "Telephone", sort: 14040, category: "Appliance", derived: 1, src: "A550" },
  "gr100_a": { code: "GR-100", label: "Ottoman", sort: 17000, category: "FF&E - Seating", derived: 1, src: "A550", ck: "CC" },
  "gr101_a": { code: "GR-101", label: "Sleeper Sofa", sort: 17010, category: "FF&E - Seating", derived: 1, src: "A550", ck: "CC" },
  "gr103_a": { code: "GR-103", label: "Ergonomic Task Chair", sort: 17020, category: "FF&E - Seating", derived: 1, src: "A555", iss: "IN BOX" },
  "gr200_a": { code: "GR-200", label: "Side Table Lamp", sort: 18000, category: "FF&E - Lighting", derived: 1, src: "A550", ck: "CC" },
  "gr201_a": { code: "GR-201", label: "Desk Lamp", sort: 18010, category: "FF&E - Lighting", derived: 1, src: "A550", ck: "CC" },
  "gr203_a": { code: "GR-203", label: "Vanity Sconce (legend prints 'VANITY SCONE' sic)", sort: 18020, category: "FF&E - Lighting", derived: 1, src: "A530" },
  "gr204_a": { code: "GR-204", label: "Sconce @ Wall Hook", sort: 18030, category: "FF&E - Lighting", derived: 1, src: "A555", ck: "CC" },
  "gr205_a": { code: "GR-205", label: "Floor Lamp", sort: 18040, category: "FF&E - Lighting", derived: 1, src: "A550", ck: "CC" },
  "gr207_a": { code: "GR-207", label: "Nightstand Sconce @ QUEEN QUEEN CENTER, between the beds", sort: 18050, category: "FF&E - Lighting", derived: 1, src: "A555", iss: "?" },
  "gr208_a": { code: "GR-208", label: "Nightstand Sconce @ QUEEN QUEEN SIDE", sort: 18060, category: "FF&E - Lighting", qty: 2, derived: 1, src: "A555", iss: "NEED INSTALL" },
  "gr300_a": { code: "GR-300", label: "Queen Headboard", sort: 15000, category: "FF&E - Casegoods", qty: 2, derived: 1, src: "A555", ck: "CC" },
  "gr302_a": { code: "GR-302", label: "Vanity @ Guest Bath", sort: 15010, category: "FF&E - Casegoods", derived: 1, src: "A530", instanceNote: "⚑ paper sheet tags this GR-302L; DB/legend carries GR-302 — L designation stays per ruling, discrepancy documented" },
  "gr308_a": { code: "GR-308", label: "Working Wall @ Queen Queen Studio Suite Connector", sort: 15020, category: "FF&E - Casegoods", reliability: "FLAGGED", derived: 1, src: "A555", instanceNote: "one continuous run", ck: "CC" },
  "gr318_a": { code: "GR-318", label: "Sofa Table @ Sofa", sort: 15030, category: "FF&E - Casegoods", derived: 1, src: "A550", ck: "CC" },
  "gr321_a": { code: "GR-321", label: "Wall Shelf @ Bathroom", sort: 15040, category: "FF&E - Casegoods", derived: 1, src: "A530" },
  "gr322_a": { code: "GR-322", label: "Nightstand @ Queen Queen", sort: 15050, category: "FF&E - Casegoods", reliability: "FLAGGED", derived: 1, src: "A555", instanceNote: "paper sheet counted 3: GR-319 @ R / GR-322 / GR-323 @ L — DB carries 1 (tagged once on A555); confirm count on A555", ck: "CC" },
  "gr400_a": { code: "GR-400", label: "Blackout & Sheer Roller Shade, MANUAL", sort: 19000, category: "FF&E - Window", derived: 1, src: "A555", ck: "CC" },
  "gr4021_a": { code: "GR-402.1", label: "Divider Drapery Hardware", sort: 19020, category: "FF&E - Window", derived: 1, src: "A555" },
  "gr402_a": { code: "GR-402", label: "Divider Drapery", sort: 19010, category: "FF&E - Window", derived: 1, src: "A555", ck: "AJ" },
  "gr403_a": { code: "GR-403", label: "Closet Drapery @ Guest Suite", sort: 19030, category: "FF&E - Window", derived: 1, src: "A555" },
  "gr500_a": { code: "GR-500", label: "Art Above Sofa", sort: 20000, category: "FF&E - Art / Mirror", derived: 1, src: "A550", ck: "CC" },
  "gr501_a": { code: "GR-501", label: "Vanity Mirror", sort: 20010, category: "FF&E - Art / Mirror", derived: 1, src: "A530" },
  "gr502_a": { code: "GR-502", label: "Full Length Mirror", sort: 20020, category: "FF&E - Art / Mirror", derived: 1, src: "A555", ck: "CC" },
  "gr6001_a": { code: "GR-600.1", label: "Queen Box Spring Cover", sort: 16010, category: "FF&E - Bedding", qty: 2, derived: 1, src: "A555", iss: "NEED PROPER PLACE" },
  "gr600_a": { code: "GR-600", label: "Queen Mattress Set", sort: 16000, category: "FF&E - Bedding", qty: 2, derived: 1, src: "A555", iss: "NEED PROPER PLACE" },
  "gr602_a": { code: "GR-602", label: "Queen Bed Base", sort: 16020, category: "FF&E - Bedding", qty: 2, derived: 1, src: "A555", iss: "NEED PROPER PLACE" },
  "hd03_a": { code: "HD-03", label: "Toilet Tissue Dispenser", sort: 13000, category: "Bath Accessory", reliability: "MEDIUM", derived: 1, src: "A530" },
  "hd08_a": { code: "HD-08", label: "Grab Bar ADA 24\" VERTICAL MOUNT", sort: 13010, category: "Bath Accessory", reliability: "MEDIUM", derived: 1, src: "A530" },
  "hd12_a": { code: "HD-12", label: "Robe / Coat Hook", sort: 13020, category: "Bath Accessory", qty: 2, derived: 1, src: "A530" },
  "hd16_a": { code: "HD-16", label: "Shower Soap Dispenser, surface mounted, guestroom", sort: 13030, category: "Bath Accessory", derived: 1, src: "A530" },
  "hd18_a": { code: "HD-18", label: "Shower Footrest, surface mounted", sort: 13040, category: "Bath Accessory", derived: 1, src: "A530" },
  "hd21_a": { code: "HD-21", label: "Soap Dish, surface mounted", sort: 13050, category: "Bath Accessory", derived: 1, src: "A530" },
  "hd22_a": { code: "HD-22", label: "Towel Bar 24\"", sort: 13060, category: "Bath Accessory", derived: 1, src: "A530" },
  "kn11_a": { code: "kn 11", label: "Over-the-range microwave, wall-affixed - Danby DOM16A2SSDB, 1.6 cu ft, 1000 W, 300 CFM, mounting brackets included", sort: 14050, category: "Appliance", derived: 1, src: "A550" },
  "u_ce20ab6281": { code: "", label: "Garbage disposer", sort: 14060, category: "Appliance", reliability: "FLAGGED", derived: 1, src: "E400 Panel A/B 'Disposer' circuit; E103 480 VA", instanceNote: "⚑ no submittal link — only the E400 disposer circuit + E103 480 VA load evidence it; existence in Room 101 unresolved, resolve before ordering" },
};

export const TEMPLATES = {
  'qq-studio-connector': {
    name: 'QQ Studio Connector',
    items: R101_ITEMS,
  },
};

export function seedRooms() {
  const tpl = TEMPLATES['qq-studio-connector'];
  const items = {};
  for (const [id, t] of Object.entries(tpl.items)) {
    const it = blankItem(t);
    if (t.ck) {
      it.checked = true;
      it.initials = t.ck;
      it.checkedByName = '';
      it.checkedByUid = 'paper';
      it.checkedAt = null; // carried from the paper sheet — time unknown
      it.checkedAtLocal = null;
    }
    if (t.iss) it.issue = t.iss;
    items[id] = it;
  }
  return {
    '101': {
      number: '101', floor: 1,
      type: 'qq-studio-connector', typeLabel: 'QQ Studio Connector',
      items,
      notes: {
        n_doorlock: {
          text: 'CONNECTING DOOR LOCK – NOT LOCKING', flag: 'issue',
          resolved: false, createdBy: 'paper import', createdByUid: '', createdAt: null,
        },
      },
      deleted: false, schemaV: 3, createdAt: null, updatedAt: null,
    },
  };
}
