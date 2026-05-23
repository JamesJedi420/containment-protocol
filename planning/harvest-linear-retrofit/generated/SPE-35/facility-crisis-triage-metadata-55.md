**Harvest retrofit (rich)** — `facility-crisis-triage-metadata-55` → **SPE-35** (part 1/1)
_Automated retrofit from `planning/facility-crisis-triage-metadata-55-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.
- **Dedup:** Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror-tension-questionnaire-metadata-50` (desperate survival ethics), `tabletop-mechanics-transcript-metadata-87` (clocks/thresholds). **SPE-1107** responder energy budget covers stamina accounting; **SPE-130** multi-axis fatigue/stress — not a single tiredness bar.
- **Repo at triage:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Candidates on SPE-35:** C12, C13, C49
---

#### C12 — Desperate survival action + ethical consequence

**1. Candidate & source**
- **ID:** C12
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Desperate survival action + ethical consequence
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Desperate survival action + ethical consequence

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-1160

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-35 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C12)

---

#### C13 — Staff sacrifice for resources — rare, gated, guardrailed

**1. Candidate & source**
- **ID:** C13
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Staff sacrifice for resources — rare, gated, guardrailed
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Staff sacrifice for resources — rare, gated, guardrailed

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-35

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C13)

---

#### C49 — Taboo survival never clean optimization

**1. Candidate & source**
- **ID:** C49
- **Batch:** `facility-crisis-triage-metadata-55`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Taboo survival never clean optimization
- **Pattern context:** Abstracted from batch source (Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.).
- **Repo anchor:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.
- **Table note:** Taboo survival never clean optimization

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-35
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-35

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/facility-crisis-triage-metadata-55-harvest.md` (C49)
