# Harvest — `multi-stage-squad-operations-metadata-24`

**Source:** Partial wiki/guide metadata (sci-fi squad RPG trilogy patterns). Pattern-only — no franchise names, character labels, morality axis names, mission titles, or wiki URLs.

**Dedup:** Supplements `field-staff-operations-handbook-metadata-105`, `campaign-readiness-mission-hub-metadata-96`, `mission-hub-guide-patterns-metadata-44`, `staff-role-packages-transcript-metadata-26`, `background-packages-inherited-start-state.md`.

**Repo at triage:** `teamComposition.ts` (coverage roles, weakest-link); `deploymentReadiness.ts`; `relationshipProjection.ts` / chemistry; `branchContinuity.ts` (SPE-1760); `progressClocks.ts`; `legitimacy`/faction reputation; `responderDutyEvaluation.ts` (escort); `aggregateBattle.ts` parallel objective phase (abstract resolution pattern).

## Adjudication summary

**Candidates:** 24 (20 + 0 + 4 = 24).

| Verdict | Count |
| ------- | ----: |
| fold-in | 20 |
| no-op | 0 |
| contradiction check | 4 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-1025 | C1, C2, C11, C12 |
| SPE-158, SPE-2095 | C3, C8, C9, C12 |
| SPE-16, SPE-626 | C2, C6, C13–C15, C17 |
| SPE-562 | C6, C20 |
| SPE-208 | C7 |
| SPE-42 | C5 |
| SPE-1760, SPE-1811 | C10, C16, C18, C20 |
| SPE-626, SPE-2108 | C14, C19 |
| SPE-1034 | C9 |
| SPE-164 | C11 |
| SPE-1443 | C8 |
| SPE-1107 | C3 |
| SPE-1085 | C21–C24 |
| SPE-151 | C21–C24 guardrails |

## Per-candidate outcomes

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | fold_in | SPE-1025 | Multi-role deployment composition (`teamComposition` coverage) |
| C2 | fold_in | SPE-16, SPE-1025 | Multi-stage bounded role assignments + competency checks |
| C3 | fold_in | SPE-158, SPE-1107 | Persistent trust/readiness/morale modifiers |
| C4 | fold_in | SPE-16, SPE-1025 | Parallel off-screen aggregate strength resolution |
| C5 | fold_in | SPE-42 | Command-authority override of local automation constraints |
| C6 | fold_in | SPE-562, SPE-16 | Time-sensitive escalation while player elsewhere |
| C7 | fold_in | SPE-208, SPE-788 | Reputation-gated negotiation/de-escalation |
| C8 | fold_in | SPE-158, SPE-1443 | Personnel-origin incident variants |
| C9 | fold_in | SPE-1034, SPE-158 | Deployed-staff contextual commentary |
| C10 | fold_in | SPE-1760 | Side decisions → continuity flags/callbacks |
| C11 | fold_in | SPE-1025, SPE-164 | Specialist-gated environmental interactions |
| C12 | fold_in | SPE-158, SPE-1025 | Dynamic deployment pool contraction |
| C13 | fold_in | SPE-16, SPE-158 | Evacuation escort allocation tradeoffs |
| C14 | fold_in | SPE-16, SPE-626 | Hidden aggregate operational scoring |
| C15 | fold_in | SPE-16, SPE-1760 | Pre-commitment replanning at transition nodes |
| C16 | fold_in | SPE-1760 | Cross-era campaign-state persistence |
| C17 | fold_in | SPE-16, SPE-626 | Abstract operation resolution (not full tactical viz) |
| C18 | fold_in | SPE-1760, SPE-16 | Unified narrative/personnel/mission state deps |
| C19 | fold_in | SPE-626, SPE-2108 | Expertise-filtered information presentation |
| C20 | fold_in | SPE-1760, SPE-562 | Deferred consequence propagation |
| C21 | contradiction | SPE-1085, SPE-626 | Hidden scoring vs inspectable outcomes balance |
| C22 | contradiction | SPE-1085, SPE-158 | Personnel not interchangeable static resources |
| C23 | contradiction | SPE-1085, SPE-562 | Crisis timelines do not pause indefinitely |
| C24 | contradiction | SPE-1085, SPE-1025 | Specialist-gated procedures required |
