**Harvest retrofit (rich)** — `survival-pressure-civic-metadata-71` → **SPE-1610** (part 1/1)
_Automated retrofit from `planning/survival-pressure-civic-metadata-71-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.
- **Dedup:** Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-debt-players-edition-metadata-128` (deprivation, recovery, gear degradation), `urban-concealment-investigation-metadata-100` (witnessed misconduct, fallible map), `haunted-estate-dual-pressure-metadata-106` (dual pressure clocks), `faith-adjacent-clandestine-agency-metadata-50` (scarcity barter). **SPE-130** three-channel fatigue and **SPE-1107** responder energy budget already land multi-axis exhaustion — not a single tiredness bar.
- **Repo at triage:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Candidates on SPE-1610:** C28, C35, C54
---

#### C28 — Delta vs `districtSchedule` time layers

**1. Candidate & source**
- **ID:** C28
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Delta vs `districtSchedule` time layers
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.
- **Named modules in note:** `districtSchedule`.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Delta vs `districtSchedule` time layers

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** SPE-109

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C28)

---

#### C35 — Raised-tool stance movement/social penalty

**1. Candidate & source**
- **ID:** C35
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Raised-tool stance movement/social penalty
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Raised-tool stance movement/social penalty

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** SPE-42

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1610 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C35)

---

#### C54 — Day/night population replacement

**1. Candidate & source**
- **ID:** C54
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Day/night population replacement
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Day/night population replacement

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1610
- **Co-owners:** SPE-109

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1610 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C54)
