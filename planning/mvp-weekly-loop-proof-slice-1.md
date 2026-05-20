# MVP weekly loop proof — slice 1 (recommended next issue)

## Recommendation

**Next best implementable issue:** bounded **MVP weekly loop proof** (`planning/backlog.md` item **#6**, roadmap §15 / `planning/milestones.md` milestone 6).

| Candidate | Verdict |
| --- | --- |
| **MVP weekly loop proof (this plan)** | **Pick first.** Strategic backlog priority; closes the arc after covert-ops content + prep UI + operations drill-down; no new domain frameworks; test-backed, shippable in one PR. |
| Infiltration encounter report copy (SPE-2250 optional) | Good **slice 2** follow-up: player-visible payoff for 33 probe-plan templates without new mechanics. |
| SPE-781 tiered detection / reveal payloads | High leverage long-term; **too large** for the next single PR (new reveal taxonomy + scan integration). |
| ConcealmentTriggers batch 5 (8 remaining `case` templates) | Mostly combat/raid generics (`combat-001`, `escalation-001`, …); **low narrative fit** — defer unless deliberately expanding raid concealment. |
| Core UX spec refresh (backlog #4) | Valuable but **documentation-first**; does not advance playable proof on its own. |
| SPE-522 / SPE-1007 infiltration frameworks | Explicitly out of scope per SPE-2250; separate epics. |

**Suggested Linear issue:** new child e.g. **SPE-2251** — “MVP weekly loop proof (slice 1 — integration harness)” (or reopen a milestone-6 tracking issue if one exists).

---

## Why now

Recent work completed the **covert-ops vertical** end-to-end in code:

- Domain: concealment activation, infiltration probe/cover/leave-behind, investigation economy, mission fallout
- Content: batch-4 concealment + full batch-4 infiltration stack (12 templates)
- UI: `WeeklyCasePrepPanel` (concealment, infiltration, leave-behind, investigation)
- Navigation: report week prev/next, operations drill-down + gap hardening

What is still missing is a **single authoritative test** that proves the player-facing weekly loop holds together: prep choices → `advanceWeek` → report + events → drill-down targets. Individual integration tests exist in isolation; milestone 6 asks for **trustworthy loop proof**.

---

## Goal (slice 1)

Add one **deterministic integration harness** that exercises a minimal multi-week campaign path and asserts MVP proof claims 2, 5, and 6 from `planning/mvp-scope.md` §8 at test granularity:

- **Deployment / prep matters** — weekly prep mutations are present on the case before resolve.
- **Reports explain consequences** — post-`advanceWeek` report contains expected note/event types (concealment, infiltration, investigation, leave-behind when eligible).
- **Next week feels changed** — week index increments; report history grows; week navigation helpers return coherent prev/next.

No Playwright requirement (not in `package.json` today). Vitest + `advanceWeek` + store helpers only.

---

## Scenario (fixture narrative)

Use **existing** starter state and a known infiltration-eligible template (e.g. `ops-004` or spawned `ops-005`):

| Step | Action | Assert |
| --- | --- | --- |
| 0 | `createStartingState()`, assign team, set case `in_progress` | Case eligible for prep |
| 1 | Player prep (store or direct state mutation matching store paths) | `conceal.case.{id}` set; `infiltrationWeeklyProbeActionOverride` set; `stealthLeaveBehindId` selected if applicable; one forensic `askInvestigationQuestion` |
| 2 | `advanceWeek(state)` | Week +1; case progressed or resolved per mode |
| 3 | Inspect `reports[last]` | Notes include ≥1 of: `concealment.activated`, `infiltration.*`, investigation note types, leave-behind custody markers when pressure applied |
| 4 | Build event feed rows from report | `buildEventFeedRows` / `refineEventFeedDrillDownHref` — primary `href` resolves (report week or case) |
| 5 | `buildReportWeekNavigation(reports, week)` | Prev/next consistent with report list |
| 6 | Second `advanceWeek` (lighter prep) | Second report exists; navigation across two weeks works |

Keep RNG **deterministic** (fixed seed or template spawn `() => 0.42` pattern used elsewhere).

---

## Out of scope (slice 1)

- Browser E2E / Playwright smoke
- New domain rules (probe math, activation modes, reveal tiers)
- Full triage UI click path (assign from mission board) — use store/domain assign APIs
- Tuning pass (backlog #5)
- Content migration (batch 5 concealment, more templates)
- Hub / procurement / faction breadth

---

## Implementation plan

### 1. Test file (TDD anchor)

`src/test/weeklyMvpLoopProof.integration.test.ts`

- One `describe('MVP weekly loop proof')` with 2–3 focused tests:
  - `prep choices survive into advanceWeek outcomes`
  - `report and event feed drill-down stay coherent`
  - `multi-week report navigation` (optional third test or merged)

Reuse helpers from:

- `advanceWeek.concealmentActivation.integration.test.ts`
- `advanceWeek.infiltrationProbe.integration.test.ts`
- `investigationCasePrepView.test.ts` / store `askInvestigationQuestion`
- `operationsRouteDrillDown.test.ts` / `eventFeedView.test.ts`
- `reportWeekNavigation` tests

### 2. Thin harness helper (optional)

`src/test/helpers/runWeeklyPrepAndAdvance.ts` — only if duplication across tests exceeds ~40 lines; otherwise inline in the integration file to avoid over-abstraction.

### 3. Documentation

- Link this file from `planning/backlog.md` item #6 (one line: slice 1 plan path).
- No new audit index entry unless adding `docs/*audit*.md`.

### 4. Linear

- Create **SPE-2251** (or equivalent) with acceptance criteria copied from below.
- Parent: milestone 6 / Containment Protocol project.

---

## Acceptance criteria

- [x] `weeklyMvpLoopProof.integration.test.ts` runs in CI (`npm run test:run`)
- [x] Test covers: prep mutations → `advanceWeek` → report notes + event feed href sanity + week navigation
- [x] No new persistence shapes; uses existing domain prep APIs and case fields
- [x] `npm run lint` green
- [x] Plan linked from backlog #6

## Shipped artifacts

| Area | Files |
| --- | --- |
| Fixture | `src/test/helpers/weeklyMvpLoopProof.ts` |
| Integration tests | `src/test/weeklyMvpLoopProof.integration.test.ts` |
| Linear | SPE-2251 |

---

## Runner-up slice (after loop proof)

### Infiltration encounter report copy (SPE-2250 optional)

**Goal:** Human-readable report lines for authored probe/cover/leave-behind on cases that activated concealment — e.g. “Cover strain under maintenance cover”, “Leave-behind: risk discovery applied”.

| Area | Work |
| --- | --- |
| Domain | Extend existing report note builders in `advanceWeek` / event emission (no new tracks) |
| Content | Map `infiltrationStage`, override action, selected leave-behind id → copy keys in `src/data/copy.ts` |
| Tests | One integration test per note type; catalog guard optional |

**Why second:** Makes the 33-template content investment visible in the operations report players already drill into.

---

## Backlog queue suggestion

After slice 1 ships, reorder `planning/backlog.md` top items to:

1. MVP loop proof — slice 1 shipped; slice 2+ (triage UI path, persistence reload, 4-week fixture) as needed
2. Infiltration encounter report copy (optional SPE-2250 follow-up)
3. Tuning / QA references (backlog #5)
4. Core UX specs refresh (#4)
5. SPE-781+ / large frameworks only when loop proof is green

---

## See also

- `planning/mvp-scope.md` §7–8 (MVP surfaces and proof points)
- `planning/milestones.md` §8 (Milestone 6 — MVP proof complete)
- `planning/backlog.md` items #1–6
- `planning/infiltration-encounter-content-slice-2.md` (content arc complete)
- `planning/operations-route-drill-down-slice.md` (navigation arc complete)
