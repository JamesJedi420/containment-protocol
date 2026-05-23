**Harvest retrofit (rich)** — `survival-pressure-civic-metadata-71` → **SPE-1085** (part 1/3)
_Automated retrofit from `planning/survival-pressure-civic-metadata-71-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.
- **Dedup:** Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-debt-players-edition-metadata-128` (deprivation, recovery, gear degradation), `urban-concealment-investigation-metadata-100` (witnessed misconduct, fallible map), `haunted-estate-dual-pressure-metadata-106` (dual pressure clocks), `faith-adjacent-clandestine-agency-metadata-50` (scarcity barter). **SPE-130** three-channel fatigue and **SPE-1107** responder energy budget already land multi-axis exhaustion — not a single tiredness bar.
- **Repo at triage:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Candidates on SPE-1085:** C14, C24, C36, C43, C61, C62, C63
---

#### C14 — Inevitable loss despite correct prep

**1. Candidate & source**
- **ID:** C14
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Inevitable loss despite correct prep
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Inevitable loss despite correct prep

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-1760

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1085 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C14)

---

#### C24 — Neutral-territory jurisdiction exploit rule

**1. Candidate & source**
- **ID:** C24
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Neutral-territory jurisdiction exploit rule
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Neutral-territory jurisdiction exploit rule

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-208

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1085 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C24)

---

#### C36 — Combat avoid-or-engage framework

**1. Candidate & source**
- **ID:** C36
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Combat avoid-or-engage framework
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Combat avoid-or-engage framework

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-42

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1085 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C36)

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
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1085 when that issue's slice is implemented
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

#### C61 — Health-only staff condition

**1. Candidate & source**
- **ID:** C61
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Health-only staff condition
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Health-only staff condition

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-1107

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C61)

---

#### C62 — Trivial removable infection debuff

**1. Candidate & source**
- **ID:** C62
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Trivial removable infection debuff
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Trivial removable infection debuff

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-1107

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C62)

---

#### C63 — Cosmetic time clock

**1. Candidate & source**
- **ID:** C63
- **Batch:** `survival-pressure-civic-metadata-71`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Cosmetic time clock
- **Pattern context:** Abstracted from batch source (Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.).
- **Repo anchor:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.
- **Table note:** Cosmetic time clock

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-deb…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/survival-pressure-civic-metadata-71-harvest.md` (C63)
