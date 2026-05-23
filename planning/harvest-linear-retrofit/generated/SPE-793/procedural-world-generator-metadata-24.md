**Harvest retrofit (rich)** — `procedural-world-generator-metadata-24` → **SPE-793** (part 1/1)
_Automated retrofit from `planning/procedural-world-generator-metadata-24-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-hub-13`.
- **Repo at triage:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Candidates on SPE-793:** C16, C19, C20
---

#### C16 — Hybrid authored plan + procedural improvisation workflow

**1. Candidate & source**
- **ID:** C16
- **Batch:** `procedural-world-generator-metadata-24`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Hybrid authored plan + procedural improvisation workflow
- **Pattern context:** Abstracted from batch source (Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Table note:** Hybrid authored plan + procedural improvisation workflow

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-793
- **Co-owners:** SPE-371

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-793 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-h…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/procedural-world-generator-metadata-24-harvest.md` (C16)

---

#### C19 — Modular operational-state recombination without immutable continuity

**1. Candidate & source**
- **ID:** C19
- **Batch:** `procedural-world-generator-metadata-24`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Modular operational-state recombination without immutable continuity
- **Pattern context:** Abstracted from batch source (Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Table note:** Modular operational-state recombination without immutable continuity

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-793
- **Co-owners:** SPE-371

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-793 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-h…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/procedural-world-generator-metadata-24-harvest.md` (C19)

---

#### C20 — Procedural recovery when play diverges from authored plan

**1. Candidate & source**
- **ID:** C20
- **Batch:** `procedural-world-generator-metadata-24`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Procedural recovery when play diverges from authored plan
- **Pattern context:** Abstracted from batch source (Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Table note:** Procedural recovery when play diverges from authored plan

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-793
- **Co-owners:** SPE-371

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-793 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-h…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/procedural-world-generator-metadata-24-harvest.md` (C20)
