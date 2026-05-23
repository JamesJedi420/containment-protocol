**Harvest retrofit (rich)** — `urban-concealment-investigation-metadata-100` → **SPE-854** (part 5/5)
_Automated retrofit from `planning/urban-concealment-investigation-metadata-100-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable uploaded PDF (detective RPG core book; urban mystery / layered investigation patterns). Pattern-only — no imported setting names, districts, myths, moves, tags, cosmology labels, or source prose.
- **Dedup:** Deepens `investigation-debrief-guide-metadata-50`, `covert-trust-intrigue-metadata-80`, `mission-hub-guide-patterns-metadata-44`, `expedition-debt-route-map-metadata-115` (fallible map), `faith-adjacent-clandestine-agency-metadata-50`. Aligns with shipped `hiddenStateActivation.ts` (SPE-2107/2113) and SPE-2108 self-censoring information tier.
- **Repo at triage:** `hiddenStateActivation.ts`; `concealmentActivationFeed.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `downtimeSideWork.ts`.
- **Candidates on SPE-854:** C90, C93, C100
---

#### C90 — Pattern knowledge ≠ case solve

**1. Candidate & source**
- **ID:** C90
- **Batch:** `urban-concealment-investigation-metadata-100`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Pattern knowledge ≠ case solve
- **Pattern context:** Abstracted from batch source (Readable uploaded PDF (detective RPG core book; urban mystery / layered investigation patterns). Pattern-only — no imported setting names, districts, myths, moves, tags, cosmology labels, or source prose.).
- **Repo anchor:** `hiddenStateActivation.ts`; `concealmentActivationFeed.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `downtimeSideWork.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `hiddenStateActivation.ts`; `concealmentActivationFeed.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `downtimeSideWork.ts`.
- **Table note:** Pattern knowledge ≠ case solve

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-854

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Deepens `investigation-debrief-guide-metadata-50`, `covert-trust-intrigue-metadata-80`, `mission-hub-guide-patterns-metadata-44`, `expedition-debt-route-map-metadata-115` (fallible map), `faith-adjace…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/urban-concealment-investigation-metadata-100-harvest.md` (C90)

---

#### C93 — No single-clue bottlenecks

**1. Candidate & source**
- **ID:** C93
- **Batch:** `urban-concealment-investigation-metadata-100`
- **Verdict:** authoring

**2. Mechanic (agent-readable)**
- **Harvest summary:** No single-clue bottlenecks
- **Pattern context:** Abstracted from batch source (Readable uploaded PDF (detective RPG core book; urban mystery / layered investigation patterns). Pattern-only — no imported setting names, districts, myths, moves, tags, cosmology labels, or source prose.).
- **Repo anchor:** `hiddenStateActivation.ts`; `concealmentActivationFeed.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `downtimeSideWork.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `hiddenStateActivation.ts`; `concealmentActivationFeed.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `downtimeSideWork.ts`.
- **Table note:** No single-clue bottlenecks

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** none

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Deepens `investigation-debrief-guide-metadata-50`, `covert-trust-intrigue-metadata-80`, `mission-hub-guide-patterns-metadata-44`, `expedition-debt-route-map-metadata-115` (fallible map), `faith-adjace…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/urban-concealment-investigation-metadata-100-harvest.md` (C93)

---

#### C100 — Generous info; mystery via cost/interpretation

**1. Candidate & source**
- **ID:** C100
- **Batch:** `urban-concealment-investigation-metadata-100`
- **Verdict:** authoring

**2. Mechanic (agent-readable)**
- **Harvest summary:** Generous info; mystery via cost/interpretation
- **Pattern context:** Abstracted from batch source (Readable uploaded PDF (detective RPG core book; urban mystery / layered investigation patterns). Pattern-only — no imported setting names, districts, myths, moves, tags, cosmology labels, or source prose.).
- **Repo anchor:** `hiddenStateActivation.ts`; `concealmentActivationFeed.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `downtimeSideWork.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `hiddenStateActivation.ts`; `concealmentActivationFeed.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `downtimeSideWork.ts`.
- **Table note:** Generous info; mystery via cost/interpretation

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Deepens `investigation-debrief-guide-metadata-50`, `covert-trust-intrigue-metadata-80`, `mission-hub-guide-patterns-metadata-44`, `expedition-debt-route-map-metadata-115` (fallible map), `faith-adjace…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/urban-concealment-investigation-metadata-100-harvest.md` (C100)
