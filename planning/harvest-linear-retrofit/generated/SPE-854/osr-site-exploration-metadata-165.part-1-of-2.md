**Harvest retrofit (rich)** — `osr-site-exploration-metadata-165` → **SPE-854** (part 1/2)
_Automated retrofit from `planning/osr-site-exploration-metadata-165-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-mechanics-transcript-metadata-87` (OSR agency), `mc-toolkit-contract-authoring-metadata-132` (location/trap authoring), `urban-concealment-investigation-metadata-100` (fallible map), `post-release-tactical-manual-metadata-104` (visibility).
- **Repo at triage:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Candidates on SPE-854:** C6, C7, C9, C11, C12, C14, C28
---

#### C6 — Deliberate search requirement

**1. Candidate & source**
- **ID:** C6
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Deliberate search requirement
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Deliberate search requirement

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-58

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C6)

---

#### C7 — Passive vs active detection

**1. Candidate & source**
- **ID:** C7
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Passive vs active detection
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Passive vs active detection

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-2108

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C7)

---

#### C9 — Listen/scan before entry

**1. Candidate & source**
- **ID:** C9
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Listen/scan before entry
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Listen/scan before entry

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-58

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C9)

---

#### C11 — Breach consequences

**1. Candidate & source**
- **ID:** C11
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Breach consequences
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Breach consequences

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-164

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C11)

---

#### C12 — Trap purpose model

**1. Candidate & source**
- **ID:** C12
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Trap purpose model
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Trap purpose model

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-1610

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C12)

---

#### C14 — Trap evidence cleanup 

**1. Candidate & source**
- **ID:** C14
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Trap evidence cleanup (custody/evidence policy)
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Trap evidence cleanup (custody/evidence policy)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-788, SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C14)

---

#### C28 — Communication barriers

**1. Candidate & source**
- **ID:** C28
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Communication barriers
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Communication barriers

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-854
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-854 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C28)
