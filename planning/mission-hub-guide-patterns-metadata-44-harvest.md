# Harvest — `mission-hub-guide-patterns-metadata-44`

**Source:** Readable GameFAQs walkthrough (PC guide pattern library). Pattern-only — no franchise names, mission titles, species, codex prose, coordinates, or walkthrough text in Linear/repo.

**Repo at triage:** `src/domain/teamComposition.ts` + `weakestLinkResolution.ts` (missing-coverage); `src/domain/missionIntakeRouting.ts`; `src/domain/beliefTracks.ts`; `src/domain/knowledge.ts` (tiers); `src/domain/progressClocks.ts`; `src/domain/investigationEconomy.ts`; `src/domain/siteGeneration/mapMetadata.ts` (fallible maps).

## Adjudication summary

| Verdict | Count |
| ------- | ----: |
| fold-in | 36 |
| no-op | 4 |
| contradiction check | 8 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-1085, SPE-151 | C37–C44 |
| SPE-158, SPE-2095 | C1, C28, C35 |
| SPE-35, SPE-1160 | C2–C3, C25, C38 |
| SPE-1034, SPE-793 | C2, C3 |
| SPE-1025, SPE-17 | C4, C9, C36, C41 |
| SPE-1042, SPE-912, SPE-164 | C5, C16–C18, C33 |
| SPE-16, SPE-626 | C6–C9, C15, C26–C27, C36 |
| SPE-854, SPE-588, SPE-529 | C10–C11, C31, C39 |
| SPE-49, SPE-58, SPE-371, SPE-1385 | C12–C14, C32–C33 |
| SPE-1052, SPE-1562 | C29 |
| SPE-98, SPE-253 | C30 |
| SPE-1059, SPE-196 | C22–C23, C34 |
| SPE-42, SPE-1024 | C6, C23, C35 |
| SPE-788, SPE-373 | C24 |
| SPE-1343, SPE-854 | C25 |
| SPE-371, SPE-605 | C19 |
| SPE-164, SPE-1285 | C20 |
| SPE-145 | C21 |
| SPE-1760, SPE-1811 | C26–C27, C44 |
| SPE-677 | C3 supplement |

## Per-candidate outcomes (abbrev.)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1 | fold_in | SPE-158 | Background unlocks personal threads |
| C2 | fold_in | SPE-35, SPE-1034 | Ethical posture gates dialogue authority |
| C3 | fold_in | SPE-35, SPE-1160, SPE-677 | Mission ethical consequence ledger |
| C4 | fold_in | SPE-1025, SPE-17 | Team capability coverage (substrate exists) |
| C5 | fold_in | SPE-912, SPE-164 | Technical access gates |
| C6 | fold_in | SPE-42, SPE-16 | Post-mission debrief loop |
| C7 | fold_in | SPE-16, SPE-854 | Side incident metadata schema |
| C8 | fold_in | SPE-16, SPE-98 | Optional readiness rewards |
| C9 | fold_in | SPE-16, SPE-1760 | Point-of-no-return warning |
| C10 | fold_in | SPE-854, SPE-588 | Earned operational encyclopedia |
| C11 | fold_in | SPE-854, SPE-529 | Environmental object examination |
| C12 | fold_in | SPE-49, SPE-58 | Regional operations map nodes |
| C13 | fold_in | SPE-49, SPE-371 | Hidden site discovery |
| C14 | fold_in | SPE-371, SPE-529 | Survey/evidence discovery |
| C15 | fold_in | SPE-16, SPE-788 | Remote command dispatch |
| C16 | fold_in | SPE-912, SPE-1075 | Rogue automated-system incidents |
| C17 | fold_in | SPE-164, SPE-912 | Facility control objectives |
| C18 | fold_in | SPE-912, SPE-58 | Infrastructure repair reveals intel |
| C19 | fold_in | SPE-371 | Field vehicle exploration |
| C20 | fold_in | SPE-164, SPE-55 | Environmental hazard objects |
| C21 | fold_in | SPE-145 | Tool heat/cooldown |
| C22 | fold_in | SPE-1059, SPE-196 | Milestone unlocks |
| C23 | fold_in | SPE-42, SPE-1059 | Staff familiarity rewards |
| C24 | fold_in | SPE-788, SPE-373 | Recurring hostile org chain |
| C25 | fold_in | SPE-1343, SPE-35 | Sensitive-data custody choices |
| C26–C36 | fold_in | various | Engine patterns (prereqs, hub, requisition, checklist) |
| C37–C44 | contradiction_check | SPE-1085, SPE-58, SPE-854 | Import + fallible map/codex/ethics guardrails |
