#!/usr/bin/env python3
"""Emit the per-space signage schedule from the verified space/room spine.

Reads data/project.sqlite (spaces, rooms) and research/signage/space-classes.json.
Every quantity here is COUNTED off the room map, never estimated. Sign families are
assigned by space class; the requirement text and citation live in the research doc.
"""
import sqlite3, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB   = ROOT / 'data' / 'project.sqlite'
CLS  = ROOT / 'research' / 'signage' / 'space-classes.json'

# Sign families each space class receives. Codes are resolved in the research doc.
FAMILIES = {
    'Public restroom':       ['ROOM-ID-TACTILE', 'RESTROOM-SYMBOL', 'HANDWASH'],
    'Exit stair enclosure':  ['STAIR-ID', 'EXIT-TACTILE', 'FLOOR-LEVEL'],
    'Elevator / hoistway':   ['HOISTWAY-FLOOR-DESIG', 'ELEV-FIRE'],
    'Back-of-house':         ['ROOM-ID-TACTILE', 'EMPLOYEES-ONLY'],
    'Public / guest-facing': ['ROOM-ID-TACTILE'],
    'Exterior zone':         [],   # pool + site signage scheduled separately
}
# Spaces carrying an occupant-load posting (assembly use).
ASSEMBLY = {'006', '009', '018', '023', 'ZONE-B'}
# Human-readable family names for the rendered schedule.
LABEL = {
    'ROOM-ID-TACTILE': 'Room ID (tactile+Braille)', 'EMPLOYEES-ONLY': 'Restricted access',
    'RESTROOM-SYMBOL': 'Restroom door symbol', 'HANDWASH': 'Handwash notice',
    'STAIR-ID': 'Stair identification', 'EXIT-TACTILE': 'Tactile EXIT',
    'FLOOR-LEVEL': 'Floor level', 'HOISTWAY-FLOOR-DESIG': 'Hoistway floor designation',
    'ELEV-FIRE': 'Elevator fire-service', 'OCCUPANT-LOAD': 'Occupant load',
    'OCCUPANT-LOAD-LOBBY': 'Occupant load', 'ADDRESS': 'Premises address',
    'ELEC-ID': 'Electrical room ID', 'ARC-FLASH': 'Arc-flash label',
    'MECH-ID': 'Mechanical room ID', 'ELEV-MACH-ID': 'Elevator machine room ID',
    'CHEM-NFPA704': 'NFPA 704 placard', 'CHEM-SDS': 'SDS / chemical hazard',
    'FOOD-PERMIT': 'Food permit', 'ALLERGEN': 'Allergen poster',
    'CHOKING': 'Choking poster', 'LABOR-POSTERS': 'Labor law posters',
}
# Spaces whose own equipment forces extra signage.
EXTRA = {
    '007': ['HANDWASH', 'FOOD-PERMIT', 'ALLERGEN', 'CHOKING'],
    '009': ['HANDWASH'],
    '015': ['EMPLOYEES-ONLY'],
    '025': ['MECH-ID'], '030': ['MECH-ID'],
    '033': ['ELEC-ID', 'ARC-FLASH'], '219': ['ELEC-ID', 'ARC-FLASH'],
    '319': ['ELEC-ID', 'ARC-FLASH'], '419': ['ELEC-ID', 'ARC-FLASH'],
    '028': ['ELEV-MACH-ID'],
    '014': ['LABOR-POSTERS'],
    '003': ['ADDRESS', 'OCCUPANT-LOAD-LOBBY'],
    '035': ['CHEM-NFPA704', 'CHEM-SDS', 'EMPLOYEES-ONLY'],
}

# Pool-building rooms. A600 schedules doors 034/035/036 but the spaces table has no
# record of them (nor of 002 or 026) - the space spine stops at 033. They are carried
# here off the door schedule so the chemical-room signage is not lost, and FLAGGED
# because no sheet in the indexed set states their room names beyond the door schedule.
POOL_ROOMS = [
    ('034', 'Pool Storage 2',  'Back-of-house'),
    ('035', 'Pool Equipment',  'Back-of-house'),
    ('036', 'Pool Storage 1',  'Back-of-house'),
]

def main():
    con = sqlite3.connect(DB)
    spaces = {r[0]: r for r in con.execute(
        'select space_no, floor, name from spaces')}
    rooms = list(con.execute('select room_no, floor, accessible from rooms'))
    classes = {r['space_no']: r for r in json.loads(CLS.read_text())}

    if set(classes) != set(spaces):
        missing = set(spaces) - set(classes)
        extra = set(classes) - set(spaces)
        sys.exit(f'space-classes.json out of sync: missing={missing} extra={extra}')

    rows = []
    for sp, (space_no, floor, name) in sorted(
            spaces.items(), key=lambda kv: (kv[1][1], kv[0])):
        fams = list(FAMILIES[classes[sp]['kind']])
        fams += [f for f in EXTRA.get(sp, []) if f not in fams]
        if sp in ASSEMBLY:
            fams.append('OCCUPANT-LOAD')
        rows.append({'floor': floor, 'space_no': space_no, 'name': name,
                     'kind': classes[sp]['kind'], 'families': fams,
                     'source': 'spaces table'})

    for space_no, name, kind in POOL_ROOMS:
        fams = list(FAMILIES[kind]) + [f for f in EXTRA.get(space_no, [])
                                       if f not in FAMILIES[kind]]
        rows.append({'floor': '1', 'space_no': space_no, 'name': name,
                     'kind': kind, 'families': fams,
                     'source': 'A600 door schedule only - FLAGGED, no space record'})

    out = ROOT / 'research' / 'signage' / 'sign-schedule.json'
    out.write_text(json.dumps({
        'source': 'data/project.sqlite spaces+rooms (room_map.md spine, 115/115 verified)',
        'keys': len(rooms),
        'accessible_keys': sorted(r[0] for r in rooms if r[2] == '1'),
        'spaces': rows,
    }, indent=1) + '\n')

    md = ROOT / 'research' / 'signage' / 'sign-schedule.md'
    lines = [
        '# H2SEP — per-space signage schedule (generated)', '',
        '_Generated by `tools/gen_sign_schedule.py` from `data/project.sqlite`. Quantities are',
        'counted off the room map spine (115/115 keys verified by blind second extraction),',
        'never estimated. Edit the generator, not this file._', '',
        f'**{len(rows)} spaces** — {len(rows) - len(POOL_ROOMS)} from the `spaces` table plus '
        f'{len(POOL_ROOMS)} pool-building rooms carried off the A600 door schedule — plus '
        f'**{len(rooms)} guest rooms** scheduled separately.', '',
        '| Floor | Space | Name | Class | Signs required | Source |',
        '|---|---|---|---|---|---|',
    ]
    for r in sorted(rows, key=lambda r: (r['floor'], r['space_no'])):
        fams = ' · '.join(LABEL.get(f, f) for f in r['families']) or '_(scheduled separately)_'
        src = ('spaces table' if r['source'] == 'spaces table'
               else '⚠ **A600 door schedule only — no space record**')
        lines.append(f"| {r['floor']} | {r['space_no']} | {r['name']} | {r['kind']} "
                     f"| {fams} | {src} |")
    md.write_text('\n'.join(lines) + '\n')

    tally = {}
    for r in rows:
        for f in r['families']:
            tally[f] = tally.get(f, 0) + 1
    print(f'{len(rows)} spaces ({len(POOL_ROOMS)} of them pool-building, '
          f'off the door schedule) · {len(rooms)} keys')
    print(f'wrote {out.relative_to(ROOT)}')
    print(f'wrote {md.relative_to(ROOT)}\n')
    print(f"{'FAMILY':<24} SPACES")
    for f, n in sorted(tally.items(), key=lambda kv: -kv[1]):
        print(f'  {f:<22} {n}')

if __name__ == '__main__':
    main()
