**Harvest retrofit (rich)** — `horror-tension-questionnaire-metadata-50` → **SPE-58** (part 1/1)
_Automated retrofit from `planning/horror-tension-questionnaire-metadata-50-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable horror-RPG manual PDF (questionnaire setup, escalating physical tension pattern, irreversible removal, genre pacing guidance). Pattern-only — no imported game title, scenarios, questionnaire text, story content, or tower branding.
- **Dedup:** Supplements `tabletop-mechanics-transcript-metadata-87` (instability stack C20–C22, partial success C37–C41), `field-staff-operations-handbook-metadata-105` (conditions C31–C34), `investigation-debrief-guide-metadata-50` (mystery redundancy C21/C45), `episodic-quick-incident-metadata-45` (content intensity SPE-361).
- **Repo at triage:** `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Candidates on SPE-58:** C28, C31, C48
---

#### C28 — Case ambience / presentation layer

**1. Candidate & source**
- **ID:** C28
- **Batch:** `horror-tension-questionnaire-metadata-50`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Case ambience / presentation layer
- **Pattern context:** Abstracted from batch source (Readable horror-RPG manual PDF (questionnaire setup, escalating physical tension pattern, irreversible removal, genre pacing guidance). Pattern-only — no imported game title, scenarios, questionnaire text, story content, or tower branding.).
- **Repo anchor:** `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Table note:** Case ambience / presentation layer

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-160

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87` (instability stack C20–C22, partial success C37–C41), `field-staff-operations-handbook-metadata-105` (conditions C31–C34), `investigation-debrie…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/horror-tension-questionnaire-metadata-50-harvest.md` (C28)

---

#### C31 — Map-linked instability zones

**1. Candidate & source**
- **ID:** C31
- **Batch:** `horror-tension-questionnaire-metadata-50`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Map-linked instability zones
- **Pattern context:** Abstracted from batch source (Readable horror-RPG manual PDF (questionnaire setup, escalating physical tension pattern, irreversible removal, genre pacing guidance). Pattern-only — no imported game title, scenarios, questionnaire text, story content, or tower branding.).
- **Repo anchor:** `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Table note:** Map-linked instability zones

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-562

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87` (instability stack C20–C22, partial success C37–C41), `field-staff-operations-handbook-metadata-105` (conditions C31–C34), `investigation-debrie…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/horror-tension-questionnaire-metadata-50-harvest.md` (C31)

---

#### C48 — Player map ≠ host authoring truth

**1. Candidate & source**
- **ID:** C48
- **Batch:** `horror-tension-questionnaire-metadata-50`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Player map ≠ host authoring truth
- **Pattern context:** Abstracted from batch source (Readable horror-RPG manual PDF (questionnaire setup, escalating physical tension pattern, irreversible removal, genre pacing guidance). Pattern-only — no imported game title, scenarios, questionnaire text, story content, or tower branding.).
- **Repo anchor:** `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `systems/pressure-mechanics.md` (multi-form pressure — not one abstract meter); `progressClocks.ts`; `shared/outcomes.ts`; `beliefTracks.ts`; `mapMetadata.ts`; `advanceWeek.ts` execution-instability consequences; `docs/incident-template.md`.
- **Table note:** Player map ≠ host authoring truth

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-58

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87` (instability stack C20–C22, partial success C37–C41), `field-staff-operations-handbook-metadata-105` (conditions C31–C34), `investigation-debrie…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/horror-tension-questionnaire-metadata-50-harvest.md` (C48)
