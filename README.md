# H2SEP · Hotel Field Operations

### Project dashboard · Crew checklist · Room-specific 3D models

**Construction workflow and product lead: [Austin Jones](https://www.linkedin.com/in/constructionnerd/)**  
AI-assisted development with **Claude Code and OpenAI Codex**.

H2SEP organizes hotel FF&E installation and punch work into room-based checklists, actionable issue notes and project-level progress views. Austin developed the workflow for contractor use across **115 guest rooms on four floors, plus common areas**.

## Explore the public demonstration

**[Open the showcase](https://sh0t250.github.io/hotel-field-operations-demo/)** · **[Dashboard](https://sh0t250.github.io/hotel-field-operations-demo/demo/dashboard.html)** · **[Crew checklist](https://sh0t250.github.io/hotel-field-operations-demo/demo/crew.html?room=101)** · **[BIM workflow](https://sh0t250.github.io/hotel-field-operations-demo/demo/model/?room=101)** · **[Guided tour](https://sh0t250.github.io/hotel-field-operations-demo/walkthrough.html)**

The separate showcase uses fictional rooms, geometry and documents with local browser state. It requires no project account and stays disconnected from operational systems. It is the recommended starting point for clients and anyone who wants to clone and try the workflow.

![Dashboard in the separate fictional demonstration](https://raw.githubusercontent.com/SH0T250/hotel-field-operations-demo/main/assets/dashboard.png)

## What Austin built

| Workflow | Purpose |
| --- | --- |
| **Project dashboard** | Review room/floor progress, item status and open issues; coordinate field work from an office view. |
| **Crew application** | Check off installed items with initials, record issues and leave room notes using a phone-friendly checklist. |
| **Room-specific 3D models** | Explain room arrangements through supported geometry, selectable tagged objects, category navigation and camera views. |
| **Document references** | Bring plan and submittal context into installation review through companion reference pages. |

<img src="https://raw.githubusercontent.com/SH0T250/hotel-field-operations-demo/main/assets/crew-mobile.png" alt="Phone-sized crew checklist in the fictional demonstration" width="280">

Austin led the construction requirements, room/item workflows, product priorities, integration setup and field validation. Claude Code and Codex supported AI-assisted development and iteration.

Contractors used checkoffs and notes on the stated hotel project, according to Austin's field-use account. The room/floor figures describe project coverage; measured time or cost savings are not claimed.

## BIM and model-to-document workflow

The original viewer has room-specific geometry, tagged object selection, quantity/flag information and camera presets. The platform model selector currently lists **16 first-floor rooms**. The crew viewer has a separate supported model set; unsupported rooms must not silently show another room's layout.

Geometry and placement confidence vary. The source identifies some object locations as illustrative, so these views should be checked against the governing construction documents before field decisions.

The public demonstration shows the complete interaction with **FF&E, MEP and finish layers**, selectable item tags, a linked **sample submittal**, and a **plan-detail snapshot**. That integrated example was added to the showcase; it is not a claim that every original model object already has those links.

![Tagged model and references in the fictional demonstration](https://raw.githubusercontent.com/SH0T250/hotel-field-operations-demo/main/assets/model.png)

**[View the model](https://sh0t250.github.io/hotel-field-operations-demo/demo/model/?room=101)** · **[Read the case study](https://github.com/SH0T250/hotel-field-operations-demo/blob/main/docs/CASE-STUDY.md)**

## Clone the standalone demo

Requires Node.js 22+ and Git. No dependency installation is needed.

```sh
git clone https://github.com/SH0T250/hotel-field-operations-demo.git
cd hotel-field-operations-demo
npm start
```

Open **http://127.0.0.1:8437**. Run `npm test` and `npm run check` in that repository for its offline state tests and public-package checks.

## Operational source map

| Path in this repository | Purpose |
| --- | --- |
| `index.html`, `js/` | Crew application, local persistence, synchronization and navigation. |
| `dashboard.html` | Dashboard sharing the crew application's store. |
| `platform/` | Broader office platform with its own store/backend path. |
| `room-3d.html`, `platform/room3d.html` | Room-model viewers; coverage differs between them. |
| `print.html`, `refs.html` | Printable checklists and document references. |
| `tests/`, `tools/` | Verification and project-maintenance tooling; review a tool's behavior before running it. |

The operational interfaces use HTML, CSS and JavaScript, with Firebase/Firestore integration and a crew-app service worker. This repository includes project/reference data and staged snapshots. Its checked-in configuration is connected to the operational environment. The `?demo=1` query is not a reliable isolation mechanism across every entry point or navigation route; use the separate demo above for a visitor walkthrough.

## Deployment and reuse

This repository's GitHub Pages source is **gh-pages / root**. Updating `main` alone does not establish a deployment. Maintain and validate the operational publishing path separately from the public demonstration.

No general open-source license has been selected. Review rights and applicable third-party notices before redistributing project materials or branding. The public demo has its own documented data scope and component notices.
