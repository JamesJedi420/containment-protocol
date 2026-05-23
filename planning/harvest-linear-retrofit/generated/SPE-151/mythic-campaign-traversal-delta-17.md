**Harvest retrofit (rich)** — `mythic-campaign-traversal-delta-17` → **SPE-151** (part 1/1)
_Automated retrofit from `planning/mythic-campaign-traversal-delta-17-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.
- **Dedup:** Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.
- **Repo at triage:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Candidates on SPE-151:** C33, C37
---

#### C33 — Symmetrical numerical balance as design goal

**1. Candidate & source**
- **ID:** C33
- **Batch:** `mythic-campaign-traversal-delta-17`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Symmetrical numerical balance as design goal
- **Pattern context:** Abstracted from batch source (Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.).
- **Repo anchor:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Table note:** Symmetrical numerical balance as design goal

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-151
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-151

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/mythic-campaign-traversal-delta-17-harvest.md` (C33)

---

#### C37 — Dense operational presentation / low lookup friction

**1. Candidate & source**
- **ID:** C37
- **Batch:** `mythic-campaign-traversal-delta-17`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Dense operational presentation / low lookup friction
- **Pattern context:** Abstracted from batch source (Supplemental review/community metadata (campaign flow, procedural hexcrawl, holdings, balance philosophy, traversal escalation). Pattern-only — no franchise names, knight/seer/realm labels, author names, review URLs, or source prose.).
- **Repo anchor:** `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `regionPackets.ts`; `mapMetadata.ts`; `pressurePipeline.ts` + `globalPressure`; `caseGeneration.ts`; `aggregateBattle.ts`; `agentFatigueChannels.ts`; `institutionalDenialDoctrinePressure.ts`; `branchContinuity.ts`; `campaignLedger.ts`.
- **Table note:** Dense operational presentation / low lookup friction

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-151
- **Co-owners:** SPE-854

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-151 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements mythic-density-24, `procedural-world-generator-metadata-24`, `expedition-debt-route-map-metadata-115`, `home-bases-transcript-metadata-48`, `osr-emergent-fieldplay-metadata-60`.

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/mythic-campaign-traversal-delta-17-harvest.md` (C37)
