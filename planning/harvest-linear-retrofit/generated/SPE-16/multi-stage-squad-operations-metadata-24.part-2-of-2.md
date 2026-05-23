**Harvest retrofit (rich)** — `multi-stage-squad-operations-metadata-24` → **SPE-16** (part 2/2)
_Automated retrofit from `planning/multi-stage-squad-operations-metadata-24-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Partial wiki/guide metadata (sci-fi squad RPG trilogy patterns). Pattern-only — no franchise names, character labels, morality axis names, mission titles, or wiki URLs.
- **Dedup:** Supplements `field-staff-operations-handbook-metadata-105`, `campaign-readiness-mission-hub-metadata-96`, `mission-hub-guide-patterns-metadata-44`, `staff-role-packages-transcript-metadata-26`, `background-packages-inherited-start-state.md`.
- **Repo at triage:** `teamComposition.ts` (coverage roles, weakest-link); `deploymentReadiness.ts`; `relationshipProjection.ts` / chemistry; `branchContinuity.ts` (SPE-1760); `progressClocks.ts`; `legitimacy`/faction reputation; `responderDutyEvaluation.ts` (escort); `aggregateBattle.ts` parallel objective phase (abstract resolution pattern).
- **Candidates on SPE-16:** C18
---

#### C18 — Unified narrative/personnel/mission state deps

**1. Candidate & source**
- **ID:** C18
- **Batch:** `multi-stage-squad-operations-metadata-24`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Unified narrative/personnel/mission state deps
- **Pattern context:** Abstracted from batch source (Partial wiki/guide metadata (sci-fi squad RPG trilogy patterns). Pattern-only — no franchise names, character labels, morality axis names, mission titles, or wiki URLs.).
- **Repo anchor:** `teamComposition.ts` (coverage roles, weakest-link); `deploymentReadiness.ts`; `relationshipProjection.ts` / chemistry; `branchContinuity.ts` (SPE-1760); `progressClocks.ts`; `legitimacy`/faction reputation; `responderDutyEvaluation.ts` (escort); `aggregateBattle.ts` parallel objective phase (abstract resolution pattern).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `teamComposition.ts` (coverage roles, weakest-link); `deploymentReadiness.ts`; `relationshipProjection.ts` / chemistry; `branchContinuity.ts` (SPE-1760); `progressClocks.ts`; `legitimacy`/faction reputation; `responderDutyEvaluation.ts` (escort); `aggregateBattle.ts` parallel objective phase (abstract resolution pattern).
- **Table note:** Unified narrative/personnel/mission state deps

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-1760

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `field-staff-operations-handbook-metadata-105`, `campaign-readiness-mission-hub-metadata-96`, `mission-hub-guide-patterns-metadata-44`, `staff-role-packages-transcript-metadata-26`, `backg…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/multi-stage-squad-operations-metadata-24-harvest.md` (C18)
