#!/usr/bin/env python3
"""Assemble refs/refs-spaces.json from reviewed match fragments.

The common-area refs index is ROOM-SCOPED ({"003": {"LT-05": [refs]}}) because
the kitchen-equipment numbering reuses codes across spaces for different
products ("01" is a reach-in freezer in Food Prep 007 and a refrigeration rack
in the walk-in) — a flat code map would attach the wrong cutsheet.

Inputs
  tools/out/spaces/*.json          the reviewed space docs (source of truth for
                                   which room/code/itemId combinations exist)
  tools/out/space-refs/*.json      match fragments from the audited matching
                                   passes. Shape:
                                     { "cluster": "...",
                                       "matches": [ {room, code|itemId, kind,
                                          driveId?, sheetId?, snippet?, title,
                                          note?, evidence} ],
                                       "gaps": [ {room, code|itemId, why} ] }
  tools/out/space-refs/sheets.json OPTIONAL registry sheetId -> {driveId,title}
                                   used to fill driveId/title on plan refs that
                                   name only a sheetId.

Every match must land on a line that exists — an unknown room, or a code the
room does not carry, is a HARD FAILURE naming the fragment (the apply_rulings
discipline: nothing silently no-ops). Submittal matches must carry evidence;
evidence that only repeats the folder name is exactly the failure mode that
put a faucet cutsheet on a vanity casegood, so folder names alone are refused.

Output
  refs/refs-spaces.json            room -> code -> [refs]
  tools/out/space-refs/COVERAGE.md per-space coverage + honest gap list

Usage: python3 tools/gen_space_refs.py [--floor 1] [--check]
"""
import argparse
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPACES = os.path.join(HERE, 'out', 'spaces')
FRAGS = os.path.join(HERE, 'out', 'space-refs')
OUT = os.path.join(HERE, '..', 'refs', 'refs-spaces.json')
COVER = os.path.join(FRAGS, 'COVERAGE.md')

REF_KEYS = {'kind', 'title', 'sheetId', 'driveId', 'snippet', 'note'}


def fail(msg):
    print('FAIL: ' + msg, file=sys.stderr)
    sys.exit(1)


def load_spaces(floor):
    spaces = {}
    for f in sorted(glob.glob(os.path.join(SPACES, '*.json'))):
        d = json.load(open(f))
        if floor is not None and str(d.get('floor')) != str(floor):
            continue
        num = str(d['number'])
        items = d.get('items') or {}
        by_code = {}
        for iid, it in items.items():
            code = (it.get('code') or '').strip()
            if code:
                by_code.setdefault(code, []).append(iid)
        spaces[num] = {
            'typeLabel': d.get('typeLabel', ''),
            'items': items,
            'by_code': by_code,
        }
    if not spaces:
        fail('no space docs matched under %s (floor=%r)' % (SPACES, floor))
    return spaces


def clean_ref(m, sheets, frag_name):
    kind = m.get('kind')
    if kind not in ('submittal', 'plan'):
        fail('%s: bad kind %r' % (frag_name, kind))
    ref = {'kind': kind, 'title': (m.get('title') or '').strip()}
    for k in ('sheetId', 'driveId', 'snippet', 'note'):
        v = m.get(k)
        if v:
            ref[k] = v
    # plan refs naming only a sheet get the registry's driveId + title
    if kind == 'plan' and ref.get('sheetId') and sheets:
        reg = sheets.get(ref['sheetId'])
        if reg:
            ref.setdefault('driveId', reg.get('driveId'))
            if not ref['title']:
                ref['title'] = reg.get('title', '')
            ref = {k: v for k, v in ref.items() if v}
    if not ref['title']:
        fail('%s: ref with empty title (%r)' % (frag_name, m))
    if kind == 'submittal':
        if not ref.get('driveId'):
            fail('%s: submittal without driveId (%r)' % (frag_name, ref['title']))
        ev = (m.get('evidence') or '').strip()
        if len(ev) < 20:
            fail('%s: submittal %r needs real evidence (file content / model '
                 'number), got %r' % (frag_name, ref['title'], ev))
        low = ev.lower()
        if 'folder' in low and not re.search(
                r'model|spec|sheet|page|title|drawing|labeled|lists|shows|'
                r'names|describ|match', low):
            fail('%s: submittal %r evidence cites only the folder — match on '
                 'file CONTENT, never the folder name' % (frag_name, ref['title']))
    if m.get('snippet'):
        p = os.path.join(HERE, '..', 'refs',
                         re.sub(r'^(\./)?(refs/)?', '', str(m['snippet'])))
        if not os.path.exists(p):
            fail('%s: snippet %s does not exist' % (frag_name, m['snippet']))
    return ref


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--floor', default='1')
    ap.add_argument('--all-floors', action='store_true')
    ap.add_argument('--check', action='store_true',
                    help='validate + report, do not write refs-spaces.json')
    args = ap.parse_args()

    spaces = load_spaces(None if args.all_floors else args.floor)
    sheets = {}
    reg_path = os.path.join(FRAGS, 'sheets.json')
    if os.path.exists(reg_path):
        sheets = json.load(open(reg_path))

    out = {}          # room -> code/itemId -> [refs]
    gaps = []         # honest misses for Austin
    n_matches = 0
    frag_files = sorted(f for f in glob.glob(os.path.join(FRAGS, '*.json'))
                        if os.path.basename(f) != 'sheets.json')
    if not frag_files:
        fail('no fragments in %s' % FRAGS)
    seen = set()      # (room, key, kind, driveId/snippet/title) dedupe across clusters
    for f in frag_files:
        name = os.path.basename(f)
        frag = json.load(open(f))
        for m in frag.get('matches', []):
            room = str(m.get('room', ''))
            if room not in spaces:
                fail('%s: unknown room %r' % (name, room))
            sp = spaces[room]
            key = (m.get('code') or '').strip()
            if key:
                if key not in sp['by_code']:
                    fail('%s: room %s does not carry code %r' % (name, room, key))
            else:
                key = (m.get('itemId') or '').strip()
                if not key or key not in sp['items']:
                    fail('%s: room %s has no item id %r (and no code given)'
                         % (name, room, key))
            ref = clean_ref(m, sheets, name)
            ident = (room, key, ref['kind'],
                     ref.get('driveId') or ref.get('snippet') or ref['title'])
            if ident in seen:
                continue
            seen.add(ident)
            out.setdefault(room, {}).setdefault(key, []).append(ref)
            n_matches += 1
        for g in frag.get('gaps', []):
            gaps.append((name, str(g.get('room', '')),
                         g.get('code') or g.get('itemId') or '?',
                         (g.get('why') or '').strip()))

    # plan refs sort before submittals inside each list (refs-101 convention)
    for room in out.values():
        for refs in room.values():
            refs.sort(key=lambda r: 0 if r['kind'] == 'plan' else 1)

    # coverage
    lines = ['# Common-area refs coverage — floor %s\n'
             % ('ALL' if args.all_floors else args.floor)]
    tot_items = tot_sub = tot_plan = 0
    for room in sorted(spaces):
        sp = spaces[room]
        room_refs = out.get(room, {})
        n_items = sum(1 for it in sp['items'].values() if not it.get('deleted'))
        covered_sub = covered_plan = 0
        for iid, it in sp['items'].items():
            if it.get('deleted'):
                continue
            key = (it.get('code') or '').strip() or iid
            refs = room_refs.get(key, [])
            if any(r['kind'] == 'submittal' for r in refs):
                covered_sub += 1
            if any(r['kind'] == 'plan' for r in refs):
                covered_plan += 1
        tot_items += n_items
        tot_sub += covered_sub
        tot_plan += covered_plan
        lines.append('- **%s %s** — %d lines · submittal %d · plan %d'
                     % (room, sp['typeLabel'], n_items, covered_sub, covered_plan))
    lines.append('\n**Totals: %d lines · %d with a submittal · %d with a plan ref**'
                 % (tot_items, tot_sub, tot_plan))
    if gaps:
        lines.append('\n## Gaps (no document found — honest misses, Austin supplies)\n')
        for name, room, key, why in sorted(gaps, key=lambda g: (g[1], g[2])):
            lines.append('- %s · `%s` — %s _(from %s)_' % (room, key, why, name))

    print('%d matches -> %d rooms; %d gaps; coverage %d/%d submittal, %d/%d plan'
          % (n_matches, len(out), len(gaps), tot_sub, tot_items, tot_plan, tot_items))
    if args.check:
        return
    json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False, sort_keys=True)
    open(COVER, 'w').write('\n'.join(lines) + '\n')
    print('wrote %s and %s' % (os.path.relpath(OUT), os.path.relpath(COVER)))


if __name__ == '__main__':
    main()
