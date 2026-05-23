**Harvest retrofit (rich)** — `mc-toolkit-contract-authoring-metadata-132` → **SPE-854** (part 6/6)
_Automated retrofit from `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.
- **Dedup:** Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format tables). **Adds** contract-authoring schemas, red-herring rules, collectives, session/cutscene flow, campaign series sheets, legal/media threat profiles, and extended sensitivity guardrails.
- **Repo at triage:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Candidates on SPE-854:** C92, C101, C109, C125, C126
---

#### C92 — Local contact template

**1. Candidate & source**
- **ID:** C92
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Local contact template
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Local contact template

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-158

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

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C92)

---

#### C101 — Reporter/media danger profile

**1. Candidate & source**
- **ID:** C101
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Reporter/media danger profile
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Reporter/media danger profile

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-208

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

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C101)

---

#### C109 — Sample-case validation fixture

**1. Candidate & source**
- **ID:** C109
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Sample-case validation fixture
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Sample-case validation fixture

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-16

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

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C109)

---

#### C125 — Fair multi-path clues

**1. Candidate & source**
- **ID:** C125
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Fair multi-path clues
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Fair multi-path clues

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-854

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C125)

---

#### C126 — Red-herring time respect

**1. Candidate & source**
- **ID:** C126
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Red-herring time respect
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Red-herring time respect

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-151

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-854

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C126)
