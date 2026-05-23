**Harvest retrofit (rich)** — `procedural-world-generator-metadata-24` → **SPE-158** (part 1/1)
_Automated retrofit from `planning/procedural-world-generator-metadata-24-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-hub-13`.
- **Repo at triage:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Candidates on SPE-158:** C12, C24
---

#### C12 — Civilian social-link networks beyond team chemistry

**1. Candidate & source**
- **ID:** C12
- **Batch:** `procedural-world-generator-metadata-24`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Civilian social-link networks beyond team chemistry
- **Pattern context:** Abstracted from batch source (Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Table note:** Civilian social-link networks beyond team chemistry

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-158
- **Co-owners:** SPE-2095

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-158 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-h…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/procedural-world-generator-metadata-24-harvest.md` (C12)

---

#### C24 — NPCs need persistent relational memory, not isolated spawns

**1. Candidate & source**
- **ID:** C24
- **Batch:** `procedural-world-generator-metadata-24`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** NPCs need persistent relational memory, not isolated spawns
- **Pattern context:** Abstracted from batch source (Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Table note:** NPCs need persistent relational memory, not isolated spawns

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-158
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-158

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-h…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/procedural-world-generator-metadata-24-harvest.md` (C24)
