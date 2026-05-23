**Harvest retrofit (rich)** — `field-staff-operations-handbook-metadata-105` → **SPE-626** (part 1/1)
_Automated retrofit from `planning/field-staff-operations-handbook-metadata-105-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable field-operations handbook PDF (320 pp; mission structure, beliefs/goals/instincts, identity-resource, conditions, conflicts, seasons, territories, advancement). Pattern-only — no imported setting names, oath prose, species politics, maps, art, or copyrighted sheet text.
- **Dedup:** Supplements `tabletop-mechanics-transcript-metadata-87`, `home-bases-transcript-metadata-48`, `mission-hub-guide-patterns-metadata-44`, `stonetop-settlement-playbook-metadata-110` (downtime/season slices). Actor **belief tracks** on cases (SPE-677) differ from staff **ethical stance / goal / instinct** fields (SPE-158).
- **Repo at triage:** `missionIntakeRouting.ts`, `teamComposition.ts`, `beliefTracks.ts`, `campaignCalendar.ts`, `advanceWeek.ts`, `responderDutyEvaluation.ts`, `responderEnergyBudget.ts`, `pressure.ts`, `partial/success` in `shared/outcomes.ts`, SPE-1610 conflict substrate.
- **Candidates on SPE-626:** C1–C3, C39
---

#### C1–C3 — Contract packet, duty taxonomy, itinerary/overdue alerts

**1. Candidate & source**
- **ID:** C1–C3
- **Batch:** `field-staff-operations-handbook-metadata-105`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Contract packet, duty taxonomy, itinerary/overdue alerts
- **Pattern context:** Abstracted from batch source (Readable field-operations handbook PDF (320 pp; mission structure, beliefs/goals/instincts, identity-resource, conditions, conflicts, seasons, territories, advancement). Pattern-only — no imported setting names, oath prose, species politics, maps, art, or copyrighted sheet text.).
- **Repo anchor:** `missionIntakeRouting.ts`, `teamComposition.ts`, `beliefTracks.ts`, `campaignCalendar.ts`, `advanceWeek.ts`, `responderDutyEvaluation.ts`, `responderEnergyBudget.ts`, `pressure.ts`, `partial/success` in `shared/outcomes.ts`, SPE-1610 conflict substrate.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts`, `teamComposition.ts`, `beliefTracks.ts`, `campaignCalendar.ts`, `advanceWeek.ts`, `responderDutyEvaluation.ts`, `responderEnergyBudget.ts`, `pressure.ts`, `partial/success` in `shared/outcomes.ts`, SPE-1610 conflict substrate.
- **Table note:** Contract packet, duty taxonomy, itinerary/overdue alerts

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-626
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-626 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87`, `home-bases-transcript-metadata-48`, `mission-hub-guide-patterns-metadata-44`, `stonetop-settlement-playbook-metadata-110` (downtime/season sli…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/field-staff-operations-handbook-metadata-105-harvest.md` (C1–C3)

---

#### C39 — Offscreen staff catch-up

**1. Candidate & source**
- **ID:** C39
- **Batch:** `field-staff-operations-handbook-metadata-105`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Offscreen staff catch-up
- **Pattern context:** Abstracted from batch source (Readable field-operations handbook PDF (320 pp; mission structure, beliefs/goals/instincts, identity-resource, conditions, conflicts, seasons, territories, advancement). Pattern-only — no imported setting names, oath prose, species politics, maps, art, or copyrighted sheet text.).
- **Repo anchor:** `missionIntakeRouting.ts`, `teamComposition.ts`, `beliefTracks.ts`, `campaignCalendar.ts`, `advanceWeek.ts`, `responderDutyEvaluation.ts`, `responderEnergyBudget.ts`, `pressure.ts`, `partial/success` in `shared/outcomes.ts`, SPE-1610 conflict substrate.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `missionIntakeRouting.ts`, `teamComposition.ts`, `beliefTracks.ts`, `campaignCalendar.ts`, `advanceWeek.ts`, `responderDutyEvaluation.ts`, `responderEnergyBudget.ts`, `pressure.ts`, `partial/success` in `shared/outcomes.ts`, SPE-1610 conflict substrate.
- **Table note:** Offscreen staff catch-up

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-626
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-626 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87`, `home-bases-transcript-metadata-48`, `mission-hub-guide-patterns-metadata-44`, `stonetop-settlement-playbook-metadata-110` (downtime/season sli…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/field-staff-operations-handbook-metadata-105-harvest.md` (C39)
