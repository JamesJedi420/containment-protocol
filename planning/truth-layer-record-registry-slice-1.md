# SPE-2447 — Truth-layer record registry slice 1

One-page implementation plan. Linear: [SPE-2447](https://linear.app/spectranoir/issue/SPE-2447) (child under [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343)). Follows shipped [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) public disclosure registry and grooming [SPE-2446](https://linear.app/spectranoir/issue/SPE-2446).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2447 — Truth-layer record registry slice 1](https://linear.app/spectranoir/issue/SPE-2447)         |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth / operational truth split; stays **Backlog** |
| **Branch** | `spe-1343-truth-layer-record-registry-slice-1`                                                             |
| **Status** | **Shipped** — PR #2772 @ `080608e6`                                                                        |
| **Base `main` SHA** | `1808d653`                                                                                          |

## Goal

Add a pure deterministic **truth-layer record registry** for simultaneous claim, doctrine, and verification layers per actor, site, or event — without extending `PublicDisclosureRecord` or importing franchise/source-literal tokens.

## Prerequisite (on `main` @ `1808d653`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Public disclosure registry | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109) — explicitly defers truth-layer records |
| Source-confidence vocabulary | `AuthoritySourceConfidence` in `src/domain/authorityGraph.ts` (SPE-788) |
| Knowledge-state vocabulary | `KnowledgeTier` in `src/domain/knowledge.ts` (SPE-58)                  |
| Parent grooming      | [SPE-2446](https://linear.app/spectranoir/issue/SPE-2446) — truth-layer priority 1 |

## Gap (pre-slice)

- No bounded schema for claim / doctrine / verification layers per actor, site, or event.
- No deterministic validation preserving separate truth layers on one case.
- No review projection helper surfacing layer divergence without collapsing to objective truth.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `TruthLayerRecordId` + `TruthLayerRecord` in `src/domain/truthLayerRecordRegistry.ts`                                              | GameState persistence                         |
| `claim`, `doctrine`, `verification` layer slots with source-confidence / knowledge-tier hints                                      | SPE-677 / SPE-58 runtime wire-up              |
| `competingLayers` refs for parallel cover / operational records on same case                                                       | Myth-as-infrastructure ops hook (priority 2)  |
| `validateTruthLayerRecord(record)` — deterministic lint (warnings + errors)                                                    | Public-disclosure registry field extensions   |
| `projectTruthLayerReviewView(record, policy)` — separate review surfaces                                                         | Planning mirror UI                            |
| Focused tests in `src/test/truthLayerRecordRegistry.test.ts`                                                                       | Full SPE-1343 parent Done                     |

## Record contract (deterministic)

### Core fields

- **subjectRef / subjectKind** — actor, site, or event anchor.
- **claim** — public or subject-facing narrative slot (`narrative`, optional `sourceConfidence`, `knowledgeTier`, `evidenceRef`).
- **doctrine** — institutional record slot (same sub-shape).
- **verification** — operationally verified slot (same sub-shape).
- **competingLayers** — `{ recordRef, layerRole, note? }[]` for parallel truth records on the same case.
- **correctionPressure** — 0..1 scalar (review surface hook).
- **mythInfrastructureWeight** — 0..1 scalar; myth may affect ops without verification (projection flag only in slice 1).
- **linkedDisclosureRef** — optional hook to disclosure record; does not extend `PublicDisclosureRecord`.
- **confidence / unknown / redacted** — projection legibility without dumping hidden truth.

### Validation rules (examples)

- Missing `id`, `label`, `subjectRef`, or any layer `narrative` → error.
- Invalid `subjectKind`, source confidence, knowledge tier, or unit score → error.
- Franchise / source-literal token in any string field → error.
- `verification` marked `verified` without `evidenceRef` → warning.
- Identical `claim` and `verification` narratives → warning (`collapsed_claim_and_verification`).
- `mythInfrastructureWeight` > 0 with verified identical claim/verification → warning.

## Acceptance

- [x] Fixture: competing truth layers on one site event with distinct claim/doctrine/verification.
- [x] Separate claim/doctrine/verification round-trip on actor fixture.
- [x] Negative: franchise token in label or layer narrative → error.
- [x] Review projection surfaces layer divergence without collapsing layers.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| GameState persistence + hydrate wire | SPE-1343 slice 2 | Registry anchor must land first |
| SPE-677 / SPE-58 knowledge-state wire-up | SPE-1343 slice 2+ | Parent constraint; schema uses compatible types only |
| Myth-as-infrastructure ops projection | SPE-1343 follow-up | Parent AC row 2; depends on persisted records |
| Cover narrative + agency operational record dual-incident pairing | SPE-899 / SPE-1347 | Parent AC row 4 partial |
| Historical-icon normalcy pressure review surfaces | SPE-1343 follow-up | Parent AC row 5 |
| Planning mirror UI | SPE-1343 slice 4+ | Mirror follows persistence pattern |

## File touch list (expected)

| Area   | Files                                                       |
| ------ | ----------------------------------------------------------- |
| Domain | `src/domain/truthLayerRecordRegistry.ts`                    |
| Tests  | `src/test/truthLayerRecordRegistry.test.ts`                 |
| Plan   | `planning/truth-layer-record-registry-slice-1.md`, `planning/backlog.md` |

## See also

- `planning/spe-1343-parent-acceptance-review-slice-2.md` — truth-layer priority table
- `src/domain/publicDisclosureStateRegistry.ts` — sibling registry; do not extend for truth layers
- `src/domain/selfCensoringInformationRegistry.ts` — validation + projection conventions
