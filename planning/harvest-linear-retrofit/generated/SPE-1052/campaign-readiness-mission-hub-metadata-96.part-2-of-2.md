**Harvest retrofit (rich)** — `campaign-readiness-mission-hub-metadata-96` → **SPE-1052** (part 2/2)
_Automated retrofit from `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.
- **Dedup:** Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-55` (defend-while-progress), `branchContinuity` (SPE-1760), `missionIntakeRouting` readiness scoring.
- **Repo at triage:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.
- **Candidates on SPE-1052:** C88
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
- **Primary (this comment):** SPE-1052
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1052

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/campaign-readiness-mission-hub-metadata-96-harvest.md` (C88)
