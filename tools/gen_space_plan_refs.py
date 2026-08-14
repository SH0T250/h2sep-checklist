#!/usr/bin/env python3
"""Emit the plan-ref fragment for the common-area spaces.

Every floor-1 space line already carries `src` — the title-block sheet ids its
content was read from (the enrich pipeline's provenance). This tool turns that
provenance into tappable plan refs, the same shape the guest rooms ship:

  { kind: 'plan', sheetId, title, driveId?, snippet?, note? }

- sheetId / driveId / title come from tools/out/space-refs/sheets.json
  (built from the Drive manifest — real title-block names, never guessed).
- snippet is attached when a downloaded crop exists in refs/ under the
  room-scoped name `SP<room>-<code>-<sheet>.png` (or the tag-generic
  `<code>-<sheet>.png` when the crop shows the PRODUCT, not a location).
- A sheet cited by an item but absent from the registry still gets an honest
  snippet-less ref ("see <sheet>") ONLY when --allow-unregistered is passed;
  default is to skip it and count it, so a typo'd sheet id can't ship.

Output: tools/out/space-refs/plan-refs.json (a gen_space_refs.py fragment).
"""
import argparse
import glob
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SPACES = os.path.join(HERE, 'out', 'spaces')
FRAGS = os.path.join(HERE, 'out', 'space-refs')
REFS_DIR = os.path.join(HERE, '..', 'refs')

SHEET_RE = re.compile(r'\b([A-Z]{1,2}[SD]?\d{3}(?:\.\d+)?|ID-\d+\.\d+|AS\d{3})\b')
MAX_SHEETS_PER_ITEM = 3


def sanitize(code):
    return re.sub(r'[^A-Za-z0-9.\-]+', '_', code)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--floor', default='1')
    ap.add_argument('--allow-unregistered', action='store_true')
    args = ap.parse_args()

    sheets = json.load(open(os.path.join(FRAGS, 'sheets.json')))
    matches, skipped = [], {}
    n_items = n_with = 0
    for f in sorted(glob.glob(os.path.join(SPACES, '*.json'))):
        d = json.load(open(f))
        if str(d.get('floor')) != str(args.floor):
            continue
        room = str(d['number'])
        for iid, it in (d.get('items') or {}).items():
            if it.get('deleted'):
                continue
            n_items += 1
            src = it.get('src') or ''
            cited = []
            for tok in SHEET_RE.findall(src):
                if tok not in cited:
                    cited.append(tok)
            key_code = (it.get('code') or '').strip()
            emitted = 0
            for sheet in cited:
                if emitted >= MAX_SHEETS_PER_ITEM:
                    break
                reg = sheets.get(sheet)
                if not reg and not args.allow_unregistered:
                    skipped[sheet] = skipped.get(sheet, 0) + 1
                    continue
                ref = {'kind': 'plan', 'sheetId': sheet}
                if reg:
                    ref['driveId'] = reg.get('driveId')
                    ref['title'] = reg.get('title') or ('Sheet ' + sheet)
                else:
                    ref['title'] = 'See sheet ' + sheet
                # room-scoped crop first (location callout), then tag-generic
                if key_code:
                    for cand in ('SP%s-%s-%s.png' % (room, sanitize(key_code), sheet),
                                 '%s-%s.png' % (sanitize(key_code), sheet)):
                        if os.path.exists(os.path.join(REFS_DIR, cand)):
                            ref['snippet'] = 'refs/' + cand
                            break
                m = {'room': room, 'kind': 'plan',
                     'evidence': 'src provenance: %s' % src}
                m.update(ref)
                if key_code:
                    m['code'] = key_code
                else:
                    m['itemId'] = iid
                matches.append(m)
                emitted += 1
            if emitted:
                n_with += 1

    frag = {'cluster': 'plan-refs',
            'matches': matches,
            'gaps': []}
    out = os.path.join(FRAGS, 'plan-refs.json')
    json.dump(frag, open(out, 'w'), indent=1, ensure_ascii=False)
    n_snip = sum(1 for m in matches if m.get('snippet'))
    print('items %d · with plan ref %d · refs emitted %d · with snippet %d'
          % (n_items, n_with, len(matches), n_snip))
    if skipped:
        print('cited but NOT in sheets.json (skipped):',
              ', '.join('%s×%d' % kv for kv in sorted(skipped.items())))


if __name__ == '__main__':
    main()
