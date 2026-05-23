**Harvest retrofit (rich)** — `tabletop-mechanics-transcript-metadata-87` → **SPE-83** (part 1/1)
_Automated retrofit from `planning/tabletop-mechanics-transcript-metadata-87-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Indexed transcript — talk on adapting tabletop RPG mechanics into video games (pattern-only; no imported game names, perk labels, or franchise terminology in Linear/repo).
- **Repo at triage:** `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Candidates on SPE-83:** C26–C28, C34–C36
---

#### C26–C28 — Minimal/fast-start actors

**1. Candidate & source**
- **ID:** C26–C28
- **Batch:** `tabletop-mechanics-transcript-metadata-87`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Minimal/fast-start actors
- **Pattern context:** Abstracted from batch source (Indexed transcript — talk on adapting tabletop RPG mechanics into video games (pattern-only; no imported game names, perk labels, or franchise terminology in Linear/repo).).
- **Repo anchor:** `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Table note:** Minimal/fast-start actors

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-83
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-83 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/tabletop-mechanics-transcript-metadata-87-harvest.md` (C26–C28)

---

#### C34–C36 — Fast NPC dignity

**1. Candidate & source**
- **ID:** C34–C36
- **Batch:** `tabletop-mechanics-transcript-metadata-87`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Fast NPC dignity
- **Pattern context:** Abstracted from batch source (Indexed transcript — talk on adapting tabletop RPG mechanics into video games (pattern-only; no imported game names, perk labels, or franchise terminology in Linear/repo).).
- **Repo anchor:** `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/progressClocks.ts`; `src/domain/beliefTracks.ts` (SPE-677); `src/domain/agent/models.ts` (stress/trauma); `src/domain/investigationEconomy.ts`; `src/domain/shared/outcomes.ts` (partial/success bands); `src/domain/branchContinuity.ts`; `docs/progress-clock-audit.md`.
- **Table note:** Fast NPC dignity

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-83
- **Co-owners:** SPE-158, SPE-2095

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-83 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/tabletop-mechanics-transcript-metadata-87-harvest.md` (C34–C36)
