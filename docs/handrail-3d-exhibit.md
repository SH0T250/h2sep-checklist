# Entrance handrail 3D mock-up — `handrail-3d.html`

Standalone, self-contained 3D exhibit of the new pedestrian handrail proposed on
**both sides of the hotel entrance drive** at Home2 Suites, Eagle Pass (H2SEP),
where the sidewalk crosses the culvert headwall and there is an open dropoff to
the riprap ditch.

Open `handrail-3d.html` directly (file:// or any static host). No build step, no
network: three.js r128 + OrbitControls are vendored inline, same as `room-3d.html`.
It is intentionally **not** added to the service-worker precache — it is an
exhibit, not part of the checklist app.

## Where the rail geometry comes from

Modeled from **TxDOT PRD-13, Pedestrian Handrail Details (3 sheets)** — the same
standard on the plan sheet in the civil set (STANDARD DETAILS SHEET 3 OF 3,
TerraTech Engineering, 5/30/2023).

| Item | Per PRD-13 |
| --- | --- |
| Posts | 2½″ std pipe (2.875″ O.D., 0.203″ wall), plumb, **5′-0″ post spacing usual & max** |
| Rails | 1½″ std pipe (1.900″ O.D., 0.145″ wall), parallel to walk |
| Pickets (TY C / TY E) | ⅝″ dia round bar, equal spacing **4½″ max** |
| Base plate | ½″ A36, 7½″ × 7½″, four ¾″ dia epoxy anchors, 5″ embedment |
| End returns | 3″ R bends |
| Panel length | 30′-10″ max, splice joint requires two posts min each side |
| Finish | A53 Gr. B pipe / A36 plate & bar, galvanized after fabrication |

Rail types modeled (heights above top of ramp/sidewalk):

| Type | Infill | Top rail | Notes |
| --- | --- | --- | --- |
| **TY F** | 8 rails @ 5¼″ o.c. (7 spa = 3′-0¾″), bottom rail 4⅝″ | 3′-5⅜″ | for 30″+ dropoff — **matches the TxDOT rail across the highway** |
| TY E | ⅝″ pickets, 2′-7½″ picket zone | 3′-5⅜″ | for 30″+ dropoff |
| TY D | 7 rails @ 5¼″ o.c. (6 spa = 2′-7½″) | 3′-0⅛″ | dropoff under 30″ |
| TY B | 3 rails (4⅝″, 1′-8⅜″, 3′-0⅛″) | 3′-0⅛″ | dropoff under 30″ |

PRD-13's recommended-usage table: dropoff under 30″ → TY A/B/C/D; **30″ or more,
or along a bike path → TY E or TY F**. The headwall at this entrance is modeled
at a ±3′-6″ dropoff, which puts it in the TY E / TY F range, and TY F is what is
already installed across the highway — so TY F is the default shown.

The optional ADA handrail (1½″ pipe at 3′-0⅛″, PRD-13 note 9) is off by default:
the walk across the culvert is flat, so it is only required if the adjacent ramp
grade hits 5% or greater.

## What is approximate

Everything that is **not** the rail. Sidewalk width (6′-0″), drive width (36′-0″),
headwall length, ditch depth (3′-6″), riprap, buildings, poles and traffic are
massed from the two field photos in `MockUp_Handrailing_at_entrance.pdf`, not
from survey. Run length defaults to 24′-0″ each side and is adjustable on the
panel. Verify the real dropoff height, wall length and anchorage before ordering
or fabricating anything.

## Controls

- **Camera** — across the street, on the sidewalk, entering the drive, from the
  ditch, aerial, post detail (turning **Dimensions** on also flies to a dim view).
- **Rail type** — TY F / TY E / TY B / TY D, rebuilt live.
- **Options** — ADA handrail, dimensions, the existing temporary rail that is out
  there today, site context, shadows.
- **Layout** — run length each side (10′–30′), max post spacing, time of day.
- **Quantities** — posts, base plates, anchor bolts, rail LF and post LF for both
  runs, recomputed on every change.
