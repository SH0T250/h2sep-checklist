# Domestic water booster — Grundfos CMBE TWIN 10-54 vs A.Y. McDonald DuraMAC duplex

Weighted comparison for H2SEP (Home2 Suites by Hilton, Eagle Pass TX — 115 keys,
four floors). Priced 13 Aug 2026.

**Recommendation: Grundfos**, weighted 8.55 against 6.13 — more pump, $1,908.56
less, roughly ten days sooner. **But neither unit should be ordered until the
plumbing engineer's booster pump schedule is confirmed** (see
[The risk both units share](#the-risk-both-units-share)).

Interactive version with the performance curves:
<https://claude.ai/code/artifact/1f8e7db9-d735-457d-9c5f-ebf38db237e5>

| | Grundfos | A.Y. McDonald |
|---|---|---|
| Model | CMBE TWIN 10-54 | DuraMAC 17044C120PC2-D |
| SKU | 99503875 | AYM17044C120PC2-D / 6011-002 |
| Price with tax | **$12,922.39** (free freight) | $14,830.95 |
| Availability | 10 in stock, 17–19 Aug | ships within 2 weeks |

---

## 1. The headline numbers are quoted from opposite ends of the curve

This is the single most important thing in this comparison, because the two
listings invite a straight comparison that is flatly wrong.

- SupplyHouse advertises the Grundfos at **58 ft of head (~25 psi)**. That is head
  at *runout* — the far right end of the curve, at maximum flow.
- A.Y. McDonald advertises **44 PSI**. That is boost at *zero flow* — the far left
  end. Their own model nomenclature confirms it: in `17` `044` `C120` `PC2-D`, the
  catalog defines the `044` field as "Water Pressure at 0 GPM".

Read at face value, the DuraMAC looks ~75% stronger. Compared correctly, the
opposite is true by a wide margin.

### Boost vs flow, both pumps running

Digitized from the vector geometry of each manufacturer's published curve.
Accurate to roughly ±1 psi on top of the makers' own ISO 9906:2012 3B tolerance.

| Flow (GPM) | Grundfos (psi) | A.Y. McDonald (psi) | Grundfos advantage |
|---:|---:|---:|---:|
| 0 | 79.3 | 44.3 | +35.0 (79%) |
| 20 | 76.5 | 41.9 | +34.6 (83%) |
| 40 | 64.4 | 39.1 | +25.3 (65%) |
| 60 | 54.4 | 35.7 | +18.7 (52%) |
| 80 | 46.0 | 31.3 | +14.7 (47%) |
| 100 | 38.7 | 26.0 | +12.7 (49%) |
| 120 | 31.9 | 19.9 | +12.0 (60%) |

The Grundfos delivers 47–83% more boost at every point on the curve, for $1,909
less. Cost per psi of boost at 120 GPM: **$405 (Grundfos) vs $745 (A.Y. McDonald)**.

One important asymmetry: the Grundfos trace is its *full-speed envelope*. Each
pump carries an integrated VFD, so it holds any setpoint beneath that line at
constant pressure. The DuraMAC is fixed-speed — its delivered pressure rides its
curve as demand changes.

---

## 2. Weighted decision matrix

Scores 1–10. Weights reflect operating-hotel cost: a booster that can't hold
pressure generates guest complaints for twenty years, while a $1,900 delta is a
rounding error on the FF&E budget.

| Criterion | Weight | Grundfos | A.Y. McD | Swing |
|---|---:|---:|---:|---:|
| Hydraulic capability at design flow | 25% | 9.0 | 6.0 | +0.75 |
| Delivered pressure stability | 15% | 9.0 | 5.0 | +0.60 |
| Reliability, redundancy, wear-sharing | 15% | 8.0 | 6.5 | +0.23 |
| Serviceability / local support | 12% | 6.5 | **7.5** | −0.12 |
| Installed cost | 10% | 9.0 | 7.0 | +0.20 |
| Lead time / schedule | 8% | 9.0 | 6.0 | +0.24 |
| Energy + operating cost | 7% | 9.0 | 5.0 | +0.28 |
| Electrical & code fit | 5% | 9.0 | 6.0 | +0.15 |
| Footprint / installation | 3% | 9.0 | 6.0 | +0.09 |
| **Weighted total** | **100%** | **8.55** | **6.13** | **+2.42** |

**Sensitivity — the result is not weight-sensitive:**

| Reweighting | Grundfos | A.Y. McD |
|---|---:|---:|
| As scored above | 8.55 | 6.13 |
| Serviceability tripled to 30% (paid out of hydraulics) | 8.10 | 6.41 |
| Installed cost tripled to 30% (paid out of hydraulics) | 8.55 | 6.33 |
| Price, schedule and energy deleted entirely | 8.18 | 6.36 |

There is no defensible set of weights under which the A.Y. McDonald wins.

---

## 3. Pros and cons

### Grundfos CMBE TWIN 10-54

**Pros**

- 47–83% more boost at every flow point — a different capability class, not a
  marginal edge.
- True constant pressure. Integrated VFD per pump holds setpoint instead of riding
  the curve; guests get the same shower at 7 AM as at 3 AM.
- **Automatic pump alternation is documented** — starts whichever pump has the
  fewest running hours, so wear is shared and neither pump sits idle long enough
  to seize.
- $1,908.56 cheaper, and 10 units on the shelf for 17–19 Aug delivery.
- 200–240 V band explicitly covers a 208 V service — no buck-boost question.
- Cascade control, dry-running, thermal and overload protection built in; no
  external motor protection required.
- NSF/ANSI 61 & 372; UL Listed Packaged Pumping System; IP55; insulation class F.
- Rated to 131 °F ambient — documented, which matters in an Eagle Pass mechanical
  room.
- ≤58 dBA and quieter at reduced speed. 24-month warranty. Grundfos GO wireless
  for commissioning and BMS tie-in.
- Compact: 26.8" × 16.3" × 22.0", 180 lb, 2" NPT.

**Cons**

- Two VFDs are two electronic failure points. A drive failure around year 8–10 is
  the classic expense, is not a parts-house item, and is not a repair a hotel
  maintenance tech makes at 2 AM.
- Commissioning needs someone who knows drives; that skill is thinner in Eagle
  Pass than in San Antonio.
- Higher connected load — 18.2 A vs 14.0 A, so a larger branch circuit and breaker.
- Grundfos scopes the CMBE TWIN to "small hotels". 115 keys over four floors sits
  at or past that edge.
- Small per-pump diaphragm tanks only — less buffer for tiny overnight draws.
- Drive electronics are more heat- and transient-sensitive than a TEFC motor and a
  relay.

### A.Y. McDonald DuraMAC 17044C120PC2-D

**Pros**

- **Mechanically simple and locally serviceable** — fixed-speed TEFC motors, a
  pressure transducer and relay logic. Any plumber in Maverick County can
  troubleshoot it. This is its single strongest argument.
- No VFD to fail or replace, and no drive harmonics on the panel.
- 20-gallon tank included — absorbs small draws, handles thermal expansion, cuts
  pump starts.
- Lower connected load at 7.0 A per pump, 14.0 A total.
- TEFC motors shrug off heat and dust better than drive electronics.
- Flow Mode is genuinely useful if incoming city pressure swings — it starts on
  flow (~5 GPM) regardless of pressure, tolerating a leaky or unstable main.
- All-stainless wetted path: 304 SS impellers and diffuser, 301 SS casings,
  silicon carbide seal faces, no-lead brass, 304 SS base. NSF 61 compliant.

**Cons**

- 33–45% less boost at matched flow — 19.9 psi vs 31.9 psi at 120 GPM.
- **Fixed speed means the pressure swings.** Delivered boost rides from 44 psi at
  night down to 20 psi at the morning peak — a 24 psi swing at the fixture, which
  is precisely the shower-pressure complaint pattern. The 20-gallon tank stops
  short cycling; it does not stabilize pressure under sustained flow.
- $1,908.56 more for materially less pump.
- Two weeks to ship against stock on the shelf.
- **Lead-lag appears to be set by dialing two independent controllers to different
  start pressures.** A.Y. McDonald's literature says "designed for lead-lag" but
  documents no automatic alternation — which would mean the lead pump takes nearly
  all the hours while the lag pump sits. *Confirm with the factory;* distributor
  copy claims automatic alternation and the two sources disagree.
- Nameplate is 230 V. On a 208Y/120 service that sits at the bottom of tolerance —
  confirm service voltage or price a buck-boost transformer.
- Control is marked "for indoor use only", and no ambient temperature rating is
  published.
- Roughly twice the floor area once the 20-gallon tank is set; PRV required if
  incoming pressure exceeds 36 psi.
- Base warranty 1 year from installation / 2 from manufacture; a 3-year tier exists
  for "certain booster pumps" — confirm which applies. Catalog literature dates to
  November 2015.

---

## 4. Side by side

| | Grundfos CMBE TWIN 10-54 | A.Y. McDonald 17044C120PC2-D |
|---|---|---|
| Configuration | 2 × CMBE (CM10) in parallel, integrated VFD each | 2 × 2 HP TEFC fixed-speed, digital PC2 control each |
| Control | Constant pressure, cascade control, automatic alternation | Pressure Mode (stops below 3 GPM) or Flow Mode; lead-lag |
| Boost at 0 / 60 / 120 GPM | 79.3 / 54.4 / 31.9 psi | 44.3 / 35.7 / 19.9 psi |
| Max head | 54 m ≈ 177 ft nominal (183 ft on curve) | 44 psi ≈ 102 ft at zero flow |
| Max system pressure | 145 psi (10 bar) | not published; PRV above 36 psi inlet |
| Electrical | 1 × 200–240 V 60 Hz · 18.2 A both pumps · P1 3,404 W | 230 V 60 Hz 1φ · 7.0 A per pump (14.0 A total) |
| Tank | diaphragm tank + sensor + gauge per pump | 20 gallon, included and required |
| Connections | 2" NPT | 2" NPT manifolds with ball valves |
| Dimensions / weight | 26.8" × 16.3" × 22.0" · 180 lb | approx. 36" × 34" × 28.5" incl. tank |
| Wetted materials | AISI 304 SS sleeve, impeller, shaft, nozzle; PP diffuser | 304 SS impellers & diffuser, 301 SS casings, no-lead brass |
| Environment | liquid 32–140 °F · ambient to 131 °F · IP55 · ≤58 dBA | control indoor use only; no ambient rating published |
| Certifications | NSF/ANSI 61 & 372 · UL Listed Packaged Pumping System | NSF 61 compliant · no-lead brass |
| Warranty | 24 months from installation (30 from manufacture) | 1 year from installation base; 3-year tier to confirm |

---

## The risk both units share

**Neither pump may be big enough for this building.**

Both published curves stop near 120 GPM, and both are single-phase, 2 HP-class
packages. For 115 extended-stay keys over four floors — plus laundry, breakfast
service, public restrooms and any pool make-up — a Hunter's-curve peak lands
somewhere around 150–190 GPM before diversity credits for low-flow fixtures. That
estimate is not the engineer's, and it is the assumption that decides this
purchase.

Two supporting signals point the same way: Grundfos scopes the CMBE TWIN to "small
hotels", and A.Y. McDonald catalogues the DuraMAC family as "Residential | Light
Commercial | Irrigation". A 115-key hotel would normally be specified with a
three-phase package — and the Grundfos Hydro MPC page already in the bookmarks is
exactly that class of product.

**Do not cut a PO on either unit until the plumbing engineer's booster pump
schedule is in hand.** If the schedule calls for more than ~120 GPM, or more than
~32 psi of boost at design flow, both are undersized and this comparison is moot.

### Verify before ordering

- [ ] **Pull the booster pump schedule** from the plumbing drawings — design GPM
      and required boost at that flow. This single document decides everything.
- [ ] **Get Eagle Pass city static and residual pressure at the meter**, in writing
      from the utility. Required boost is meaningless without it.
- [ ] **Confirm the building service voltage.** If 208Y/120, the Grundfos is rated
      through it and the A.Y. McDonald is not without checking.
- [ ] **Confirm the approved submittal matches the model being bought.** A
      substitution from a scheduled product needs the engineer's stamp, not just a
      price comparison.
- [ ] **Ask A.Y. McDonald directly whether the duplex auto-alternates** — the
      literature and the distributor copy disagree, and it changes the reliability
      picture.
- [ ] **Verify mechanical room ambient design temperature** against the Grundfos
      131 °F limit if the room is unconditioned.

---

## Sources

- Grundfos Data Booklet, *CMBE, CMBE TWIN — Horizontal multistage centrifugal
  pressure boosting pumps, 60 Hz North America* (98647967 0219): performance
  curves p.13, operating and electrical data p.10, dimensions p.11, type key p.6,
  product numbers p.19.
- A.Y. McDonald, *DuraMAC Booster Pumps* catalog rev. 11-15: dual-mode duplex
  performance curve p.14, specifications, materials and control description p.15,
  model nomenclature p.4.
- Pricing, tax, stock and delivery as quoted by SupplyHouse and R.C. Worst,
  13 Aug 2026. Warranty terms per Grundfos Pumps Corporation and the A.Y. McDonald
  limited warranty schedule.
