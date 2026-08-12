#!/usr/bin/env python3
"""Write the reviewed submittal match fragments for floor-1 common-area spaces.

Every match here was verified against FILE CONTENT — never a folder name. That
rule exists because a folder named for one room area turned out to hold
plumbing trim cutsheets, which is how a faucet once got attached to a vanity
casegood. Sources opened and read:
- Home2-Dynamic FF&E Specifications Public Areas (Drive 1vC3HV7dT...): the
  brand tag index, 76 tags with descriptions. Its text export renders cards
  cleanly only through PA-315, so later series carry an index-level caveat.
- Home2-Dynamic Finish Specifications (183MQYdOK...): 51 finish tags.
- RK Shop Drawings & PD package (1L9WZOhjT...): per-page Item Code fields
  verified for PA-800/801(+801.1)/802.1/802.2/803/PV-36.
- Individual per-tag shop drawing PDFs (folder Austin added 8/12).
- Clevenger brochure book (1sB5dT7US...): ITEM# headers 01-26 + model strings.
- RK Finish Plan Snippet Corrections (102hEP4Ij...): Nadia Hayek's 5/7 ruling.

A second adversarial pass re-opened every cited file and refuted four matches
(PA-200 deleted from the brand book; PA-202 at Lobby 003 being a different item
than the restroom mirror; OF-705-ADA having its own book line; Clevenger having
no ITEM 31). Those are now gaps, and several evidence strings were corrected
where they overstated what a file actually says. Regenerate with:

    python3 tools/build_space_ref_fragments.py
    python3 tools/gen_space_plan_refs.py
    python3 tools/gen_space_refs.py
"""
import json, re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
FRAGS = os.path.join(REPO, 'tools', 'out', 'space-refs')
DATA = os.path.join(FRAGS, 'source-data')
cat = json.load(open(os.path.join(DATA, 'floor1-catalog.json')))['codes']
padesc = json.load(open(os.path.join(DATA, 'pa-descriptions.json')))

SPEC_FFE = dict(driveId='1vC3HV7dT-WoVHspJaZg3RvuONwmKlQi_',
    title='Home2-Dynamic FF&E Specifications Public Areas (Scheme B spec book)')
SPEC_FIN = dict(driveId='183MQYdOKoX2-yxqsoDnG1DpUvadmDSgY',
    title='Home2-Dynamic Finish Specifications - Public Areas & Guest Suites')
RK_PKG = dict(driveId='1L9WZOhjThhINv-T-nxdIAK8gjT7w-sk5',
    title='RK Hospitality Shop Drawings & PD - Tables, Reception Desk, Breakfast & Public RR Vanities.pdf')
CORR = dict(driveId='102hEP4Ij99oEEaxpJYj6KMLidiSiF57c',
    title='RK Finish Plan Snippet Corrections.pdf (Nadia Hayek ruling, 5/7)')
CLEV = dict(driveId='1sB5dT7US2uvLB4-LpSRgKpzHZ28nNZfE',
    title='Clevenger - Food Prep-Service Kitchen Equipment Cut Sheets & PD.pdf')
IND = {  # individual per-tag shop drawings (uploaded 8/12)
 'PA-800': ('1zqme1S1N1hYuwCgCbAcBpgU9GqvJcVfS', 'PA-800_Perch Table.pdf'),
 'PA-801': ('1BnLY7XQz5Lum-0rT34_QevrGgFfEjBf4', 'PA-801_Reception Desk.pdf'),
 'PA-802.1': ('19ip3WifJOHMGJeNdje-ZY3FuDgNxOtcc', 'PA-802.1_Breakfast Large Servery.pdf'),
 'PA-802.2': ('1UCFoZxK981v5NDp_r_QUDdhuO2LJ1m2w', 'PA-802.2_Breakfast Small Servery.pdf'),
 'PA-803': ('1HZ3A9kI74xyyiBt6_Iuf3Y_VTIQ_yJa_', 'PA-803_Coffee & Hydration Station.pdf'),
 'PV-36': ('1v6EonTmD3dGLAjMoOUUbswcAJjxO23tw', 'PV-36_Public Restroom Vanities 36IN.pdf'),
}

def uses(code):
    return cat.get(code, {}).get('uses', [])

def rooms_of(code):
    return sorted({u['space'] for u in uses(code)})

frags = {}
def add(frag, room, code_or_itemid, ref, evidence, by_item_id=False):
    m = dict(room=room, kind=ref.get('kind', 'submittal'), evidence=evidence)
    m.update({k: v for k, v in ref.items() if k != 'kind'})
    if by_item_id: m['itemId'] = code_or_itemid
    else: m['code'] = code_or_itemid
    frags.setdefault(frag, {'matches': [], 'gaps': []})['matches'].append(m)
def gap(frag, room, code, why):
    frags.setdefault(frag, {'matches': [], 'gaps': []})['gaps'].append(
        dict(room=room, code=code, why=why))

# ---------------- A. brand FF&E spec book: agreeing tags ----------------
# PA-200: refuted — book Summary of Changes says "PA-200 Product Deleted"
# (May-23) and no spec card exists (cards run PA-113 then PA-201). Gapped,
# not matched — citing a deleted product would be a wrong order.
AGREE = ['PA-100','PA-101','PA-102','PA-103','PA-104','PA-105','PA-106','PA-107',
 'PA-109','PA-110','PA-111','PA-204','PA-205','PA-300','PA-301','PA-302',
 'PA-303','PA-304','PA-306','PA-307','PA-309','PA-311','PA-313','PA-314','PA-315',
 'PA-316','PA-800','PA-801','PA-802','PA-803']
# PA-503/504/505/506/804/805/807 and the whole OF-7xx run: the brand book's
# Drive text export renders cleanly only through PA-315, then degenerates —
# these tags were verified at INDEX level (tag + one-line description) but
# their underlying spec CARD (vendor/dimensions/finish) could not be
# independently re-read. Carried with that caveat rather than as a plain match.
EXPORT_TRUNCATED = ['PA-503','PA-505','PA-506','PA-804','PA-805','PA-807',
 'OF-700','OF-701','OF-702','OF-703','OF-704','OF-705','OF-706','OF-707','OF-708',
 'OF-709','OF-710','OF-711','OF-712','OF-713','OF-714','OF-715','OF-716','OF-718','OF-719']
TRUNC_NOTE = ' Spec CARD (vendor/dims/finish) not independently re-verified — Drive text export degrades past PA-315; pull the PDF page before a PO.'
ODD_LOC = {'PA-111': 'Brand card says Meeting Room Stack Chair; ID-1.7 tags it in the Lobby.',
 'PA-309': 'Brand card is the Employee Breakroom table; ID-1.7 also tags it at Breakfast.',
 'PA-311': 'Brand card says Food Delivery Pick-Up Console; A510.3 places the tag at Fitness 023.',
 'PA-110': 'Brand card is the Employee Breakroom chair; also tagged at Breakfast 006.'}
# PA-204: book says "Wall Sconce @ Guest Corridor"; the 121 item is drawn as
# a ceiling fixture — mounting divergence the crew should verify before install.
MOUNT_FLAG = {'PA-204': ' Book names it a WALL sconce; verify against the drawn ceiling mount before install.'}
for code in AGREE + EXPORT_TRUNCATED:
    d = padesc.get(code, '')
    for room in rooms_of(code):
        note = 'Brand spec book identifies this tag: ' + d if d else None
        ref = dict(**SPEC_FFE)
        if note:
            note += (' — ' + ODD_LOC[code] if code in ODD_LOC else '')
            note += MOUNT_FLAG.get(code, '')
            if code in EXPORT_TRUNCATED: note += TRUNC_NOTE
            ref['note'] = note
        add('ffe-brand-spec', room, code, ref,
            "Spec book index lists '%s  %s' (Dynamic-Scheme B, Public Area); tag and product family match the plan tag placement." % (code, d))
gap('ffe-brand-spec', '003', 'PA-200',
    "Brand book Summary of Changes: 'PA-200 Product Deleted' (May-23); no spec card exists (cards run PA-113 then PA-201). Identity unresolved — do not order from the stale index row. Austin to identify the replacement/current product.")
# OF-705.ADA: the book carries its OWN line "OF-705-ADA  ADA Table @
# Grilling Patio" — a dedicated entry, not a variant note on the OF-705 card.
# Also corrected: the catalog records this tag on ID-1.7 only, not AS104.
for room in rooms_of('OF-705.ADA'):
    add('ffe-brand-spec', room, 'OF-705.ADA',
        dict(note='Brand book index: "OF-705-ADA  ADA Table @ Grilling Patio" — its own line item, not a variant of the OF-705 "2 Top Table" card.' + TRUNC_NOTE, **SPEC_FFE),
        "Spec book index carries a dedicated 'OF-705-ADA ADA Table @ Grilling Patio' line (distinct from OF-705); tag printed on ID-1.7.")

# collisions: RK ID-set identity ≠ brand-book identity — attach with the collision spelled out
# PA-202 collision is room-specific: at 019/020/023/027 it's the restroom
# vanity mirror (the swap is real, confirmed against the book). At 003 it's a
# DIFFERENT item — a ceiling/lighting feature zone over Breakfast/Lobby/
# Market — so the mirror-vs-light swap does not apply there; gapped instead.
PA202_MIRROR_ROOMS = ['019', '020', '023', '027']
for room in PA202_MIRROR_ROOMS:
    add('ffe-brand-spec', room, 'PA-202',
        dict(note='TAG COLLISION — RK sheets use PA-202 as the DECORATIVE MIRROR above the restroom vanity (ID-3.4); the brand spec book card PA-202 is \'Bathroom Vanity Light\' and PA-502 is \'Bathroom Mirror\' — the two numbering systems swap the pair. Confirm which card governs before ordering.', **SPEC_FFE),
        "Spec book index: 'PA-202 Bathroom Vanity Light' / 'PA-502 Bathroom Mirror'; catalog label at this room is the mirror — exact swap documented.")
gap('ffe-brand-spec', '003', 'PA-202',
    "Brand book PA-202 = 'Bathroom Vanity Light' (a restroom fixture — that identity governs at 019/020/023/027 instead, as a documented tag-numbering collision with PA-502). At Lobby 003 the same code tags something else entirely — a dashed decorative ceiling/lighting feature zone over Breakfast/the Lobby lounge/near Market — that identity is in neither the book nor ID-1.7. Austin to identify the 003 fixture.")
COLLIDE = {
 'PA-502': ("RK sheets use PA-502 as the DECORATIVE SCONCE above the vanity; brand book PA-502 is 'Bathroom Mirror' (PA-202 is the vanity light) — swapped pair. Confirm before ordering.",
            "Spec book index: 'PA-502 Bathroom Mirror'; catalog label is the sconce — swap documented."),
 'PA-400': ("Brand book PA-400 = 'Roller Shade @ Lobby & Fitness Room (Curtain Wall)'. ID-1.13 prints 'PA-400 - typical at all corridor windows' with no description — identity was recorded as unresolved. The brand card resolves the PRODUCT (roller shade); the corridor placement is RK's.",
            "Spec book index: 'PA-400 Roller Shade @ Lobby & Fitness Room (Curtain Wall)'."),
 'PA-401': ("Item drawn as a decorative pendant (ID-3.1); brand book PA-401 = 'Roller Shade @ Fitness (Framed Windows) & Breakroom' — tag numbering diverges. Confirm which governs.",
            "Spec book index: 'PA-401 Roller Shade @ Fitness (Framed Windows) & Breakroom'; plan usage is a pendant — collision documented."),
 'PA-402': ("Item drawn as the meeting-room stacking chair (ID-1.7 x4); brand book PA-402 = 'Roller Shade @ Sales, Boardroom, & Meeting Room' — collision; brand PA-111 is the stack chair. Confirm.",
            "Spec book index: 'PA-402 Roller Shade @ Sales, Boardroom & Meeting Room' vs plan usage stacking chair."),
 'PA-501': ("ID-1.13 calls PA-501 the elevator-lobby console/feature piece; brand book PA-501 = 'Decorative Mirror @ Guest Elevator Lobbies'. Same location, different product family — confirm which card governs.",
            "Spec book index: 'PA-501 Decorative Mirror @ Guest Elevator Lobbies'."),
 'PA-310': ("ID-4.7 keys PA-310 to the meeting-room credenza (M18); brand book PA-310 = 'Towel Station @ Fitness' — collision. Confirm.",
            "Spec book index: 'PA-310 Towel Station @ Fitness' vs ID-4.7 credenza keying."),
}
for code, (note, ev) in COLLIDE.items():
    for room in rooms_of(code):
        add('ffe-brand-spec', room, code,
            dict(note='TAG COLLISION — ' + note, **SPEC_FFE), ev)
# spec-book absentees
for room in rooms_of('PA-117'):
    gap('ffe-brand-spec', room, 'PA-117',
        'Tag absent from the brand spec book index AND from ID-1.7; identity unknown. Austin to identify.')
for room in rooms_of('ACB-001'):
    gap('ffe-brand-spec', room, 'ACB-001',
        'Acoustic baffle ceiling over the front desk (ID-4.1). No baffle-ceiling submittal on the Drive; brand spec book does not carry ACB. Austin to supply the baffle submittal.')

# ---------------- B. RK shop drawings (verified page-level) ----------------
SD = {
 'PA-800': "Package page P21: Item Code PA-800, 'Perch Table', 197\"W×21\"D×34\"H, Wilsonart High Line 7970K-18 / PL-02, Tiger Drylac Sparkle Silver.",
 'PA-801': "Package pages P22-P26: Item Code PA-801 (+PA-801.1) 'Reception Desk' 138\"W×90\"D×42\"H, quartz Daltile One Simply White, Wilsonart 5th Ave Elm 7966K-12.",
 'PA-803': "Package pages P35-P36: Item Code PA-803 'Coffee & Hydration Station' 220¾\"W, quartz Daltile One Simply White.",
}
SD_NOTE = {
 'PA-800': 'Drawing note: "table is sandwiched between two walls, clearance space need to be verified on site" — field-verify the 197" wall-to-wall opening before this ships.',
 'PA-801': 'Drawing\'s own plan view prints 121" [3073mm] overall — the 90"D title-block figure reads as a leg depth, not the footprint; treat 138"W×121"D (=11\'-6"×10\'-1", matching the plan) as governing and field-verify. RK also has an open question on-sheet about clearance for 2 printers + 2 CPUs at the desk — unanswered as of the drawing.',
 'PA-803': 'Title block is self-contradictory: page P35 prints 220¾"W, page P36 (same item) prints 234"W — confirm the real width with RK before ordering.',
}
for code, ev in SD.items():
    ind = IND.get(code)
    for room in rooms_of(code):
        add('ffe-shop-drawings', room, code, dict(note=SD_NOTE.get(code), **RK_PKG), ev)
        if ind:
            add('ffe-shop-drawings', room, code,
                dict(note=SD_NOTE.get(code), driveId=ind[0], title=ind[1] + ' (individual shop drawing)'), ev)
# PA-802 variants
for room in rooms_of('PA-802'):
    for var in ('PA-802.1', 'PA-802.2'):
        i = IND[var]
        add('ffe-shop-drawings', room, 'PA-802',
            dict(driveId=i[0], title=i[1] + ' (individual shop drawing)',
                 note='Two servery variants exist (Large 245"W / Small 96"W) — verify which one ID-4.4/A902 shows for this breakfast bar before fabrication.'),
            "Package pages P27-P34 carry Item Codes PA-802.1 'Breakfast Large' and PA-802.2 'Breakfast Small servery'; both included, variant unconfirmed.")
    add('ffe-shop-drawings', room, 'PA-802', dict(**RK_PKG),
        "Package pages P27-P34: Item Codes PA-802.1/PA-802.2 Breakfast serveries with quartz tops (ST-01) and Wilsonart High Line finishes.")
# PV-36 restroom vanities → the untagged vanity lines
VAN = {'019': 'x_3c0fa3ac74', '020': 'x_3c0fa3ac74', '027': 'x_7763127bea'}
PV36_NOTE = ("Quantity 3 PCS on the drawing — one per public restroom (Womens 019 / Mens 020 / Unisex 027), but A520's own vanity elevations "
 "carry a lavatory run L-01A/L-01B/L-01C — verify vanity count/length per restroom against A520 before ordering, a single 36\" unit each may not be "
 "the full run. Unresolved fabricator questions still on the sheet: drawn 'only splash back' vs. a handwritten note 'NEED SPLASH ALL 3 SIDES'; "
 "'if sink the same with Vanity's OK?'; and 'QUARTZ TOP WILSONART TBD' — get splash config, sink model, and top spec answered before fabrication.")
for room, iid in VAN.items():
    add('ffe-shop-drawings', room, iid,
        dict(driveId=IND['PV-36'][0], title=IND['PV-36'][1] + ' (individual shop drawing)', note=PV36_NOTE),
        "Package page P38: Item Code PV-36 'Public Restroom Vanities 36\"' 36\"W×24\"D×36\"H, 3 PCS, quartz top Wilsonart TBD — matches the A510.1 keyed-note-43 vanity lines.",
        by_item_id=True)
    add('ffe-shop-drawings', room, iid, dict(note=PV36_NOTE, **RK_PKG),
        "Same PV-36 drawing inside the combined RK package (page P38).", by_item_id=True)
# 004 reception desk (untagged M1 + KN 9)
DESK_NOTE = ("Title-block prints 138\"W×90\"D×42\"H, but the drawing's own plan view prints a 121\" [3073mm] overall dimension — the 90\"D title-block "
 "figure reads as a leg depth, not the footprint. The plan's M1 desk reads 11'-6\" (=138\") × 10'-1\" (=121\"), matching the drawing's own plan view — "
 "treat that as the governing L-shaped footprint and field-verify on site. RK also has an open question on-sheet about clearance for 2 printers + "
 "2 CPUs at the desk, unanswered as of the drawing.")
add('ffe-shop-drawings', '004', 'x_0ceab1a614',
    dict(driveId=IND['PA-801'][0], title=IND['PA-801'][1] + ' (individual shop drawing)', note=DESK_NOTE),
    "Shop drawing Item Code PA-801 'Reception Desk', L-configuration with quartz top and integrated power/data — the same piece the A900/ID-4.1 M1 desk describes.",
    by_item_id=True)
add('ffe-shop-drawings', '004', 'KN 9', dict(**RK_PKG),
    "A510.1 keyed note 9 'REGISTRATION DESK... refer to FF&E package' — the FF&E package's reception-desk pages are P22-P26 (Item Code PA-801).")
# tables: package title says Tables but those pages are image-encoded
for code in ('PA-300','PA-301','PA-302','PA-303','PA-304','PA-306','PA-307','PA-309','PA-313','PA-314','PA-315'):
    for room in rooms_of(code):
        gap('ffe-shop-drawings', room, code,
            "RK package title includes 'Tables' but its table pages (P1-P20) are image-encoded — coverage of %s not verifiable from text. Brand spec card attached instead; shop-drawing confirmation pending." % code)

# ---------------- C. Clevenger food-service book ----------------
# (verified via ITEM# headers and model strings in the extracted text)
CLE = {
 ('009','01'): "Brochure header 'ITEM# 01 - REFRIGERATION RACK (1 EA REQ'D) OmniTemp OTA1-AC-H-2-0-3-4' — matches the 009 rack line (OMNI, 208V).",
 ('007','02'): "Brochure header 'ITEM# 02 - WALK-IN COOLER / FREEZER ASSEMBLY' American Panel CUSTOM — matches both 007 walk-in lines.",
 ('007','04'): "Brochure header 'ITEM# 04 - MOBILE WORK TABLE' — custom fabricated, as the item label says.",
 ('007','05'): "Header ITEM# 05 UNDERCOUNTER DISHMACHINE header itself specs Champion UH-230B; the crew label UH-100B matches only a separate tab line, not the header — in-book model conflict, confirm the governing dishmachine model with Clevenger before rough-in.",
 ('007','06'): "Header ITEM# 06 DISHTABLE RACK SHELF + 'DT-6R-11' ×4 in book text — matches Advance Tabco DT-6R-11.",
 ('007','07'): "Header ITEM# 07 WALL SHELF + Metro model '2436NK3' ×4 in text — the three 007 wall-shelf variants are Metro K3-series.",
 ('007','11'): "Header ITEM# 11 MOBILE COOLER/FREEZER SHELVING + 'METROMAX' ×61 in text — Metro MetroMax Q.",
 ('007','12'): "Header ITEM# 12 UTENSIL RACK W/ SHELF + 'PS-12-60' ×5 — Advance Tabco PS-12-60.",
 ('007','13'): "Header ITEM# 13 WORKTABLE WITH SINK — custom fabricated.",
 ('007','14'): "Header ITEM# 14 COFFEE MAKER + model 'CBS-2152XTS' in text — FETCO CBS-2152XTS (operator furnished).",
 ('009','14'): "Same ITEM# 14 COFFEE MAKER FETCO CBS-2152XTS brochure — the servery placement of the same schedule item.",
 ('007','15'): "Header ITEM# 15 WALL SHELF — Metro, high mount.",
 ('007','16'): "Header ITEM# 16 CONVECTION OVEN — text layer has 'Moffat E33D5 Item #16' and 'USE33D5-H2' repeated on the Revised 03/2025 pages, consistent with the Moffat Turbofan E33D5H2 label on A513/A514.",
 ('007','17'): "Header ITEM# 17 WALL SHELF — custom fabricated.",
 ('007','18'): "Header ITEM# 18 WORKTOP REFRIGERATOR + True models TWT-67-HC / TWT-67D-2-HC / TWT-67D-4-HC / TWT-67F-HC in text. NOTE: A514 prints TWT-67~SPEC1 vs A513/A513.1 TWT-67-HC~SPEC3 (model-variance flag D7).",
 ('007','19'): "Header ITEM# 19 STORAGE SHELVING - WALK IN PLAN + METROMAX — Metro MetroMax Q.",
 ('008','19'): "Same ITEM# 19 STORAGE SHELVING brochure — dry-storage placement.",
 ('007','20'): "Header ITEM# 20 CONVECTION OVEN — optional second oven, same Moffat basis as item 16.",
 ('007','21'): "Header ITEM# 21 SPEED RACK - DRY STORAGE PLAN + '207-UA' ×5 — Cres Cor 207-UA-13A.",
 ('007','22'): "Header ITEM# 22 MICROWAVE OVEN WITH SHELF + 'HDC12A2' ×10 and 'BMS2024' ×10 — Amana HDC12A2 with BMS2024 shelf (variance note D7 on record).",
 ('009','23'): "Header ITEM# 23 BATTER MIX STARTER KIT — operator furnished.",
 ('009','24'): "Header ITEM# 24 WAFFLE MAKER — the book's own header/body pages spec 'Golden Malted RRT Series (BY VENDOR)' (Carbon's Golden Malted spec pages); the crew label 'Wells BWB-1SE' matches only a tab line, conflicting with the book's specified vendor unit. Confirm the governing unit with Clevenger/the operator before ordering.",
 ('009','25'): "Header ITEM# 25 WAFFLE MAKER (FUTURE) — same Golden Malted RRT Series vs. Wells BWB-1SE tab-line conflict as item 24.",
 ('009','26'): "Header ITEM# 26 CONVEYOR TOASTER + 'ECO 4000' ×3 — APW Wyott ECO 4000-350L-HILTON.",
}
for (room, code), ev in CLE.items():
    add('food-service', room, code, dict(**CLEV), ev)
# Codes 01/02/27/28/29/30/32/33/34/35/36/37/39 are NOT gaps — the brochure book
# lacks them but both Clevenger equipment FLOOR PLANS carry them with models and
# rough-ins; they are attached in the equipment-found cluster above.
CLE_GAP = {
 ('006','31'): "UNDERCOUNTER DISPLAY REFRIGERATOR True TUC-27G-ADA-HC — the brochure book has NO Item 31 (items stop at 26); the only 'TUC-27G' hit is 'TUC-27G-HC~SPEC3' inside a ~30-model family list printed on the ITEM# 18 True TWT-67 worktop-refrigerator brochure, and 'TUC-27G-ADA-HC' itself never appears. Neither Clevenger floor plan carries a 31 either. Austin to supply the real cut sheet.",
}
for (room, code), why in CLE_GAP.items():
    gap('food-service', room, code, why)

# ---------------- D. finishes ----------------
FIN_OK = ['CPT-10','CPT-10.1','CPT-11','CPT-12','CPT-12.1','FILM-01','PT-01','PT-03',
 'PT-04','PT-05','PT-07','PT-08','RB-10','RB-11','RB-12','RF-10','RF-11','ST-01',
 'T-01','T-01.1','T-04','T-10','T-13','VCT-10','WC-01','WC-02','WC-10','WC-11',
 'WC-12','WC-13','WC-14','WC-15','WP-10','PL-01']
for code in FIN_OK:
    for room in rooms_of(code):
        note = None
        ev = "Finish tag %s appears in the Home2-Dynamic finish specification book (extracted tag set includes it); labels' Supp A/B manufacturer notes trace to the same schedule family." % code
        if code == 'WC-15':
            # index-only placeholder — no spec card exists (Delta-2 "Coming
            # Soon"). The generic "appears in the book" claim overstates
            # this; Nadia's ruling is what actually governs.
            note = "Nadia Hayek (RK, 5/7): WC-15 on ID4.5 detail 2 is a TYPO — WC-15 was removed from Hilton specs; continue with WC-11."
            ev = "Finish book indexes WC-15 as a placeholder only (Delta-2, 'Wallcovering @ Breakfast Servery Entry Wall', revision log 'Coming Soon' — no spec card). Nadia Hayek's ruling (5/7) governs: continue with WC-11, never install from a WC-15 card."
        add('finishes', room, code,
            dict(note=note, **SPEC_FIN) if note else dict(**SPEC_FIN), ev)
# CPT-12.ALT: book scopes the ALT card to BOH only (p.16, "Alternate Carpet
# Tile @ BOH"); stairwell carpet is CPT-12. Rooms 100/141 are stairwells
# tagged CPT-12.ALT on the plan — flag the scope mismatch rather than
# asserting the BOH card governs.
for room in rooms_of('CPT-12.ALT'):
    add('finishes', room, 'CPT-12.ALT',
        dict(note="Book scopes CPT-12.ALT to BOH ONLY (p.16, 'Alternate Carpet Tile @ BOH') — this room is a stairwell tagged with the same code on the plan. Verify with RK/Austin whether the stairwell alternate is really this BOH product or a different, undocumented alternate before ordering.", **SPEC_FIN),
        "CPT-12.ALT is a registered book tag with its own spec card (p.16); its scope is BOH, not stairwells — flagged as a mismatch rather than a clean match.")
# Nadia's ruling attached where the ruled room actually carries the line
NADIA = {
 ('021','PT-03'): "Ruling list: 'Engineer – 021 (just see one wall PT-03): PT-03' — confirms the wall paint.",
 ('100','T-01'): "Ruling + attachment rule floor tile in lieu of carpet at 1st-floor stair landings/exits only (not treads). The email body itself does not name T-01 (book's T-01 area is Lobby/Guest Suite Entry/Bath) — the code is recorded on the referenced field-markup attachment ('26.05.07 Home2 EaglePass 1st FL Stairwell Floor finish.pdf'), not verbatim in the email text.",
 ('141','T-01'): "Same first-floor stair-landing tile ruling and same attachment caveat.",
 ('100','CPT-12'): "Ruling: tile replaces carpet at the first-floor landing ONLY — the stairwell carpet stays on the treads/upper flights; competing-finish flag on this line is resolved by the ruling for the landing.",
 ('141','CPT-12'): "Same landing-vs-treads carpet ruling.",
 ('023','WC-11'): "Ruling: 'Lobby side and wall area before entering Fitness room - WC-11' — covers the LOBBY-SIDE entry wall only. Do not extend WC-11 inside room 023 itself — the book specifies WC-14 (Fitness Center, still 'Coming Soon' with no card) for the interior fitness walls.",
 ('005','WC-15'): "Ruling: WC-15 is a typo (removed from Hilton specs) — continue with WC-11.",
}
for (room, code), ev in NADIA.items():
    add('finishes', room, code, dict(**CORR), ev)
FIN_GAP = {
 'CPT-13': "Not in the Home2-Dynamic finish book's tag set — RK project-added carpet; Austin to supply the spec/submittal.",
 'RF-15': "Not in the finish book's tag set (RF-10/RF-11 are) — tag as printed at Fitness; verify whether RF-15 is a misprint of RF-10.",
 'T-05': "Not in the finish book's tag set — Austin to supply.",
 'T-21': "Not in the finish book's tag set — Austin to supply.",
 'VCT-15': "Not in the finish book's tag set (VCT-10 is) — verify tag.",
 'WC-01.1': "Tag as printed WC-01.1 — book carries WC-01 only; the .1 variant is unregistered. Verify against WC-01 card.",
 'WC-04': "Tag printed stacked under WC-11 at identical position (pre-existing flag) — book carries WC-02 but the placement is suspect; verify before ordering.",
}
for code, why in FIN_GAP.items():
    for room in rooms_of(code):
        gap('finishes', room, code, why)

# ---------------- E-pre. documents found by the gap re-check ----------------
# A second sweep re-opened the whole Drive against every recorded gap and found
# real coverage the first pass missed — mostly because it searched the wrong
# book (the acoustic baffle is in the FINISH book, not the FF&E one) or the
# wrong file family (laundry models live in the PLUMBING fixture schedule, and
# the food-service models absent from the brochure book are on the two
# equipment FLOOR PLANS). Where the found document names a DIFFERENT model than
# the architectural schedule, the ref is attached with the conflict stated —
# the crew needs to see both numbers, not one silently chosen.
P104 = dict(driveId='1QzVFDBVbxfFxK7KwolAisq035s8Z75om',
    title='P104 — Plumbing Fixtures Schedule (mfr + model for laundry equipment)')
CLEV_PLAN_A = dict(driveId='10pYlvp8hekjqqfpJHiWqQkZpQ-FHrG6d',
    title='Clevenger FS Equipment Floor Plan — Standard / End Load (equipment schedule w/ models + rough-ins)')
CLEV_PLAN_B = dict(driveId='1HLDH5AT6lDZHbYIkcxmPHd7xnuJHi0UE',
    title='Clevenger FS Equipment Floor Plan — Optional Center Load (equipment schedule w/ models + rough-ins)')
KALISHER = dict(driveId='1nat4040zyhiVEI1ZIlB4f-5iUrzGj95D',
    title='Kalisher — Art Imagery Submittal.pdf (per-piece image codes)')

LAUNDRY = {
 ('015','401'): ("Schedule mark LAU-1 'Commercial Washer (Laundry)' = Unimac UWN065T, 9.7 cu.ft front load.", None),
 ('016','402'): ("Schedule mark DRY-1 'Commercial Dryer (Laundry)' = Unimac UTT45 stack double, 2×95 MBH, 240V/3/60.", None),
 ('024','406'): ("Schedule mark LAU-2 'Guest Washer (Laundry)' = Maytag MHN33PR with smart-card pay — the guest/coin-op washer.", None),
 ('024','407'): ("Schedule mark DRY-2 'Guest Dryer (Laundry)' = Maytag MDE28PR, 240V/1/60 30A.", None),
 ('015','409'): ("P104 specs only a FRONT-load commercial washer (LAU-1 Unimac UWN065T).",
   "CONFIGURATION CONFLICT — A510.3 calls this line a TOP-LOAD washer, but P104 schedules only a front-load unit and A510.1 keyed note 60 requires front load. RFI the configuration before buying."),
}
for (room, code), (ev, note) in LAUNDRY.items():
    add('equipment-found', room, code, dict(note=note, **P104) if note else dict(**P104), ev)

# Food-service models absent from the brochure book but present on both
# equipment floor plans. Both load schemes are attached: which one governs is
# Austin's call, and they agree on these models.
FS_PLAN = {
 ('008','01'): ("Equipment schedule (DRY STORAGE): '01  1  MOBILE REACH-IN FREEZER  TRUE T-49F-HC' — exact model match.", None),
 ('008','02'): ("Equipment schedule: '02  2  MOBILE REACH-IN REFRIGERATOR  TRUE T-49-HC'; the End-Load plumbing schedule prints TRUE TS-49-HC — same unit family as the item label.", None),
 ('007','32'): ("'32  1  UNIT COOLER (COOLER)  OMNITEMP KLP106MA-S1D' — exact model match, with 120V/1.4A JBOX rough-in (wiring detail 5/FS-2).", None),
 ('007','33'): ("'33  1  UNIT COOLER (FREEZER)  OMNI KLP106LE-S2D' — exact model match, 208V/4.6A JBOX.", None),
 ('009','27'): ("'27  1  DISPLAY SHOWCASE  EQUIPEX WD780B-2/1' — exact model match, 120V/15.0A dedicated circuit.", None),
 ('009','29'): ("'29  1  WARMING KETTLE (OPTIONAL)  VOLLRATH 72017' — exact model match, 120V/6.7A.", None),
 ('006','34'): ("'34  1  YOGURT DISPENSER (BY VENDOR)  PERFECT PARFAIT PPHG1BK', 120V/1.4A.",
   "Identity resolved here: this tag is printed on A513/A514 with no description — the Clevenger equipment schedule is the only document that defines it."),
 ('006','39'): ("'39  1  WARMING KETTLE (DROP-IN)  VOLLRATH 74701D'.",
   "Identity resolved here: tag printed with no description on A513/A514; the Clevenger equipment schedule defines it."),
 ('009','28'): ("'28  1  JUICE DISPENSER (BY VENDOR)  NESTLE VITALITY EXPRESS'.",
   "MODEL CONFLICT — A513 says Bunn JDF-4, this schedule says Nestle Vitality Express. Vendor-furnished either way; confirm which schedule governs before rough-in."),
 ('006','30'): ("'30  1  CEREAL DISPENSER  CAL MIL 22067-1-110'.",
   "MODEL CONFLICT — A513 says Server Products 88920, this schedule says Cal-Mil 22067-1-110. Confirm which governs."),
 ('009','35'): ("'35  1  REACH-IN DISPLAY FREEZER  TRUE GDM-23F-HC-TSL01-SS'.",
   "MODEL CONFLICT — A513 says True TS-23FG-HC. Confirm which governs before ordering."),
 ('009','36'): ("'36  1  REACH-IN DISPLAY REFRIGERATOR  TRUE GDM-49-HC-TSL01'.",
   "MODEL CONFLICT — A513 says True TSD-47G-HC-LD. Confirm which governs before ordering."),
 ('009','37'): ("'37  1  WATER DISPENSER  MARCO FRIIA HCS'.",
   "MODEL CONFLICT — A513 says Vivreau VI-TAP-1H. Also dimension-critical: the PA-803 millwork cutout is sized for a 32⅝\"W dispenser — check the winning unit fits before fabrication."),
}
for (room, code), (ev, note) in FS_PLAN.items():
    for plan in (CLEV_PLAN_A, CLEV_PLAN_B):
        add('equipment-found', room, code, dict(note=note, **plan) if note else dict(**plan), ev)

# Acoustic baffle ceiling: the FINISH book carries the ACB card (the first
# pass searched the FF&E book and wrongly concluded no ACB spec exists).
add('equipment-found', '004', 'ACB-001', dict(
    note="Card names the product outright: MDC Interior Solutions Zintra Standard Baffle System, HLTN3212 Pebble, 4\"W × 108\"L × ½\" thick, Class A, NRC 0.45–0.95.", **SPEC_FIN),
    "Finish book page 7 IS an ACB-01 card: 'Acoustic Ceiling Baffles', Area 'Reception Desk Ceiling' — matches the M2 baffle ceiling over the front desk.")

# Public art: the Kalisher submittal carries per-piece image codes.
ART = {
 ('003','PA-503'): "Kalisher submittal covers PA-503 (Meeting Space Artwork) as PA-503A/B/C with image codes K-621349 / K-620614 / KFS-983140-h2epM1C1.",
 ('003','PA-505'): "Kalisher submittal covers PA-505 (Guest Engagement Wall) as PA-505A–H, incl. the KLC-021860pu and KFS-370101-121 series.",
}
for (room, code), ev in ART.items():
    add('equipment-found', room, code, dict(**KALISHER), ev)

# ---------------- E. equipment with no document on Drive ----------------
NO_DOC = {
 '432': 'ICE DISPENSER (139) — no ice-machine submittal on Drive; outside both Clevenger schemes (their scope is Food Prep / Dry Storage / Servery), and P501\'s "ice box" detail is plumbing rough-in only, not an equipment spec.',
 '303': 'SAFE (004) — owner/operator equipment; no document on Drive.',
 '304': 'LOCKER (013) — accessible-locker compliance noted on A510.3; no submittal on Drive.',
 '300': 'SHELVING (011) — no document.',
 '404': 'STORAGE SHELVING (017) — no document.',
 '403': 'WALL MOUNTED TELEVISION (020) — no TV submittal on Drive.',
 '431': 'WALL-MOUNTED TV (014) — none.',
 '813': 'WALL MOUNTED TELEVISION (023) — none.',
 '820': 'HYDRATION STATION (020) — plumbing-adjacent; no cutsheet on Drive.',
 '821': 'BOTTLE FILLING STATION (137) — none.',
 '400': 'FIRE PIT WITH FITTED SCREEN (ZONE-A) — not in the brand OF index; no cutsheet on Drive.',
 '408': 'DECORATIVE TRASH CAN (014/024) — brand PA-804 Trash & Recycling card exists for 006; these BOH cans have no document.',
}
for code, why in NO_DOC.items():
    for room in rooms_of(code):
        gap('equipment-nodoc', room, code, why)
FITNESS_LEAD = {
 '800': ' Possible lead: the brand PA-310 "Towel Station @ Fitness" card (Elkay Interior Systems, 72"W×18"D×64"H) is specified "to Accommodate Required Accessory Items: Laundry Basket" — this hamper may be that basket rather than a separate buy. Confirm with RK.',
 '816': ' Possible lead: the brand book indexes "PA-506 Fitness Wall Hooks" (added Jun-23) and ID-3.2 places PA-506 in Fitness, but the card body is an image page that could not be read — pull that page to confirm before ordering separately.',
}
for code in ('803','804','805','806','807','808','809','810','811','812','814','816','817','819','800','801','802'):
    for room in rooms_of(code):
        gap('equipment-nodoc', room, code,
            'Fitness equipment/accessory (A510.3 furnishing list) — no fitness-equipment submittal on the Drive; A510.3 points at fitness.hilton.com approved vendors, i.e. an owner-direct package. Austin to supply.'
            + FITNESS_LEAD.get(code, ''))
# bath accessories: models still awaiting Austin (bath-research.md)
for code in ('HD-01','HD-06A','HD-06B','HD-06C','HD-12','HD-13','HD-15','HD-19','HD-31','HD-38'):
    for room in rooms_of(code):
        gap('equipment-nodoc', room, code,
            'Bath accessory per the A530 legend — manufacturer/model NOT on the drawings and no accessory submittal on Drive (Bobrick unconfirmed; research/bath-research.md). Austin to supply the accessory schedule.')

# ---------------- write ----------------
os.makedirs(FRAGS, exist_ok=True)
for name, frag in frags.items():
    frag['cluster'] = name
    path = os.path.join(FRAGS, name + '.json')
    json.dump(frag, open(path, 'w'), indent=1, ensure_ascii=False)
    print('%-18s matches=%-3d gaps=%d' % (name, len(frag['matches']), len(frag['gaps'])))
