# ConcealmentTriggers migration batch 4 (SPE-2249)

## Goal

Content-only follow-up after batches 1–3: add authored `concealmentTriggers[]` to remaining catalog templates where hidden/displaced activation fits the narrative.

## Migrated templates (`BATCH_FOUR_TEMPLATE_IDS`)

| Template | Trigger id | Mode | When |
| --- | --- | --- | --- |
| `ops-005` | `trigger:ops-005-chamber-approach` | hidden | `allTags: occult, seal` |
| `bio-forensics-001` | `trigger:bio-forensics-001-vector-stakeout` | hidden | `anyTag: forensics, biological` |
| `info-001` | `trigger:info-001-relay-infiltration` | hidden | `allTags: information, cyber` |
| `occult-001` | `trigger:occult-001-chapel-infiltration` | hidden | `allTags: occult, chapel` |
| `occult-002` | `trigger:occult-002-memorial-blend` | hidden | `anyTag: memorial, resonance` |
| `occult-004` | `trigger:occult-004-vault-approach` | hidden | `allTags: reliquary, vault` |
| `occult-005` | `trigger:occult-005-greenhouse-cover` | hidden | `anyTag: cathedral, weather` |
| `occult-007` | `trigger:occult-007-catacomb-infiltration` | hidden | `allTags: occult, catacomb` |
| `psi-001` | `trigger:psi-001-bleed-stakeout` | hidden | `anyTag: psionic, precognition` |
| `psi-004` | `trigger:psi-004-station-infiltration` | hidden | `anyTag: amplifier, psionic` |
| `psi-006` | `trigger:psi-006-reliquary-screen` | hidden | `allTags: psionic, reliquary` |
| `followup_psi_aftermath` | `trigger:followup-psi-aftermath-residue-sweep` | hidden | `anyTag: psionic, aftermath` |

## Intentionally excluded (this batch)

Combat/raid generics (`combat-001`, `raid-001`, `anomaly-raid-001`, …), open-assault follow-ups (`followup_feeding_frenzy`), and templates without a credible concealed-approach narrative (`ops-006`, `ops-009`, `reward-mixed-bundle`, …). All templates with `infiltrationProbePlan` already had triggers from batches 1–3.

## Out of scope

- Domain kernel / UI changes
- New activation modes
- SPE-781 full hidden-modality matrix

## Acceptance

- [x] `BATCH_FOUR_TEMPLATE_IDS` catalog test
- [x] Integration test: `ops-005` → `advanceWeek` → `hiddenState === 'hidden'`
- [x] `npm run test:run` green

## See also

- Parent SPE-2155
- `src/test/caseTemplateConcealmentMigration.test.ts`
- Linear SPE-2249 / GitHub #2331
