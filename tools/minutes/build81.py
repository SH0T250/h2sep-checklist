"""Derive the Meeting #81 content model from Meeting #80 plus Cesar's markup.

Every edit below corresponds to a red annotation on the four marked-up agenda
pages, transcribed and adjudicated in docs/meeting-81-markup-ledger.txt.  The
operations match on exact source text and raise if a target has gone missing,
so the transform fails loudly rather than silently dropping a change.

    python3 build81.py data/minutes-80.json data/minutes-81.json
"""

from __future__ import annotations

import json
import sys

MEETING_NO = 81
MEETING_DATE = "Aug 10, 2026"
NEXT_MEETING = "Next Meeting is scheduled for August 17, 2026, at 11:00 am (CST)."
# Stamped rather than taken from the clock so the output is reproducible.
PRINTED_ON = "Aug 12, 2026 05:09 PM CDT"


class Doc:
    """Edit helper over one item's description line list.

    Anchors are resolved inside a named level-1 block (a subcontractor) so the
    edits stay readable and cannot silently attach to the wrong trade.
    """

    def __init__(self, lines: list[dict]):
        self.lines = lines

    # -- locating ---------------------------------------------------------

    def _block(self, heading: str) -> tuple[int, int]:
        start = None
        for i, ln in enumerate(self.lines):
            if ln.get("level") == 1 and ln.get("text") == heading:
                start = i
                break
        if start is None:
            raise SystemExit(f"no level-1 block titled {heading!r}")
        end = len(self.lines)
        for j in range(start + 1, len(self.lines)):
            # an empty level-1 bullet is a stray from the source document, not
            # the start of the next trade
            if self.lines[j].get("level") == 1 and self.lines[j].get("text"):
                end = j
                break
        return start, end

    def _find(self, text: str, within: str | None = None) -> int:
        lo, hi = self._block(within) if within else (0, len(self.lines))
        hits = [i for i in range(lo, hi) if self.lines[i].get("text") == text]
        if len(hits) != 1:
            where = f" in {within!r}" if within else ""
            raise SystemExit(
                f"expected exactly one line {text!r}{where}, found {len(hits)}"
            )
        return hits[0]

    # -- editing ----------------------------------------------------------

    def sub(self, old: str, new: str, within: str | None = None) -> None:
        self.lines[self._find(old, within)]["text"] = new

    def drop(self, text: str, within: str | None = None) -> None:
        del self.lines[self._find(text, within)]

    def drop_block(self, heading: str) -> None:
        """Remove a whole subcontractor block, keeping its authored lead space."""
        lo, hi = self._block(heading)
        carried = self.lines[lo].get("extra")
        del self.lines[lo:hi]
        if carried and lo < len(self.lines) and not self.lines[lo].get("extra"):
            self.lines[lo]["extra"] = carried

    def after(self, anchor: str, level: int, text: str,
              within: str | None = None) -> None:
        i = self._find(anchor, within)
        self.lines.insert(i + 1, {"text": text, "level": level, "bold": False})

    def append_to_block(self, heading: str, level: int, text: str) -> None:
        """Add a line at the end of a subcontractor block."""
        _, hi = self._block(heading)
        self.lines.insert(hi, {"text": text, "level": level, "bold": False})


def build(src: dict) -> dict:
    out = json.loads(json.dumps(src))
    out["meeting_no"] = MEETING_NO
    out["meeting_date"] = MEETING_DATE
    out["printed_on"] = PRINTED_ON

    def item(sec: int, it: int = 0) -> Doc:
        return Doc(out["sections"][sec]["items"][it]["description"])

    # -- 1.1 SAFETY --------------------------------------------------------
    # Tool Box Talk topic for the week struck and rewritten.
    safety = item(0)
    safety.sub("General Safety Signs.", "Eye Protection.")

    # -- 2.1 Action Items --------------------------------------------------
    actions = item(1)
    actions.after(
        "New Action Items:", 2,
        "Elevator Installation - standby Electrical / Plumbing.",
    )

    # -- 3.1 CONSTRUCTION PROGRESS ----------------------------------------
    p = item(2)

    # A/E Hiller
    p.after("Completed Last Week-", 3, "Sweep south end of property.", "A/E Hiller:")
    p.drop("Clear Northside for landscaping- Ongoing due to last week's weather delay.")
    p.after("Anticipated Progress for this Week-", 3,
            "Rock install north side of property.", "A/E Hiller:")
    p.sub("Clean pool decking and coping- Pending.",
          "Clean pool decking and coping- Completed.")
    p.after("Clean pool decking and coping- Completed.", 3,
            "Inspect east side driveway cracks.")

    # United Electric
    p.sub("Finish light poles- Completed.", "Trim-out 2nd, 3rd & 4th floor.")
    p.sub("3rd and 4th floor trim out - Ongoing.",
          "3rd and 4th floor trim out - Completed.")
    p.sub("Check plug height on 3rd and 4th floor for FF&E- Ongoing.",
          "Check plug height on 3rd and 4th floor for FF&E- Completed.")
    p.sub('Check "by Hilton" sign - does not turn on',
          'Check "by Hilton" sign - working - Completed.')

    # Larry's Plumbing
    p.after("Completed Last Week-", 3,
            "Trim out ongoing on 3rd & 4th floors.", "Larry\'s Plumbing:")
    p.sub("Trim out on 3rd and 4th floor - sinks, faucets, and shower heads - Ongoing.",
          "Trim out on 3rd and 4th floor - sinks, faucets, and shower heads - Completed.")
    p.sub("Installation of storage tank, back flow, water heaters, water softener in "
          "Mechanical area - ongoing.",
          "Installation of storage tank, back flow, water heaters, water softener in "
          "Mechanical area - Completed.")
    p.after("Installation of storage tank, back flow, water heaters, water softener in "
            "Mechanical area - Completed.", 3, "Water pressure low.")
    p.after("Water pressure low.", 3, "Connect water softener.")

    # IronTek: entire Construction Progress block struck through
    p.drop_block("IronTek:")

    # Iceberg HVAC
    p.after("Completed last Week-", 3, "Thermostat installation ongoing.", "Iceberg HVAC:")
    p.sub("Installation of PTAC on 2nd through 4th floors - pending loading rooms",
          "Installation of PTAC - pending loading rooms")
    p.sub("Access panels and vents installation - ongoing vent at reception area wrong size.",
          "Access panels and vents installation - vent at reception area - Completed.")
    p.sub("Painting outside vents - ongoing due to last week's weather.",
          "Painting outside vents - Completed.")
    p.after("Painting outside vents - Completed.", 3,
            "Continue with thermostat installation & install speed sensor to RTU.")

    # Keepers Construction
    p.sub("Completed carpet installation in 31 rooms of 33 on 2nd, 3rd, and 4th floor - "
          "pending loading rooms window installation and paint.",
          "Loading rooms carpet install on 2nd & 3rd level.")
    p.sub("Begin window sealant.",
          "Begin window sealant - pending - sealed 2nd & 3rd & 4th level at loading "
          "areas - south end.")
    p.sub("Stairwells - pending T/F and paint.",
          "Stairwells - pending T/F and paint - Scheduled.")
    p.sub("VCT installation - ongoing.", "VCT installation - Completed.")

    # Montecito
    p.sub("Dumpster Enclosure - EIFS and masonry - ongoing.",
          "Dumpster Enclosure - EIFS and masonry - Completed & North end of building "
          "by Lobby area.")

    # Triun
    p.after("Completed last Week-", 3, "FF&E delivery to building ongoing.", "Triun:")
    p.sub("Continue staging of FF&E on 4th floor.",
          "Continue staging of FF&E on 4th floor - Ongoing.")
    p.sub("Installation of doors on 2nd through 4th floors.",
          "Installation of doors on 2nd through 4th floors - Ongoing.")

    # Alex's Crew
    p.after("Completed last Week-", 3,
            "Close all electrical & plumbing openings.", "Alex\'s Crew:")
    p.sub("Continue 4th floor door framing - pending door frames - need to order - ongoing.",
          "Continue 4th floor door framing - pending door frames - need to order - "
          "ongoing - pending delivery 8/13.")
    p.sub("Installation of 1st floor doors - 80% completed.",
          "Installation of 1st floor doors - 100% completed.")
    p.after("Installation of 1st floor doors - 100% completed.", 3,
            "Install wall dividers.")

    # Tape/Float and Paint
    p.after("Completed last Week-", 3, "4th floor Tape/Float/Paint.",
            "Tape/Float and Paint:")
    p.sub("2nd - 4th floor loading rooms pending window installation and paint.",
          "2nd - 4th floor loading rooms - Completed.")
    p.sub("3rd and 4th floor door frame paint - pending door frames.",
          "3rd and 4th floor door frame paint - pending door frames - pending delivery 8/13.")
    p.sub("Stairwells paint - pending.", "Stairwells paint - Completed.")

    # Wallpaper
    p.after("Anticipated Progress for this Week-", 3, "4th floor Corridor.", "Wallpaper:")
    p.sub("4th floor - 15 guestrooms completed out of 33.",
          "4th floor - 15 guestrooms completed out of 33 - Completed.")
    p.sub("Wallpaper installation 2nd and 3rd floor - pending loading rooms.",
          "Wallpaper installation 2nd and 3rd floor - pending loading rooms - Ongoing.")
    p.sub("1st floor - ongoing.", "1st floor - Completed.", "Wallpaper:")
    p.sub("2nd - 4th - pending.", "2nd - 3rd - Completed.")
    p.after("2nd - 3rd - Completed.", 4, "4th - Ongoing.")

    # Thermal Guard
    p.sub("Installation of porte cochere and dumpster enclosure roofing system - "
          "pending coping and 2 gutters.",
          "Installation of porte cochere and dumpster enclosure roofing system - Completed.")
    p.after("Installation of porte cochere and dumpster enclosure roofing system - Completed.",
            3, "Coming back to work on porte cochere above entrance - we can see light.")

    # Systems Integrated
    p.after("Competed last Week-", 3, "Trim-out ongoing 3rd & 4th floor.",
            "Systems Integrated:")
    p.sub("2nd floor trim out - pending ETA - corridor has ACT.",
          "2nd floor trim out - Completed - corridor has ACT.")
    p.sub("4th floor- pending ceiling tiles - order pending CO approval.",
          "4th floor- pending ceiling tiles - order pending CO approval - Ongoing.")
    p.after("4th floor- pending ceiling tiles - order pending CO approval - Ongoing.", 3,
            "Ready to test 8/12.")

    # Texas Fire Services
    p.after("Competed last Week-", 3,
            "Changed out leaking sprinkler heads 2nd floor.", "Texas Fire Services:")
    p.sub("Schedule Fire Sprinkler test for 2nd through 4th floor.",
          "Schedule Fire Sprinkler test for 2nd through 4th floor - week of 8/14.")

    # Spectrum
    p.append_to_block("Spectrum:", 3, "Complete.")

    # RK Hospitality
    p.sub("Delivery of materials- window treatment, room dividers, closet draperies, "
          "and cornices.",
          "Delivery of materials- window treatment, room dividers, closet draperies, "
          "and cornices - Ongoing.")
    p.sub("Pending installation date for window treatment.",
          "Pending installation date for window treatment - Ongoing.")

    # Velasquez Pools
    p.sub("TBD - Plaster - pending completion of Pool Equipment Room and Storage.",
          "TBD - Plaster - pending completion of Pool Equipment Room and Storage - "
          "schedule 8/17.")
    p.sub("Begin installation of pool equipment this week 7/13/2026.",
          "Begin installation of pool equipment this week 8/17.")

    # Eo3 - a single brace over the whole block reading "pending to continue".
    # Nothing on this line was struck, so all of the typed text survives.
    p.sub("Ongoing - electrical connections of solar canopies - pending remobilization "
          "date - Last.",
          "Ongoing - electrical connections of solar canopies - pending remobilization "
          "date - Last - Pending to continue.")

    # Tormax
    p.sub("Door has gap when closed - will not lock - onsite 7/21/2026.",
          "Door has gap when closed - will not lock - onsite - Completed.")
    p.after("Door has gap when closed - will not lock - onsite - Completed.", 3,
            "Door closing slow.")

    # -- 8.1 NEXT MEETING --------------------------------------------------
    nxt = item(7)
    nxt.sub("Next Meeting is scheduled for July 27, 2026, at 11:00 am (CST).",
            NEXT_MEETING)

    return out


def main() -> None:
    with open(sys.argv[1], encoding="utf-8") as fh:
        src = json.load(fh)
    out = build(src)
    with open(sys.argv[2], "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
    n = sum(len(i["description"]) for s in out["sections"] for i in s["items"])
    print(f"{sys.argv[2]}: meeting #{out['meeting_no']}, {n} description lines")


if __name__ == "__main__":
    main()
