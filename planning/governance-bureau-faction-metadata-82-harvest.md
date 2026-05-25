# Harvest — `governance-bureau-faction-metadata-82`

**Source:** Readable wiki faction-hub pass (law-and-order administrative bureau with branches, ethics committee, field sections, security contractor). Pattern-only — no imported setting names, character roster, proprietary classification acronyms, level IDs, or hub prose.

**Dedup:** Supplements `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `phenomena-hub-verified-metadata-58`, `street-contact-dossier-metadata-51`, `field-staff-operations-handbook-metadata-105`, `alpha-centauri-manual-metadata-88`.

**Repo at triage:** `systems/factions-legitimacy.md`; `src/domain/civilization.ts` (taboos, doctrine); `authorityGraph` confidence/provenance; `architecture/anomaly-compendium-governed-taxonomy.md`; `architecture/background-packages-inherited-start-state.md`; `teamComposition` / recruitment substrates.

## Adjudication summary

**Candidates:** 82 (58 + 12 + 12 = 82).

| Verdict | Count |
| ------- | ----: |
| fold-in | 58 |
| no-op | 12 |
| contradiction check | 12 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-1085, SPE-151 | C71–C82 |
| SPE-788, SPE-373, SPE-598 | C1–C4, C8–C9, C22–C24, C39–C40, C46–C47, C60–C61, C70 |
| SPE-35, SPE-208 | C2–C3, C26–C28, C66, C72–C74 |
| SPE-854, SPE-88, SPE-2105 | C4–C7, C10–C11, C43, C50, C58–C59, C67–C68 |
| SPE-1052, SPE-58, SPE-164 | C12–C17, C19, C51–C53, C65, C68, C78 |
| SPE-815, SPE-58 | C18 |
| SPE-1334, SPE-1104 | C20–C21, C54, C77 |
| SPE-158, SPE-1443, SPE-1025 | C29–C31, C36–C38, C44–C45, C55–C57, C62–C63, C79 |
| SPE-16, SPE-626 | C34, C41, C61 |
| SPE-562 | C36–C37, C57 |
| SPE-42 | C65 |
| SPE-529 | C5 restricted objects (partial) |
| SPE-1496 | C15 partial |

## Per-candidate outcomes (C1–C45)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | fold_in | SPE-788, SPE-373 | Governance/administrative faction archetype |
| C2 | fold_in | SPE-788, SPE-208 | Law-and-order ideology → behavior modifiers |
| C3 | fold_in | SPE-788, SPE-35 | Moral-absolutist policy pressure |
| C4 | fold_in | SPE-788, SPE-854 | Policy adoption states (proposed→enforced/backfire) |
| C5 | fold_in | SPE-854, SPE-529 | Restricted-object policy |
| C6 | fold_in | SPE-88, SPE-2105 | Faction-specific classification taxonomy |
| C7 | fold_in | SPE-854, SPE-88 | Cross-faction classification reconciliation |
| C8 | fold_in | SPE-788, SPE-373 | Faction budget-priority model |
| C9 | fold_in | SPE-788, SPE-854 | Resource estimate with confidence tiers |
| C10 | fold_in | SPE-854, SPE-58 | Supply-chain inference clues |
| C11 | fold_in | SPE-854, SPE-1334 | Unexplained equipment source investigation |
| C12 | fold_in | SPE-1052, SPE-58 | Public/restricted facility access model |
| C13 | fold_in | SPE-1052, SPE-164 | Converted-building prior-use inheritance |
| C14 | fold_in | SPE-788, SPE-208 | Public announcement / propaganda venue |
| C15 | fold_in | SPE-1052, SPE-58 | Facility visual identity / public symbol |
| C16 | fold_in | SPE-1052, SPE-58 | Public HQ vs secluded research facility |
| C17 | fold_in | SPE-1052, SPE-58 | Communications blockade component |
| C18 | fold_in | SPE-58, SPE-815 | Exterior/interior mismatch / underground suspicion |
| C19 | fold_in | SPE-854, SPE-1334 | Facility traffic-pattern surveillance clue |
| C20 | fold_in | SPE-1334, SPE-1104 | Rival surveillance around facility |
| C21 | fold_in | SPE-1334, SPE-598 | Counter-surveillance ambiguity |
| C22 | fold_in | SPE-788, SPE-158 | Faction leader competence modifiers |
| C23 | fold_in | SPE-788, SPE-854 | Leader public image vs confirmed record |
| C24 | fold_in | SPE-788, SPE-373 | Faction branch/sub-branch schema |
| C25 | fold_in | SPE-788, SPE-158 | Non-field administrative staff functions |
| C26 | fold_in | SPE-35, SPE-788 | Internal ethics/review committee |
| C27 | fold_in | SPE-158, SPE-1443 | Career track into oversight/admin |
| C28 | fold_in | SPE-158, SPE-208 | Contextual personality modes (public vs hearing) |
| C29 | fold_in | SPE-158, SPE-1025 | Field team specialization types |
| C30 | fold_in | SPE-158, SPE-1443 | Field section ID and roster |
| C31 | fold_in | SPE-1025, SPE-158 | Team-size-by-role configuration |
| C32 | fold_in | SPE-854, SPE-88 | Discovery-to-research handoff |
| C33 | fold_in | SPE-58, SPE-371 | Exploration/survey report generation |
| C34 | fold_in | SPE-1334, SPE-16 | Covert faction investigation contracts |
| C35 | fold_in | SPE-16, SPE-1025 | Operations commander planning modifier |
| C36 | fold_in | SPE-562, SPE-788 | Elite team independence + audit risk |
| C37 | fold_in | SPE-158, SPE-1025 | Field team cohesion modifier |
| C38 | fold_in | SPE-788, SPE-208 | Team fame/reputation effects |
| C39 | fold_in | SPE-788, SPE-16 | Service-for-resources branch |
| C40 | fold_in | SPE-788, SPE-35 | Security branch role split |
| C41 | fold_in | SPE-16, SPE-626 | Contract reward scaling |
| C42 | fold_in | SPE-1025, SPE-158 | Branch training/readiness loop |
| C43 | fold_in | SPE-854, SPE-1334 | Leak/rumor investigation leads |
| C44 | fold_in | SPE-158, SPE-2095 | Named specialist reputation profile |
| C45 | fold_in | SPE-158, SPE-1496 | Social style vs competence split |

## Per-candidate outcomes (C46–C82)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C46 | fold_in | SPE-788, SPE-854 | Faction dossier template |
| C47 | fold_in | SPE-788, SPE-373 | Branch dossier template |
| C48 | fold_in | SPE-35, SPE-788 | Committee approve/delay/punish model |
| C49 | fold_in | SPE-788, SPE-854 | Law registry with enforcement status |
| C50 | fold_in | SPE-88, SPE-854 | Faction classification prefix alias registry |
| C51 | fold_in | SPE-1052, SPE-58 | Public vs secret facility fields |
| C52 | fold_in | SPE-58, SPE-1052 | Communications-denial map modifier |
| C53 | fold_in | SPE-854, SPE-58 | Facility rumor ecology |
| C54 | fold_in | SPE-1334, SPE-1104 | Rival spy layer on locations |
| C55 | fold_in | SPE-788, SPE-158 | Administrative staff as playable capacity |
| C56 | fold_in | SPE-158, SPE-1443 | Field section lifecycle |
| C57 | fold_in | SPE-562, SPE-788 | Elite-team suspicion/audit clock |
| C58 | fold_in | SPE-854, SPE-88 | Discovery registration workflow |
| C59 | fold_in | SPE-854, SPE-35 | Public release vs restricted annex |
| C60 | fold_in | SPE-788, SPE-16 | Resource-crisis branch creation |
| C61 | fold_in | SPE-16, SPE-35 | Contracting morally ambiguous security branch |
| C62 | fold_in | SPE-788, SPE-158 | Leader archetypes by branch |
| C63 | fold_in | SPE-158, SPE-1443 | Prior-world profession → capability |
| C64 | fold_in | SPE-788, SPE-208 | Internal morale vs external credibility |
| C65 | fold_in | SPE-58, SPE-42 | Visitor access infiltration/diplomacy routes |
| C66 | fold_in | SPE-788, SPE-35 | Bureaucratic overreach events |
| C67 | fold_in | SPE-854, SPE-529 | Weaponized-object ban policy |
| C68 | fold_in | SPE-1052, SPE-1334 | Secret research suspicion chain |
| C69 | fold_in | SPE-788, SPE-208 | Public speech as faction action |
| C70 | fold_in | SPE-788, SPE-373 | Internal branch conflict |
| C71 | contradiction_check | SPE-1085, SPE-151 | Setting taxonomy conversion |
| C72 | contradiction_check | SPE-1085, SPE-35 | Civil-liberties / legitimacy framing |
| C73 | contradiction_check | SPE-1085, SPE-788 | Moral absolutism not neutral CP voice |
| C74 | contradiction_check | SPE-1085, SPE-35 | Ethics committee due process |
| C75 | contradiction_check | SPE-1085, SPE-35 | PMC/security abstraction |
| C76 | contradiction_check | SPE-1085, SPE-854 | Military-tech rumor non-instructional |
| C77 | contradiction_check | SPE-1085, SPE-1334 | Surveillance legal/ethical framing |
| C78 | contradiction_check | SPE-1085, SPE-58 | Signal blockade fictional effect only |
| C79 | contradiction_check | SPE-1085, SPE-158 | Staff agency under hierarchy |
| C80 | contradiction_check | SPE-1085, SPE-788 | Avoid bureaucrat caricature |
| C81 | contradiction_check | SPE-1085, SPE-151 | Source-expression / license caution |
| C82 | contradiction_check | SPE-1085, SPE-151 | No universal imported canon status |

## No-op notes (12)

| ID | Reason |
| -- | ------ |
| C6 (partial) | Governed taxonomy in `anomaly-compendium-governed-taxonomy.md` / phenomena-hub |
| C7 (partial) | Classification reconciliation in authority graph harvests |
| C15 (partial) | Facility identity overlaps home-bases / sealed-facility |
| C30 (partial) | Team IDs in `teamComposition` / staff-role packages |
| C32 (partial) | Discovery handoff in investigation-debrief harvest |
| C33 (partial) | Survey layers in `mapMetadata` / field-staff |
| C41 (partial) | Contract scaling in mission-hub / tabletop harvests |
| C43 (partial) | Rumor/leak confidence in authority graph + recruitment |
| C44 (partial) | Specialist profiles in street-contact-dossier |
| C46 (partial) | Faction dossier in covert-organization-field-catalog |
| C58 (partial) | Registration workflow in phenomena-hub |
| C63 (partial) | Background packages architecture doc |

## Map pivot

**Fallible institutional map:** public HQ vs secret institute, traffic patterns, signal denial zones, spy layers, supply clues, facility rumors, branch deployments, and classification alias conflicts — confidence layers for member testimony, field surveillance, leaked claims, theory, and verified agency records (not omniscient bureau truth).
