**Harvest retrofit (rich)** — `survival-pressure-civic-metadata-71` → **SPE-16** (part 1/1)
_Automated retrofit from `planning/survival-pressure-civic-metadata-71-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.
- **Dedup:** Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-debt-players-edition-metadata-128` (deprivation, recovery, gear degradation), `urban-concealment-investigation-metadata-100` (witnessed misconduct, fallible map), `haunted-estate-dual-pressure-metadata-106` (dual pressure clocks), `faith-adjacent-clandestine-agency-metadata-50` (scarcity barter). **SPE-130** three-channel fatigue and **SPE-1107** responder energy budget already land multi-axis exhaustion — not a single tiredness bar.
- **Repo at triage:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Candidates on SPE-16:** C15, C18, C43, C46
---

#### C15 — Midnight resolution phase

**1. Candidate & source**
- **ID:** C15
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Midnight resolution phase
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Midnight resolution phase

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C15)

---

#### C18 — Escalating time pressure by campaign day

**1. Candidate & source**
- **ID:** C18
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Escalating time pressure by campaign day
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Escalating time pressure by campaign day

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C18)

---

#### C43 — Checkpoint/reporting commitment friction

**1. Candidate & source**
- **ID:** C43
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Checkpoint/reporting commitment friction
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Checkpoint/reporting commitment friction

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C43)

---

#### C46 — Daily town-state resolver

**1. Candidate & source**
- **ID:** C46
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Daily town-state resolver
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Daily town-state resolver

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-109, SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C46)
