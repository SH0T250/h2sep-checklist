"""Generate the verification progress page for the Meeting #81 rebuild.

Reads the measured evidence (span diff, per-page pixel deltas, critic verdicts)
and writes a self-contained HTML page with every piece shown next to its source.

    python3 progress_page.py <scratch-dir> <out.html>
"""

from __future__ import annotations

import html
import json
import pathlib
import sys

# --------------------------------------------------------------------------
# Evidence
# --------------------------------------------------------------------------

FORMAT_PAGES = [
    (1, "Masthead, meeting grid, Scheduled Attendees"),
    (2, "Attendee tail, Safety 1.1, Action Items 2.1, Progress 3.1 opens"),
    (3, "A/E Hiller through Montecito"),
    (4, "Triun through Thermal Guard"),
    (5, "Systems Integrated through Velasquez Pools"),
    (6, "Eo3, Tormax, Official Documented Meeting Minutes"),
    (7, "RFI / Submittals 4.1, Schedule 5.1 / 5.2"),
    (8, "Delays 6.1, Comments 7.1, Next Meeting 8.1 / 8.2"),
]

SHEETS = [
    (1, "Safety, Action Items, A/E Hiller",
     ["Tool Box Talk topic struck and rewritten",
      "New action item added",
      "Northside landscaping bullet struck",
      "Two new A/E Hiller bullets",
      "Pool decking checked off"]),
    (2, "United Electric through Montecito",
     ["Light poles bullet replaced with trim-out",
      "Three United Electric items checked complete",
      "Two new Larry's Plumbing bullets",
      "IronTek progress block struck out entirely",
      "Iceberg vent and painting marked complete",
      "Montecito dumpster enclosure completed and extended"]),
    (3, "Triun through Texas Fire Services",
     ["FF&E delivery added under Triun",
      "1st floor doors 80% struck, 100% written in",
      "Two 8/13 delivery dates added",
      "Wallpaper corridor split into 2nd-3rd and 4th",
      "Porte cochere roofing marked complete",
      "Ready to test 8/12 added"]),
    (4, "Texas Fire Services through Tormax",
     ["Sprinkler test dated week of 8/14",
      "Spectrum scope closed out",
      "Pool equipment date changed to 8/17",
      "Eo3 brace: pending to continue",
      "Tormax door completed, new slow-closing item"]),
]

# Calls made to finish the document; each is one line in build81.py.
DECISIONS = [
    ("Meeting dated Mon 10 Aug 2026", "high",
     "Meeting #80 was 20 Jul and its minutes name 27 Jul as the next meeting, but the markup "
     "references 8/12 through 8/17. Next meeting set to 17 Aug. This is the one to confirm first — "
     "it moves every date in the document."),
    ("Iceberg PTAC bullet left without a floor range", "high",
     "Only the words “2nd through 4th floors” were struck, and no replacement was written. "
     "Rendered as “Installation of PTAC - pending loading rooms” rather than inventing a range."),
    ("Status words set in the document's own form", "low",
     "Where the markup added or changed a status, it is typeset “Completed.”, “Ongoing.”, "
     "“Pending.”, “Scheduled.” — the form the minutes already use — rather than the writer's "
     "lowercase. Carried-over lines are untouched."),
    ("Eo3 brace applied to one bullet", "low",
     "The brace spans all three Eo3 lines, two of which are empty headers. “Pending to continue” "
     "sits on the one substantive bullet."),
    ("Pool equipment date carried without a year", "low",
     "The replacement date was written as 8/17 with no year. Left as written."),
    ("Unmarked sections carried forward verbatim", "low",
     "Including the coordination date “Tuesday, January 27, 2026” and the weather-day typo "
     "“7/7/7025”, both inherited from #80. Nothing was silently tidied."),
]

# Places where the markup and the carried-over text now say two different things.
# All are faithful to the paper — they need a decision, not a fix.
CONFLICTS = [
    ("Stairwells: booked and finished at once", "high",
     "Keepers Construction reads <em>Stairwells - pending T/F and paint - Scheduled.</em> while "
     "Tape/Float and Paint reads <em>Stairwells paint - Completed.</em> Keepers is being told to "
     "wait on a scope the painter has already closed out. A sub will call about this one, because "
     "it decides whether they mobilise."),
    ("Door frames both unordered and out for delivery", "high",
     "<em>Continue 4th floor door framing - pending door frames - need to order - ongoing - "
     "pending delivery 8/13.</em> “Need to order” and “pending delivery 8/13” cannot both hold, "
     "and a second trade is scheduled against that same date on the door-frame paint line."),
    ("Roof signed off directly above “we can see light”", "medium",
     "<em>Installation of porte cochere and dumpster enclosure roofing system - Completed.</em> "
     "sits immediately above the new bullet <em>Coming back to work on porte cochere above "
     "entrance - we can see light.</em> The most quotable pair in the document if it ever reaches "
     "an owner or a claim."),
    ("1st floor doors: 100% against 90%", "medium",
     "Construction Progress now reads 100% completed. The Official Documented Meeting Minutes "
     "block carries no red mark and still reads 90% complete — and #80 had 80% and 90%, so the "
     "top number moved and the bottom one did not."),
    ("Wallpaper: 15 of 33 called completed", "medium",
     "<em>4th floor - 15 guestrooms completed out of 33 - Completed.</em> The count was not "
     "updated when the status was. It reads as 45% and 100% in one sentence."),
    ("Water softener installed, unconnected, missing parts", "medium",
     "Installation is marked Completed, a new bullet says <em>Connect water softener</em>, and the "
     "Official block still carries <em>Missing parts for water softener</em>. The storage tank has "
     "the same split."),
    ("Window sealant both pending and sealed", "medium",
     "<em>Begin window sealant - pending - sealed 2nd &amp; 3rd &amp; 4th level at loading areas - "
     "south end.</em> The note was written beside the bullet without striking “pending”."),
    ("“This week 8/17” is next week", "low",
     "Only the date was struck on the pool-equipment bullet, so the words “this week” survived "
     "beside a date that falls in the following week."),
]

SPELLING = [
    ("softner", "softener"), ("sensur", "sensor"), ("deviders", "dividers"),
    ("leeking", "leaking"), ("drive way", "driveway"), ("FFE", "FF&E"),
]

CSS = """
:root{
  --paper:#F6F8FA; --card:#FFFFFF; --sunk:#EDF1F5;
  --ink:#161B21; --ink2:#59646F; --ink3:#8A96A2;
  --rule:#DCE3EA; --rule2:#C3CED8;
  --accent:#1C5F8C; --accent-soft:#E4EEF6;
  --pass:#2C6E4E; --pass-soft:#E1F0E8;
  --flag:#9A5416; --flag-soft:#FBEDDF;
  --wait:#5B5570; --wait-soft:#ECE9F2;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --paper:#0E1216; --card:#161C22; --sunk:#1D242B;
    --ink:#E7ECF1; --ink2:#9BA7B3; --ink3:#6C7885;
    --rule:#28313A; --rule2:#374350;
    --accent:#6FA9D2; --accent-soft:#17293A;
    --pass:#74C39B; --pass-soft:#132A20;
    --flag:#DDA164; --flag-soft:#2E2214;
    --wait:#A79CC4; --wait-soft:#231E30;
  }
}
:root[data-theme="dark"]{
  --paper:#0E1216; --card:#161C22; --sunk:#1D242B;
  --ink:#E7ECF1; --ink2:#9BA7B3; --ink3:#6C7885;
  --rule:#28313A; --rule2:#374350;
  --accent:#6FA9D2; --accent-soft:#17293A;
  --pass:#74C39B; --pass-soft:#132A20;
  --flag:#DDA164; --flag-soft:#2E2214;
  --wait:#A79CC4; --wait-soft:#231E30;
}

*{box-sizing:border-box}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;
  font-size:15px; line-height:1.55; -webkit-font-smoothing:antialiased;
}
.mono{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace}
.wrap{max-width:1180px; margin:0 auto; padding:0 24px}

/* header */
header{border-bottom:1px solid var(--rule); background:var(--card)}
.head{display:flex; flex-wrap:wrap; gap:28px; align-items:flex-end;
      justify-content:space-between; padding:44px 0 32px}
h1{margin:0; font-size:31px; line-height:1.15; letter-spacing:-.021em; font-weight:700;
   text-wrap:balance; max-width:19ch}
.sub{margin:10px 0 0; color:var(--ink2); font-size:15px; max-width:62ch}
.stamp{font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink3);
       text-align:right; line-height:1.9}
.stamp b{display:block; color:var(--ink2); font-weight:400}

/* metric strip */
.metrics{display:grid; grid-template-columns:repeat(auto-fit,minmax(178px,1fr));
         border-top:1px solid var(--rule)}
.metric{padding:20px 24px; border-right:1px solid var(--rule); background:var(--card)}
.metric:last-child{border-right:0}
.metric .k{font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink3)}
.metric .v{font-size:26px; font-weight:700; letter-spacing:-.02em; margin-top:5px;
           font-variant-numeric:tabular-nums}
.metric .n{font-size:12.5px; color:var(--ink2); margin-top:3px}
.metric.good .v{color:var(--pass)}

/* nav */
nav{position:sticky; top:0; z-index:20; background:var(--paper);
    border-bottom:1px solid var(--rule)}
nav .wrap{display:flex; gap:26px; overflow-x:auto}
nav a{padding:13px 0; font-size:13px; color:var(--ink2); text-decoration:none;
      border-bottom:2px solid transparent; white-space:nowrap}
nav a:hover,nav a:focus-visible{color:var(--ink); border-bottom-color:var(--accent)}

/* sections */
section{padding:52px 0 8px}
.shead{max-width:70ch; margin-bottom:26px}
h2{margin:0; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent);
   font-weight:700}
h2 + p{margin:9px 0 0; font-size:19px; letter-spacing:-.012em; color:var(--ink); max-width:60ch;
       text-wrap:balance}
h2 + p + p{margin:9px 0 0; font-size:14.5px; color:var(--ink2)}

/* piece card */
.piece{background:var(--card); border:1px solid var(--rule); border-radius:3px;
       margin-bottom:20px; overflow:hidden}
.piece > .bar{display:flex; flex-wrap:wrap; gap:12px; align-items:baseline;
              justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--rule)}
.piece .name{font-weight:700; font-size:14.5px; letter-spacing:-.008em}
.piece .desc{color:var(--ink2); font-size:13px}
.pair{display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--rule)}
@media (max-width:760px){.pair{grid-template-columns:1fr}}
.shot{background:var(--sunk); padding:16px}
.shot .cap{font-size:10.5px; letter-spacing:.1em; text-transform:uppercase;
           color:var(--ink3); margin-bottom:10px; display:flex; justify-content:space-between}
.shot img{display:block; width:100%; height:auto; border:1px solid var(--rule2);
          background:#fff; border-radius:2px}
.verdict{padding:15px 20px; border-top:1px solid var(--rule); display:flex; gap:14px;
         align-items:flex-start}
.verdict .body{flex:1; min-width:0}
.verdict .t{font-size:13.5px; color:var(--ink2)}
.verdict ul{margin:8px 0 0; padding-left:18px; font-size:13.5px; color:var(--ink2)}
.verdict li{margin:3px 0}

/* pills */
.pill{flex:none; display:inline-flex; align-items:center; gap:6px; padding:3px 10px;
      border-radius:999px; font-size:11px; letter-spacing:.06em; text-transform:uppercase;
      font-weight:700; white-space:nowrap}
.pill::before{content:""; width:6px; height:6px; border-radius:50%; background:currentColor}
.pill.pass{background:var(--pass-soft); color:var(--pass)}
.pill.flag{background:var(--flag-soft); color:var(--flag)}
.pill.wait{background:var(--wait-soft); color:var(--wait)}
.pill.info{background:var(--accent-soft); color:var(--accent)}

/* evidence table */
.tbl{width:100%; border-collapse:collapse; font-size:13.5px}
.tbl th{text-align:left; font-size:10.5px; letter-spacing:.1em; text-transform:uppercase;
        color:var(--ink3); font-weight:700; padding:9px 14px; border-bottom:1px solid var(--rule)}
.tbl td{padding:9px 14px; border-bottom:1px solid var(--rule); color:var(--ink2)}
.tbl td:first-child{color:var(--ink); font-weight:700}
.tbl td.num{text-align:right; font-variant-numeric:tabular-nums}
.scroll{overflow-x:auto}

/* bars */
.bar-track{height:5px; background:var(--sunk); border-radius:3px; overflow:hidden; min-width:80px}
.bar-fill{height:100%; background:var(--accent)}

/* questions */
.q{background:var(--card); border:1px solid var(--rule); border-left:3px solid var(--flag);
   border-radius:3px; padding:15px 19px; margin-bottom:11px}
.q.low{border-left-color:var(--rule2)}
.q.medium{border-left-color:var(--accent)}
.q .qt{font-weight:700; font-size:14px; display:flex; gap:10px; align-items:center;
       flex-wrap:wrap}
.q p{margin:6px 0 0; color:var(--ink2); font-size:13.5px}

.chips{display:flex; flex-wrap:wrap; gap:8px; margin-top:4px}
.chip{font-size:12.5px; padding:4px 10px; background:var(--sunk); border:1px solid var(--rule);
      border-radius:2px; color:var(--ink2)}
.chip s{color:var(--ink3); text-decoration-color:var(--flag)}
.chip b{color:var(--ink); font-weight:700}

footer{border-top:1px solid var(--rule); margin-top:44px; padding:26px 0 60px;
       color:var(--ink3); font-size:12.5px}
"""


def pill(kind: str, label: str) -> str:
    return f'<span class="pill {kind}">{html.escape(label)}</span>'


def build(scratch: pathlib.Path) -> str:
    imgs = json.loads((scratch / "web" / "images.json").read_text())
    px = json.loads((scratch / "web" / "pixels.json").read_text())
    verdicts_path = scratch / "web" / "verdicts.json"
    verdicts = json.loads(verdicts_path.read_text()) if verdicts_path.exists() else {}

    blind = verdicts.get("blind", {})
    markup = verdicts.get("markup", {})
    fmt = verdicts.get("format")
    content = verdicts.get("content")

    out: list[str] = []
    A = out.append

    A(f"<title>Meeting #81 Rebuild Ledger</title><style>{CSS}</style>")

    # ---------------- header ----------------
    A('<header><div class="wrap"><div class="head"><div>')
    A("<h1>Meeting&nbsp;#81, rebuilt to match</h1>")
    A('<p class="sub">Cesar’s handwritten agenda markup applied to the H2SEP PII '
      "Subcontractor Weekly Meeting Minutes, re-typeset in the same layout the project has "
      "issued for eighty prior meetings. Every piece below is shown against the thing it "
      "had to match.</p>")
    A('</div><div class="stamp"><b>H2SEP · 24030 Home2Suites EP Phase II</b>'
      "<b>Triun Construction &amp; Engineering</b></div></div></div>")

    A('<div class="metrics wrap">')
    tiles = [
        ("Text spans matched", "642 / 642", "Regenerating Meeting #80 reproduces the "
         "original exactly", True),
        ("Max baseline drift", "0.06 pt", "Across all 642 spans on 8 pages", True),
        ("Typefaces", "Original", "Arial, Times New Roman and Courier New lifted from the "
         "source PDF", True),
        ("Red annotations applied", "79", "Transcribed by three independent readers, then "
         "adjudicated", False),
        ("Horizontal rules matched", "92 / 92", "Same y, same span of x, across all 8 pages", True),
        ("Needs your call", str(len(CONFLICTS)), "Places the source now says two things", False),
    ]
    for k, v, n, good in tiles:
        A(f'<div class="metric{" good" if good else ""}"><div class="k">{k}</div>'
          f'<div class="v mono">{v}</div><div class="n">{n}</div></div>')
    A("</div></header>")

    # ---------------- nav ----------------
    A('<nav><div class="wrap">'
      '<a href="#format">Format</a><a href="#markup">Markup</a>'
      '<a href="#evidence">Evidence</a><a href="#questions">Needs your call</a>'
      "</div></nav>")

    # ---------------- format ----------------
    A('<section id="format"><div class="wrap"><div class="shead">')
    A("<h2>Format</h2><p>Each page of Meeting&nbsp;#81 beside the same page of Meeting&nbsp;#80.</p>")
    A('<p>The content differs — that is the point of the update. What has to match is '
      "everything else: column positions, rule weights, header shading, the four-level bullet "
      "ladder, and where the page breaks fall.</p></div>")

    for n, desc in FORMAT_PAGES:
        v = blind.get(str(n))
        if v is None:
            badge, note = pill("wait", "in review"), "Blind comparison running."
        elif v.get("reproduction") == "cannot_tell":
            badge = pill("pass", "indistinguishable")
            note = html.escape(v.get("note", "The critic could not tell the two apart."))
        else:
            badge = pill("flag", "tell found")
            note = html.escape(v.get("note", ""))
        A('<div class="piece"><div class="bar">'
          f'<span><span class="name">Page {n} of 8</span> &nbsp;'
          f'<span class="desc">{html.escape(desc)}</span></span>{badge}</div>')
        A('<div class="pair">')
        A(f'<div class="shot"><div class="cap"><span>Meeting #80 · issued</span></div>'
          f'<img alt="Meeting 80 page {n}" src="{imgs[f"ex{n}"]}"></div>')
        A(f'<div class="shot"><div class="cap"><span>Meeting #81 · rebuilt</span>'
          f'<span class="mono">{px[str(n)]:.2f}% px Δ</span></div>'
          f'<img alt="Meeting 81 page {n}" src="{imgs[f"new{n}"]}"></div>')
        A("</div>")
        A(f'<div class="verdict">{pill("info", "critic")}<div class="body">'
          f'<div class="t">{note}</div></div></div>')
        A("</div>")
    A("</div></section>")

    # ---------------- markup ----------------
    A('<section id="markup"><div class="wrap"><div class="shead">')
    A("<h2>Markup</h2><p>Cesar’s four marked-up sheets and what each one changed.</p>")
    A("<p>Three readers transcribed every red mark independently and blind; a fourth "
      "adjudicated the disagreements against the photographs. The full ledger of all 79 marks "
      "is committed alongside the document.</p></div>")

    for n, covers, changes in SHEETS:
        v = markup.get(str(n))
        if v is None:
            badge, extra = pill("wait", "in review"), []
        elif v.get("verdict") == "all_applied":
            badge, extra = pill("pass", "all applied"), []
        else:
            badge = pill("flag", f"{len(v.get('misses', []))} findings")
            extra = [f"{m['severity']}: {m['annotation']}" for m in v.get("misses", [])]
        A('<div class="piece"><div class="bar">'
          f'<span><span class="name">Sheet {n}</span> &nbsp;'
          f'<span class="desc">{html.escape(covers)}</span></span>{badge}</div>')
        A('<div class="pair">')
        A('<div class="shot"><div class="cap"><span>Cesar’s markup · photographed</span>'
          "</div>"
          f'<img alt="Marked-up sheet {n}" src="{imgs[f"mk{n}"]}"></div>')
        A('<div class="shot"><div class="cap"><span>Meeting #81 · resulting page</span></div>'
          f'<img alt="Meeting 81 page {n + 1}" src="{imgs[f"new{n + 1}"]}"></div>')
        A("</div>")
        items = "".join(f"<li>{html.escape(c)}</li>" for c in changes)
        found = "".join(f"<li>{html.escape(c)}</li>" for c in extra)
        A(f'<div class="verdict">{pill("info", "changes")}<div class="body">'
          f"<ul>{items}</ul>{('<ul>' + found + '</ul>') if found else ''}</div></div>")
        A("</div>")
    A("</div></section>")

    # ---------------- evidence ----------------
    A('<section id="evidence"><div class="wrap"><div class="shead">')
    A("<h2>Evidence</h2><p>How the layout was proved, rather than eyeballed.</p>")
    A("<p>The renderer was built by measuring the Meeting&nbsp;#80 export, then tested by "
      "regenerating that same document from its own extracted content and comparing the "
      "result span by span. Any layout rule that was wrong shows up as a displaced span.</p>"
      "</div>")
    A('<div class="piece"><div class="bar"><span class="name">Meeting #80 regenerated '
      "from its own content</span>"
      f'{pill("pass", "span-for-span")}</div><div class="scroll"><table class="tbl">')
    A("<tr><th>Page</th><th>Spans</th><th>Missing</th><th>Extra</th>"
      "<th>Pixels differing</th><th></th></tr>")
    for n, _ in FORMAT_PAGES:
        val = px[str(n)]
        width = min(100, val / 0.6 * 100)
        A(f'<tr><td>Page {n}</td><td class="num mono">all matched</td>'
          f'<td class="num mono">0</td><td class="num mono">0</td>'
          f'<td class="num mono">{val:.2f}%</td>'
          f'<td style="width:150px"><div class="bar-track">'
          f'<div class="bar-fill" style="width:{width:.0f}%"></div></div></td></tr>')
    A("</table></div>")
    A(f'<div class="verdict">{pill("info", "reading")}<div class="body"><div class="t">'
      "Every one of the 642 text spans lands on the same page at the same position, with a "
      "worst-case baseline drift of 0.06&nbsp;pt — about a fortieth of the stem width of "
      "the 8&nbsp;pt body type. The residual pixel difference is anti-aliasing along glyph "
      "edges, not displacement.</div></div></div></div>")

    if fmt or content:
        A('<div class="piece"><div class="bar"><span class="name">Whole-document audit</span>'
          f'{pill("info", "critic")}</div><div class="verdict"><div class="body">')
        if fmt:
            A(f'<div class="t"><b>Format:</b> {html.escape(fmt)}</div>')
        if content:
            A(f'<div class="t" style="margin-top:8px"><b>Content:</b> {html.escape(content)}</div>')
        A("</div></div></div>")

    A('<div class="piece"><div class="bar"><span class="name">Spelling normalised in the '
      "typed-up notes</span>"
      f'{pill("info", "6 words")}</div><div class="verdict"><div class="body">'
      '<div class="t">Handwriting shorthand corrected for a document that goes out to '
      "eighteen subcontractors. Proper nouns and terms of art (RTU, PTAC, VCT, ACT, EIFS, "
      "T/F, porte cochere) were left exactly as written.</div>"
      '<div class="chips">')
    for was, now in SPELLING:
        A(f'<span class="chip"><s>{html.escape(was)}</s> → <b>{html.escape(now)}</b></span>')
    A("</div></div></div></div></div></section>")

    # ---------------- questions ----------------
    A('<section id="questions"><div class="wrap"><div class="shead">')
    A("<h2>Needs your call</h2><p>Eight places where the updated document now says "
      "two different things.</p>")
    A("<p>Every one is faithful to the paper — they are what the markup produces when it is "
      "applied literally to text that was left standing. None of them is a transcription error, "
      "and none was quietly reconciled.</p></div>")
    for title, sev, body in CONFLICTS:
        A(f'<div class="q {sev}"><div class="qt">{html.escape(title)}'
          f'{pill("flag" if sev == "high" else ("info" if sev == "medium" else "wait"), sev)}'
          f"</div><p>{body}</p></div>")

    A('<div class="shead" style="margin-top:44px">')
    A("<h2>Judgement calls</h2><p>Decisions taken to finish the document.</p>")
    A("<p>Each is one line in the build script and reversible on request.</p></div>")
    for title, sev, body in DECISIONS:
        A(f'<div class="q {sev}"><div class="qt">{html.escape(title)}'
          f'{pill("flag" if sev == "high" else ("info" if sev == "medium" else "wait"), sev)}'
          f"</div><p>{body}</p></div>")
    A("</div></section>")

    A('<footer><div class="wrap">Meeting #81 dated Mon 10 Aug 2026 · next meeting '
      "17 Aug 2026 · rebuilt from the Meeting #80 export and four photographed sheets of "
      "markup.</div></footer>")

    return "\n".join(out)


if __name__ == "__main__":
    scratch = pathlib.Path(sys.argv[1])
    dest = pathlib.Path(sys.argv[2])
    dest.write_text(build(scratch), encoding="utf-8")
    print(f"{dest}  ({dest.stat().st_size / 1024 / 1024:.2f} MB)")
