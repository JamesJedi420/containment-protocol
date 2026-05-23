**Harvest retrofit (rich)** — `osr-site-exploration-metadata-165` → **SPE-788** (part 1/1)
_Automated retrofit from `planning/osr-site-exploration-metadata-165-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-mechanics-transcript-metadata-87` (OSR agency), `mc-toolkit-contract-authoring-metadata-132` (location/trap authoring), `urban-concealment-investigation-metadata-100` (fallible map), `post-release-tactical-manual-metadata-104` (visibility).
- **Repo at triage:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Candidates on SPE-788:** C13, C14, C25, C134, C135, C145, C146
---

#### C13 — Intelligent trap adaptation 

**1. Candidate & source**
- **ID:** C13
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Intelligent trap adaptation (C151 arbitrary-punishment guardrail)
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Intelligent trap adaptation (C151 arbitrary-punishment guardrail)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-1610, SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-788 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C13)

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
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-854, SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-788 when that issue's slice is implemented
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

#### C25 — Contractor loyalty

**1. Candidate & source**
- **ID:** C25
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Contractor loyalty
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Contractor loyalty

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
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C25)

---

#### C134 — Hazard bypass field

**1. Candidate & source**
- **ID:** C134
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Hazard bypass field
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Hazard bypass field

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-1610

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-788 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C134)

---

#### C135 — Faction trap/ward maintenance

**1. Candidate & source**
- **ID:** C135
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Faction trap/ward maintenance
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Faction trap/ward maintenance

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-1610

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-788 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C135)

---

#### C145 — Specialist network obligations

**1. Candidate & source**
- **ID:** C145
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Specialist network obligations
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Specialist network obligations

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-35

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-788 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C145)

---

#### C146 — Rank/challenge hierarchy

**1. Candidate & source**
- **ID:** C146
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Rank/challenge hierarchy
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Rank/challenge hierarchy

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-788
- **Co-owners:** SPE-208

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-788 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C146)
