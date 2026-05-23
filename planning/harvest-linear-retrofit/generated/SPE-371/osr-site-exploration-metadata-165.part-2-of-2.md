**Harvest retrofit (rich)** — `osr-site-exploration-metadata-165` → **SPE-371** (part 2/2)
_Automated retrofit from `planning/osr-site-exploration-metadata-165-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.
- **Dedup:** Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-mechanics-transcript-metadata-87` (OSR agency), `mc-toolkit-contract-authoring-metadata-132` (location/trap authoring), `urban-concealment-investigation-metadata-100` (fallible map), `post-release-tactical-manual-metadata-104` (visibility).
- **Repo at triage:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Candidates on SPE-371:** C164
---

#### C164 — Procedural content zone-keyed

**1. Candidate & source**
- **ID:** C164
- **Batch:** `osr-site-exploration-metadata-165`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Procedural content zone-keyed
- **Pattern context:** Abstracted from batch source (Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.).
- **Repo anchor:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.
- **Table note:** Procedural content zone-keyed

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-371
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-371

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-me…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C164)
