**Harvest retrofit (rich)** — `investigation-debrief-guide-metadata-50` → **SPE-1653** (part 1/1)
_Automated retrofit from `planning/investigation-debrief-guide-metadata-50-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable GameFAQs investigation walkthrough (pattern-only). No imported setting, characters, political thoughts, skill labels, items, dialogue, or walkthrough path.
- **Dedup:** Deepens `mission-hub-guide-patterns-metadata-44` (debrief C6), `tabletop-mechanics-transcript-metadata-87` (mind-map/case UI), `field-staff-operations-handbook-metadata-105` (thought/instinct lenses — staff doctrine projects vs case belief tracks SPE-677).
- **Repo at triage:** `contractDebrief` / SPE-1496 (`docs/contract-debrief-next-intent-audit.md`); `frontDeskView` debrief attention; `progressClocks.ts`; `loadout` readiness; SPE-854 evidence/case log; SPE-1034 dialogue; SPE-164 access; SPE-42 companions.
- **Candidates on SPE-1653:** C2, C50
---

#### C2 — Health issue → medical-support operational task

**1. Candidate & source**
- **ID:** C2
- **Batch:** `investigation-debrief-guide-metadata-50`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Health issue → medical-support operational task
- **Pattern context:** Abstracted from batch source (Readable GameFAQs investigation walkthrough (pattern-only). No imported setting, characters, political thoughts, skill labels, items, dialogue, or walkthrough path.).
- **Repo anchor:** `contractDebrief` / SPE-1496 (`docs/contract-debrief-next-intent-audit.md`); `frontDeskView` debrief attention; `progressClocks.ts`; `loadout` readiness; SPE-854 evidence/case log; SPE-1034 dialogue; SPE-164 access; SPE-42 companions.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contractDebrief` / SPE-1496 (`docs/contract-debrief-next-intent-audit.md`); `frontDeskView` debrief attention; `progressClocks.ts`; `loadout` readiness; SPE-854 evidence/case log; SPE-1034 dialogue; SPE-164 access; SPE-42 companions.
- **Table note:** Health issue → medical-support operational task

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1653
- **Co-owners:** SPE-130

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1653 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Deepens `mission-hub-guide-patterns-metadata-44` (debrief C6), `tabletop-mechanics-transcript-metadata-87` (mind-map/case UI), `field-staff-operations-handbook-metadata-105` (thought/instinct lenses —…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/investigation-debrief-guide-metadata-50-harvest.md` (C2)

---

#### C50 — Impairment affects authority and reliability

**1. Candidate & source**
- **ID:** C50
- **Batch:** `investigation-debrief-guide-metadata-50`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Impairment affects authority and reliability
- **Pattern context:** Abstracted from batch source (Readable GameFAQs investigation walkthrough (pattern-only). No imported setting, characters, political thoughts, skill labels, items, dialogue, or walkthrough path.).
- **Repo anchor:** `contractDebrief` / SPE-1496 (`docs/contract-debrief-next-intent-audit.md`); `frontDeskView` debrief attention; `progressClocks.ts`; `loadout` readiness; SPE-854 evidence/case log; SPE-1034 dialogue; SPE-164 access; SPE-42 companions.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `contractDebrief` / SPE-1496 (`docs/contract-debrief-next-intent-audit.md`); `frontDeskView` debrief attention; `progressClocks.ts`; `loadout` readiness; SPE-854 evidence/case log; SPE-1034 dialogue; SPE-164 access; SPE-42 companions.
- **Table note:** Impairment affects authority and reliability

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1653
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1653

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Deepens `mission-hub-guide-patterns-metadata-44` (debrief C6), `tabletop-mechanics-transcript-metadata-87` (mind-map/case UI), `field-staff-operations-handbook-metadata-105` (thought/instinct lenses —…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/investigation-debrief-guide-metadata-50-harvest.md` (C50)
