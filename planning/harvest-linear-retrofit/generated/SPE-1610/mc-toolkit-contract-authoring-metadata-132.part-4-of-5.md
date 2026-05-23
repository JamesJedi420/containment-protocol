**Harvest retrofit (rich)** — `mc-toolkit-contract-authoring-metadata-132` → **SPE-1610** (part 4/5)
_Automated retrofit from `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.
- **Dedup:** Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format tables). **Adds** contract-authoring schemas, red-herring rules, collectives, session/cutscene flow, campaign series sheets, legal/media threat profiles, and extended sensitivity guardrails.
- **Repo at triage:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Candidates on SPE-1610:** C70, C71, C72, C73, C74, C76, C95
---

#### C70 — Soft move library

**1. Candidate & source**
- **ID:** C70
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Soft move library
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Soft move library

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C70)

---

#### C71 — Hard move library

**1. Candidate & source**
- **ID:** C71
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Hard move library
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Hard move library

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C71)

---

#### C72 — Custom move template

**1. Candidate & source**
- **ID:** C72
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Custom move template
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Custom move template

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1610 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C72)

---

#### C73 — Custom move visibility / dossier confidence

**1. Candidate & source**
- **ID:** C73
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Custom move visibility / dossier confidence
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Custom move visibility / dossier confidence

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** SPE-2108

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1610 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C73)

---

#### C74 — Challenge tuning controls

**1. Candidate & source**
- **ID:** C74
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Challenge tuning controls
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Challenge tuning controls

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1610 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C74)

---

#### C76 — Status scope/duration

**1. Candidate & source**
- **ID:** C76
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Status scope/duration
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Status scope/duration

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** SPE-130

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1610 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C76)

---

#### C95 — Public anonymity defense

**1. Candidate & source**
- **ID:** C95
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Public anonymity defense
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Public anonymity defense

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** SPE-2108

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1610 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C95)
