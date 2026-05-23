**Harvest retrofit (rich)** — `procedural-world-generator-metadata-24` → **SPE-109** (part 1/1)
_Automated retrofit from `planning/procedural-world-generator-metadata-24-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-hub-13`.
- **Repo at triage:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Candidates on SPE-109:** C10, C11, C23
---

#### C10 — Specialized urban-district operational profiles

**1. Candidate & source**
- **ID:** C10
- **Batch:** `procedural-world-generator-metadata-24`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Specialized urban-district operational profiles
- **Pattern context:** Abstracted from batch source (Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Table note:** Specialized urban-district operational profiles

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-109
- **Co-owners:** SPE-2106

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-109 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-h…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/procedural-world-generator-metadata-24-harvest.md` (C10)

---

#### C11 — Persistent quarantine-district containment layers

**1. Candidate & source**
- **ID:** C11
- **Batch:** `procedural-world-generator-metadata-24`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Persistent quarantine-district containment layers
- **Pattern context:** Abstracted from batch source (Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Table note:** Persistent quarantine-district containment layers

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-109
- **Co-owners:** SPE-1052

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-109 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-h…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/procedural-world-generator-metadata-24-harvest.md` (C11)

---

#### C23 — Districts must have systemic consequences, not décor

**1. Candidate & source**
- **ID:** C23
- **Batch:** `procedural-world-generator-metadata-24`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Districts must have systemic consequences, not décor
- **Pattern context:** Abstracted from batch source (Partial Scribd/metadata access to procedural world/city generator supplements (pattern-only). No imported setting names, landmark titles, pantheon labels, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `districtSchedule.ts` + `caseGeneration.ts` (SPE-109); `regionPackets.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; faction runtime in `models.ts`.
- **Table note:** Districts must have systemic consequences, not décor

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-109
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-109

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `expedition-debt-route-map-metadata-115`, `campaign-readiness-mission-hub-metadata-96`, `pulp-expedition-adventure-metadata-40`, `setting-governance-h…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/procedural-world-generator-metadata-24-harvest.md` (C23)
