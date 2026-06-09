# SPE-1343 — Parent acceptance review (grooming slice 1)

One-page grooming record. Parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) stays **Backlog** — registry child wave shipped; truth-layer split AC not met.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2401 — SPE-1343 parent acceptance review (grooming slice 1)](https://linear.app/spectranoir/issue/SPE-2401) |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth / operational truth split; stays **Backlog** |
| **Branch** | `spe-1343-parent-acceptance-review-slice-1`                                                                |
| **Status** | **Shipped** — SPE-2401 (PR #2671) @ `c5202e81`                                                         |
| **Base `main` SHA** | `f8dfc53e`                                                                                          |

## Goal

Evaluate whether shipped [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) public disclosure registry slices 1–4 satisfy parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) acceptance criteria. Docs + Linear hygiene only — no runtime unless owner reopens AC gaps.

## Prerequisite (on `main` @ `f8dfc53e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) / PR #2430 — `src/domain/publicDisclosureStateRegistry.ts` |
| GameState persistence | [SPE-2325](https://linear.app/spectranoir/issue/SPE-2325) / PR #2517 — `publicDisclosureRecords` |
| Weekly progression hook | [SPE-2326](https://linear.app/spectranoir/issue/SPE-2326) / PR #2519 — `applyWeeklyPublicDisclosureProgressionTick` |
| Planning mirror UI | [SPE-2331](https://linear.app/spectranoir/issue/SPE-2331) / PR #2529 — `PublicDisclosureMirrorPage` |
| Sibling mass-anomaly child | [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) slices 1–5 **Done** under SPE-2109 |

## Parent AC vs shipped evidence

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| One case can carry multiple competing truth layers | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) tracks **public awareness / disclosure progression** (`awarenessLevel`, `falloutPhase`, regional `trustByRegion`) — not simultaneous claim/doctrine/verification layers per actor, site, or event | **No** |
| Public myth can affect operations without being treated as verified mechanism | `projectDisclosureRegionalView` projects **public awareness** (explicitly not objective truth); `campaignObjectivePivot` and `linkedContractOutcomes` field hooks exist — no myth-as-infrastructure model where public belief drives ops without verification | **Partial** |
| Records can preserve claim, doctrine, and verification separately | No claim/doctrine/verification fields on `PublicDisclosureRecord`; domain module explicitly defers truth-layer records | **No** |
| At least one incident maintains a public cover narrative alongside a separate agency operational record | `coverCapacityFailure` flag + `linkedContractOutcomes` (`operationalSuccess` + `secrecyFailure` coexistence on contract ref) — field hooks only; no dual-narrative incident record pairing cover story with agency operational truth | **Partial** |
| At least one historical-icon case preserves public myth, operational truth, and correction pressure as separate review surfaces | No historical-icon normalcy-pressure record or review surface in registry wave | **No** |
| The issue can parent god-king, propaganda, sacred-history, and post-breach cover regimes | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) attaches as post-breach disclosure registry child; slice docs defer parent closure; sibling [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) covers normalization inputs | **Partial** — attach surface works; umbrella truth-layer model undefined |

**Child [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) disposition:** **Done** — slices 1–4 satisfy registry child AC (schema → persistence → weekly hook → mirror UI). Parent closure was explicitly out of scope in every slice doc.

**Parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) disposition:** **Backlog** — registry intake wave is a valid attach surface for post-secrecy disclosure state, not the public myth / operational truth split engine.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Truth-layer record runtime implementation   |
| `planning/backlog.md` recommended next step handoff                | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on [SPE-2401](https://linear.app/spectranoir/issue/SPE-2401) | SPE-868 slice 28 (branching reward logic)   |

## Acceptance

- [x] Parent AC evaluated against SPE-2109 slices 1–4 evidence with Done vs Backlog reasoning
- [x] SPE-1343 stays **Backlog** on Linear; SPE-2109 + children remain **Done**
- [x] Recommended next step updated to next genuinely open grooming target
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Truth-layer record model (claim, doctrine, verification per actor/site/event) | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Parent AC; requires owner-scoped truth-layer slice — not disclosure registry pattern alone |
| Cover narrative + agency operational record dual-incident pairing | [SPE-899](https://linear.app/spectranoir/issue/SPE-899) / [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) | Parent AC; cover-story lifecycle and witness normalization out of registry wave |
| Historical-icon normalcy pressure review surfaces | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) follow-up | Parent AC; no registry fixture or review surface shipped |
| Disclosure campaign player UI / post-secrecy orchestration | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) / [SPE-861](https://linear.app/spectranoir/issue/SPE-861) | Parent scope; deferred in every SPE-2109 slice doc |
| Belief-track / knowledge-state reuse for truth layers | [SPE-677](https://linear.app/spectranoir/issue/SPE-677) / [SPE-58](https://linear.app/spectranoir/issue/SPE-58) | Parent constraint says reuse existing systems; wire-up deferred |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/public-disclosure-state-registry-slice-4.md`
- `planning/spe-1309-parent-acceptance-review-slice-1.md`
- `planning/spe-1888-parent-acceptance-review-slice-1.md`
- `planning/backlog-handoff-hygiene-slice-1.md`
