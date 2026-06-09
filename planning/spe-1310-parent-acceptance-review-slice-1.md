# SPE-1310 — Parent acceptance review (grooming slice 1)

One-page grooming record. Parent [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) stays **Backlog** — registry child waves shipped; unified case lifecycle state machine AC not met.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2402 — SPE-1310 parent acceptance review (grooming slice 1)](https://linear.app/spectranoir/issue/SPE-2402) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Anomaly case lifecycle state machine; stays **Backlog** |
| **Branch** | `spe-1310-parent-acceptance-review-slice-1`                                                                |
| **Status** | **In progress** — SPE-2402 grooming slice 1 @ `c3fd4371`                                                         |
| **Base `main` SHA** | `c3fd4371`                                                                                          |

## Goal

Evaluate whether shipped [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) recurrent catastrophe (slices 1–5) and [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) rule-document compliance (slices 1–4) registry waves satisfy parent [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) acceptance criteria. Docs + Linear hygiene only — no runtime unless owner reopens AC gaps.

## Prerequisite (on `main` @ `c3fd4371`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Recurrent catastrophe schema | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) / PR #2436 — `src/domain/recurrentCatastropheAmeliorationRegistry.ts` |
| Recurrent catastrophe persistence | [SPE-2363](https://linear.app/spectranoir/issue/SPE-2363) / PR #2595 — `recurrentCatastropheRecords` |
| Recurrent catastrophe weekly hook | [SPE-2364](https://linear.app/spectranoir/issue/SPE-2364) / PR #2597 — `applyWeeklyRecurrentCatastropheTick` |
| Recurrent catastrophe mirror UI | [SPE-2369](https://linear.app/spectranoir/issue/SPE-2369) / PR #2606 — `RecurrentCatastropheMirrorPage` |
| Recurrent catastrophe review ref wire-up | [SPE-2370](https://linear.app/spectranoir/issue/SPE-2370) / PR #2608 under [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — `recurrentCatastrophePostIncidentReviewLinks` |
| Rule-document compliance schema | [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) / PR #2442 — `src/domain/ruleDocumentComplianceContainmentRegistry.ts` |
| Rule-document compliance persistence | [SPE-2365](https://linear.app/spectranoir/issue/SPE-2365) / PR #2599 — `ruleDocumentComplianceRecords` |
| Rule-document compliance weekly hook | [SPE-2366](https://linear.app/spectranoir/issue/SPE-2366) / PR #2601 — `applyWeeklyRuleDocumentComplianceTick` |
| Rule-document compliance mirror UI | [SPE-2368](https://linear.app/spectranoir/issue/SPE-2368) / PR #2604 — `RuleDocumentComplianceMirrorPage` |

## Parent AC vs shipped evidence

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| Case lifecycle has named states with explicit transitions | `CaseStatus` remains `open \| in_progress \| resolved` on `CaseInstance` / mission records — not lead→confirmation→containment→revision stages; registry waves track **record-local** recurrence and compliance drift, not case-level transition graph | **No** |
| Lead, confirmation, containment, and revision are distinct simulation stages | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) models recurrence cadence + amelioration tactics; [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) models document binding + compliance decay — neither defines intake lead, credibility review, or containment-stage gates on `CaseInstance` | **No** |
| Research can materially change containment assumptions and move the case into a new state | [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) `revisionHistoryRefs` are audit refs on compliance records; weekly tick advances `compliant→drifting→breach` from decay bands — no research-invalidates-procedure transition that reopens a case into revision | **No** |
| Presumed-neutralized case retains surveillance obligations and breach-readiness without archive closure | No `presumed_neutralized` disposition, surveillance clock, or breach-readiness field in either registry or case models; design reference (`presumed_neutralized_surveillance`) not implemented in runtime | **No** |
| At least one transition upgrades containment policy tier after demonstrated adaptation | [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) `breachConsequence: escalate_review` is a static record field; no adaptation-triggered procedure-tier upgrade transition (`policy_revision_on_adaptation`) | **No** |
| Lifecycle usable as backbone for intake, containment, and research issues | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) and [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) attach as sibling registries; every slice doc defers SPE-1310 case lifecycle wire-up; sibling intake registries ([SPE-2104](https://linear.app/spectranoir/issue/SPE-2104), [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106)) advance **record-local** custody/monitoring chains only | **Partial** — attach surface works; unified state machine undefined |
| Institutional classification text distinct from operational risk tier | Mirror UIs project record labels and decay/recurrence bands; no split between player-facing classification copy and active monitoring tier on cases | **No** |

**Child [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) disposition:** **Done** — slices 1–5 satisfy registry child AC (schema → persistence → weekly hook → mirror UI → post-incident review ref wire-up under [SPE-868](https://linear.app/spectranoir/issue/SPE-868)). Parent closure was explicitly out of scope in every slice doc.

**Child [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) disposition:** **Done** — slices 1–4 satisfy registry child AC (schema → persistence → weekly hook → mirror UI). Parent closure was explicitly out of scope in every slice doc.

**Parent [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) disposition:** **Backlog** — registry intake waves are valid attach surfaces for recurrence amelioration and written-conduct containment records, not the anomaly case lifecycle state machine.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Case lifecycle state machine runtime        |
| `planning/backlog.md` recommended next step handoff                | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on [SPE-2402](https://linear.app/spectranoir/issue/SPE-2402) | SPE-868 slice 28 (branching reward logic)   |
| Branch continuity validator row                                    | Exploit-access deferral row                   |

## Acceptance

- [x] Parent AC evaluated against SPE-2117 slices 1–5 and SPE-2123 slices 1–4 evidence with Done vs Backlog reasoning
- [x] SPE-1310 stays **Backlog** on Linear; SPE-2117 + SPE-2123 and registry children remain **Done**
- [x] Recommended next step updated to next genuinely open grooming target
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Unified case lifecycle state machine (lead→confirmation→containment→revision transitions) | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Parent AC; requires owner-scoped lifecycle engine slice — not registry slice pattern alone |
| Presumed-neutralized disposition with surveillance + breach-readiness clocks | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) / [SPE-921](https://linear.app/spectranoir/issue/SPE-921) | Parent AC; false-clear / dormant-site alignment deferred; no runtime disposition |
| Policy-revision-on-adaptation containment tier upgrade | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Parent AC; adaptation-triggered procedure upgrade not in compliance or catastrophe registries |
| Institutional classification vs operational risk tier split | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Parent scope constraint; mirror labels conflate record state with case posture |
| Research invalidation → case revision transition | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Parent AC; compliance `revisionHistoryRefs` are audit hooks only |
| Case lifecycle backbone wire-up for intake / containment / research | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) follow-up | Sibling registries ([SPE-2104](https://linear.app/spectranoir/issue/SPE-2104), [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106), [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123)) defer integration per slice boundary |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/recurrent-catastrophe-amelioration-registry-slice-5.md`
- `planning/rule-document-compliance-containment-registry-slice-4.md`
- `planning/spe-1343-parent-acceptance-review-slice-1.md`
- `planning/spe-1309-parent-acceptance-review-slice-1.md`
- `planning/backlog-handoff-hygiene-slice-1.md`
