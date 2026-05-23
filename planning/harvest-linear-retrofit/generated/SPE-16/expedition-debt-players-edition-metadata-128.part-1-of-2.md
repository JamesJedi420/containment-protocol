**Harvest retrofit (rich)** — `expedition-debt-players-edition-metadata-128` → **SPE-16** (part 1/2)
_Automated retrofit from `planning/expedition-debt-players-edition-metadata-128-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.
- **Dedup:** **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-rules surfaces.
- **Repo at triage:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Candidates on SPE-16:** C1–C2, C3, C4, C39, C42, C81–C83, C84–C85
---

#### C1–C2 — =115 C1–C2

**1. Candidate & source**
- **ID:** C1–C2
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** =115 C1–C2
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** =115 C1–C2

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-788

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

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C1–C2)

---

#### C3 — Debt clause/obligation schema 

**1. Candidate & source**
- **ID:** C3
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Debt clause/obligation schema (not amount-only)
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Debt clause/obligation schema (not amount-only)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C3)

---

#### C4 — Dynamic liability modifiers from events

**1. Candidate & source**
- **ID:** C4
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Dynamic liability modifiers from events
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Dynamic liability modifiers from events

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C4)

---

#### C39 — Shared inherited asset liability hooks

**1. Candidate & source**
- **ID:** C39
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Shared inherited asset liability hooks
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Shared inherited asset liability hooks

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C39)

---

#### C42 — Debt payoff category incentives

**1. Candidate & source**
- **ID:** C42
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Debt payoff category incentives
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Debt payoff category incentives

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C42)

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
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-158, SPE-529

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
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

#### C84–C85 — Equipment bundles; org-binding debt origin

**1. Candidate & source**
- **ID:** C84–C85
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Equipment bundles; org-binding debt origin
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Equipment bundles; org-binding debt origin

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-98

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C84–C85)
