# SPE-2269 — Deployable readiness composition registry (slice 1)

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2269](https://linear.app/spectranoir/issue/SPE-2269/deployable-readiness-composition-registry-slice-1) |
| **GitHub issue** | [#2376](https://github.com/JamesJedi420/containment-protocol/issues/2376) |
| **Pull request** | [#3469](https://github.com/JamesJedi420/containment-protocol/pull/3469) |
| **Status** | **Shipped** |
| **Parent** | [SPE-1023](https://linear.app/spectranoir/issue/SPE-1023/response-team-readiness-patrol-and-alert-doctrine-layer) |
| **Branch** | `agent/spe-2269-deployable-readiness-composition` |
| **Base `main` SHA** | `90bc00f0` |

## Goal

Add a pure deterministic readiness-composition registry that combines the repository's existing certification, equipment-tier, and operative-condition authorities into one bounded field-reliability score and compact readiness band.

## Authoritative inputs

- Certification: existing `CertificationState` from `src/domain/agent/models.ts`.
- Gear tier: existing `EquipmentRarity` from `src/domain/equipment.ts`.
- Condition: existing `AgentReadinessBand` from `src/domain/agent/models.ts`.

The slice does not create a second certification, loadout, fatigue, health, or availability source.

## Bounded contract

- `ReadinessCompositionInputs` accepts the three source classes without reading `GameState` directly.
- `ReadinessCompositionRecord` stores normalized source values, a 0–100 `fieldReliabilityScore`, a compact `ready | limited | degraded | blocked` band, and explicit missing-input classes.
- Missing certification, gear, or condition produces a blocked zero-score record.
- `not_started`, `expired`, or `revoked` certification and `unavailable` condition hard-block readiness.
- `eligible_review` certification or `strained` condition caps readiness at `limited`.
- `in_progress` certification or `critical` condition caps readiness at `degraded`.
- Certified operatives with steady condition and basic-or-better gear can resolve `ready`; higher gear improves the bounded score without overriding hard gates.
- Registry keys use language-independent code-unit ordering.
- Validation recomputes score, band, and missing-input fields rather than trusting stored derived values.

## Validation plan

Targeted tests cover:

- deterministic composition;
- all three individual missing-input cases;
- ready, limited, degraded, and blocked outputs;
- hard certification and condition gates;
- stable registry ordering;
- tampered derived score, band, and missing-input rejection;
- registry-key mismatch rejection.

## Review reconciliation

Review corrections on head `f1a94b14fe2a1e8dc5170e274dd5055cd36d494c` replaced host-locale ordering with code-unit ordering, added explicit `missingInputs` tamper coverage, and synchronized the repository handoff to Shipped. Linear remains In Review until PR #3469 merges.

## Boundaries preserved

- No mission-specific suitability or team ranking.
- No specialist-unit taxonomy or lifecycle changes.
- No persistence or hydration fields.
- No `GameState`, store, week-close, routing, UI, or command integration.
- No change to existing `TeamDeploymentReadinessState` or deployment-eligibility resolution.
- No scalar overall-power model; this record is one bounded source for later mission-specific composition.

## Parent disposition

SPE-1023 remains open after this slice. Patrol doctrine, alert behavior, deployment cost, specialist-unit fit, provisional regional coverage, and mission-specific team assessment remain separately owned.
