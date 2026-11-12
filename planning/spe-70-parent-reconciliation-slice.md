# SPE-70 — Parent acceptance reconciliation (grooming)

One-page grooming record. Parent [SPE-70](https://linear.app/spectranoir/issue/SPE-70) **Done** — concealment activation stack, hidden-modality matrix slices 1–11, SPE-2306 triage chips, and prep-stack follow-ons shipped; parent AC rows 1–8 **Yes**.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-70 parent reconciliation (hygiene slice)                                                               |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70) — Hidden-State, Displacement, & Counter-Detection Layer; **Done** |
| **Branch** | `spe-70-parent-reconciliation`                                                                             |
| **Status** | **Shipped** — hygiene session (docs-only)                                                              |
| **Base `main` SHA** | `ce76d07d`                                                                                          |

## Goal

Re-evaluate parent [SPE-70](https://linear.app/spectranoir/issue/SPE-70) acceptance criteria after the full concealment activation stack, hidden-modality matrix slices 1–11, SPE-2306 mission-triage chips, and prep activation preview / Front Desk attention follow-ons. Confirm parent **Done** only when all AC rows are evidenced — not on prep-only work alone. Docs + Linear hygiene only.

## Prerequisite (on `main` @ `ce76d07d`)

| Layer | Anchor |
| --- | --- |
| Concealment activation | [SPE-2107](https://linear.app/spectranoir/issue/SPE-2107) / [SPE-2113](https://linear.app/spectranoir/issue/SPE-2113) — PR #2169, #2175 — `hiddenStateActivation.ts` |
| Concealment triggers migration | [SPE-2249](https://linear.app/spectranoir/issue/SPE-2249) — PR #2218, #2266 |
| Stealth leave-behind stack | [SPE-2163](https://linear.app/spectranoir/issue/SPE-2163)–[SPE-2247](https://linear.app/spectranoir/issue/SPE-2247) — PR #2315–#2323 |
| Case prep + prep-stack follow-ons | PR #2326, #2821, #2822 — `concealmentCasePrepView.ts`, `concealmentPrepActivationPreviewNotes.ts`, `concealmentPendingActivationAttention.ts` |
| Hidden-modality matrix 1–6 | [SPE-2281](https://linear.app/spectranoir/issue/SPE-2281)–[SPE-2286](https://linear.app/spectranoir/issue/SPE-2286) — PR #2403–#2415 |
| Post-matrix modalities 7–11 | [SPE-2288](https://linear.app/spectranoir/issue/SPE-2288)–[SPE-2303](https://linear.app/spectranoir/issue/SPE-2303) — PR #2421–#2469 |
| Mission triage chips | [SPE-2306](https://linear.app/spectranoir/issue/SPE-2306) — PR #2475 — `missionTriageModalitySignalView.ts` |
| Tiered reveal / disguise bridge | [SPE-781](https://linear.app/spectranoir/issue/SPE-781) — PR #2342–#2347 |

**Delta since June 2026 grooming (`planning/scope-discipline-grooming-pass.md`):** matrix slices 7–11 and SPE-2306 triage chips shipped; prep activation preview (#2821) and Front Desk pending-activation (#2822) landed; parent body still said “keep open” with slices 7–9 queued and out-of-phase / anti-scan deferred.

## Parent AC vs shipped evidence

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| ≥3 mechanically distinct modalities in one reusable flow | `HiddenStateModalityKind` compose in `hiddenStateModality.ts` + `resolveScoutingWithCaseHiddenState` — concealed / displaced / disguised (+ slices 7–11 families) in one scouting path (SPE-2281 / PR #2403) | **Yes** |
| Counter-reveal invalidates one mode without solving all | Modality layer strip on counter-detection; counter-detection clears hidden without solving displaced (`advanceWeek.hiddenState.integration.test.ts`) | **Yes** |
| Player-facing partial / mislocated / unresolved outputs | False position projection (SPE-2281); recon cache partial readouts (SPE-2284); signature mask / false-detection / glamour overlays (SPE-2288–2290); `ReportFeature.projectionMismatch.test.tsx` | **Yes** |
| Hidden-state affects downstream operational choice | Route-caution score signal from recon cache + out-of-phase / anti-scan adjustments (`advanceWeek.hiddenState.downstream.test.ts`, `hiddenStateScoutingReconCache.test.ts`) | **Yes** |
| Known-but-unresolved across scouting passes | `scoutingReconCache` persistence across weeks (SPE-2284 / PR #2409) | **Yes** |
| Mode-specific tells / threshold validation | `hiddenStateModalityTells.ts` + `evaluateHiddenStateModalityTell` (SPE-2286 / PR #2415); triage chip surfacing (SPE-2306 / PR #2475) | **Yes** |
| False entity / structural illusion lifecycle | `hiddenStateIllusionLifecycle.ts` — active → disproved → collapsed (SPE-2285 / PR #2411); `hiddenStateIllusionLifecycle.test.ts` | **Yes** |
| Targeted tests for deterministic behavior, counter-detection, projection mismatch | `hiddenStateModality.test.ts`, `hiddenStateActivation.test.ts`, `advanceWeek.hiddenState*.test.ts`, `revealPayloadOrchestration.test.ts`, `missionTriageModalitySignalView.test.ts`, report projection tests | **Yes** |

**Extended modality families (formerly “open” or “deferred” in issue body):** signature masking (SPE-2288), false-detection output (SPE-2289), glamour overlay (SPE-2290), out-of-phase presence (SPE-2302), anti-scan compartments (SPE-2303) — all **shipped**.

**Concealment activation stack (prep evidence, not separate AC rows):** runtime resolver + authored triggers (`hiddenStateActivation.ts`); case prep panel (#2326); activation preview notes (#2821); Front Desk pending-activation attention (#2822).

**Parent [SPE-70](https://linear.app/spectranoir/issue/SPE-70) disposition:** **Done** — AC rows 1–8 met by matrix stack + tests; prep follow-ons close operator surfacing without reopening AC gaps.

**Doc vs Linear reconciliation:** Linear marked **Done** on prep-stack merge (2026-06-15) while issue body still said “Keep this issue open” and listed slices 7–9 as Backlog. Grooming confirms **Done** aligns with evidenced AC; update parent body + deferred table to match.

## Scope (this slice)

| In | Out |
| --- | --- |
| Grooming comment on [SPE-70](https://linear.app/spectranoir/issue/SPE-70) | New modality families |
| Parent body / deferred table hygiene | Mission triage full refresh |
| `planning/backlog.md` handoff + context | Registry intake waves |
| `planning/scope-discipline-grooming-pass.md` SPE-70 row | Runtime implementation |
| Slice doc (this file) + planning index row | SPE-521 infiltration substrate |

## Acceptance

- [x] Parent AC re-evaluated — rows 1–8 **Yes**
- [x] SPE-70 **Done** on Linear aligned with docs
- [x] Recommended next step updated post reconciliation
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission triage full refresh (compare-top-2, bulk actions, spec §13 grouping) | blocked queue | UI breadth without new loop truth — `planning/backlog.md` § Blocked |
| New hidden-modality families beyond shipped 1–11 stack | roadmap §14 | Requires grooming pass before promotion — `planning/scope-discipline-grooming-pass.md` |
| Harvest fold-in breadth (identity obfuscation, stealth upkeep, viewpoint concealment, etc.) | future content waves | Reconciliation comments in parent body — not parent AC minimum bar |
| Broader encounter-state infiltration prep | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) siblings | Uniform/cover stack — related but separate parent |
| Template-wide modality migration beyond fixture set | follow-up children | Slice docs § Deferred per matrix slice |

## Validation

Docs-only — no `npm run test:run` required for hygiene boundary.

## See also

- `planning/scope-discipline-grooming-pass.md`
- `planning/spe-521-parent-reconciliation-slice.md`
- `planning/backlog.md`
- `architecture/hidden-state-displacement-counter-detection.md`
