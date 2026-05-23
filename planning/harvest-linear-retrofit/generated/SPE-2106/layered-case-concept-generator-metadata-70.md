**Harvest retrofit (rich)** — `layered-case-concept-generator-metadata-70` → **SPE-2106** (part 1/1)
_Automated retrofit from `planning/layered-case-concept-generator-metadata-70-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.
- **Dedup:** **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook/complication tables.
- **Repo at triage:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Candidates on SPE-2106:** C14, C23
---

#### C14 — Nonhuman instigator in urban batch

**1. Candidate & source**
- **ID:** C14
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Nonhuman instigator in urban batch
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Nonhuman instigator in urban batch

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-2106
- **Co-owners:** SPE-88

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C14)

---

#### C23 — Single-site bottle template

**1. Candidate & source**
- **ID:** C23
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Single-site bottle template
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Single-site bottle template

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-2106
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-2106 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C23)
