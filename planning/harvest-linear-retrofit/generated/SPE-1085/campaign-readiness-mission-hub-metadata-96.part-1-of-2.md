**Harvest retrofit (rich)** — `campaign-readiness-mission-hub-metadata-96` → **SPE-1085** (part 1/2)
_Automated retrofit from `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.
- **Dedup:** Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-55` (defend-while-progress), `branchContinuity` (SPE-1760), `missionIntakeRouting` readiness scoring.
- **Repo at triage:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Candidates on SPE-1085:** C81, C82, C83, C84, C85, C86, C87, C88
---

#### C81 — No franchise import

**1. Candidate & source**
- **ID:** C81
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** No franchise import
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** No franchise import

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-151

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C81)

---

#### C82 — War → civic/containment readiness

**1. Candidate & source**
- **ID:** C82
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** War → civic/containment readiness
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** War → civic/containment readiness

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C82)

---

#### C83 — Fair readiness preview

**1. Candidate & source**
- **ID:** C83
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Fair readiness preview
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Fair readiness preview

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C83)

---

#### C84 — No paragon/renegade color morality

**1. Candidate & source**
- **ID:** C84
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** No paragon/renegade color morality
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** No paragon/renegade color morality

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-1034

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C84)

---

#### C85 — Fair deadline warnings

**1. Candidate & source**
- **ID:** C85
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Fair deadline warnings
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Fair deadline warnings

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
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C85)

---

#### C86 — Rescue dignity

**1. Candidate & source**
- **ID:** C86
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Rescue dignity
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Rescue dignity

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-35

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C86)

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
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-1025

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C87)

---

#### C88 — Refugee content dignity/agency

**1. Candidate & source**
- **ID:** C88
- **Batch:** `campaign-readiness-mission-hub-metadata-96`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Refugee content dignity/agency
- **Pattern context:** Abstracted from batch source (Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.).
- **Repo anchor:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Table note:** Refugee content dignity/agency

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-1052

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C88)
