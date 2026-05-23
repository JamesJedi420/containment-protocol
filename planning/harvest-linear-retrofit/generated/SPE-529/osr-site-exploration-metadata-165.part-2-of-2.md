**Harvest retrofit (rich)** — `osr-site-exploration-metadata-165` → **SPE-529** (part 2/2)
_Automated retrofit from `planning/osr-site-exploration-metadata-165-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-mechanics-transcript-metadata-87` (OSR agency), `mc-toolkit-contract-authoring-metadata-132` (location/trap authoring), `urban-concealment-investigation-metadata-100` (fallible map), `post-release-tactical-manual-metadata-104` (visibility).
- **Repo at triage:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Candidates on SPE-529:** C148, C149, C159, C160, C161, C163
---

#### C148 — Artifact destruction conditions

**1. Candidate & source**
- **ID:** C148
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Artifact destruction conditions
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Artifact destruction conditions

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-88

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C148)

---

#### C149 — Artifact side-effect package template

**1. Candidate & source**
- **ID:** C149
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Artifact side-effect package template
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Artifact side-effect package template

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-151

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C149)

---

#### C159 — Wards not universal

**1. Candidate & source**
- **ID:** C159
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Wards not universal
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Wards not universal

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-529

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C159)

---

#### C160 — Artifacts not simple loot

**1. Candidate & source**
- **ID:** C160
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Artifacts not simple loot
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Artifacts not simple loot

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-529

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C160)

---

#### C161 — Curses alter outcomes

**1. Candidate & source**
- **ID:** C161
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Curses alter outcomes
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Curses alter outcomes

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-529

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C161)

---

#### C163 — Gear/evidence/rooms vulnerable

**1. Candidate & source**
- **ID:** C163
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Gear/evidence/rooms vulnerable
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Gear/evidence/rooms vulnerable

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-529

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C163)
