**Harvest retrofit (rich)** — `layered-case-concept-generator-metadata-70` → **SPE-35** (part 1/1)
_Automated retrofit from `planning/layered-case-concept-generator-metadata-70-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.
- **Dedup:** **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook/complication tables.
- **Repo at triage:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Candidates on SPE-35:** C10, C37, C62, C63, C64, C65, C66, C67
---

#### C10 — Non-criminal harm contracts

**1. Candidate & source**
- **ID:** C10
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Non-criminal harm contracts
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Non-criminal harm contracts

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-35 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C10)

---

#### C37 — Redeemable subject branch 

**1. Candidate & source**
- **ID:** C37
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Redeemable subject branch (accountability preserved)
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Redeemable subject branch (accountability preserved)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-35 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C37)

---

#### C62 — Sensitive crime filtering

**1. Candidate & source**
- **ID:** C62
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Sensitive crime filtering
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Sensitive crime filtering

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-151

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-35

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C62)

---

#### C63 — Police misconduct grounded framing

**1. Candidate & source**
- **ID:** C63
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Police misconduct grounded framing
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Police misconduct grounded framing

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-208

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-35

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C63)

---

#### C64 — Conversion preserves agency/consent

**1. Candidate & source**
- **ID:** C64
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Conversion preserves agency/consent
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Conversion preserves agency/consent

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-2108

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-35

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C64)

---

#### C65 — Victim/perpetrator ambiguity + accountability

**1. Candidate & source**
- **ID:** C65
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Victim/perpetrator ambiguity + accountability
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Victim/perpetrator ambiguity + accountability

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-35

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C65)

---

#### C66 — Psychological harm / suicide care

**1. Candidate & source**
- **ID:** C66
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Psychological harm / suicide care
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Psychological harm / suicide care

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-151

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-35

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C66)

---

#### C67 — Trafficking abstraction

**1. Candidate & source**
- **ID:** C67
- **Batch:** `layered-case-concept-generator-metadata-70`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Trafficking abstraction
- **Pattern context:** Abstracted from batch source (Readable 12-page case concept generator PDF (layered investigation premise tables). Pattern-only — no setting names, myth labels, Rifts/Mythos/Logos terminology, or source prose.).
- **Repo anchor:** `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `caseGeneration.ts`; `contracts.ts` / case templates; `caseTemplates.*`; `missionIntakeRouting.ts`; `branchContinuity.ts`.
- **Table note:** Trafficking abstraction

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-151

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-35

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta/supplement** to `urban-concealment-investigation-metadata-100` (awareness, dual identity, clue economy, case iceberg). Adds procedural **contract-generator schema**, harm taxonomy, format/hook…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/layered-case-concept-generator-metadata-70-harvest.md` (C67)
