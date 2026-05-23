**Harvest retrofit (rich)** — `mission-hub-guide-patterns-metadata-44` → **SPE-58** (part 1/1)
_Automated retrofit from `planning/mission-hub-guide-patterns-metadata-44-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable GameFAQs walkthrough (PC guide pattern library). Pattern-only — no franchise names, mission titles, species, codex prose, coordinates, or walkthrough text in Linear/repo.
- **Repo at triage:** `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Candidates on SPE-58:** C12, C18, C37–C44
---

#### C12 — Regional operations map nodes

**1. Candidate & source**
- **ID:** C12
- **Batch:** `mission-hub-guide-patterns-metadata-44`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Regional operations map nodes
- **Pattern context:** Abstracted from batch source (Readable GameFAQs walkthrough (PC guide pattern library). Pattern-only — no franchise names, mission titles, species, codex prose, coordinates, or walkthrough text in Linear/repo.).
- **Repo anchor:** `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Table note:** Regional operations map nodes

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-49

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mission-hub-guide-patterns-metadata-44-harvest.md` (C12)

---

#### C18 — Infrastructure repair reveals intel

**1. Candidate & source**
- **ID:** C18
- **Batch:** `mission-hub-guide-patterns-metadata-44`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Infrastructure repair reveals intel
- **Pattern context:** Abstracted from batch source (Readable GameFAQs walkthrough (PC guide pattern library). Pattern-only — no franchise names, mission titles, species, codex prose, coordinates, or walkthrough text in Linear/repo.).
- **Repo anchor:** `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Table note:** Infrastructure repair reveals intel

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-912

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mission-hub-guide-patterns-metadata-44-harvest.md` (C18)

---

#### C37–C44 — Import + fallible map/codex/ethics guardrails

**1. Candidate & source**
- **ID:** C37–C44
- **Batch:** `mission-hub-guide-patterns-metadata-44`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Import + fallible map/codex/ethics guardrails
- **Pattern context:** Abstracted from batch source (Readable GameFAQs walkthrough (PC guide pattern library). Pattern-only — no franchise names, mission titles, species, codex prose, coordinates, or walkthrough text in Linear/repo.).
- **Repo anchor:** `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).
- **Table note:** Import + fallible map/codex/ethics guardrails

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-1085, SPE-854

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-58

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/mission-hub-guide-patterns-metadata-44-harvest.md` (C37–C44)
