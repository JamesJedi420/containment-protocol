**Harvest retrofit (rich)** — `mc-toolkit-contract-authoring-metadata-132` → **SPE-1760** (part 1/1)
_Automated retrofit from `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.
- **Dedup:** Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format tables). **Adds** contract-authoring schemas, red-herring rules, collectives, session/cutscene flow, campaign series sheets, legal/media threat profiles, and extended sensitivity guardrails.
- **Repo at triage:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Candidates on SPE-1760:** C45, C48, C50, C81, C82, C84
---

#### C45 — Campaign resource registry 

**1. Candidate & source**
- **ID:** C45
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Campaign resource registry (`campaignLedger`)
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.
- **Named modules in note:** `campaignLedger`.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Campaign resource registry (`campaignLedger`)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-854

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C45)

---

#### C48 — Linked contract arc chains

**1. Candidate & source**
- **ID:** C48
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Linked contract arc chains
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Linked contract arc chains

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-854

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C48)

---

#### C50 — Mutable campaign arc graph

**1. Candidate & source**
- **ID:** C50
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Mutable campaign arc graph
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Mutable campaign arc graph

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C50)

---

#### C81 — Series staff tracking sheet

**1. Candidate & source**
- **ID:** C81
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Series staff tracking sheet
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Series staff tracking sheet

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C81)

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
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-854

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
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
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-854

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
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
