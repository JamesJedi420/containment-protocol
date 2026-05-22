# Harvest — `campaign-readiness-mission-hub-metadata-96`

**Source:** Readable GameFAQs campaign walkthrough (PC guide pattern library). Pattern-only — no imported franchise names, characters, factions, missions, locations, weapons, dialogue, readiness thresholds, or walkthrough prose.

**Dedup:** Supplements `mission-hub-guide-patterns-metadata-44`, `investigation-debrief-guide-metadata-50` (debrief/PONR), `pulp-expedition-adventure-metadata-40` (compact ops), `facility-crisis-triage-metadata-55` (defend-while-progress), `branchContinuity` (SPE-1760), `missionIntakeRouting` readiness scoring.

**Repo at triage:** `missionIntakeRouting.ts` (readinessScore); `branchContinuity.ts`; `progressClocks.ts`; `advanceWeek.ts` (faction reputation); SPE-1496 contract debrief; `docs/cross-scale-integration.md`.

## Adjudication summary

**Candidates:** 96 (68 + 12 + 16 = 96).

| Verdict | Count |
| ------- | ----: |
| fold-in | 68 |
| no-op | 12 |
| contradiction check | 16 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-1085, SPE-151 | C81–C96 |
| SPE-16, SPE-626 | C4–C10, C25–C30, C49–C51, C56–C59, C77–C78 |
| SPE-1760 | C11–C14, C65 |
| SPE-35, SPE-50, SPE-52 | C15–C16, C67, C82 |
| SPE-1034 | C16–C18, C84 |
| SPE-562, SPE-704 | C2, C6, C18, C53, C61, C72 |
| SPE-788, SPE-1052 | C3, C9, C35, C70 |
| SPE-854 | C31–C32, C38–C39, C44–C45, C69, C89 |
| SPE-164, SPE-854 | C33 |
| SPE-58, SPE-371 | C40–C41, C62, C73 |
| SPE-98, SPE-1734 | C42–C43, C46, C55 |
| SPE-1025, SPE-1485 | C22–C24, C27–C28, C87 |
| SPE-1496, SPE-42 | C47 |
| SPE-793, SPE-614 | C27, C54 |
| SPE-677 | C19–C21, C39 |
| SPE-158, SPE-2095 | C64, C22 |
| SPE-68, SPE-130 | C34, C94 |
| SPE-160 | C25 |
| SPE-1101, SPE-1653 | C48, C94 |

## Per-candidate outcomes (C1–C55)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | fold_in | SPE-16, SPE-704 | Campaign readiness score (civic/containment) |
| C2 | fold_in | SPE-16, SPE-562 | Readiness-threshold final outcomes |
| C3 | fold_in | SPE-788, SPE-1052 | Support-asset registry |
| C4 | fold_in | SPE-16, SPE-1496 | Point-of-no-return warning + preview |
| C5 | fold_in | SPE-16, SPE-626 | Contract expiration on crisis advance |
| C6 | fold_in | SPE-562, SPE-16 | Mission-count deadlines |
| C7 | fold_in | SPE-16, SPE-626 | Milestone-driven unlock graph |
| C8 | fold_in | SPE-16, SPE-626 | Message-triggered intake |
| C9 | fold_in | SPE-1052, SPE-16 | Hub-side-mission generator |
| C10 | fold_in | SPE-854, SPE-16 | Ambient overheard leads |
| C11 | fold_in | SPE-1760 | Import-state continuity |
| C12 | fold_in | SPE-1760 | Default history profile |
| C13 | fold_in | SPE-1760, SPE-158 | Replacement actor system |
| C14 | fold_in | SPE-1034, SPE-35 | Relationship dialogue modifiers |
| C15 | fold_in | SPE-35, SPE-50 | Reputation (not binary morality) |
| C16 | fold_in | SPE-1034, SPE-35 | State-gated social options |
| C17 | fold_in | SPE-1034, SPE-793 | Timed scene interrupts |
| C18 | fold_in | SPE-1034, SPE-35 | Interrupt consequence propagation |
| C19 | fold_in | SPE-677, SPE-35 | Faction summit event |
| C20 | fold_in | SPE-677, SPE-158 | Faction representative stance |
| C21 | fold_in | SPE-35, SPE-16 | Rescue vs asset dilemma |
| C22 | fold_in | SPE-1025, SPE-158 | Staff presence modifies scenes |
| C23 | fold_in | SPE-1025, SPE-16 | Mandatory specialist coverage |
| C24 | fold_in | SPE-1025, SPE-158 | Optional specialist insight |
| C25 | fold_in | SPE-16, SPE-160 | Compact field-operation schema |
| C26 | fold_in | SPE-16, SPE-58 | Field-site task nodes |
| C27 | fold_in | SPE-562, SPE-793 | Defend while progress clock |
| C28 | fold_in | SPE-1485, SPE-1025 | Temporary staff split |
| C29 | fold_in | SPE-16, SPE-1052 | Infrastructure restoration template |
| C30 | fold_in | SPE-16, SPE-854 | Abduction contract template |
| C31–C32 | fold_in | SPE-854 | Object/evidence recovery contracts |
| C33 | fold_in | SPE-164, SPE-854 | Access-code/cipher resources |
| C34 | fold_in | SPE-68, SPE-130 | Medical-resource contract effects |
| C35 | fold_in | SPE-1052, SPE-35 | Holding-area civic pressure |
| C36 | fold_in | SPE-35, SPE-854 | Public morale/narrative contracts |
| C37 | fold_in | SPE-854, SPE-788 | Political-district investigation |
| C38 | fold_in | SPE-854, SPE-529 | Surveillance bug evidence |
| C39 | fold_in | SPE-35, SPE-1034 | Choose-a-side resolution |
| C40–C41 | fold_in | SPE-58, SPE-371 | Remote survey layer + rewards |
| C42 | fold_in | SPE-98, SPE-1734 | Branching upgrade choices |
| C43 | fold_in | SPE-1734, SPE-98 | Upgrade acquisition sources |
| C44–C45 | fold_in | SPE-854, SPE-16 | Recoverable checklist + capability linkage |
| C46 | fold_in | SPE-98, SPE-788 | Shop/vendor loop |
| C47 | fold_in | SPE-1496, SPE-42 | Pre-crisis staff conversations |
| C48 | fold_in | SPE-1101, SPE-130 | Stress-dream motif |
| C49–C51 | fold_in | SPE-16, SPE-562 | Final forced route + staged ops + readiness-constrained choice |
| C52 | fold_in | SPE-158, SPE-788 | Recurring hostile actor arc |
| C53 | fold_in | SPE-793, SPE-16 | Threat support-node dependencies |
| C54 | fold_in | SPE-793, SPE-562 | Timed technical interaction under pressure |
| C55 | fold_in | SPE-98, SPE-68 | Site-embedded emergency resources |

## Engine patterns (C56–C80)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C56–C59 | fold_in | SPE-16, SPE-626 | Mission states, briefing card, warnings, side dependencies |
| C60–C61 | fold_in | SPE-16, SPE-704 | Typed readiness gains/losses |
| C62 | fold_in | SPE-58, SPE-529 | Remote survey risk |
| C63 | fold_in | SPE-1052, SPE-16 | Hub availability markers |
| C64 | fold_in | SPE-158, SPE-2095 | Staff insight tags |
| C65 | fold_in | SPE-1760, SPE-158 | Returning actor variants |
| C66 | fold_in | SPE-16, SPE-854 | High-stakes choice preview (fallible) |
| C67 | fold_in | SPE-35, SPE-677 | Multi-faction attitude changes |
| C68 | fold_in | SPE-35, SPE-16 | Rescue dilemma template |
| C69 | fold_in | SPE-854 | Civic object recovery mapping |
| C70 | fold_in | SPE-1052, SPE-68 | Refugee support action family |
| C71 | fold_in | SPE-854, SPE-788 | Political investigation chain |
| C72 | fold_in | SPE-562, SPE-793 | Console progress clock |
| C73 | fold_in | SPE-58, SPE-1052 | Infrastructure support-node map |
| C74–C76 | fold_in | SPE-16, SPE-562 | Final checklist categories, outcome rollup, tier labels |
| C77–C78 | fold_in | SPE-16, SPE-626 | Operational backlog sort; completionist tension |
| C79–C80 | fold_in | SPE-151, SPE-16 | Authoring recoverable checklist; spoiler separation |

## Contradiction checks (C81–C96)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C81 | contradiction_check | SPE-1085, SPE-151 | No franchise import |
| C82 | contradiction_check | SPE-1085, SPE-16 | War → civic/containment readiness |
| C83 | contradiction_check | SPE-1085, SPE-16 | Fair readiness preview |
| C84 | contradiction_check | SPE-1085, SPE-1034 | No paragon/renegade color morality |
| C85 | contradiction_check | SPE-1085, SPE-562 | Fair deadline warnings |
| C86 | contradiction_check | SPE-1085, SPE-35 | Rescue dignity |
| C87 | contradiction_check | SPE-1085, SPE-1025 | Staff split = actors with aftermath |
| C88 | contradiction_check | SPE-1085, SPE-1052 | Refugee content dignity/agency |
| C89 | contradiction_check | SPE-1085, SPE-854 | Surveillance legal/ethical framing |
| C90 | contradiction_check | SPE-1085, SPE-151 | Abstract digital mechanics |
| C91 | contradiction_check | SPE-1085, SPE-16 | Readiness ≠ pure checklist |
| C92 | contradiction_check | SPE-1085, SPE-98 | Upgrades = containment not weapon DPS |
| C93 | contradiction_check | SPE-1085, SPE-16 | Forced final route preserves agency |
| C94 | contradiction_check | SPE-1085, SPE-1101 | Non-stigmatizing trauma framing |
| C95 | contradiction_check | SPE-1085, SPE-151 | No walkthrough prose import |
| C96 | contradiction_check | SPE-1085, SPE-151 | Designer vs player discovery separation |

## No-op notes (12)

| ID | Reason |
| -- | ------ |
| C1 (partial) | `missionIntakeRouting` readinessScore exists |
| C4 (partial) | SPE-1496 contract debrief substrate |
| C11 (partial) | `branchContinuity.ts` |
| C15 (partial) | Faction reputation in `advanceWeek.ts` |
| C22 (partial) | Team composition / mission-hub harvests |
| C25 (partial) | Case templates / episodic patterns |
| C27 (partial) | `facility-crisis-triage-metadata-55` defend-while-progress |
| C44 (partial) | Case objective / evidence substrates |
| C54 (partial) | Progress clocks + partial success |
| C56 (partial) | Case/mission state in intake |
| C72 (partial) | SPE-562 progress clocks |
| C77 (partial) | Contract board UI patterns |

## Map pivot

**Fallible operations map:** contract backlog, expiration risk, readiness tiers (banded), hub leads, survey uncertainty, rival/support-node states — not walkthrough-optimal route truth.
