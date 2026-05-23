**Harvest retrofit (rich)** — `post-release-tactical-manual-delta-100` → **SPE-49** (part 1/1)
_Automated retrofit from `planning/post-release-tactical-manual-delta-100-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Visible PDF (158 pp). **Delta pass** — emphasizes companion doctrine, follower autonomy, reputation propagation, map discovery gradients, active skill targeting, hidden dialogue checks, trade insults, disposition presets, and guardrails. Supplements `post-release-tactical-manual-metadata-104` and `sealed-facility-manual-metadata-95`; do not duplicate children.
- **Repo at triage:** `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/stealthLeaveBehindRegistry.ts`; SPE-49/SPE-98 Done substrates.
- **Candidates on SPE-49:** C48–C55
---

#### C48–C55 — Map gradients, travel time, exit hostility

**1. Candidate & source**
- **ID:** C48–C55
- **Batch:** `post-release-tactical-manual-delta-100`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Map gradients, travel time, exit hostility
- **Pattern context:** Abstracted from batch source (Visible PDF (158 pp). **Delta pass** — emphasizes companion doctrine, follower autonomy, reputation propagation, map discovery gradients, active skill targeting, hidden dialogue checks, trade insults, disposition presets, and guardrails. Supplements `post-release-tactical-manual-metadata-104` and `sealed-facility-manual-metadata-95`; do not duplicate children.).
- **Repo anchor:** `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/stealthLeaveBehindRegistry.ts`; SPE-49/SPE-98 Done substrates.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/stealthLeaveBehindRegistry.ts`; SPE-49/SPE-98 Done substrates.
- **Table note:** Map gradients, travel time, exit hostility

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-49
- **Co-owners:** SPE-58, SPE-371

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-49 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/post-release-tactical-manual-delta-100-harvest.md` (C48–C55)
