**Harvest retrofit (rich)** — `mc-toolkit-contract-authoring-metadata-132` → **SPE-854** (part 5/6)
_Automated retrofit from `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.
- **Dedup:** Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format tables). **Adds** contract-authoring schemas, red-herring rules, collectives, session/cutscene flow, campaign series sheets, legal/media threat profiles, and extended sensitivity guardrails.
- **Repo at triage:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Candidates on SPE-854:** C80, C82, C83, C84, C88, C90, C91
---

#### C80 — Clue resolve: authored → truth → generated

**1. Candidate & source**
- **ID:** C80
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Clue resolve: authored → truth → generated
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Clue resolve: authored → truth → generated

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C80)

---

#### C82 — Series resources sheet

**1. Candidate & source**
- **ID:** C82
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Series resources sheet
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Series resources sheet

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-1760

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C82)

---

#### C83 — Evidence board / iceberg UI

**1. Candidate & source**
- **ID:** C83
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Evidence board / iceberg UI
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Evidence board / iceberg UI

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-58

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C83)

---

#### C84 — Arc branch convergence UI

**1. Candidate & source**
- **ID:** C84
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Arc branch convergence UI
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Arc branch convergence UI

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-1760

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C84)

---

#### C88 — Street symptoms of macro ops

**1. Candidate & source**
- **ID:** C88
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Street symptoms of macro ops
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Street symptoms of macro ops

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-16

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

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C88)

---

#### C90 — District template packet

**1. Candidate & source**
- **ID:** C90
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** District template packet
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** District template packet

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-109

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C90)

---

#### C91 — Place-of-interest template

**1. Candidate & source**
- **ID:** C91
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Place-of-interest template
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Place-of-interest template

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-2106

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C91)
