**Harvest retrofit (rich)** — `campaign-readiness-mission-hub-metadata-96` → **SPE-1025** (part 1/1)
_Automated retrofit from `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.
- **Dedup:** Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-55` (defend-while-progress), `branchContinuity` (SPE-1760), `missionIntakeRouting` readiness scoring.
- **Repo at triage:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Candidates on SPE-1025:** C22, C23, C24, C28, C87
---

#### C22 — Staff presence modifies scenes

**1. Candidate & source**
- **ID:** C22
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Staff presence modifies scenes
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Staff presence modifies scenes

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1025
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1025 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C22)

---

#### C23 — Mandatory specialist coverage

**1. Candidate & source**
- **ID:** C23
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Mandatory specialist coverage
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Mandatory specialist coverage

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1025
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1025 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C23)

---

#### C24 — Optional specialist insight

**1. Candidate & source**
- **ID:** C24
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Optional specialist insight
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Optional specialist insight

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1025
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1025 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C24)

---

#### C28 — Temporary staff split

**1. Candidate & source**
- **ID:** C28
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Temporary staff split
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Temporary staff split

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1025
- **Co-owners:** SPE-1485

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1025 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C28)

---

#### C87 — Staff split = actors with aftermath

**1. Candidate & source**
- **ID:** C87
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Staff split = actors with aftermath
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Staff split = actors with aftermath

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1025
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1025

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C87)
