**Harvest retrofit (rich)** — `hidden-role-social-meeting-metadata-65` → **SPE-793** (part 1/1)
_Automated retrofit from `planning/hidden-role-social-meeting-metadata-65-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable community guide metadata (hidden-role social-deduction loop: stats, roles, discussion actions, onboarding). Pattern-only — no imported game title, role/skill labels, character names, UI wording, or guide prose.
- **Dedup:** Supplements `covert-trust-intrigue-metadata-80`, `covert-organization-field-catalog-metadata-83`, `investigation-debrief-guide-metadata-50`, `street-contact-dossier-metadata-51`, `episodic-quick-incident-metadata-45`, `urban-concealment-investigation-metadata-100` (witness reliability).
- **Repo at triage:** `sim/relationshipProjection.ts`; `sim/betrayal.ts`; `sim/chemistry.ts`; `infiltrationCover.ts`; `disguiseValidation.ts`; `branchContinuity.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `caseGeneration.ts`; `advanceWeek.ts`.
- **Candidates on SPE-793:** C32
---

#### C32 — Social bonding survival modifier

**1. Candidate & source**
- **ID:** C32
- **Batch:** `hidden-role-social-meeting-metadata-65`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Social bonding survival modifier
- **Pattern context:** Abstracted from batch source (Readable community guide metadata (hidden-role social-deduction loop: stats, roles, discussion actions, onboarding). Pattern-only — no imported game title, role/skill labels, character names, UI wording, or guide prose.).
- **Repo anchor:** `sim/relationshipProjection.ts`; `sim/betrayal.ts`; `sim/chemistry.ts`; `infiltrationCover.ts`; `disguiseValidation.ts`; `branchContinuity.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `caseGeneration.ts`; `advanceWeek.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `sim/relationshipProjection.ts`; `sim/betrayal.ts`; `sim/chemistry.ts`; `infiltrationCover.ts`; `disguiseValidation.ts`; `branchContinuity.ts`; `contractDebrief`/SPE-1496; `progressClocks.ts`; `caseGeneration.ts`; `advanceWeek.ts`.
- **Table note:** Social bonding survival modifier

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-793
- **Co-owners:** SPE-788

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-793 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `covert-trust-intrigue-metadata-80`, `covert-organization-field-catalog-metadata-83`, `investigation-debrief-guide-metadata-50`, `street-contact-dossier-metadata-51`, `episodic-quick-incid…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/hidden-role-social-meeting-metadata-65-harvest.md` (C32)
