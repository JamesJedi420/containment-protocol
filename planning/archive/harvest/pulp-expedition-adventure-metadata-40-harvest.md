# Harvest — `pulp-expedition-adventure-metadata-40`

**Source:** Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.

**Dedup:** Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occult-supplement-metadata-51` (museum opener, cross-era), `facility-crisis-triage-metadata-55` (port sites), `covert-trust-intrigue-metadata-80` (networks).

**Repo at triage:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.

## Adjudication summary

**Candidates:** 40 (28 + 4 + 8 = 40).

| Verdict | Count |
| ------- | ----: |
| fold-in | 28 |
| no-op | 4 |
| contradiction check | 8 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake (partial_index) |
| SPE-1085, SPE-151 | C31–C40; C3, C29–C30 authoring |
| SPE-1025, SPE-16 | C1, C9, C17, C28 |
| SPE-788 | C2 |
| SPE-854 | C3–C4, C16, C24–C25 |
| SPE-160 | C5, C10, C29 |
| SPE-58, SPE-371, SPE-1429 | C6, C12, C20–C23 |
| SPE-98, SPE-529 | C7–C8 |
| SPE-562 | C10, C26 |
| SPE-901, SPE-854 | C11, C32 |
| SPE-793 | C27 |
| SPE-158, SPE-1101, SPE-1443 | C18–C19, C35–C37 |
| SPE-1760 | C15 |
| SPE-2095 | C12, C24 |
| SPE-677 | C13, C33 |
| SPE-704 | C26 supplement |
| SPE-626 | C3, C21 |

## Per-candidate outcomes

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | fold_in | SPE-1025, SPE-16 | Expedition-cell team assembly / role coverage |
| C2 | fold_in | SPE-788 | Global field-office / contact chapter network |
| C3 | fold_in | SPE-854, SPE-626, SPE-151 | Diegetic classified-hook notices |
| C4 | fold_in | SPE-854, SPE-16 | Museum/archive incident opener |
| C5 | fold_in | SPE-160, SPE-151 | Three-act pacing profile (not truth map) |
| C6 | fold_in | SPE-58, SPE-371 | Port/dock/warehouse site package |
| C7 | fold_in | SPE-98, SPE-1429 | Transport-specialist access gate |
| C8 | fold_in | SPE-98, SPE-529 | Prototype/unstable field equipment workflow |
| C9 | fold_in | SPE-1025, SPE-42 | Teamwork bold-action resolver |
| C10 | fold_in | SPE-160, SPE-562 | Cliffhanger phase-end escalation |
| C11 | fold_in | SPE-901, SPE-854 | Artifact custody/ownership/jurisdiction chain |
| C12 | fold_in | SPE-2095, SPE-58 | Remote expedition-region dossier |
| C13 | fold_in | SPE-677, SPE-562 | Rival expedition race + contested objective |
| C14 | fold_in | SPE-16, SPE-151 | Era/jurisdiction incident overlay |
| C15 | fold_in | SPE-1760, SPE-854 | Cross-era anomaly provenance chain |
| C16 | fold_in | SPE-160, SPE-854 | Action-investigation pacing profile |
| C17 | fold_in | SPE-16, SPE-1443 | Quick field-cell template for one-shots |
| C18 | fold_in | SPE-158, SPE-1101 | Staff advantage/liability trait pairs |
| C19 | fold_in | SPE-1443, SPE-158 | Career-tag capability and access |
| C20 | fold_in | SPE-58, SPE-1429 | Submerged-site hazard framework |
| C21 | fold_in | SPE-16, SPE-626 | Expedition launch board UI |
| C22 | fold_in | SPE-58, SPE-371 | Global port-of-call map layer |
| C23 | fold_in | SPE-1429, SPE-371 | Travel-leg complication table |
| C24 | fold_in | SPE-854, SPE-2095 | Artifact case intake schema |
| C25 | fold_in | SPE-854, SPE-793 | Clue-triggered chase/escalation |
| C26 | fold_in | SPE-562, SPE-677 | Rival progress clock with confidence limits |
| C27 | fold_in | SPE-793, SPE-614 | Daring-action cost model |
| C28 | fold_in | SPE-1025, SPE-16 | Multi-role teamwork challenge |
| C29 | fold_in | SPE-16, SPE-160, SPE-151 | Act-based action case packet schema |
| C30 | fold_in | SPE-151, SPE-854 | Classified-ad hook generator (authoring) |
| C31 | contradiction_check | SPE-1085, SPE-854 | Pulp pace ≠ skip evidence/containment |
| C32 | contradiction_check | SPE-1085, SPE-901 | Artifacts ≠ loot rewards |
| C33 | contradiction_check | SPE-1085, SPE-677 | Rivals use permits, records, bribery — not combat only |
| C34 | contradiction_check | SPE-1085, SPE-58 | Remote region affects logistics/authority — not scenery |
| C35 | contradiction_check | SPE-1085, SPE-1443 | Careers change access/failure — not flavor |
| C36 | contradiction_check | SPE-1085, SPE-158 | Advantages need constraints/context |
| C37 | contradiction_check | SPE-1085, SPE-158 | Liabilities trigger real operational risk |
| C38 | contradiction_check | SPE-1085, SPE-58 | Era overlay + fallible map — not fixed truth |
| C39 | contradiction_check | SPE-1085, SPE-151 | No imported RPG/adventure prose |
| C40 | contradiction_check | SPE-1085, SPE-2110 | Partial index — re-extract on full PDF |

## No-op notes (4)

| ID | Reason |
| -- | ------ |
| C1 (partial) | `teamComposition` / `TEAM_COVERAGE_ROLES` substrate |
| C9 (partial) | Team weakest-link / cohesion in field-staff + mission-hub harvests |
| C19 (partial) | `SPE-1443` staff role packages |
| C11 (partial) | Custody chain patterns in stealth leave-behind + investigation harvests |

## Map pivot

**Fallible expedition map:** ports of call, uncertain routes, rival movement (confidence-limited), artifact custody, museum evidence, transport availability, regional rumors, submerged hazards — layers for classified ads, expedition reports, local testimony, rival claims, and verified containment fact.
