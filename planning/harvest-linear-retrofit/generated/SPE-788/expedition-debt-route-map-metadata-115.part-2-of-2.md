**Harvest retrofit (rich)** — `expedition-debt-route-map-metadata-115` → **SPE-788** (part 2/2)
_Automated retrofit from `planning/expedition-debt-route-map-metadata-115-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable uploaded PDF (336 pp.; setting/procedure supplement). Pattern-only — no imported setting names, failed-career labels, borough/creature/item tables, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60`, `pulp-expedition-adventure-metadata-40`, `haunted-estate-dual-pressure-metadata-106`, `tabletop-mechanics-transcript-metadata-87`, `campaign-readiness-mission-hub-metadata-96`, `background-packages-inherited-start-state.md`.
- **Repo at triage:** `progressClocks.ts`; `mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts`; `teamComposition` / recruitment; `advanceWeek` casualty substrates; infiltration cover.
- **Candidates on SPE-788:** C94, C107
---

#### C94 — Faction philosophy tags

**1. Candidate & source**
- **ID:** C94
- **Batch:** `expedition-debt-route-map-metadata-115`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Faction philosophy tags
- **Pattern context:** Abstracted from batch source (Readable uploaded PDF (336 pp.; setting/procedure supplement). Pattern-only — no imported setting names, failed-career labels, borough/creature/item tables, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts`; `teamComposition` / recruitment; `advanceWeek` casualty substrates; infiltration cover.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts`; `teamComposition` / recruitment; `advanceWeek` casualty substrates; infiltration cover.
- **Table note:** Faction philosophy tags

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-373

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-788 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `pulp-expedition-adventure-metadata-40`, `haunted-estate-dual-pressure-metadata-106`, `tabletop-mechanics-transcript-metadata-87`, `campaign-readiness…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-route-map-metadata-115-harvest.md` (C94)

---

#### C107 — Cities are active systems

**1. Candidate & source**
- **ID:** C107
- **Batch:** `expedition-debt-route-map-metadata-115`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Cities are active systems
- **Pattern context:** Abstracted from batch source (Readable uploaded PDF (336 pp.; setting/procedure supplement). Pattern-only — no imported setting names, failed-career labels, borough/creature/item tables, or source prose.).
- **Repo anchor:** `progressClocks.ts`; `mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts`; `teamComposition` / recruitment; `advanceWeek` casualty substrates; infiltration cover.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts`; `teamComposition` / recruitment; `advanceWeek` casualty substrates; infiltration cover.
- **Table note:** Cities are active systems

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-788

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60`, `pulp-expedition-adventure-metadata-40`, `haunted-estate-dual-pressure-metadata-106`, `tabletop-mechanics-transcript-metadata-87`, `campaign-readiness…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/expedition-debt-route-map-metadata-115-harvest.md` (C107)
