**Harvest retrofit (rich)** — `horror-tension-questionnaire-metadata-50` → **SPE-788** (part 1/1)
_Automated retrofit from `planning/horror-tension-questionnaire-metadata-50-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable horror-RPG manual PDF (questionnaire setup, escalating physical tension pattern, irreversible removal, genre pacing guidance). Pattern-only — no imported game title, scenarios, questionnaire text, story content, or tower branding.
- **Dedup:** Supplements `tabletop-mechanics-transcript-metadata-87` (instability stack C20–C22, partial success C37–C41), `field-staff-operations-handbook-metadata-105` (conditions C31–C34), `investigation-debrief-guide-metadata-50` (mystery redundancy C21/C45), `episodic-quick-incident-metadata-45` (content intensity SPE-361).
- **Repo at triage:** `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Candidates on SPE-788:** C40
---

#### C40 — Setup secret → in-case exposure workflow

**1. Candidate & source**
- **ID:** C40
- **Batch:** `horror-tension-questionnaire-metadata-50`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Setup secret → in-case exposure workflow
- **Pattern context:** Abstracted from batch source (Readable horror-RPG manual PDF (questionnaire setup, escalating physical tension pattern, irreversible removal, genre pacing guidance). Pattern-only — no imported game title, scenarios, questionnaire text, story content, or tower branding.).
- **Repo anchor:** `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Table note:** Setup secret → in-case exposure workflow

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-788 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87` (instability stack C20–C22, partial success C37–C41), `field-staff-operations-handbook-metadata-105` (conditions C31–C34), `investigation-debrie…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/horror-tension-questionnaire-metadata-50-harvest.md` (C40)
