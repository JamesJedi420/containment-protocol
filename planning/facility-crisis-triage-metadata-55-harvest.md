# Harvest — `facility-crisis-triage-metadata-55`

**Source:** Readable turn-based facility-crisis survival manual PDF (17 pp; phase loop, event backlog, module repair, stamina/food, stress side projects, hazards, emergency research). Pattern-only — no imported game title, Mars framing, crew names, module labels as canon, dice UI, or taboo-action prose.

**Dedup:** Supplements `home-bases-transcript-metadata-48` (facility modules), `sealed-facility-manual-metadata-95` (staged consequences), `field-staff-operations-handbook-metadata-105` (fatigue/stress), `horror-tension-questionnaire-metadata-50` (desperate survival ethics), `tabletop-mechanics-transcript-metadata-87` (clocks/thresholds). **SPE-1107** responder energy budget covers stamina accounting; **SPE-130** multi-axis fatigue/stress — not a single tiredness bar.

**Repo at triage:** `advanceWeek.ts` phase spine; `responderDutyEvaluation.ts` readiness; `responderEnergyBudget.ts`; `mapMetadata.ts`; `architecture/fatigue-stress-exhaustion-multi-axis.md`; `docs/cross-scale-integration.md`.

## Adjudication summary

**Candidates:** 55 (40 + 5 + 10 = 55).

| Verdict | Count |
| ------- | ----: |
| fold-in | 40 |
| no-op | 5 |
| contradiction check | 10 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-1085, SPE-151 | C46–C55; authoring C31, C38, C40–C42, C44 |
| SPE-16, SPE-626, SPE-160 | C1, C26, C35–C36, C39 |
| SPE-562, SPE-704 | C2–C3, C34 |
| SPE-58, SPE-371 | C4–C5, C51 |
| SPE-1052, SPE-1562 | C7–C9, C40 |
| SPE-1107, SPE-130, SPE-1653 | C10–C11, C33, C48 |
| SPE-98, SPE-1074 | C11, C34 |
| SPE-1101, SPE-158 | C14–C18, C43 |
| SPE-35, SPE-1160, SPE-681 | C12–C13, C49 |
| SPE-793, SPE-614 | C19–C23, C50 |
| SPE-1485, SPE-16 | C24–C25, C29 |
| SPE-1734, SPE-562 | C26–C28, C53 |
| SPE-1443, SPE-1059 | C30, C37 |
| SPE-854 | C41 |
| SPE-1760 | C29 |
| SPE-612 | C8 supplement |

## Per-candidate outcomes

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | fold_in | SPE-16, SPE-160 | Turn-phase crisis loop (event → deploy → damage → side work → distribute) |
| C2 | fold_in | SPE-562, SPE-704 | Active event backlog + end-of-turn damage |
| C3 | fold_in | SPE-562, SPE-58 | Impending/predicted unresolved-event damage indicator |
| C4 | fold_in | SPE-58, SPE-371 | Route-based movement hazard (unsafe path vs safe destination) |
| C5 | fold_in | SPE-58 | Color-coded movement-risk map overlay |
| C6 | fold_in | SPE-562, SPE-130 | Typed event consequence taxonomy |
| C7 | fold_in | SPE-1052, SPE-1562 | Module lockout from unresolved event |
| C8 | fold_in | SPE-1052, SPE-1562 | Facility module function schema |
| C9 | fold_in | SPE-1052, SPE-1562 | Module activation rule variants |
| C10 | fold_in | SPE-1107, SPE-130 | Staff stamina/readiness pool per turn |
| C11 | fold_in | SPE-1107, SPE-98 | Supply distribution restores readiness |
| C12 | fold_in | SPE-35, SPE-1160 | Desperate survival action + ethical consequence |
| C13 | contradiction_check | SPE-1085, SPE-35 | Staff sacrifice for resources — rare, gated, guardrailed |
| C14 | fold_in | SPE-1101, SPE-158 | Stress shapes side-project proposals |
| C15 | fold_in | SPE-1101, SPE-158 | Unchosen plan backlash |
| C16 | fold_in | SPE-1101, SPE-16 | Side-project tradeoff choices |
| C17 | fold_in | SPE-158, SPE-1024 | Hidden teamwork / pairing cohesion |
| C18 | fold_in | SPE-158, SPE-1101 | Max-stress isolation / cooperation lockout |
| C19 | fold_in | SPE-793, SPE-98 | Assist/support buffer blocks one hazard |
| C20 | fold_in | SPE-793, SPE-614 | Repair hazard taxonomy + mitigation |
| C21 | fold_in | SPE-793 | Stasis / locked-effort hazard |
| C22 | fold_in | SPE-793, SPE-130 | Injury hazard + compound risk |
| C23 | fold_in | SPE-793 | Void / lost-work hazard |
| C24 | fold_in | SPE-1485, SPE-16 | Multi-staff shared event repair |
| C25 | fold_in | SPE-16, SPE-562 | Event work-threshold until resolved |
| C26 | fold_in | SPE-1734, SPE-16 | Rotating emergency research project market |
| C27 | fold_in | SPE-1734 | Research option shuffle opportunity cost |
| C28 | fold_in | SPE-1734 | Project effect scope taxonomy |
| C29 | fold_in | SPE-1760, SPE-1485 | Committed deployment after irreversible action |
| C30 | fold_in | SPE-1443, SPE-158 | Staff class ability framework |
| C31 | fold_in | SPE-151, SPE-562 | Root-cause vs mitigation strategic warning |
| C32 | fold_in | SPE-793, SPE-1107 | Deployment risk-order advisor |
| C33 | fold_in | SPE-130, SPE-1107 | Repeated-work fatigue / rotation |
| C34 | fold_in | SPE-98, SPE-1107 | Resource overfill inefficiency warning |
| C35 | fold_in | SPE-16, SPE-626 | Final-phase readiness checklist |
| C36 | fold_in | SPE-16, SPE-1052 | Final objective positioning requirement |
| C37 | fold_in | SPE-1443, SPE-1059 | Unlockable staff archetype roster |
| C38 | fold_in | SPE-16, SPE-151 | Weighted randomized crisis setup |
| C39 | fold_in | SPE-16, SPE-562 | Random active-event pool with pacing constraints |
| C40 | fold_in | SPE-151, SPE-1052 | Module UI information contract |
| C41 | fold_in | SPE-854, SPE-151 | Event card UI schema |
| C42 | fold_in | SPE-151, SPE-1085 | Taboo emergency resource translation rule |
| C43 | fold_in | SPE-1101, SPE-158 | Stress-to-proposal-quality curve |
| C44 | fold_in | SPE-151, SPE-1107 | Redundant recovery/mitigation pathways |
| C45 | fold_in | SPE-158, SPE-1052 | Room-local staff ability timing |
| C46 | contradiction_check | SPE-1085, SPE-562 | Bandage repair ≠ fixing active events |
| C47 | contradiction_check | SPE-1085, SPE-1101 | Stress alters plans, not cosmetic |
| C48 | contradiction_check | SPE-1085, SPE-1107 | Readiness supplies ≠ generic loot |
| C49 | contradiction_check | SPE-1085, SPE-35 | Taboo survival never clean optimization |
| C50 | contradiction_check | SPE-1085, SPE-793 | Hazards ≠ single damage number |
| C51 | contradiction_check | SPE-1085, SPE-58 | Facility map is fallible crisis state |
| C52 | contradiction_check | SPE-1085, SPE-1443 | Roles change deployment dynamics |
| C53 | contradiction_check | SPE-1085, SPE-1734 | Emergency research ≠ passive tech tree |
| C54 | contradiction_check | SPE-1085, SPE-1101 | Side projects carry cost/politics |
| C55 | contradiction_check | SPE-1085, SPE-151 | No imported manual/scenario prose |

## No-op notes (5)

| ID | Reason |
| -- | ------ |
| C8 (partial) | Facility module substrate in `home-bases-transcript-metadata-48` |
| C10–C11 (partial) | `responderEnergyBudget` (SPE-1107) + SPE-130 fatigue channels |
| C25 (partial) | Progress-clock / threshold patterns in tabletop + mission substrates |
| C40 (partial) | Module presentation overlap home-bases harvest |
| C5 (partial) | `mapMetadata.ts` fallible map layers exist |

## Map pivot

**Fallible crisis map:** active events, predicted damage, unsafe routes, disabled modules, staff readiness, stress risk, support-buffer coverage, research options, side-project fallout, final-objective access — confidence layers for known damage, predicted damage, staff proposals, hidden teamwork, and verified facility state.
