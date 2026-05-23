**Harvest retrofit (rich)** — `mission-hub-guide-patterns-metadata-44` → **SPE-677** (part 1/1)
_Automated retrofit from `planning/mission-hub-guide-patterns-metadata-44-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable GameFAQs walkthrough (PC guide pattern library). Pattern-only — no franchise names, mission titles, species, codex prose, coordinates, or walkthrough text in Linear/repo.
- **Repo at triage:** `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Candidates on SPE-677:** C3
---

#### C3 — Mission ethical consequence ledger

**1. Candidate & source**
- **ID:** C3
- **Batch:** `mission-hub-guide-patterns-metadata-44`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Mission ethical consequence ledger
- **Pattern context:** Abstracted from batch source (Readable GameFAQs walkthrough (PC guide pattern library). Pattern-only — no franchise names, mission titles, species, codex prose, coordinates, or walkthrough text in Linear/repo.).
- **Repo anchor:** `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Table note:** Mission ethical consequence ledger

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-677
- **Co-owners:** SPE-35, SPE-1160

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-677 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mission-hub-guide-patterns-metadata-44-harvest.md` (C3)
