# Harvest — `mc-toolkit-contract-authoring-metadata-132`

**Source:** Readable 247-page MC toolkit PDF (case authoring, dangers/spectrums, session flow, series/arc tools, district/macro-threat guidance, sample case). Pattern-only — no setting names, Rifts/Mythos/Avatar labels, sample-case prose, map art, or exact move wording.

**Dedup:** Supplements `urban-concealment-investigation-metadata-100` (concealment, awareness, districts, clue economy, danger baselines) and `layered-case-concept-generator-metadata-70` (harm taxonomy, format tables). **Adds** contract-authoring schemas, red-herring rules, collectives, session/cutscene flow, campaign series sheets, legal/media threat profiles, and extended sensitivity guardrails.

**Repo at triage:** `contracts.ts` / `caseTemplates.*`; `caseGeneration.ts`; `missionIntakeRouting.ts`; `campaignLedger.ts`; `progressClocks.ts`; `branchContinuity.ts`; `downtimeSideWork.ts`; `advanceWeek.ts`; `mapMetadata.ts`.

## Adjudication summary

**Candidates:** 132 (70 + 40 + 22 = 132).

| Verdict | Count |
| ------- | ----: |
| fold-in | 70 |
| no-op / delta (urban-100 or layered-70) | 40 |
| contradiction check | 22 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-16, SPE-626 | C1–C6, C37–C43, C48–C51, C63–C66, C79–C80, C109 |
| SPE-854, SPE-1496 | C2–C13, C37–C44, C63–C65, C78–C80, C83–C84, C109 |
| SPE-1610, SPE-130, SPE-562 | C14–C35, C67–C71, C74–C76 |
| SPE-158, SPE-2095, SPE-1443 | C8, C58–C59, C81–C82, C91–C92 |
| SPE-1025, missionIntake | C6 |
| SPE-1760, SPE-1811 | C45–C50, C84 |
| SPE-788, SPE-208 | C45–C47, C52, C61, C85–C88, C95–C102 |
| SPE-58, SPE-164 | C7–C8, C54–C57, C62, C93–C94, C110 |
| SPE-109, SPE-2106 | C53, C90–C91, C107 |
| SPE-42 | C43 |
| SPE-88, SPE-2105, SPE-529 | C58–C60, C105–C108 |
| SPE-35, SPE-208 | C96, C100, C102 |
| SPE-1052, SPE-901 | C97–C98 |
| SPE-371 | C34 |
| SPE-2108 | C59 supplement |
| SPE-1085, SPE-151 | C111–C132 |

## No-op / dedup (selected)

| IDs | Parent |
| --- | ------ |
| C1 | layered-70 C9–C11 + urban harm intake |
| C2–C4, C55–C56 | urban-100 C56–C58 iceberg/backstory |
| C5 | urban-100 C43 intake taxonomy |
| C14–C21, C24, C46 | urban-100 C47–C54 dangers |
| C28–C30 | urban status/spectrum baselines |
| C36 | urban-100 C50 non-hostile danger |
| C44 | urban-100 C64 case-end reflection |
| C54–C56, C57 | urban-100 C26–C27 map |
| C58–C60 | urban-100 C8–C13, C79 macro fronts |
| C68 | urban-100 C48 countdowns |
| C89 | urban institution dual function |

## Per-candidate outcomes (C1–C62)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | no_op | SPE-16, SPE-854 | Harm category in layered-70 |
| C2 | no_op | SPE-854 | Backstory-first = urban C58 |
| C3 | no_op | SPE-854 | Visible vs hidden = urban iceberg |
| C4 | no_op | SPE-854 | Clue-depth graph = urban C56 |
| C5 | no_op | SPE-16, SPE-854 | Multi-hook = urban C43 |
| C6 | fold_in | SPE-16, SPE-1025 | Organization-type hook routing (`missionIntakeRouting`) |
| C7 | fold_in | SPE-854 | Breadcrumb location/person graph |
| C8 | fold_in | SPE-854, SPE-58 | Contract location schema fields |
| C9 | fold_in | SPE-854 | Clue type taxonomy |
| C10 | fold_in | SPE-854 | Multi-clue fact assembly |
| C11 | fold_in | SPE-854 | Exclusionary / ruled-out hypothesis clues |
| C12 | fold_in | SPE-854, SPE-151 | Productive red-herring model |
| C13 | fold_in | SPE-854, SPE-151 | Dead-end fail-fast guardrail |
| C14 | no_op | SPE-1610 | Danger entity breadth = urban C47–C50 |
| C15 | no_op | SPE-1610 | Generalized threat profiles |
| C16 | no_op | SPE-1610 | Resolution spectrums |
| C17 | no_op | SPE-562 | Countdown spectrums |
| C18 | no_op | SPE-1610 | Immunity / invalid approaches |
| C19 | no_op | SPE-1610 | Temporary condition overlays |
| C20 | no_op | SPE-1610 | Soft warning moves |
| C21 | no_op | SPE-1610 | Hard consequence moves |
| C22 | fold_in | SPE-1610, SPE-151 | Fair-warning escalation policy |
| C23 | no_op | SPE-854 | Objective denial |
| C24 | no_op | SPE-793 | Forced-choice events |
| C25 | fold_in | SPE-529, SPE-901 | Capability/tag burn system |
| C26 | fold_in | SPE-1610, SPE-88 | Custom conditional move framework |
| C27 | fold_in | SPE-1610, SPE-208 | Active shield defenses |
| C28 | no_op | SPE-1610 | Starting threat/location tags |
| C29 | no_op | SPE-1610 | Status filter resistance |
| C30 | fold_in | SPE-1610, SPE-130 | Status side-effect payloads |
| C31 | fold_in | SPE-1610, SPE-42 | Collective actor model |
| C32 | fold_in | SPE-1610 | Collective size scaling |
| C33 | fold_in | SPE-1610 | Collective split/merge |
| C34 | fold_in | SPE-371, SPE-1610 | Improvised threat generator |
| C35 | fold_in | SPE-1610, SPE-854 | Dynamic resolution-track addition |
| C36 | no_op | SPE-1610 | Protectable innocent danger |
| C37 | fold_in | SPE-16, SPE-1496 | Contract session flow (briefing/scenes/downtime/wrap) |
| C38 | fold_in | SPE-854, SPE-16 | Cold-open contract intro |
| C39 | fold_in | SPE-16, SPE-151 | Designer foreshadow cutscene layer |
| C40 | no_op | SPE-854 | Scene opening-shot = urban C60 |
| C41 | fold_in | SPE-16, SPE-1496 | Scene spotlight/action loop |
| C42 | fold_in | SPE-1496, SPE-151 | Cut/fade pacing transitions |
| C43 | fold_in | SPE-42, SPE-16 | Parallel split-team scene manager |
| C44 | no_op | SPE-1496 | Aftermath = urban C64 |
| C45 | fold_in | SPE-1760, SPE-854 | Campaign resource registry (`campaignLedger`) |
| C46 | no_op | SPE-793 | Value-conflict dilemmas |
| C47 | fold_in | SPE-788, SPE-158 | Recurring actor intrusion into contracts |
| C48 | fold_in | SPE-1760, SPE-854 | Linked contract arc chains |
| C49 | no_op | SPE-788, SPE-88 | Operation graph = urban C79 |
| C50 | fold_in | SPE-1760, SPE-16 | Mutable campaign arc graph |
| C51 | fold_in | SPE-16, SPE-109 | Between-contract regional evolution |
| C52 | fold_in | SPE-854, SPE-208 | News/digest hook + clock surface |
| C53 | fold_in | SPE-109, SPE-16 | Urban systems domain taxonomy |
| C54 | no_op | SPE-58 | District map = urban C26 |
| C55 | no_op | SPE-58, SPE-854 | Map confidence = urban pivot |
| C56 | no_op | SPE-58, SPE-2106 | Thin places = urban C23 |
| C57 | fold_in | SPE-58, SPE-854 | Bounded out-of-region haze |
| C58 | no_op | SPE-158, SPE-88 | Mundane + anomaly overlay |
| C59 | fold_in | SPE-2108, SPE-158 | Awareness stage ladder (extends urban tiers) |
| C60 | no_op | SPE-788, SPE-88 | Macro fronts = urban C79 |
| C61 | fold_in | SPE-788, SPE-208 | Status-quo preservation faction |
| C62 | fold_in | SPE-58, SPE-854 | Floating/adaptive location placement |

## Per-candidate outcomes (C63–C132)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C63 | fold_in | SPE-16, SPE-854 | Contract object model (full schema) |
| C64 | fold_in | SPE-16, SPE-1025 | Hook object model |
| C65 | fold_in | SPE-854 | Clue object model |
| C66 | fold_in | SPE-854, SPE-58 | Location graph node model |
| C67 | fold_in | SPE-1610 | Threat profile model |
| C68 | no_op | SPE-1610 | Spectrum progress tracks |
| C69 | fold_in | SPE-562, SPE-1610 | Countdown terminal outcome table |
| C70 | no_op | SPE-1610 | Soft move library |
| C71 | no_op | SPE-1610 | Hard move library |
| C72 | fold_in | SPE-1610 | Custom move template |
| C73 | fold_in | SPE-1610, SPE-2108 | Custom move visibility / dossier confidence |
| C74 | fold_in | SPE-1610 | Challenge tuning controls |
| C75 | fold_in | SPE-854, SPE-58 | Scene tag system |
| C76 | fold_in | SPE-1610, SPE-130 | Status scope/duration |
| C77 | fold_in | SPE-16, SPE-854 | Player intent → procedure mapping |
| C78 | fold_in | SPE-1496, SPE-854 | Clarifying questions before resolve |
| C79 | fold_in | SPE-854, SPE-16 | Improvisation from backstory |
| C80 | fold_in | SPE-854 | Clue resolve: authored → truth → generated |
| C81 | fold_in | SPE-158, SPE-1760 | Series staff tracking sheet |
| C82 | fold_in | SPE-1760, SPE-854 | Series resources sheet |
| C83 | fold_in | SPE-854, SPE-58 | Evidence board / iceberg UI |
| C84 | fold_in | SPE-1760, SPE-854 | Arc branch convergence UI |
| C85 | no_op | SPE-788 | Macro branch taxonomy |
| C86 | no_op | SPE-788 | Agenda/method/endgame |
| C87 | fold_in | SPE-788, SPE-88 | Macro-threat vulnerable remainder |
| C88 | no_op | SPE-16, SPE-854 | Street symptoms of macro ops |
| C89 | no_op | SPE-2106 | Public vs hidden site function |
| C90 | fold_in | SPE-109, SPE-854 | District template packet |
| C91 | fold_in | SPE-2106, SPE-854 | Place-of-interest template |
| C92 | fold_in | SPE-158, SPE-854 | Local contact template |
| C93 | fold_in | SPE-2106, SPE-164 | Thin-place transition links |
| C94 | fold_in | SPE-58, SPE-109 | Edge-of-region contract pacing |
| C95 | fold_in | SPE-2108, SPE-1610 | Public anonymity defense |
| C96 | fold_in | SPE-35, SPE-208 | Institutional cover defense |
| C97 | fold_in | SPE-1052, SPE-901 | Evidence-storage dangerous sites |
| C98 | fold_in | SPE-1052, SPE-1610 | Security system as actor |
| C99 | fold_in | SPE-1610, SPE-42 | Vehicle danger profile |
| C100 | fold_in | SPE-35, SPE-208 | Legal danger profile |
| C101 | fold_in | SPE-208, SPE-854 | Reporter/media danger profile |
| C102 | fold_in | SPE-208, SPE-35 | Corrupt official danger profile |
| C103 | fold_in | SPE-158, SPE-1610 | Helpless civilian danger profile |
| C104 | fold_in | SPE-1052, SPE-1610 | Location hazard profile templates |
| C105 | fold_in | SPE-88, SPE-2105 | Anomaly trait packs (pattern-only) |
| C106 | fold_in | SPE-529, SPE-901 | Relic as evidence + active actor |
| C107 | no_op | SPE-2106 | Enclave locations |
| C108 | fold_in | SPE-88, SPE-158 | Familiar/companion proxy actor |
| C109 | fold_in | SPE-854, SPE-16 | Sample-case validation fixture |
| C110 | fold_in | SPE-58, SPE-164 | Reusable scene map archetypes |
| C111 | contradiction | SPE-1085, SPE-151 | No IP import |
| C112 | contradiction | SPE-1085, SPE-151 | Copyrighted toolkit — structure only |
| C113 | contradiction | SPE-151, SPE-35 | Cultural reference caution |
| C114 | contradiction | SPE-151, SPE-35 | Sensitive harm filtering |
| C115 | contradiction | SPE-151, SPE-35 | Sex work / exploitation framing |
| C116 | contradiction | SPE-151, SPE-109 | Urban poverty stereotype guardrail |
| C117 | contradiction | SPE-151, SPE-208 | Police/legal accountability |
| C118 | contradiction | SPE-151, SPE-158 | Mental health language replacement |
| C119 | contradiction | SPE-151 | Drug/intoxication abstraction |
| C120 | contradiction | SPE-151, SPE-42 | Weapon/explosive abstraction |
| C121 | contradiction | SPE-151, SPE-88 | Religion/cult neutrality |
| C122 | contradiction | SPE-151, SPE-158 | Gender/identity care |
| C123 | contradiction | SPE-151, SPE-2108 | Memory/sealing ethics |
| C124 | contradiction | SPE-151, SPE-788 | Secret-government trope restraint |
| C125 | contradiction | SPE-854, SPE-1085 | Fair multi-path clues |
| C126 | contradiction | SPE-854, SPE-151 | Red-herring time respect |
| C127 | contradiction | SPE-1610, SPE-151 | Hard-move fairness |
| C128 | contradiction | SPE-1496, SPE-151 | Cinematic pacing preserves agency |
| C129 | contradiction | SPE-788, SPE-16 | Macro-threat preserves local agency |
| C130 | contradiction | SPE-88, SPE-158 | Mythic overlay preserves personhood |
| C131 | contradiction | SPE-151, SPE-1610 | Epidemic abstraction |
| C132 | contradiction | SPE-35, SPE-151 | Legal danger rights framing |

## Map pivot (unchanged + authoring)

Fallible operational map with **evidence-board depth**: contract iceberg, breadcrumb graph, clue provenance, vote/association optional layers from social-deduction batches, district confidence, floating nodes for adaptive play.
