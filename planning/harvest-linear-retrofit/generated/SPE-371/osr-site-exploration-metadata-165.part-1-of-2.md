**Harvest retrofit (rich)** — `osr-site-exploration-metadata-165` → **SPE-371** (part 1/2)
_Automated retrofit from `planning/osr-site-exploration-metadata-165-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-mechanics-transcript-metadata-87` (OSR agency), `mc-toolkit-contract-authoring-metadata-132` (location/trap authoring), `urban-concealment-investigation-metadata-100` (fallible map), `post-release-tactical-manual-metadata-104` (visibility).
- **Repo at triage:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Candidates on SPE-371:** C1, C2, C18, C19, C21, C137, C139
---

#### C1 — Turn-based exploration clock + zone reactions

**1. Candidate & source**
- **ID:** C1
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Turn-based exploration clock + zone reactions
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Turn-based exploration clock + zone reactions

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-371
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-371 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C1)

---

#### C2 — Exploration action cost table

**1. Candidate & source**
- **ID:** C2
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Exploration action cost table
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Exploration action cost table

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-371
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-371 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C2)

---

#### C18 — Delta vs osr-60 zone tables

**1. Candidate & source**
- **ID:** C18
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Delta vs osr-60 zone tables
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Delta vs osr-60 zone tables

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-371
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C18)

---

#### C19 — Wandering checks partial in osr-60

**1. Candidate & source**
- **ID:** C19
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Wandering checks partial in osr-60
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Wandering checks partial in osr-60

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-371
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C19)

---

#### C21 — Wilderness table partial osr-60

**1. Candidate & source**
- **ID:** C21
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Wilderness table partial osr-60
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Wilderness table partial osr-60

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-371
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C21)

---

#### C137 — Alert-state encounter modifier

**1. Candidate & source**
- **ID:** C137
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Alert-state encounter modifier
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Alert-state encounter modifier

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-371
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-371 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C137)

---

#### C139 — Pursuit after retreat

**1. Candidate & source**
- **ID:** C139
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Pursuit after retreat
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Pursuit after retreat

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-371
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-371 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C139)
