**Harvest retrofit (rich)** — `facility-crisis-triage-metadata-55` → **SPE-130** (part 1/1)
_Automated retrofit from `planning/facility-crisis-triage-metadata-55-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.
- **Dedup:** Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror-tension-questionnaire-metadata-50` (desperate survival ethics), `tabletop-mechanics-transcript-metadata-87` (clocks/thresholds). **SPE-1107** responder energy budget covers stamina accounting; **SPE-130** multi-axis fatigue/stress — not a single tiredness bar.
- **Repo at triage:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Candidates on SPE-130:** C6, C10, C22, C33
---

#### C6 — Typed event consequence taxonomy

**1. Candidate & source**
- **ID:** C6
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Typed event consequence taxonomy
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Typed event consequence taxonomy

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-130
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-130 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C6)

---

#### C10 — Staff stamina/readiness pool per turn

**1. Candidate & source**
- **ID:** C10
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Staff stamina/readiness pool per turn
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Staff stamina/readiness pool per turn

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-130
- **Co-owners:** SPE-1107

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-130 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C10)

---

#### C22 — Injury hazard + compound risk

**1. Candidate & source**
- **ID:** C22
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Injury hazard + compound risk
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Injury hazard + compound risk

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-130
- **Co-owners:** SPE-793

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-130 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C22)

---

#### C33 — Repeated-work fatigue / rotation

**1. Candidate & source**
- **ID:** C33
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Repeated-work fatigue / rotation
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Repeated-work fatigue / rotation

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-130
- **Co-owners:** SPE-1107

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-130 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C33)
