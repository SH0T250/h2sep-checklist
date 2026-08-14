# Phase 0 Research: OpenConstructionERP — Expert Report

Prepared for: Austin Jones, Triun Construction & Engineering — H2SEP (Home2 Suites by Hilton, Eagle Pass TX, 4-story / 115-key, interior finish-out)
Date: 2026-08-14
Research method: live GitHub API, project website/docs, and a **full local shallow clone** of the repository inspected file-by-file at `/workspace/datadrivenconstruction/openconstructionerp`.

---

## 1. Identity & provenance

| Fact | Value | Source |
|---|---|---|
| Repository | https://github.com/datadrivenconstruction/OpenConstructionERP | verified |
| Website / docs | https://openconstructionerp.com, https://openconstructionerp.com/docs | verified |
| License | **AGPL-3.0** (`LICENSE`), **dual-licensed** with a commercial option (`COMMERCIAL-LICENSE.md`), CLA required (`CLA.md`) | verified in clone |
| Author | **Single author: Artem Boiko** (@boikoartem), founder of DataDrivenConstruction. `AUTHORS.md` states plainly: "There is a single author… Many people help… They are contributors, not authors." `CONTRIBUTORS.md` even says community patches are normally **reimplemented by the maintainer** rather than merged | verified (`AUTHORS.md`, `CONTRIBUTORS.md`) |
| Stars / forks / open issues | **653 / 206 / 13** (GitHub API, 2026-08-14) | verified |
| Created | **2026-04-02** — the project is ~4.5 months old | verified (API) |
| Last push | **2026-08-14** (same day as this research — extremely active) | verified (API) |
| Commits on main | 3,763 (GitHub web UI) | verified |
| Git tags (≈ releases) | **558** (`git ls-remote --tags`) | verified |
| Current version | **14.8.1** (2026-08-12, `backend/pyproject.toml` + `CHANGELOG.md`) | verified |
| Contributors | ~51 credited in `CONTRIBUTORS.md`, almost all for bug reports/ideas, not code | verified |

**Warning on stale metadata:** the GitHub repo *description* still says "71 modules, 21 languages, v3.0". The actual codebase is at v14.8.1 with 185–189 modules and ~29–40 languages (README says 29; changelog prose mentions "forty"). Exact language count: UNVERIFIED. Versioning went 3.0 → 14.8.1 in ~4 months — releases are near-daily.

There are unrelated forks (`ryannebendol/openconstructionerp`, `ptak82/OpenConstructionERPPL`) — ignore them; `datadrivenconstruction/OpenConstructionERP` is canonical.

---

## 2. Stack & architecture

- **Backend:** Python 3.12+, **FastAPI** (async), SQLAlchemy async + **Alembic** migrations, Pydantic v2. **PostgreSQL 16+ only** — SQLite support was removed in v6.6.0 (`deploy/docker/README.md`). Local runs auto-launch an *embedded* PostgreSQL. Prod compose uses the `pgduckdb/pgduckdb:16-main` image (Postgres + DuckDB extension; `bim_hub` queries Parquet dataframes through DuckDB).
- **Frontend:** React 18 + TypeScript + Vite SPA; Tailwind; AG Grid; i18next. **Custom BIM viewer** built on `three` + `three-mesh-bvh` with tile streaming (`frontend/src/shared/ui/BIMViewer/`), plus **Cesium** for the Geo Hub globe.
- **Desktop:** **Tauri** app (`desktop/src-tauri`) with a PyInstaller Python sidecar; shipped as .exe/.dmg/.deb/.AppImage.
- **AI (optional):** provider-agnostic LLM (Anthropic/OpenAI/Gemini/Mistral/Groq/DeepSeek); vector search via embedded LanceDB or Qdrant server.
- **CAD/BIM conversion:** DDC "cad2data" converters — `RvtExporter.exe` / `IfcExporter.exe` run as subprocesses, **via Wine on Linux** (`backend/app/modules/bim_hub/ifc_processor.py`). This is a real fragility for RVT/DWG on a Linux server; the IFC path is the more reliable one. Converter licensing is separate from AGPL — UNVERIFIED, check before relying on it.
- **Shape:** a **modular monolith** — one FastAPI app auto-mounts all module routers; the SPA talks to `/api/v1/*` REST (~**3,629 endpoints** counted by grep), WebSockets for notifications + collaborative-lock presence, SSE for AI chat streaming. Swagger at `/api/docs`. Health endpoint `/api/health` reports version, module count, and migration status.

---

## 3. Module system (the core question)

Every business feature is a Python package under `backend/app/modules/<name>/` — **189 directories on disk; `MODULES.md` says 185 load** in the current build. Standard layout (verified in `punchlist`):

```
manifest.py  models.py  schemas.py  router.py  service.py  repository.py  permissions.py  events.py
```

`manifest.py` declares a `ModuleManifest` (from `app/core/module_loader.py`): `name` ("oe_punchlist"), `version`, `display_name`, `category` (core/business/integration/regional/community), `depends`, `optional_depends`, `auto_install`, `enabled`. Loader lifecycle: discover → topological sort by deps → import (registers models/hooks/events) → mount router → `on_startup()`.

**Toggling:** modules are enabled/disabled **globally per installation** via the `/modules` settings UI, persisted in `module_states.json` (`app/core/module_state.py`); **core-category modules cannot be disabled**. There is **NO per-project module toggle** — I searched for one and found none. Per-project control is achieved instead through (a) per-user module access set by admins (`users` module: `UserModuleAccessPayload`, levels incl. None/View/Edit/Full) and (b) project membership/teams. FLAG: docs phrasing "set up the site tools you need on the project" refers to usage, not module flags.

**Extension model — explicitly "extend, don't fork"** (`docs/platform/extend-dont-fork.md`):
- **Event bus:** `@event_bus.on("oe_module.entity.action")`, wildcard `"*"` subscribers; failing handlers isolated.
- **Filter hooks / action hooks** (WordPress-style): `@hooks.filter("boq.position.before_save")`, `@hooks.action(...)`.
- **Validation rules** in `validators.py`.
- **Runtime module root** (`app/core/module_runtime_root.py`): custom modules are installed into the instance **data directory**, appended to `app.modules.__path__`, so **platform upgrades never overwrite your custom module** and packaged builds can load it. Shipped modules win name collisions.
- A module template exists at `modules/oe-module-template`, plus `docs/platform/first-module-in-10-minutes.md` and `docs/module-development/quickstart.md`. There is even a `module_builder` module.

**Multi-tenancy:** single-tenant per install today ("tenant" = owning user id; no Org entity — `app/core/tenant_scope.py` says so verbatim). Optional Postgres row-level-security scaffolding exists but is default-OFF (`app/core/rls.py`).

### Modules relevant to H2SEP (all verified present)

- **Checklists/punch:**
  - `punchlist` — table `oe_punchlist_item`: status `open → in_progress → resolved → verified → closed`, priority, **photos** (JSON), location pins on drawings, verifier-must-differ-from-fixer rule, PDF export. Category "core", auto-installed.
  - `forms` ("Forms & Checklists") — `FormTemplate` (org-wide library **or per-project**, ordered `fields_data` JSON `[{key,type,label,required,options,unit,max_rating}]`, versioned, categories, tags, seeded starters) + `FormSubmission`, with **conditional logic** (`conditional.py`) and **formulas** (`formula.py`). This is the closest analog to Austin's room checklist system.
  - `inspections` (checklist + pass/fail gates), `ncr`, `qms`, `construction_control` (hold/witness/review points), `commissioning`, `closeout` (assembles the completion package from punchlist + inspections + documents).
- **Documents/submittals:** `documents`, `cde` (ISO 19650), `submittals`, `transmittals`, `correspondence`, `plan_room`, `markups` (10 PDF markup types), `file_versions/approvals/comments/tags/search/distribution`, `resumable_uploads`.
- **Directory/contacts:** `contacts`, `crm`, `subcontractors`, `teams`, `portal` (client/partner portal), `rfi`, `meetings`, `phonelog`.
- **Roles/permissions:** `users`, `teams` + core `permissions.py` (below).
- **Scheduling (later):** `schedule` (4D Gantt/CPM), `schedule_advanced` (Last Planner), `tasks` (tasks with checklists), `portfolio`, `timeline`.
- **BIM:** `bim_hub` (model/element store, custom three.js viewer, tile streaming, **OfflineModelButton** for caching a model offline), `smart_views`, `coordination_hub`, `clash*`, `geo_hub` (Cesium).

---

## 4. Auth / users / roles

- **JWT** (HS256 default; `JWT_SECRET` mandatory in prod — image bakes in no default) + bcrypt password hashing.
- Canonical roles in `app/core/permissions.py`: **admin > manager > editor > viewer** (hierarchical ranks), plus a newly added **`FIELD_WORKER`** role ranked *below* viewer ("site labourer, lowest-trust persona"). Aliases (`estimator`, `qs`, `owner`, `guest`) collapse to canonical roles.
- Per-module permissions follow `{module}.{action}` in a central `PermissionRegistry`; an admin permissions-matrix UI with presets (viewer-default / editor-default / manager-default) exists.
- Per-user **module access levels** (None/View/Edit/Full) stored in user metadata, admin-set (`users/router.py` lines ~1383-1414).
- Demo accounts are seeded with random passwords (disable via `DISABLE_DEMO_ACCOUNTS=1`).
- A **magic-link + token (jti, revocable, rate-limited) portal auth pattern** already ships for property buyers (`property_dev/portal_*`) and is the declared blueprint for field-worker access.
- IMPORTANT CAVEAT: `grep field_worker backend/app/modules/` returns **nothing** — the role exists in core but **no module surface uses it yet**. The field-worker mobile surface is a **design doc** (`docs/architecture/FIELD_WORKER_MOBILE_DESIGN.md`, "Status: DESIGN (not yet implemented)", pilot = Daily Diary only).

---

## 5. File storage

- Pluggable backend in `app/core/storage.py`: **local filesystem** (default; everything under `OE_DATA_DIR`, `/data` volume in Docker) or **S3-compatible** (`S3StorageBackend` via `aioboto3`, `pip install openconstructionerp[s3]`, `STORAGE_BACKEND=s3`, env `S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET`; `.env.example` defaults to a local **MinIO**).
- Multipart uploads, presigned GET/PUT URLs, a `resumable_uploads` module, magic-byte upload validation, path-traversal protections.
- Reverse proxy must allow **100 MB** request bodies (their nginx.conf does; documented as a hard requirement for CAD/drawing uploads).

---

## 6. PWA / offline — honest reading

**It IS a real installable PWA, but it is offline-*tolerant*, not offline-*first*.**

Verified in code:
- `vite-plugin-pwa` + workbox in `frontend/vite.config.ts`: web manifest ("OCERP", standalone display), full app-shell precache (`js/mjs/css/html/svg/woff2`), CacheFirst runtime caching for static assets, `autoUpdate` service worker, `PWAInstallPrompt.tsx`, `OfflineFallback.tsx`, `useOnlineStatus.ts`.
- `frontend/src/shared/lib/offlineStore.ts`: IndexedDB (`oe_offline`) with two stores — `apiCache` (GET response cache, 1h default TTL) and `mutationQueue`.
- The **generic API client** (`shared/lib/api.ts`) integrates it globally: offline GETs are served from cache; **every offline non-GET mutation is queued and replayed on reconnect** with a "Saved offline / will sync when you reconnect" toast. This applies across modules for free.
- Limitations: the generic queue is naive — no idempotency keys, no conflict resolution, last-write-wins, `retries` counter only. Exactly one module (`field_time`, v14.8.0) has a hardened at-least-once queue with **device-minted idempotency keys** and full-state (not diff) operations — the changelog explains the design well; that pattern is the house style to copy.
- The BIM viewer can pin a model for offline use (`OfflineModelButton.tsx`, tile cache).
- The **field-worker mobile surface** (restricted role, thumb-zone UI, PIN + magic link, per-module whitelist) is designed in detail but **not implemented**.

Bottom line: there is no local database-of-record, no per-room dataset packaging, no sync-conflict UX. A crew member who opens a page online and loses signal can keep working and it will usually sync; a crew member who starts the day offline in a concrete stairwell cannot.

---

## 7. Recommended hosting per the project's own docs, and a concrete plan

The project's own recommendations (from README, `deploy/docker/README.md`, `deploy/`):
1. **Individual/local:** Tauri desktop app or `pip install openconstructionerp` (embedded Postgres).
2. **Team server (their documented path): Docker.**
   - *Layout 1 (fastest):* one unified image (FastAPI serves the built SPA) + Postgres 16 — `docker-compose.quickstart.yml`.
   - *Layout 2 (production):* `docker-compose.prod.yml` — `pgduckdb:16` Postgres, backend container (port 8000), **nginx frontend container** (TLS termination, `client_max_body_size 100M`, `.mjs` MIME fix for the pdf.js worker, WebSocket upgrade blocks), optional Qdrant behind an `ai` profile. Required env: `JWT_SECRET`, DB parts, `OE_DATA_DIR=/data` (persistent volume — without it BIM geometry dies on container recreate), `ALLOWED_ORIGINS` **must** include the public hostname (symptom of forgetting: blank screen, clean server logs), `OE_BIND=127.0.0.1` when behind a proxy.
3. **Cloud recipes shipped in-repo:** `deploy/render/render.yaml` (Render web service + **managed Postgres** — the only recipe using a managed DB), `deploy/railway/railway.toml`, `deploy/terraform/digitalocean/main.tf` (droplet + firewall, self-managed).

**Concrete plan for Triun (cost no object; reliability, convenience, large files):**
1. One Linux VM (DigitalOcean droplet 4 vCPU / 8 GB or equivalent — their own Terraform targets DO) **or** Render if you prefer fully-managed; Docker Compose from `docker-compose.prod.yml`.
2. **Managed PostgreSQL 16** (DO Managed PG / Render Postgres) instead of the containerized DB — daily automated backups, point-in-time recovery. Set `DATABASE_URL` directly (it overrides the compose DB parts).
3. **`STORAGE_BACKEND=s3`** pointed at S3/Cloudflare R2/DO Spaces for large files (plans, photos, BIM). This is first-class in the code and removes disk-size worry.
4. Nginx (theirs) or Caddy for TLS on 443; honor their four proxy rules (100M body, .mjs MIME, WS upgrade, `ALLOWED_ORIGINS`).
5. Skip Qdrant/AI initially (LanceDB embedded covers it if wanted later).
6. **Pin an image/version tag and upgrade deliberately.** This project releases near-daily with Alembic migrations (a `MIGRATION_v4.5_to_v4.6.md` exists; changelogs note behavior-changing releases). Keep a staging instance; snapshot DB before upgrades. `/api/health` reports whether DB revision matches the Alembic head.
7. Nightly `pg_dump` + `/data` volume backup; monitor `/api/health`.

---

## 8. AGPL-3.0 obligations for Triun's custom build (not legal advice)

- **Running an unmodified copy** for your own team: AGPL §13's network clause applies to *modified* versions; unmodified hosting carries no source-offer duty (keep license/notice files intact). Safest practice anyway: keep a "Source" link.
- **Modifying it (including adding custom in-process modules):** a custom module that imports `app.core.*` and runs inside the FastAPI process is a derivative work → it becomes AGPL, and **every user who interacts with the modified version over the network** — including subcontractors/vendors you give logins to — **must be offered the Corresponding Source** of your modified version (custom modules included). This does **not** mean publishing to the general public: a footer link to a repo that those users can access (even a private repo with access granted, though a public one is simplest) satisfies it.
- **A separate custom field PWA that talks only to the documented REST API** is generally regarded as a separate work communicating at arm's length — it can remain proprietary. This is the standard reading of AGPL API boundaries; if it matters commercially, confirm with counsel.
- The project is dual-licensed; DataDrivenConstruction sells a commercial license if AGPL terms are unwanted. Contributing upstream requires their CLA (copyright stays with DDC).

---

## 9. Honest assessment

**Maturity — genuinely impressive breadth, genuinely young, bus factor of one.**
- Strengths: 653 stars in 4.5 months; pushed the same day I researched; 3,763 commits; 558 tagged releases; disciplined changelogs; visible security engineering (RLS scaffolding, upload magic-byte guards, revocable portal tokens, IDOR-as-404 discipline, rate limiting); real docs; a real extension architecture with an upgrade-safe runtime module root. Only 13 open issues.
- Risks, plainly: **one person writes effectively all the code** (stated in `AUTHORS.md`; community patches are reimplemented, not merged). Version 3 → 14 in four months means fast-moving schemas and occasional breaking behavior. No evidence of a production install base (UNVERIFIED). If the author stops, the project stops. Mitigation: AGPL means the code can't be taken away, the stack (FastAPI/React/Postgres) is mainstream and maintainable, and self-hosting isolates you from upstream drama — but budget for pinning a version and living on it.

**Fit for H2SEP:**
- **Office dashboard / back-office: strong.** Punch list, forms/checklists (with per-project templates, conditional logic), inspections, submittals/transmittals/documents/CDE, contacts/subcontractors, RFI, roles/permissions, scheduling, reporting — all exist and are API-complete (~3,629 endpoints, Swagger).
- **BIM viewer: yes**, custom three.js viewer with tile streaming and offline model pinning; IFC is the reliable ingestion path; RVT/DWG conversion depends on Windows .exe converters under Wine — treat as best-effort on a Linux host.
- **Offline-first field PWA: the gap.** It is a PWA with a global offline mutation queue — good — but not offline-first: no local source of truth, no conflict handling, no per-room work packaging, and the dedicated field-worker surface is an unimplemented design doc. For a hotel finish-out crew walking 115 rooms with spotty signal, the built-in surface today would frustrate.

**Recommended architecture honoring "built on OpenConstructionERP":**
1. **OCERP as the system of record + office layer**, self-hosted per §7. Turn off unneeded modules; use `punchlist`, `forms`, `inspections`, `documents`, `submittals`, `contacts`, `teams`, `bim_hub`; `schedule` later.
2. **A custom OCERP module** (built from `modules/oe-module-template`, installed via the runtime module root so upgrades don't touch it) for hotel-domain data: rooms (115 keys, room types, floors) as first-class locations, room-type checklist template bindings, FF&E/MEP rollup endpoints, and any H2SEP-specific reports. It plugs into OCERP's auth, permissions, events, and REST surface automatically.
3. **A thin custom field PWA as a separate client** speaking only the REST API: local IndexedDB (or SQLite-wasm) as the on-device source of truth, background sync with device-minted idempotency keys (copy the `field_time` v14.8.0 pattern — it is the project's own blessed design), one-thumb room-checklist UX. Keeping it API-only also keeps it outside AGPL.
4. Migration note: the existing H2SEP crew checklist app is Firestore-seeded (per the `h2sep-room-buildout` workflow); moving to OCERP means an ETL of room/checklist/status data into `forms`/`punchlist` (or the custom module's tables). Feasible, but it is a real data-migration workstream — flag for planning.

**Verdict:** OpenConstructionERP is real, remarkably capable for its age, architecturally sound, and explicitly designed to be extended without forking — a defensible base for the office/back-office layer and API. It does **not** currently deliver the offline-first field experience Austin needs; that piece should be built as a custom API-client PWA (or by implementing the project's own field-worker design). The single-author sustainability risk is the one thing that should be consciously accepted, with version pinning and self-hosting as the mitigation.

---

## Appendix: key paths (in local clone `/workspace/datadrivenconstruction/openconstructionerp`)

- Module loader / state / runtime root: `backend/app/core/module_loader.py`, `module_state.py`, `module_runtime_root.py`
- RBAC: `backend/app/core/permissions.py`; per-user module access: `backend/app/modules/users/router.py` (~L1383)
- Storage: `backend/app/core/storage.py`; config: `backend/app/config.py` (~L301); `.env.example`
- Offline: `frontend/src/shared/lib/offlineStore.ts`, `frontend/src/shared/lib/api.ts` (~L426), `frontend/src/features/field-time/offlineQueue.ts`
- PWA: `frontend/vite.config.ts` (VitePWA block, ~L141)
- Field design doc: `docs/architecture/FIELD_WORKER_MOBILE_DESIGN.md`
- Extension guide: `docs/platform/extend-dont-fork.md`; template: `modules/oe-module-template`
- Deployment: `deploy/docker/README.md`, `docker-compose.prod.yml`, `docker-compose.quickstart.yml`, `deploy/render/render.yaml`, `deploy/terraform/digitalocean/main.tf`
- Checklist-relevant modules: `backend/app/modules/{punchlist,forms,inspections,ncr,documents,submittals,transmittals,contacts,teams,users,schedule,tasks,bim_hub,portal,field_diary,field_time}`
- Governance: `AUTHORS.md`, `CONTRIBUTORS.md`, `CLA.md`, `COMMERCIAL-LICENSE.md`, `MODULES.md`, `CHANGELOG.md`
