**Harvest retrofit (rich)** — `tabletop-mechanics-transcript-metadata-87` → **SPE-854** (part 1/1)
_Automated retrofit from `planning/tabletop-mechanics-transcript-metadata-87-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Indexed transcript — talk on adapting tabletop RPG mechanics into video games (pattern-only; no imported game names, perk labels, or franchise terminology in Linear/repo).
- **Repo at triage:** `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Candidates on SPE-854:** C1–C2, C5–C7, C43–C45
---

#### C1–C2 — Prior-preparation action + cost

**1. Candidate & source**
- **ID:** C1–C2
- **Batch:** `tabletop-mechanics-transcript-metadata-87`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Prior-preparation action + cost
- **Pattern context:** Abstracted from batch source (Indexed transcript — talk on adapting tabletop RPG mechanics into video games (pattern-only; no imported game names, perk labels, or franchise terminology in Linear/repo).).
- **Repo anchor:** `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Table note:** Prior-preparation action + cost

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-16, SPE-626

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/tabletop-mechanics-transcript-metadata-87-harvest.md` (C1–C2)

---

#### C5–C7 — Clock framework + case log board

**1. Candidate & source**
- **ID:** C5–C7
- **Batch:** `tabletop-mechanics-transcript-metadata-87`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Clock framework + case log board
- **Pattern context:** Abstracted from batch source (Indexed transcript — talk on adapting tabletop RPG mechanics into video games (pattern-only; no imported game names, perk labels, or franchise terminology in Linear/repo).).
- **Repo anchor:** `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Table note:** Clock framework + case log board

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-562, SPE-704

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/tabletop-mechanics-transcript-metadata-87-harvest.md` (C5–C7)

---

#### C43–C45 — Climax aggregation + mind-map case UI

**1. Candidate & source**
- **ID:** C43–C45
- **Batch:** `tabletop-mechanics-transcript-metadata-87`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Climax aggregation + mind-map case UI
- **Pattern context:** Abstracted from batch source (Indexed transcript — talk on adapting tabletop RPG mechanics into video games (pattern-only; no imported game names, perk labels, or franchise terminology in Linear/repo).).
- **Repo anchor:** `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Table note:** Climax aggregation + mind-map case UI

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/tabletop-mechanics-transcript-metadata-87-harvest.md` (C43–C45)
