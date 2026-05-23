**Harvest retrofit (rich)** — `mythic-campaign-traversal-delta-17` → **SPE-562** (part 1/1)
_Automated retrofit from `planning/mythic-campaign-traversal-delta-17-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.
- **Dedup:** Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.
- **Repo at triage:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Candidates on SPE-562:** C26, C31
---

#### C26 — Macro-instability / background campaign pressure 

**1. Candidate & source**
- **ID:** C26
- **Batch:** `mythic-campaign-traversal-delta-17`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Macro-instability / background campaign pressure (`globalPressure`, ambient pipeline)
- **Pattern context:** Abstracted from batch source (Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.).
- **Repo anchor:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.
- **Named modules in note:** `globalPressure`.

**3. Repo / subsystem anchor**
- `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Table note:** Macro-instability / background campaign pressure (`globalPressure`, ambient pipeline)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-562
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-562 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mythic-campaign-traversal-delta-17-harvest.md` (C26)

---

#### C31 — Ambient escalation during ordinary movement 

**1. Candidate & source**
- **ID:** C31
- **Batch:** `mythic-campaign-traversal-delta-17`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Ambient escalation during ordinary movement (not mission-only)
- **Pattern context:** Abstracted from batch source (Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.).
- **Repo anchor:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Table note:** Ambient escalation during ordinary movement (not mission-only)

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-562
- **Co-owners:** SPE-371, SPE-58

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-562 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mythic-campaign-traversal-delta-17-harvest.md` (C31)
