**Harvest retrofit (rich)** — `spatial-remodeling-faction-metadata-35` → **SPE-1085** (part 1/2)
_Automated retrofit from `planning/spatial-remodeling-faction-metadata-35-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.
- **Dedup:** Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous factions), `alpha-centauri-manual-metadata-88` (`constructionProgress.ts`, `mapMetadata.ts`).
- **Repo at triage:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Candidates on SPE-1085:** C8, C29, C30, C31, C32, C33, C34
---

#### C8 — Stabilizer benefit/liability 

**1. Candidate & source**
- **ID:** C8
- **Batch:** `spatial-remodeling-faction-metadata-35`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Stabilizer benefit/liability (lock-in, trap, bad-state freeze)
- **Pattern context:** Abstracted from batch source (Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.).
- **Repo anchor:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Table note:** Stabilizer benefit/liability (lock-in, trap, bad-state freeze)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-529

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1085 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous fact…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/spatial-remodeling-faction-metadata-35-harvest.md` (C8)

---

#### C29 — Friendly ≠ safe

**1. Candidate & source**
- **ID:** C29
- **Batch:** `spatial-remodeling-faction-metadata-35`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Friendly ≠ safe
- **Pattern context:** Abstracted from batch source (Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.).
- **Repo anchor:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Table note:** Friendly ≠ safe

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-1610

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous fact…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/spatial-remodeling-faction-metadata-35-harvest.md` (C29)

---

#### C30 — No weapons ≠ non-threatening

**1. Candidate & source**
- **ID:** C30
- **Batch:** `spatial-remodeling-faction-metadata-35`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** No weapons ≠ non-threatening
- **Pattern context:** Abstracted from batch source (Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.).
- **Repo anchor:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Table note:** No weapons ≠ non-threatening

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-788

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous fact…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/spatial-remodeling-faction-metadata-35-harvest.md` (C30)

---

#### C31 — Construction zones not neutral by default

**1. Candidate & source**
- **ID:** C31
- **Batch:** `spatial-remodeling-faction-metadata-35`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Construction zones not neutral by default
- **Pattern context:** Abstracted from batch source (Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.).
- **Repo anchor:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Table note:** Construction zones not neutral by default

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-110

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous fact…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/spatial-remodeling-faction-metadata-35-harvest.md` (C31)

---

#### C32 — Stabilizer not universal answer

**1. Candidate & source**
- **ID:** C32
- **Batch:** `spatial-remodeling-faction-metadata-35`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Stabilizer not universal answer
- **Pattern context:** Abstracted from batch source (Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.).
- **Repo anchor:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Table note:** Stabilizer not universal answer

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-529

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous fact…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/spatial-remodeling-faction-metadata-35-harvest.md` (C32)

---

#### C33 — Rank markers are confidence-coded not truth

**1. Candidate & source**
- **ID:** C33
- **Batch:** `spatial-remodeling-faction-metadata-35`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Rank markers are confidence-coded not truth
- **Pattern context:** Abstracted from batch source (Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.).
- **Repo anchor:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Table note:** Rank markers are confidence-coded not truth

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous fact…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/spatial-remodeling-faction-metadata-35-harvest.md` (C33)

---

#### C34 — Hub-style facts preserve unknowns/theories

**1. Candidate & source**
- **ID:** C34
- **Batch:** `spatial-remodeling-faction-metadata-35`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Hub-style facts preserve unknowns/theories
- **Pattern context:** Abstracted from batch source (Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.).
- **Repo anchor:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Table note:** Hub-style facts preserve unknowns/theories

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-854

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous fact…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/spatial-remodeling-faction-metadata-35-harvest.md` (C34)
