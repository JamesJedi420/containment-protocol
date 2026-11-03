# Harvest — `survival-pressure-civic-metadata-71`

**Source:** Readable turn-based civic-survival mechanics wiki (bodily deterioration, infection logistics, district reputation, daily transitions, infrastructure, field medicine, death penalties). Pattern-only — no imported game title, town/plague framing, bound-role terms, character names, district labels, item names, exact values, or source prose.

**Dedup:** Supplements `facility-crisis-triage-metadata-55` (phased crisis food/stamina), `field-staff-operations-handbook-metadata-105` (fatigue/rest), `expedition-debt-route-map-metadata-115` / `expedition-debt-players-edition-metadata-128` (deprivation, recovery, gear degradation), `urban-concealment-investigation-metadata-100` (witnessed misconduct, fallible map), `haunted-estate-dual-pressure-metadata-106` (dual pressure clocks), `faith-adjacent-clandestine-agency-metadata-50` (scarcity barter). **SPE-130** three-channel fatigue and **SPE-1107** responder energy budget already land multi-axis exhaustion — not a single tiredness bar.

**Repo at triage:** `agentFatigueChannels.ts`; `fatiguePipeline.ts`; `responderEnergyBudget.ts`; `advanceWeek.ts`; `districtSchedule.ts`; `mapMetadata.ts`; `relationshipProjection.ts`; `progressClocks.ts`; `branchContinuity.ts`; `deploymentReadiness.ts`.

## Adjudication summary

**Candidates:** 71 (54 + 6 + 11 = 71).

| Verdict | Count |
| ------- | ----: |
| fold-in | 54 |
| no-op / delta | 6 |
| contradiction check | 11 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-1107, SPE-130 | C1–C7, C10–C14, C44–C45, C49, C57 |
| SPE-109, SPE-2106 | C19–C20, C28, C46, C54–C55 |
| SPE-562, SPE-1734 | C15–C18, C30, C46, C52, C59–C60 |
| SPE-16, SPE-626 | C46 daily spine; C43 checkpoint friction |
| SPE-208, SPE-788 | C21–C27, C50–C51 |
| SPE-58, SPE-2108 | C8–C9, C31–C33, C42, C56, C70 |
| SPE-1052, SPE-1562 | C31–C33 infrastructure repair |
| SPE-158, SPE-854 | C11–C13, C38–C41, C47–C49 |
| SPE-35, SPE-901 | C27–C29, C52–C53, C58 |
| SPE-1610, SPE-793 | C28–C29, C54 |
| SPE-42, SPE-98 | C35–C36, C40 |
| SPE-1760 | C13–C14, C60 |
| SPE-88 | C38–C39 taboo procedures |
| SPE-1085, SPE-151 | C14, C36, C43, C56, C59; C61–C71 |

## Per-candidate outcomes

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | fold_in | SPE-1107, SPE-130 | Interlocked survival axes (not single HP) |
| C2 | no_op | SPE-1107 | Delta vs facility-crisis food/stamina |
| C3 | no_op | SPE-130 | Delta vs three-channel exhaustion + rest tradeoff |
| C4 | fold_in | SPE-1107, SPE-130 | Stimulant benefit/cost on channels |
| C5 | fold_in | SPE-1107, SPE-98 | Immunity/exposure buffer before onset |
| C6 | fold_in | SPE-1107, SPE-130 | Progressive infection management |
| C7 | fold_in | SPE-1107 | Nonlinear late-stage contamination curve |
| C8 | fold_in | SPE-2108, SPE-58 | Contaminated surface interaction points |
| C9 | fold_in | SPE-2108, SPE-58 | Ambiguous contamination signposting |
| C10 | fold_in | SPE-1107, SPE-854 | Medicine harm/necessity tradeoffs |
| C11 | fold_in | SPE-854, SPE-1107 | Diagnosis before correct treatment |
| C12 | fold_in | SPE-158, SPE-854 | Prophylaxis for at-risk important NPCs |
| C13 | fold_in | SPE-158, SPE-1760 | Hidden daily survival odds |
| C14 | fold_in | SPE-1760, SPE-1085 | Inevitable loss despite correct prep |
| C15 | fold_in | SPE-562, SPE-16 | Midnight resolution phase |
| C16 | fold_in | SPE-562, SPE-109 | Dawn dispatch / briefing refresh |
| C17 | fold_in | SPE-562, SPE-854 | Uncertain task expiry signaling |
| C18 | fold_in | SPE-562, SPE-16 | Escalating time pressure by campaign day |
| C19 | fold_in | SPE-109, SPE-2106 | District infection/containment state cycle |
| C20 | fold_in | SPE-109, SPE-2106 | Post-contamination district aftermath |
| C21 | fold_in | SPE-208, SPE-109 | District-local reputation |
| C22 | fold_in | SPE-208, SPE-2108 | Witnessed vs unwitnessed misconduct |
| C23 | fold_in | SPE-208 | Reputation spillover adjacent districts |
| C24 | fold_in | SPE-208, SPE-1085 | Neutral-territory jurisdiction exploit rule |
| C25 | fold_in | SPE-788, SPE-208 | Civic support fund tied to local trust |
| C26 | fold_in | SPE-788 | Threshold reward packages |
| C27 | fold_in | SPE-35, SPE-208 | Barter generosity as trust action |
| C28 | no_op | SPE-109, SPE-1610 | Delta vs `districtSchedule` time layers |
| C29 | fold_in | SPE-793, SPE-35 | Crisis off-hours market |
| C30 | fold_in | SPE-562, SPE-901 | Field-cache persistence / cleanup at transition |
| C31 | fold_in | SPE-1052, SPE-58 | Infrastructure reliability breakdown |
| C32 | fold_in | SPE-1052, SPE-58 | Source-type contamination consistency |
| C33 | fold_in | SPE-1052, SPE-208 | Civic repair → trust gain |
| C34 | fold_in | SPE-1107, SPE-529 | Protective clothing degradation |
| C35 | fold_in | SPE-42, SPE-1610 | Raised-tool stance movement/social penalty |
| C36 | fold_in | SPE-42, SPE-1085 | Combat avoid-or-engage framework |
| C37 | fold_in | SPE-208, SPE-42 | Lockpicking consequence by witness/district |
| C38 | fold_in | SPE-88, SPE-854, SPE-208 | Taboo autopsy / evidence procedure fallout |
| C39 | fold_in | SPE-208, SPE-88 | Corpse-state ethics modifier |
| C40 | fold_in | SPE-98, SPE-854 | Field medicine specialist action suite |
| C41 | fold_in | SPE-854, SPE-109 | Medical ingredient ecology / respawn |
| C42 | no_op | SPE-58 | Delta vs `mapMetadata` service layer |
| C43 | fold_in | SPE-16, SPE-1085 | Checkpoint/reporting commitment friction |
| C44 | fold_in | SPE-1107, SPE-1760 | Persistent death penalty / degraded run |
| C45 | fold_in | SPE-1107, SPE-208 | Failure bargain removes penalties at debt |
| C46 | fold_in | SPE-16, SPE-109, SPE-562 | Daily town-state resolver |
| C47 | fold_in | SPE-158 | Important NPC risk dashboard |
| C48 | fold_in | SPE-158, SPE-854 | Prophylaxis allocation UI |
| C49 | fold_in | SPE-788, SPE-854 | Consecutive correct-treatment trust curve |
| C50 | fold_in | SPE-208, SPE-109 | District jurisdiction / lawlessness tags |
| C51 | fold_in | SPE-208 | Reputation action provenance ledger |
| C52 | fold_in | SPE-35, SPE-901 | Crisis inflation by day |
| C53 | no_op | SPE-901 | Delta vs expedition loot-refresh schedules |
| C54 | fold_in | SPE-1610, SPE-109 | Day/night population replacement |
| C55 | fold_in | SPE-1052, SPE-109 | Public service degradation curve |
| C56 | fold_in | SPE-58, SPE-151 | Map service-icon contract |
| C57 | fold_in | SPE-2108, SPE-1107 | Contaminated loot risk prompt |
| C58 | no_op | SPE-35 | Delta vs barter value tables (partial) |
| C59 | fold_in | SPE-562, SPE-151 | Deadline outcome presentation anti-scum |
| C60 | fold_in | SPE-1760, SPE-562 | Seeded daily odds; reload-proof resolution |
| C61 | contradiction | SPE-1085, SPE-1107 | Health-only staff condition |
| C62 | contradiction | SPE-1085, SPE-1107 | Trivial removable infection debuff |
| C63 | contradiction | SPE-1085, SPE-562 | Cosmetic time clock |
| C64 | contradiction | SPE-1085, SPE-208 | Global karma reputation |
| C65 | contradiction | SPE-1085, SPE-854 | Pure-benefit medicine |
| C66 | contradiction | SPE-1085, SPE-158 | Guaranteed rescue if treated |
| C67 | contradiction | SPE-1085, SPE-1052 | Stable background infrastructure |
| C68 | contradiction | SPE-1085, SPE-1107 | Death as clean reset only |
| C69 | contradiction | SPE-1085, SPE-88 | Neutral corpse handling |
| C70 | contradiction | SPE-1085, SPE-2108 | Omniscient map certainty |
| C71 | contradiction | SPE-1085, SPE-151 | Literal franchise import guardrail |

## No-op / delta notes

| ID | Rationale |
| -- | --------- |
| C2 | Facility-crisis food/stamina + SPE-1107 energy budget already specify ration pressure |
| C3 | SPE-130 channels + rest/therapy recovery landed |
| C28 | `districtSchedule.ts` already models time-layer population shifts |
| C42 | `mapMetadata.ts` service markers exist; extend via fold-in only when new icon types needed |
| C53 | Expedition batches already own refresh schedules by node type |
| C58 | Barter tables partially in SPE-35; delta only if NPC-type valuation gaps found at implement time |

## Map pivot (batch theme)

Operational map is **fallible survival geography**: district containment states, burned aftermath, local reputation, safe beds/storage/shops/report nodes, water-source confidence layers, contaminated objects, important NPC risk, medicine access, off-hours markets, patrol swaps — separating rumor, witnessed action, tested infrastructure, diagnosis, and verified containment state (not omniscient epidemic dashboard).
