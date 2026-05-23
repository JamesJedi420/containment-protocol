**Harvest retrofit (rich)** — `facility-crisis-triage-metadata-55` → **SPE-16** (part 1/2)
_Automated retrofit from `planning/facility-crisis-triage-metadata-55-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.
- **Dedup:** Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror-tension-questionnaire-metadata-50` (desperate survival ethics), `tabletop-mechanics-transcript-metadata-87` (clocks/thresholds). **SPE-1107** responder energy budget covers stamina accounting; **SPE-130** multi-axis fatigue/stress — not a single tiredness bar.
- **Repo at triage:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Candidates on SPE-16:** C1, C16, C24, C25, C26, C35, C36
---

#### C1 — Turn-phase crisis loop 

**1. Candidate & source**
- **ID:** C1
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Turn-phase crisis loop (event → deploy → damage → side work → distribute)
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Turn-phase crisis loop (event → deploy → damage → side work → distribute)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-160

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C1)

---

#### C16 — Side-project tradeoff choices

**1. Candidate & source**
- **ID:** C16
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Side-project tradeoff choices
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Side-project tradeoff choices

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-1101

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C16)

---

#### C24 — Multi-staff shared event repair

**1. Candidate & source**
- **ID:** C24
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Multi-staff shared event repair
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Multi-staff shared event repair

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-1485

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C24)

---

#### C25 — Event work-threshold until resolved

**1. Candidate & source**
- **ID:** C25
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Event work-threshold until resolved
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Event work-threshold until resolved

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C25)

---

#### C26 — Rotating emergency research project market

**1. Candidate & source**
- **ID:** C26
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Rotating emergency research project market
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Rotating emergency research project market

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-1734

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C26)

---

#### C35 — Final-phase readiness checklist

**1. Candidate & source**
- **ID:** C35
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Final-phase readiness checklist
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Final-phase readiness checklist

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-626

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C35)

---

#### C36 — Final objective positioning requirement

**1. Candidate & source**
- **ID:** C36
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Final objective positioning requirement
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Final objective positioning requirement

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-16
- **Co-owners:** SPE-1052

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-16 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C36)
