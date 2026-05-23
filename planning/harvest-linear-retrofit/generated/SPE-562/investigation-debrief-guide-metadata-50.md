**Harvest retrofit (rich)** — `investigation-debrief-guide-metadata-50` → **SPE-562** (part 1/1)
_Automated retrofit from `planning/investigation-debrief-guide-metadata-50-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable GameFAQs investigation walkthrough (pattern-only). No imported setting, characters, political thoughts, skill labels, items, dialogue, or walkthrough path.
- **Dedup:** Deepens `mission-hub-guide-patterns-metadata-44` (debrief C6), `tabletop-mechanics-transcript-metadata-87` (mind-map/case UI), `field-staff-operations-handbook-metadata-105` (thought/instinct lenses — staff doctrine projects vs case belief tracks SPE-677).
- **Repo at triage:** `contractDebrief` / SPE-1496 (`docs/contract-debrief-next-intent-audit.md`); `frontDeskView` debrief attention; `progressClocks.ts`; `loadout` readiness; SPE-854 evidence/case log; SPE-1034 dialogue; SPE-164 access; SPE-42 companions.
- **Candidates on SPE-562:** C4
---

#### C4 — Institutional patience / review clock

**1. Candidate & source**
- **ID:** C4
- **Batch:** `investigation-debrief-guide-metadata-50`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Institutional patience / review clock
- **Pattern context:** Abstracted from batch source (Readable GameFAQs investigation walkthrough (pattern-only). No imported setting, characters, political thoughts, skill labels, items, dialogue, or walkthrough path.).
- **Repo anchor:** `contractDebrief` / SPE-1496 (`docs/contract-debrief-next-intent-audit.md`); `frontDeskView` debrief attention; `progressClocks.ts`; `loadout` readiness; SPE-854 evidence/case log; SPE-1034 dialogue; SPE-164 access; SPE-42 companions.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `contractDebrief` / SPE-1496 (`docs/contract-debrief-next-intent-audit.md`); `frontDeskView` debrief attention; `progressClocks.ts`; `loadout` readiness; SPE-854 evidence/case log; SPE-1034 dialogue; SPE-164 access; SPE-42 companions.
- **Table note:** Institutional patience / review clock

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-562
- **Co-owners:** SPE-704

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-562 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Deepens `mission-hub-guide-patterns-metadata-44` (debrief C6), `tabletop-mechanics-transcript-metadata-87` (mind-map/case UI), `field-staff-operations-handbook-metadata-105` (thought/instinct lenses —…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/investigation-debrief-guide-metadata-50-harvest.md` (C4)
