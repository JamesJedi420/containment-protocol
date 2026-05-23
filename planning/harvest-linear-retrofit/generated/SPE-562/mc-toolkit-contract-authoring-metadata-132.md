**Harvest retrofit (rich)** — `mc-toolkit-contract-authoring-metadata-132` → **SPE-562** (part 1/1)
_Automated retrofit from `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.
- **Dedup:** Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format tables). **Adds** contract-authoring schemas, red-herring rules, collectives, session/cutscene flow, campaign series sheets, legal/media threat profiles, and extended sensitivity guardrails.
- **Repo at triage:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Candidates on SPE-562:** C17, C69
---

#### C17 — Countdown spectrums

**1. Candidate & source**
- **ID:** C17
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Countdown spectrums
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Countdown spectrums

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-562
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

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C17)

---

#### C69 — Countdown terminal outcome table

**1. Candidate & source**
- **ID:** C69
- **Batch:** `mc-toolkit-contract-authoring-metadata-132`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Countdown terminal outcome table
- **Pattern context:** Abstracted from batch source (Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.).
- **Repo anchor:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.
- **Table note:** Countdown terminal outcome table

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-562
- **Co-owners:** SPE-1610

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-562 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format t…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mc-toolkit-contract-authoring-metadata-132-harvest.md` (C69)
