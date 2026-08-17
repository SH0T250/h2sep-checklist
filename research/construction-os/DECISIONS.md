# Platform build decisions (Austin's rulings)

Running log. Each entry is law until Austin overrides it in writing.

| # | Date | Decision |
|---|---|---|
| D1 | 2026-08-15 | Status workflow v1: tap-to-check with initials + timestamp stays the heartbeat on every item, plus the issue flag. Procurement statuses (Not Ordered, Ordered, In Transit, Received, Staged, Installing, Installed Complete, Damaged) turn on only for order-tracked categories (FF&E families, appliances, bath accessories, patio, pool). Other categories can enable them later via a per-category switch, no rebuild. |
| D2 | 2026-08-15 | Common areas: the 66 spaces seeded from the plans carry over as the confirmed list. Additions/archives happen in-app later. |
| D3 | 2026-08-15 | Populating categories beyond the database scope (cameras/low voltage, pool equipment, patio furniture, kitchen equipment, signage): both paths. Mine plans + submittals in Drive where they cover it (sheet-cited, flagged unknowns, never guessed) AND ship a fast in-app add-item intake flow for field fill-in. The database stays the source of truth where it has the data. |
