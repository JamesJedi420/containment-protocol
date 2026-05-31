# SPE-1343 — Public disclosure state registry slice 1

One-page implementation plan. Linear: [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) (child under [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343)). Follows shipped [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) (self-censoring information registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2109 — Public disclosure state registry slice 1](https://linear.app/spectranoir/issue/SPE-2109)     |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Post-secrecy / broken-masquerade campaign layer |
| **Branch** | `jamesdyedbq/spe-2109-public-disclosure-state-registry-awareness-levels-fallout`                           |
| **Status** | **Shipped** — PR #2430                                                                                     |

## Goal

Add a pure deterministic **public-disclosure state registry** for post-secrecy and partial-disclosure campaign layers — secrecy collapse, public response, and adapted containment — without importing external wiki canon names, organizations, or geopolitical event details.

## Prerequisite (on `main` @ `13795852`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Self-censoring info  | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108 / PR #2429) |
| Intake registry wave | SPE-2105 / SPE-2106 / SPE-2104 sibling patterns                        |
| Information intake parent | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — In Progress |

## Gap (pre-slice)

- No bounded schema for post-secrecy awareness levels and fallout timeline.
- No deterministic validation for disclosure progression, cover-capacity failure hooks, or normalization inputs.
- No regional trust projection helper (public awareness, not objective truth).

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `PublicDisclosureStateId` + `PublicDisclosureRecord` in `src/domain/publicDisclosureStateRegistry.ts`                              | GameState persistence                         |
| awarenessLevel, falloutPhase, trustByRegion, oversightPressure, coverCapacityFailure, campaignObjectivePivot, transitionHistory    | Public-trust engine wire-up (SPE-861)         |
| normalizationInputs (tourism, public-managed sites, services, cleanup fronts, product lines, integration programs, population emergence) | Location / event registry ownership          |
| linkedContractOutcomes hook (operational_success + secrecy_failure coexistence)                                                    | Media / press-event simulator (SPE-1091)      |
| `validatePublicDisclosureRecord(record)` — deterministic lint (warnings + errors)                                                | Cover-story capacity model (SPE-1347)         |
| `projectDisclosureRegionalView(record, policy)` — regional public-awareness and trust projection                                   | Disclosure campaign UI                        |
| Focused tests in `src/test/publicDisclosureStateRegistry.test.ts`                                                                | Full SPE-1343 parent Done                     |

## Record contract (deterministic)

### Core fields

- **awarenessLevel** — `secrecy_intact`, `local_rumor`, `credible_leak`, `public_scandal`, `official_disclosure`, `normalization`.
- **falloutPhase** — `crisis`, `leak`, `disclosure`, `reform`, `commerce`, `media_saturation`, `normalization`.
- **trustByRegion** — `{ regionRef, trustScore }[]` with scores 0..1.
- **oversightPressure** — 0..1 scalar.
- **coverCapacityFailure** — boolean; requires justification ref when true.
- **campaignObjectivePivot** — `secrecy`, `harm_reduction`, `legitimacy`, `adaptation`.
- **transitionHistory** — append-only `{ fromAwarenessLevel, toAwarenessLevel, week, note?, falloutPhase? }[]`.
- **normalizationInputs** — registry-facing drivers (not location/event records).
- **linkedContractOutcomes** — `{ contractRef, operationalSuccess?, secrecyFailure? }[]` field hook only.
- **confidence / unknown / redacted** — projection legibility without dumping hidden truth.

### Validation rules (examples)

- `official_disclosure` without prior `credible_leak` or `public_scandal` in history → warning.
- `normalization` awareness without `reform` / `commerce` / `normalization` fallout phase → warning.
- `coverCapacityFailure` without casualty/leak/scale justification ref → warning.
- franchise/source-literal token in any string field → error.

## Acceptance

- [x] Fixture: transition credible_leak → public_scandal → official_disclosure with history preserved.
- [x] operational_success + secrecy_failure coexist on linked contract ref.
- [x] Negative: coverCapacityFailure without justification ref → warning.
- [x] Regional trust scores round-trip on validation.
- [x] At least one normalization input type representable without location/event registry ownership.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + negative lint cases.
3. **Projection** — regional public-awareness and trust view.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                       |
| ------ | ----------------------------------------------------------- |
| Domain | `src/domain/publicDisclosureStateRegistry.ts`               |
| Tests  | `src/test/publicDisclosureStateRegistry.test.ts`            |

## Branch

`jamesdyedbq/spe-2109-public-disclosure-state-registry-awareness-levels-fallout`

## Out of scope (parent closure)

- Full SPE-1343 parent Done
- GameState persistence and weekly orchestration wiring
- SPE-861 public-trust engine, SPE-1091 media simulator, SPE-1347 cover capacity

## See also

- `planning/harvest-reconciliation-index.md` — harvest batch `broken-masquerade-hub-70`
- `src/domain/selfCensoringInformationRegistry.ts` — validation + projection conventions (SPE-2108)
- `src/domain/extranormalEventRegistry.ts` — sibling intake registry pattern (SPE-2105)
