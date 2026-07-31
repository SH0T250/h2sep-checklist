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
    checked: false, initials: '', checkedByName: '', checkedByUid: '',
    checkedAt: null, checkedAtLocal: null,
    issue: '', issueResolved: false, deleted: false,
  };
}

export const TEMPLATES = {
  'qq-studio-connector': {
    name: 'QQ Studio Connector',
    items: expandTemplateItems(QQ_STUDIO_CONNECTOR),
  },
};

// Room 101's actual states from the paper sheet ("CC" = checked, red = issue).
const R101_CHECKED = new Set([
  'gr400_a', 'gr319_a', 'gr300_a', 'gr322_a', 'gr300_b', 'gr323_a',
  'gr205_a', 'gr101_a', 'gr500_a', 'gr200_a', 'gr318_a', 'gr502_a',
  'gr100_a', 'gr308r_a', 'gr308r_b', 'gr201_a', 'gr204_a',
]);
const R101_ISSUES = {
  gr202_a: 'NEED INSTALL',
  gr600_a: 'NEED PROPER PLACE',
  gr6001_a: 'NEED PROPER PLACE',
  gr602_a: 'NEED PROPER PLACE',
  gr207_a: '?',
  gr600_b: 'NEED PROPER PLACE',
  gr6001_b: 'NEED PROPER PLACE',
  gr602_b: 'NEED PROPER PLACE',
  gr202_b: 'NEED INSTALL',
  gr103_a: 'IN BOX',
};

export function seedRooms() {
  const tpl = TEMPLATES['qq-studio-connector'];
  const items = {};
  for (const [id, t] of Object.entries(tpl.items)) {
    const it = blankItem(t);
    if (R101_CHECKED.has(id)) {
      it.checked = true;
      it.initials = 'CC';
      it.checkedByName = '';
      it.checkedByUid = 'paper';
      it.checkedAt = null; // unknown from paper
      it.checkedAtLocal = null;
    }
    if (R101_ISSUES[id]) it.issue = R101_ISSUES[id];
    items[id] = it;
  }
  return {
    '101': {
      number: '101', floor: 1,
      type: 'qq-studio-connector', typeLabel: 'QQ STUDIO Connector',
      items,
      notes: {
        n_doorlock: {
          text: 'CONNECTING DOOR LOCK – NOT LOCKING', flag: 'issue',
          resolved: false, createdBy: 'paper import', createdByUid: '', createdAt: null,
        },
      },
      deleted: false, schemaV: 1, createdAt: null, updatedAt: null,
    },
  };
}
