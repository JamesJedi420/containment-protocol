**Harvest retrofit (rich)** — `post-release-tactical-manual-delta-100` → **SPE-1085** (part 1/1)
_Automated retrofit from `planning/post-release-tactical-manual-delta-100-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Visible PDF (158 pp). **Delta pass** — emphasizes companion doctrine, follower autonomy, reputation propagation, map discovery gradients, active skill targeting, hidden dialogue checks, trade insults, disposition presets, and guardrails. Supplements `post-release-tactical-manual-metadata-104` and `sealed-facility-manual-metadata-95`; do not duplicate children.
- **Repo at triage:** `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/stealthLeaveBehindRegistry.ts`; SPE-49/SPE-98 Done substrates.
- **Candidates on SPE-1085:** C93–C100
---

#### C93–C100 — Reinforce guardrails; no-op if 104 already posted

**1. Candidate & source**
- **ID:** C93–C100
- **Batch:** `post-release-tactical-manual-delta-100`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Reinforce guardrails; no-op if 104 already posted
- **Pattern context:** Abstracted from batch source (Visible PDF (158 pp). **Delta pass** — emphasizes companion doctrine, follower autonomy, reputation propagation, map discovery gradients, active skill targeting, hidden dialogue checks, trade insults, disposition presets, and guardrails. Supplements `post-release-tactical-manual-metadata-104` and `sealed-facility-manual-metadata-95`; do not duplicate children.).
- **Repo anchor:** `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/stealthLeaveBehindRegistry.ts`; SPE-49/SPE-98 Done substrates.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/stealthLeaveBehindRegistry.ts`; SPE-49/SPE-98 Done substrates.
- **Table note:** Reinforce guardrails; no-op if 104 already posted

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1085
- **Co-owners:** SPE-151

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1085

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/post-release-tactical-manual-delta-100-harvest.md` (C93–C100)
