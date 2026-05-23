**Harvest retrofit (rich)** — `expedition-debt-players-edition-metadata-128` → **SPE-529** (part 1/1)
_Automated retrofit from `planning/expedition-debt-players-edition-metadata-128-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.
- **Dedup:** **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-rules surfaces.
- **Repo at triage:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Candidates on SPE-529:** C48–C57, C59, C62–C63, C64–C65, C72–C74, C81–C83, C126–C128
---

#### C48–C57 — Oddity patterns in 115

**1. Candidate & source**
- **ID:** C48–C57
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Oddity patterns in 115
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Oddity patterns in 115

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C48–C57)

---

#### C59 — Activation-cost categories 

**1. Candidate & source**
- **ID:** C59
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Activation-cost categories (currency, sacrifice, belief)
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Activation-cost categories (currency, sacrifice, belief)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C59)

---

#### C62–C63 — Device personality/refusal; extraction beacons

**1. Candidate & source**
- **ID:** C62–C63
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Device personality/refusal; extraction beacons
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Device personality/refusal; extraction beacons

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C62–C63)

---

#### C64–C65 — Memory/coercion safeguards

**1. Candidate & source**
- **ID:** C64–C65
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Memory/coercion safeguards
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Memory/coercion safeguards

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-35

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-529

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C64–C65)

---

#### C72–C74 — Timed repair; object-class preparation procedures

**1. Candidate & source**
- **ID:** C72–C74
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Timed repair; object-class preparation procedures
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Timed repair; object-class preparation procedures

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C72–C74)

---

#### C81–C83 — Actor/debtholder/oddity templates

**1. Candidate & source**
- **ID:** C81–C83
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Actor/debtholder/oddity templates
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Actor/debtholder/oddity templates

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-158, SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C81–C83)

---

#### C126–C128 — Combat math, career list, oddity list import bans

**1. Candidate & source**
- **ID:** C126–C128
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** no_op/guardrail

**2. Mechanic (agent-readable)**
- **Harvest summary:** Combat math, career list, oddity list import bans
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Combat math, career list, oddity list import bans

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-1085, SPE-151

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C126–C128)
