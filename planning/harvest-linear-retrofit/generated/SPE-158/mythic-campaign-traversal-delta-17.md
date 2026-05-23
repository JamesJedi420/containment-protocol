**Harvest retrofit (rich)** — `mythic-campaign-traversal-delta-17` → **SPE-158** (part 1/1)
_Automated retrofit from `planning/mythic-campaign-traversal-delta-17-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.
- **Dedup:** Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.
- **Repo at triage:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Candidates on SPE-158:** C28, C32, C38
---

#### C28 — Region-linked anomaly interpreters tied to local omen ecology

**1. Candidate & source**
- **ID:** C28
- **Batch:** `mythic-campaign-traversal-delta-17`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Region-linked anomaly interpreters tied to local omen ecology
- **Pattern context:** Abstracted from batch source (Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.).
- **Repo anchor:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Table note:** Region-linked anomaly interpreters tied to local omen ecology

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-158
- **Co-owners:** SPE-88, SPE-854

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-158 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mythic-campaign-traversal-delta-17-harvest.md` (C28)

---

#### C32 — Delta vs ideology/fatigue channels + mythic-density C11

**1. Candidate & source**
- **ID:** C32
- **Batch:** `mythic-campaign-traversal-delta-17`
- **Verdict:** no_op

**2. Mechanic (agent-readable)**
- **Harvest summary:** Delta vs ideology/fatigue channels + mythic-density C11
- **Pattern context:** Abstracted from batch source (Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.).
- **Repo anchor:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.

**3. Repo / subsystem anchor**
- `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Table note:** Delta vs ideology/fatigue channels + mythic-density C11

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-158
- **Co-owners:** SPE-130, SPE-1107

**5. Boundary**
**In scope (when owner ships):**
- None — doc traceability only

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.

**6. Disposition & issue decision**
- **Disposition:** no implementation change
- **Reasoning:** Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.

**Traceability:** `planning/mythic-campaign-traversal-delta-17-harvest.md` (C32)

---

#### C38 — Institutional succession across personnel generations

**1. Candidate & source**
- **ID:** C38
- **Batch:** `mythic-campaign-traversal-delta-17`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Institutional succession across personnel generations
- **Pattern context:** Abstracted from batch source (Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.).
- **Repo anchor:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Table note:** Institutional succession across personnel generations

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-158
- **Co-owners:** SPE-1760

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-158 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mythic-campaign-traversal-delta-17-harvest.md` (C38)
