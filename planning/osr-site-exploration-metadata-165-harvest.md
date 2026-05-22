# Harvest — `osr-site-exploration-metadata-165`

**Source:** Readable OSRIC-style fantasy rules reference PDF (exploration, combat support, traps, encounters, morale, hirelings, spell-like effects, monsters, items, artifacts). Pattern-only — no fantasy races/classes, spell/monster/treasure names, alignment labels, tables, values, or source prose.

**Dedup:** Supplements `osr-emergent-fieldplay-metadata-60` (encounter tables, hireling morale, encumbrance guideline), `sealed-facility-manual-metadata-95` (site routes, visibility, traps partial), `tabletop-mechanics-transcript-metadata-87` (OSR agency), `mc-toolkit-contract-authoring-metadata-132` (location/trap authoring), `urban-concealment-investigation-metadata-100` (fallible map), `post-release-tactical-manual-metadata-104` (visibility).

**Repo at triage:** `siteGeneration/mapMetadata.ts` + `packets.ts`; `progressClocks.ts`; `shared/outcomes.ts`; `equipment.ts`; `aggregateBattle.ts` morale; `visibilityState`; `harvestedMindLoadout`; `caseTemplates.*`.

## Adjudication summary

**Candidates:** 165 (118 + 32 + 15 = 165).

| Verdict | Count |
| ------- | ----: |
| fold-in | 118 |
| no-op / delta | 32 |
| contradiction check | 15 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-371, SPE-562, SPE-1734 | C1–C2, C18–C21, C137, C139 |
| SPE-58, SPE-164, SPE-2106 | C4–C11, C8–C10, C16–C17, C53–C55, C75, C93, C110, C138, C141 |
| SPE-854, SPE-1496 | C6–C7, C12–C15, C38, C40, C52, C63–C66, C78–C85, C141, C144 |
| SPE-1610, SPE-130, SPE-42 | C13–C23, C31–C36, C67–C76, C91–C110, C142 |
| SPE-158, SPE-2095, SPE-1025 | C24–C30, C27, C81–C82, C143 |
| SPE-98, SPE-1074, SPE-529 | C29–C30, C41–C90, C111–C131, C148 |
| SPE-88, SPE-2105 | C41–C90, C105–C108 |
| SPE-901, SPE-529 | C37–C40, C111–C131 |
| SPE-1760, SPE-788 | C26, C45, C144–C147 |
| SPE-35, SPE-208 | C96, C100–C102, C145 |
| SPE-793, SPE-614 | C24, C36 |
| SPE-1052 | C97–C98, C104 |
| SPE-1085, SPE-151 | C132–C133, C136, C140, C149–C150 authoring; C151–C165 contradiction checks (trap/evidence policy overlaps C13–C14) |

## No-op / delta (selected)

| IDs | Parent / note |
| --- | ------------- |
| C3 | `osr-emergent-fieldplay-60` C46 encumbrance guideline |
| C18–C21 | `osr-emergent-fieldplay-60` C1–C2 encounter tables |
| C24–C26 | Partial `osr-60` C39 hired help; `field-staff-105` contractors |
| C40 | `pulp-expedition-40` / `mc-toolkit-132` reward-risk |
| C54 | `urban-concealment-100` C60 cinematic scene (opening shot) |
| C91 | Template authoring overlaps `mc-toolkit-132` danger profiles — fold detail only |
| C132–C133, C136, C140, C149 | Authoring standards (SPE-151) unless system-backed |

## Per-candidate outcomes (C1–C40 exploration & site)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | fold_in | SPE-562, SPE-371 | Turn-based exploration clock + zone reactions |
| C2 | fold_in | SPE-371, SPE-562 | Exploration action cost table |
| C3 | no_op | SPE-529 | Delta vs osr-60 encumbrance |
| C4 | fold_in | SPE-58, SPE-529 | Light/visibility state taxonomy |
| C5 | fold_in | SPE-58, SPE-2108 | Darkness as tactical terrain |
| C6 | fold_in | SPE-854, SPE-58 | Deliberate search requirement |
| C7 | fold_in | SPE-2108, SPE-854 | Passive vs active detection |
| C8 | fold_in | SPE-164, SPE-58 | Hidden access / secret routes |
| C9 | fold_in | SPE-58, SPE-854 | Listen/scan before entry |
| C10 | fold_in | SPE-164, SPE-58 | Door state taxonomy |
| C11 | fold_in | SPE-164, SPE-854 | Breach consequences |
| C12 | fold_in | SPE-854, SPE-1610 | Trap purpose model |
| C13 | fold_in | SPE-1610, SPE-788, SPE-1085 | Intelligent trap adaptation (C151 arbitrary-punishment guardrail) |
| C14 | fold_in | SPE-788, SPE-854, SPE-1085 | Trap evidence cleanup (custody/evidence policy) |
| C15 | fold_in | SPE-1610, SPE-1052 | Trap severity profile |
| C16 | fold_in | SPE-2106, SPE-88 | Trick-room / rules-puzzle spaces |
| C17 | fold_in | SPE-58, SPE-2106 | Procedural room generator |
| C18 | no_op | SPE-371 | Delta vs osr-60 zone tables |
| C19 | no_op | SPE-371 | Wandering checks partial in osr-60 |
| C20 | no_op | SPE-109 | Urban encounters partial urban-100 |
| C21 | no_op | SPE-371 | Wilderness table partial osr-60 |
| C22 | fold_in | SPE-1610, SPE-42 | NPC morale state |
| C23 | fold_in | SPE-1610, SPE-130 | Morale triggers |
| C24 | fold_in | SPE-158, SPE-2095 | Hireling/contractor system |
| C25 | fold_in | SPE-158, SPE-788 | Contractor loyalty |
| C26 | fold_in | SPE-158, SPE-1760 | Recurring support staff continuity |
| C27 | fold_in | SPE-1610, SPE-208 | First-contact disposition roll |
| C28 | fold_in | SPE-158, SPE-854 | Communication barriers |
| C29 | fold_in | SPE-98, SPE-1025 | Specialist role gates |
| C30 | fold_in | SPE-98, SPE-130 | Non-specialty attempt penalties |
| C31 | fold_in | SPE-98, SPE-1107 | System-shock / stability check |
| C32 | fold_in | SPE-1107, SPE-98 | Extreme recovery failure odds |
| C33 | fold_in | SPE-1107, SPE-1760 | Permanent capability reduction lane |
| C34 | fold_in | SPE-1107, SPE-130 | Distinct harm lanes (toxin/psychic/etc.) |
| C35 | fold_in | SPE-130, SPE-158 | Insanity symptom constraints |
| C36 | fold_in | SPE-42, SPE-1610 | Subdual / nonlethal resolution |
| C37 | fold_in | SPE-529, SPE-901 | Item saving throws |
| C38 | fold_in | SPE-854, SPE-901 | Evidence fragility |
| C39 | fold_in | SPE-529, SPE-901 | Equipment-targeting anomalies |
| C40 | fold_in | SPE-901, SPE-854 | Risk-reward resource/evidence |

## Per-candidate outcomes (C41–C90 anomaly-effect schema)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C41–C90 | fold_in | SPE-88, SPE-529, SPE-2105 | Unified anomaly procedure schema: components, interruption, wards, glyphs, illusions (partial/real), control effects, area hazards, summons, divination limits, teleport risk — catalog entries per OSRIC spell-pattern |

## Per-candidate outcomes (C91–C150 threats, items, engine)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C91 | fold_in | SPE-1610, SPE-151 | Threat stat-block schema (authoring template) |
| C92–C110 | fold_in | SPE-88, SPE-1610 | Threat patterns: regen, contagion, shapeshifter, mimic, drain, possession, gaze, sound, swarm, hierarchy, lair, hoard motive |
| C111–C131 | fold_in | SPE-529, SPE-901, SPE-88 | Item tiers: consumables, charges, counters, intelligent artifacts, curses, spatial storage risk |
| C132–C133 | authoring | SPE-151 | Facility keying + encounter-table authoring standards |
| C134 | fold_in | SPE-1610, SPE-788 | Hazard bypass field |
| C135 | fold_in | SPE-788, SPE-1610 | Faction trap/ward maintenance |
| C136 | authoring | SPE-151 | Procedural consequence pacing guide |
| C137 | fold_in | SPE-371, SPE-562 | Alert-state encounter modifier |
| C138 | fold_in | SPE-58, SPE-2106 | Multi-layer site map |
| C139 | fold_in | SPE-371, SPE-16 | Pursuit after retreat |
| C140 | authoring | SPE-151, SPE-854 | Evidence-first rewards |
| C141 | fold_in | SPE-854, SPE-58 | Detection provenance UI |
| C142 | fold_in | SPE-1107, SPE-529 | Condition-specific save categories |
| C143 | fold_in | SPE-158, SPE-1443 | Staff capability matrix |
| C144 | fold_in | SPE-1760, SPE-158 | Long-term support network |
| C145 | fold_in | SPE-788, SPE-35 | Specialist network obligations |
| C146 | fold_in | SPE-788, SPE-208 | Rank/challenge hierarchy |
| C147 | fold_in | SPE-1052, SPE-1760 | Stronghold / facility command progression |
| C148 | fold_in | SPE-88, SPE-529 | Artifact destruction conditions |
| C149 | fold_in | SPE-529, SPE-151 | Artifact side-effect package template |
| C150 | fold_in | SPE-16, SPE-1107 | Optional old-school harsh-mode toggle |

## Per-candidate outcomes (C151–C165 contradictions)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C151 | contradiction | SPE-1085, SPE-1610 | No arbitrary trap punishment |
| C152 | contradiction | SPE-1085, SPE-58 | No perfect map certainty |
| C153 | contradiction | SPE-1085, SPE-562 | Search must cost time/exposure |
| C154 | contradiction | SPE-1085, SPE-1610 | Morale/loyalty matter |
| C155 | contradiction | SPE-1085, SPE-158 | Contractors not disposable |
| C156 | contradiction | SPE-1085, SPE-2108 | Non-binary illusions |
| C157 | contradiction | SPE-1085, SPE-88 | Control effects not absolute |
| C158 | contradiction | SPE-1085, SPE-88 | Summons not free labor |
| C159 | contradiction | SPE-1085, SPE-529 | Wards not universal |
| C160 | contradiction | SPE-1085, SPE-529 | Artifacts not simple loot |
| C161 | contradiction | SPE-1085, SPE-529 | Curses alter outcomes |
| C162 | contradiction | SPE-1085, SPE-1610 | Entities need behavior beyond combat |
| C163 | contradiction | SPE-1085, SPE-529 | Gear/evidence/rooms vulnerable |
| C164 | contradiction | SPE-1085, SPE-371 | Procedural content zone-keyed |
| C165 | contradiction | SPE-1085, SPE-151 | No fantasy/OSRIC IP import |

## Map pivot

Fallible **operational site map**: door states, keyed rooms, hidden access, search costs, light/visibility, trap purpose + bypass, patrol clocks, wandering threats, contractor morale, gear/evidence fragility — confidence layers for seen vs sensor vs believed vs actual anomaly behavior (`mapMetadata` hazard glyphs extend here).
