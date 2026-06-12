# SPE-1343 — Parent acceptance review (grooming slice 2)

One-page grooming record. Parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) stays **Backlog** — registry child wave + SPE-2122 normalization follow-on shipped; truth-layer split AC not met.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2446 — SPE-1343 parent acceptance review (grooming slice 2)](https://linear.app/spectranoir/issue/SPE-2446) |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth / operational truth split; stays **Backlog** |
| **Branch** | `spe-1343-parent-acceptance-review-slice-2`                                                                |
| **Status** | **Shipped** — SPE-2446 (PR #2769) @ `b0d319f2`                                                         |
| **Base `main` SHA** | `b5d23831`                                                                                          |

## Goal

Re-evaluate whether shipped [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) public disclosure registry wave and follow-on sibling [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) satisfy remaining parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) acceptance criteria after [SPE-2401](https://linear.app/spectranoir/issue/SPE-2401) grooming (slice 1). Docs + Linear hygiene only — no runtime unless owner reopens AC gaps. This slice adds **truth-layer split implementation priority** ordering for the next owner-scoped runtime slice.

## Prerequisite (on `main` @ `b5d23831`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) / PR #2430 — `src/domain/publicDisclosureStateRegistry.ts` |
| GameState persistence | [SPE-2325](https://linear.app/spectranoir/issue/SPE-2325) / PR #2517 — `publicDisclosureRecords` |
| Weekly progression hook | [SPE-2326](https://linear.app/spectranoir/issue/SPE-2326) / PR #2519 — `applyWeeklyPublicDisclosureProgressionTick` |
| Planning mirror UI | [SPE-2331](https://linear.app/spectranoir/issue/SPE-2331) / PR #2529 — `PublicDisclosureMirrorPage` |
| Sibling mass-anomaly child | [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) slices 1–5 **Done** — persistence, weekly governance hook, mirror UI, normalization compose into disclosure records (PR #2441–#2537) |

**Delta since slice 1 (`8cf2b869`):** no commits touching `publicDisclosureStateRegistry.ts`, `massAnomalousPopulationEmergenceRegistry.ts`, normalization compose, or related weekly hooks. Registry wave evidence unchanged; slice 2 confirms disposition and prioritizes the first truth-layer runtime slice.

## Parent AC vs shipped evidence (post slice 1)

Rows unchanged from [SPE-2401](https://linear.app/spectranoir/issue/SPE-2401) grooming — see `planning/spe-1343-parent-acceptance-review-slice-1.md`. [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) slice 5 normalization compose merges governance-derived `NormalizationInput[]` into qualifying disclosure records — post-breach campaign state only; does not add claim/doctrine/verification layers.

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| One case can carry multiple competing truth layers | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) tracks **public awareness / disclosure progression** (`awarenessLevel`, `falloutPhase`, regional `trustByRegion`) — not simultaneous claim/doctrine/verification layers per actor, site, or event | **No** |
| Public myth can affect operations without being treated as verified mechanism | `projectDisclosureRegionalView` projects **public awareness** (explicitly not objective truth); `campaignObjectivePivot` and `linkedContractOutcomes` field hooks exist — no myth-as-infrastructure model where public belief drives ops without verification | **Partial** |
| Records can preserve claim, doctrine, and verification separately | No claim/doctrine/verification fields on `PublicDisclosureRecord`; domain module explicitly defers truth-layer records | **No** |
| At least one incident maintains a public cover narrative alongside a separate agency operational record | `coverCapacityFailure` flag + `linkedContractOutcomes` (`operationalSuccess` + `secrecyFailure` coexistence on contract ref) — field hooks only; no dual-narrative incident record pairing cover story with agency operational truth | **Partial** |
| At least one historical-icon case preserves public myth, operational truth, and correction pressure as separate review surfaces | No historical-icon normalcy-pressure record or review surface in registry wave | **No** |
| The issue can parent god-king, propaganda, sacred-history, and post-breach cover regimes | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) attaches as post-breach disclosure registry child; [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) attaches as normalization-input sibling; every slice doc defers SPE-1343 truth-layer wire-up | **Partial** — attach surface works; umbrella truth-layer model undefined |

**Child [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) disposition:** **Done** — slices 1–4 satisfy registry child AC. Parent closure was explicitly out of scope in every slice doc.

**Sibling [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) disposition:** **Done** — slices 1–5 satisfy child AC including normalization compose wire-up. Does not satisfy SPE-1343 truth-layer AC.

**Parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) disposition:** **Backlog** — registry intake wave is a valid attach surface for post-secrecy disclosure state, not the public myth / operational truth split engine.

## Truth-layer split priority (next runtime slices)

Ordered by dependency and parent AC gap severity. Registry wave must not be extended to fake truth-layer fields — new domain module required.

| Priority | Target | Owner | Rationale |
| --- | --- | --- | --- |
| **1** | Truth-layer record schema (claim, doctrine, verification per actor/site/event) | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) child slice 1 | Blocks AC rows 1, 3, and 6; parent constraint says reuse source-confidence / knowledge-state systems ([SPE-677](https://linear.app/spectranoir/issue/SPE-677), [SPE-58](https://linear.app/spectranoir/issue/SPE-58)) — wire in slice 2+ |
| **2** | Myth-as-infrastructure ops hook (public belief affects ops without verification) | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) follow-up | AC row 2 partial — needs truth-layer records before ops projection |
| **3** | Cover narrative + agency operational record dual-incident pairing | [SPE-899](https://linear.app/spectranoir/issue/SPE-899) / [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) | AC row 4 partial — cover-story lifecycle distinct from disclosure progression |
| **4** | Historical-icon normalcy pressure review surfaces | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) follow-up | AC row 5 — no registry fixture shipped |
| **5** | Disclosure campaign player UI / post-secrecy orchestration | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) / [SPE-861](https://linear.app/spectranoir/issue/SPE-861) | Parent scope; deferred in every SPE-2109 slice doc |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Truth-layer record runtime implementation   |
| `planning/backlog.md` recommended next step handoff                | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on [SPE-2446](https://linear.app/spectranoir/issue/SPE-2446) | SPE-868 slice 28+ (branching reward logic)  |
| Confirm parent stays **Backlog** (guard against auto-close)        | Public-disclosure registry runtime changes  |

## Acceptance

- [x] Parent AC re-evaluated against SPE-2109 wave + SPE-2122 follow-on evidence with Done vs Backlog reasoning
- [x] Truth-layer split implementation priority table recorded
- [x] SPE-1343 stays **Backlog** on Linear; SPE-2109 + SPE-2122 remain **Done**
- [x] Recommended next step updated to truth-layer record schema slice 1
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Truth-layer record model (claim, doctrine, verification per actor/site/event) | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Parent AC priority 1 — next recommended implementation slice |
| Myth-as-infrastructure ops projection | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Parent AC row 2; depends on truth-layer records |
| Cover narrative + agency operational record dual-incident pairing | [SPE-899](https://linear.app/spectranoir/issue/SPE-899) / [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) | Parent AC row 4 partial |
| Historical-icon normalcy pressure review surfaces | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) follow-up | Parent AC row 5 |
| Disclosure campaign player UI / post-secrecy orchestration | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) / [SPE-861](https://linear.app/spectranoir/issue/SPE-861) | Parent scope; deferred in every SPE-2109 slice doc |
| Belief-track / knowledge-state reuse for truth layers | [SPE-677](https://linear.app/spectranoir/issue/SPE-677) / [SPE-58](https://linear.app/spectranoir/issue/SPE-58) | Parent constraint; wire-up in truth-layer slice 2+ |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/spe-1343-parent-acceptance-review-slice-1.md`
- `planning/public-disclosure-state-registry-slice-4.md`
- `planning/mass-anomalous-population-emergence-registry-slice-5.md`
- `planning/spe-1309-parent-acceptance-review-slice-2.md`
