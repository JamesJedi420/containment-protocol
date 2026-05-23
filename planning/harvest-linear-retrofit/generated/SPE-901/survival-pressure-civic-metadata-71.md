**Harvest retrofit (rich)** — `survival-pressure-civic-metadata-71` → **SPE-901** (part 1/1)
_Automated retrofit from `planning/survival-pressure-civic-metadata-71-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.
- **Dedup:** Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-debt-players-edition-metadata-128` (deprivation, recovery, gear degradation), `urban-concealment-investigation-metadata-100` (witnessed misconduct, fallible map), `haunted-estate-dual-pressure-metadata-106` (dual pressure clocks), `faith-adjacent-clandestine-agency-metadata-50` (scarcity barter). **SPE-130** three-channel fatigue and **SPE-1107** responder energy budget already land multi-axis exhaustion — not a single tiredness bar.
- **Repo at triage:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Candidates on SPE-901:** C30, C52, C53
---

#### C30 — Field-cache persistence / cleanup at transition

**1. Candidate & source**
- **ID:** C30
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Field-cache persistence / cleanup at transition
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Field-cache persistence / cleanup at transition

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-901
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-901 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C30)

---

#### C52 — Crisis inflation by day

**1. Candidate & source**
- **ID:** C52
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Crisis inflation by day
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Crisis inflation by day

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-901
- **Co-owners:** SPE-35

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-901 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C52)

---

#### C53 — Delta vs expedition loot-refresh schedules

**1. Candidate & source**
- **ID:** C53
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Delta vs expedition loot-refresh schedules
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Delta vs expedition loot-refresh schedules

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-901
- **Co-owners:** none

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

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C53)
