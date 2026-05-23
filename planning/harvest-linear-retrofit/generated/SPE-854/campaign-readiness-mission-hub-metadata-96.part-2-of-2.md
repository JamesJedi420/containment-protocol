**Harvest retrofit (rich)** — `campaign-readiness-mission-hub-metadata-96` → **SPE-854** (part 2/2)
_Automated retrofit from `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.
- **Dedup:** Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-55` (defend-while-progress), `branchContinuity` (SPE-1760), `missionIntakeRouting` readiness scoring.
- **Repo at triage:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Candidates on SPE-854:** C44–C45, C66, C69, C71, C89
---

#### C44–C45 — Recoverable checklist + capability linkage

**1. Candidate & source**
- **ID:** C44–C45
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Recoverable checklist + capability linkage
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Recoverable checklist + capability linkage

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
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C44–C45)

---

#### C66 — High-stakes choice preview 

**1. Candidate & source**
- **ID:** C66
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** High-stakes choice preview (fallible)
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** High-stakes choice preview (fallible)

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
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C66)

---

#### C69 — Civic object recovery mapping

**1. Candidate & source**
- **ID:** C69
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Civic object recovery mapping
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Civic object recovery mapping

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
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C69)

---

#### C71 — Political investigation chain

**1. Candidate & source**
- **ID:** C71
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Political investigation chain
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Political investigation chain

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-788

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C71)

---

#### C89 — Surveillance legal/ethical framing

**1. Candidate & source**
- **ID:** C89
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Surveillance legal/ethical framing
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Surveillance legal/ethical framing

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
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C89)
