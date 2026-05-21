# Harvest — `post-release-tactical-manual-metadata-104`

**Source:** Visible PDF full pass — official post-release tactical RPG manual (159 pp, TOC + major systems). Pattern-only; no franchise names, proprietary UI labels, or imported setting lore.

**Prior batch:** `sealed-facility-manual-metadata-95` (121 pp pattern library). This pass adds granular acceptance notes; overlapping rows supplement rather than replace that closure.

**Repo at triage:** `src/domain/siteGeneration/mapMetadata.ts` (fallible maps); `src/features/dashboard/eventFeedView.ts`; `src/domain/stealthLeaveBehindRegistry.ts` + investigation custody; SPE-49/SPE-98/SPE-1104 Done substrates; SPE-70 partial.

## Adjudication summary

**Candidates:** 104 (88 + 2 + 14 = 104). Matches per-candidate table: C89 and C103 no-op; C27 and C91–C104 contradiction checks.

| Verdict | Count |
| ------- | ----: |
| fold-in | 88 |
| no-op | 2 |
| contradiction check | 14 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake, C104 |
| SPE-1085, SPE-151 | C91–C102 |
| SPE-1061, SPE-1372 | C1–C2 |
| SPE-1101, SPE-196 | C3, C54–C55 |
| SPE-1059, SPE-1412 | C4–C6, C51–C52, C73–C75 |
| SPE-1123 | C7–C8, C59, C81, C86, C90 |
| SPE-1074, SPE-98, SPE-1658 | C9–C12 |
| SPE-854, SPE-1264 | C13–C15, C29, C71 |
| SPE-16, SPE-1308 | C14 |
| SPE-1485, SPE-1734 | C16–C17, C79, C89–C90 |
| SPE-58, SPE-1244 | C18–C19, C80 |
| SPE-49, SPE-1385 | C19–C20, C24 |
| SPE-371, SPE-605 | C20–C22, C53, C56 |
| SPE-529, SPE-1285, SPE-781 | C23, C42–C43, C50, C60, C81 |
| SPE-1034, SPE-733, SPE-793 | C25–C30, C83, C85–C86, C95 |
| SPE-1555, SPE-468, SPE-402 | C31–C32, C82 |
| SPE-42, SPE-1025, SPE-1024 | C33–C37, C78, C84, C101 |
| SPE-35, SPE-1160, SPE-158 | C38–C40, C72, C83, C87–C88, C97 |
| SPE-544, SPE-1222, SPE-68 | C41–C42 |
| SPE-68, SPE-120, SPE-1484 | C44–C45, C92 |
| SPE-1429 | C46 |
| SPE-164, SPE-55 | C47–C50, C94, C102 |
| SPE-2163 | C49 |
| SPE-912, SPE-1075 | C51–C52 |
| SPE-40, SPE-1412, SPE-1708 | C55–C57, C61–C62 |
| SPE-614, SPE-55, SPE-164 | C63–C65 |
| SPE-145, SPE-120 | C66–C67 |
| SPE-1610, SPE-62 | C54, C68–C69 |
| SPE-1120, SPE-205 | C70 |
| SPE-788, SPE-282 | C40, C56, C74 |
| SPE-361, SPE-1734 | C57–C58 |
| SPE-83, SPE-158, SPE-2095 | C76 |
| SPE-1063 | C77, C23 |
| SPE-1009, SPE-1286 | C2 supplement |

## Per-candidate outcomes

| ID | CP concept | Verdict | Disposition | Owner(s) | New |
| -- | ---------- | ------- | ----------- | -------- | --- |
| C1 | Capability domains | accept | fold_in | SPE-1061 | — |
| C2 | Derived operational statistics | accept | fold_in | SPE-1061, SPE-1372 | — |
| C3 | Trait tradeoff packages | accept | fold_in | SPE-1101, SPE-196 | — |
| C4 | Tag skill specialization accelerators | accept | fold_in | SPE-1059 | — |
| C5 | Field action skill taxonomy | accept | fold_in | SPE-1059, SPE-1412 | — |
| C6 | Target-validated procedure use | accept | fold_in | SPE-1059, SPE-1412 | — |
| C7 | Baseline examine action | accept | fold_in | SPE-1123, SPE-529 | — |
| C8 | Contextual information cards | accept | fold_in | SPE-1123 | — |
| C9 | Field load and carry capacity | accept | fold_in | SPE-1074, SPE-98 | — |
| C10 | Ready equipment slots | accept | fold_in | SPE-1658, SPE-98 | — |
| C11 | Emergency packed-gear access cost | accept | fold_in | SPE-1658, SPE-40 | — |
| C12 | Dropped/misplaced item persistence | accept | fold_in | SPE-98 | — |
| C13 | Case device / field ledger | accept | fold_in | SPE-854, SPE-1123 | — |
| C14 | Objective status ledger | accept | fold_in | SPE-16, SPE-1308 | — |
| C15 | Recovered media ingestion | accept | fold_in | SPE-854, SPE-1264 | — |
| C16 | Operational clock and timed waits | accept | fold_in | SPE-1485, SPE-1734 | — |
| C17 | Rest recovery time tradeoff | accept | fold_in | SPE-1485, SPE-1412 | — |
| C18 | Multi-scale maps | accept | fold_in | SPE-58, SPE-1244 | — |
| C19 | Regional fog-of-war discovery | accept | fold_in | SPE-49, SPE-58 | — |
| C20 | Terrain travel time modifiers | accept | fold_in | SPE-371, SPE-605 | — |
| C21 | Travel random encounters | accept | fold_in | SPE-371, SPE-605 | — |
| C22 | Pre-contact detection and bypass | accept | fold_in | SPE-371, SPE-529 | — |
| C23 | Motion sensor map overlay | accept | fold_in | SPE-529 | — |
| C24 | Typed map exit markers | accept | fold_in | SPE-1385, SPE-58 | — |
| C25 | Dialogue tiers | accept | fold_in | SPE-1034 | — |
| C26 | State-gated interview options | accept | fold_in | SPE-1034, SPE-158 | — |
| C27 | Capability-gated communication | accept | contradiction_check | SPE-1034, SPE-1085 | — |
| C28 | Nonverbal social cues | accept | fold_in | SPE-1034, SPE-733 | — |
| C29 | Interview transcript and contradictions | accept | fold_in | SPE-1034, SPE-854 | — |
| C30 | Dialogue risk preview policy | accept | fold_in | SPE-1034, SPE-793 | — |
| C31 | Negotiated exchange pricing | accept | fold_in | SPE-1555, SPE-468 | — |
| C32 | Mixed local economy | accept | fold_in | SPE-1555, SPE-402 | — |
| C33 | Semi-autonomous secondary staff | accept | fold_in | SPE-42, SPE-1025 | — |
| C34 | Leadership-constrained team capacity | accept | fold_in | SPE-42, SPE-1024 | — |
| C35 | Squad inventory distribution | accept | fold_in | SPE-98, SPE-1025 | — |
| C36 | Companion doctrine templates | accept | fold_in | SPE-42, SPE-1024 | — |
| C37 | Collateral risk tolerance doctrine | accept | fold_in | SPE-55, SPE-42 | — |
| C38 | Ethical record vs public reputation | accept | fold_in | SPE-35, SPE-1160 | — |
| C39 | Reputation propagation network | accept | fold_in | SPE-35, SPE-788 | — |
| C40 | Special reputation deed tags | accept | fold_in | SPE-1160, SPE-788 | — |
| C41 | Damage-over-time exposure | accept | fold_in | SPE-544, SPE-68 | — |
| C42 | Invisible cumulative exposure | accept | fold_in | SPE-544, SPE-1222 | — |
| C43 | Exposure measurement tools | accept | fold_in | SPE-529, SPE-544 | — |
| C44 | Triage vs advanced treatment split | accept | fold_in | SPE-68, SPE-120 | — |
| C45 | Persistent injury assignment constraints | accept | fold_in | SPE-120, SPE-1484 | — |
| C46 | Sustained stealth posture | accept | fold_in | SPE-1429 | — |
| C47 | Access failure-state ladder | accept | fold_in | SPE-164 | — |
| C48 | Access control type taxonomy | accept | fold_in | SPE-164, SPE-1385 | — |
| C49 | Covert placement action | accept | fold_in | SPE-2163, SPE-164 | — |
| C50 | Hazard detection/disarm state machine | accept | fold_in | SPE-164, SPE-55 | — |
| C51 | Diagnosis before repair | accept | fold_in | SPE-912, SPE-1059 | — |
| C52 | Repair and disable action family | accept | fold_in | SPE-912, SPE-1059 | — |
| C53 | Fieldcraft travel safety | accept | fold_in | SPE-371, SPE-1429 | — |
| C54 | Prerequisite-gated capability unlocks | accept | fold_in | SPE-196, SPE-1059 | — |
| C55 | Contract-granted unique capability tags | accept | fold_in | SPE-196, SPE-788 | — |
| C56 | Rare encounter weighting | accept | fold_in | SPE-371, SPE-788 | — |
| C57 | Domain-specific difficulty settings | accept | fold_in | SPE-361, SPE-1734 | — |
| C58 | Content intensity preferences | accept | fold_in | SPE-361, SPE-1734 | — |
| C59 | Actor visibility highlighting | accept | fold_in | SPE-1123, SPE-529 | — |
| C60 | Multi-channel detection | accept | fold_in | SPE-529, SPE-781 | — |
| C61 | Emergency action budget | accept | fold_in | SPE-40, SPE-1412 | — |
| C62 | Reserved action budget orders | accept | fold_in | SPE-40 | — |
| C63 | Context modifier framework | accept | fold_in | SPE-614, SPE-55 | — |
| C64 | Precision action tradeoffs | accept | fold_in | SPE-614, SPE-40 | — |
| C65 | Exceptional outcome / mishap framework | accept | fold_in | SPE-164, SPE-55 | — |
| C66 | Protective gear mitigation model | accept | fold_in | SPE-145, SPE-120 | — |
| C67 | PPE hazard channel matrix | accept | fold_in | SPE-145 | — |
| C68 | Confrontation end conditions | accept | fold_in | SPE-1610, SPE-62 | — |
| C69 | Multi-approach incident resolution | accept | fold_in | SPE-1610, SPE-62 | — |
| C70 | Tutorial onboarding contract | accept | fold_in | SPE-1120, SPE-205 | — |
| C71 | Unified case ledger surface | accept | fold_in | SPE-854, SPE-1123 | — |
| C72 | Local reputation affects economy | accept | fold_in | SPE-35, SPE-1555 | — |
| C73 | Skill checks without guaranteed certainty | accept | fold_in | SPE-1059, SPE-793 | — |
| C74 | Increasing skill improvement cost | accept | fold_in | SPE-1059 | — |
| C75 | Training from manuals and debriefs | accept | fold_in | SPE-1059, SPE-854 | — |
| C76 | Concept-first staff generation | accept | fold_in | SPE-83, SPE-158 | — |
| C77 | Secondary actors refuse inappropriate orders | accept | fold_in | SPE-42, SPE-1063 | — |
| C78 | Squad consumable stocking | accept | fold_in | SPE-98, SPE-1025 | — |
| C79 | Time-dependent settlement services | accept | fold_in | SPE-1485 | — |
| C80 | Automap intentional simplification | accept | fold_in | SPE-58, SPE-1244 | — |
| C81 | Sensor scope limited to current map | accept | fold_in | SPE-529 | — |
| C82 | Poor offers harm relationships | accept | fold_in | SPE-1555, SPE-468 | — |
| C83 | Personal reaction vs town reputation | accept | fold_in | SPE-1034, SPE-158 | — |
| C84 | Companions volunteer advice | accept | fold_in | SPE-1024, SPE-42 | — |
| C85 | NPC-initiated conversation | accept | fold_in | SPE-1034 | — |
| C86 | Ambient chatter actionable clues | accept | fold_in | SPE-1034, SPE-1123 | — |
| C87 | Hidden ethical debt tracking | accept | fold_in | SPE-1160, SPE-35 | — |
| C88 | Impact ledger not kill counters | accept | fold_in | SPE-1160, SPE-788 | — |
| C89 | Checkpoint / debrief snapshot analogue | accept | no-op | SPE-1734 | — |
| C90 | Accessibility and presentation prefs | accept | fold_in | SPE-1734, SPE-361 | — |
| C91 | No imported IP or trade dress | accept | contradiction_check | SPE-1085, SPE-151 | — |
| C92 | Setting conversion guardrail | accept | contradiction_check | SPE-1085 | — |
| C93 | Exposure/medical safety abstraction | accept | contradiction_check | SPE-1085, SPE-68 | — |
| C94 | Weapon/combat abstraction | accept | contradiction_check | SPE-1085, SPE-55 | — |
| C95 | Communication representation care | accept | contradiction_check | SPE-1085, SPE-1034 | — |
| C96 | Replace gender-essentialist reactions | accept | contradiction_check | SPE-1085, SPE-1034 | — |
| C97 | Avoid reductive moral scoring | accept | contradiction_check | SPE-1085, SPE-1160 | — |
| C98 | Looting → custody chain | accept | contradiction_check | SPE-1085, SPE-854 | — |
| C99 | Limit gambling-loop focus | accept | contradiction_check | SPE-1085, SPE-1555 | — |
| C100 | Proactive content intensity controls | accept | contradiction_check | SPE-1085, SPE-361 | — |
| C101 | Companion welfare guardrail | accept | contradiction_check | SPE-1085, SPE-42 | — |
| C102 | Trap/explosive abstraction | accept | contradiction_check | SPE-1085, SPE-164 | — |
| C103 | Recipes appendix no-op | accept | no-op | — | — |
| C104 | Full-pass duplicate reconciliation | accept | contradiction_check | SPE-2110, SPE-1085 | — |
