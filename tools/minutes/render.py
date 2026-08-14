"""Render a minutes JSON content model to PDF.

    python3 render.py data/minutes-81.json out.pdf
"""

from __future__ import annotations

import json
import sys

from layout import Attendee, Item, Line, Minutes, Renderer, Section


def build(data: dict, logo: str | None = None) -> Minutes:
    return Minutes(
        meeting_no=data["meeting_no"],
        meeting_date=data["meeting_date"],
        meeting_time=data["meeting_time"],
        meeting_location=data["meeting_location"],
        overview=data["overview"],
        notes=data.get("notes", ""),
        attachments=list(data.get("attachments", [])),
        video_link=data.get("video_link", "Join Meeting"),
        video_uri=data.get("video_uri"),
        attachment_uris=list(data.get("attachment_uris", [])),
        printed_on=data.get("printed_on"),
        logo=logo,
        attendees=[Attendee(**a) for a in data["attendees"]],
        sections=[
            Section(
                heading=s["heading"],
                items=[
                    Item(
                        no=i["no"],
                        origin=i["origin"],
                        title=i["title"],
                        status=i.get("status", "Open"),
                        assignment=i.get("assignment", ""),
                        due=i.get("due", ""),
                        priority=i.get("priority", ""),
                        description=[
                            Line(
                                text=ln.get("text", ""),
                                level=ln.get("level", 0),
                                bold=ln.get("bold", False),
                                spacer=ln.get("spacer", False),
                                extra=ln.get("extra", 0.0),
                            )
                            for ln in i.get("description", [])
                        ],
                    )
                    for i in s["items"]
                ],
            )
            for s in data["sections"]
        ],
    )


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    logo = sys.argv[3] if len(sys.argv) > 3 else None
    with open(src, encoding="utf-8") as fh:
        data = json.load(fh)
    r = Renderer(build(data, logo))
    r.render()
    r.save(dst)
    print(f"{dst}: {len(r.pages)} pages")
    print(r.font_report())


if __name__ == "__main__":
    main()
