# Infiltration and concealment — report / event-feed QA matrix

## Purpose

Bounded **sign-off matrix** for batch-4 covert operations surfacing. Use during implementation review, regression after tuning constant changes, and milestone QA.

**Tuning constants:** `tuning/infiltration-probe-and-concealment.md`  
**UX contract:** `ux/operations-report.md` §5.3.1, `ux/navigation-map.md` §3.5.1

---

## How to use

For each row:

1. Set up the fixture conditions in the **Setup** column.
2. Run `advanceWeek` (and prep helpers where noted).
3. Assert **Report notes**, **Event feed** (if events persisted), and **Must not** columns.
4. Prefer automated tests listed in **Test anchor**; manual check only when no test exists yet.

General rules (all rows):

- Report note `type` equals event `type` for infiltration family rows.
- `metadata.probeAction` / `probeActionSource` match prep when override or authored plan applied.
- Event feed `buildEventFeedView` returns `href` → `/report/{week}` for infiltration and concealment events.

---

## Matrix

| ID | Invariant | Setup | Report notes (expect) | Event feed (expect) | Must not | Test anchor |
| --- | --- | --- | --- | --- | --- | --- |
| IC-01 | Routine week encounter | Hidden + infiltration tag; low awareness (e.g. 0.05/0.02); no threshold cross; case `in_progress` | One `infiltration.weekly_encounter`; content includes case title + probe clause + track clause | If event persisted: type `infiltration.weekly_encounter`, tone **neutral**, links to report week | Second `weekly_encounter`; threshold types same week | `infiltrationEncounterReportCopy.test.ts` (routine week) |
| IC-02 | No duplicate routine when threshold fires | Hidden + media/public tags; awareness ~0.3; cover profile present | At least one `infiltration.cover_strain` or other threshold type; **zero** `weekly_encounter` | Threshold types warning/danger per kind; no neutral weekly duplicate | `weekly_encounter` count > 0 | `infiltrationEncounterReportCopy.test.ts` (dup check) |
| IC-03 | Override metadata on threshold note | `applyInfiltrationWeeklyProbeActionOverride` → `probe_route`; awareness high enough for `cover_strain` | `infiltration.cover_strain` with enriched summary (route probe / override); `metadata.probeAction` = `probe_route`, `probeActionSource` = `override` | Same payload fields in feed detail | Missing `probeAction` on note metadata | `infiltrationEncounterReportCopy.test.ts` (override) |
| IC-04 | Authored plan in routine summary | MVP fixture / ops-004 with `infiltrationProbePlan`; no threshold events | `weekly_encounter` or threshold note includes authored/access probe wording per plan | — | Client-only copy not backed by domain summary | `infiltrationEncounterReportNotes.test.ts`, `weeklyMvpLoopProof.integration.test.ts` |
| IC-05 | Leave-behind with custody | Tuned hidden case `weeksRemaining: 1`, leave-behind id, success + active `stealthLeaveBehindMission` + non-empty `custodyLossRefs` | `infiltration.leave_behind_tradeoff`; mentions leave-behind label; optional custody strain line | `infiltration.leave_behind_tradeoff`, tone **warning**, report href | Note only in mission explanation, not report notes | `infiltrationEncounterReportCopy.test.ts` (custody), `stealthLeaveBehindMission.test.ts` |
| IC-06 | Leave-behind without custody | Hidden resolve with `leave-behind:burn-tool` (empty registry custody refs) | Still `infiltration.leave_behind_tradeoff` with label + score reason; no fabricated custody line | Same event type emitted | Skip tradeoff note entirely; `Investigation strain:` in copy | `infiltrationEncounterReportCopy.test.ts` (IC-06); registry `leave-behind:burn-tool` |
| IC-07 | Concealment activation note | `conceal.case.{id}` flag; eligible case not yet hidden | `concealment.activated` on activation week | `concealment.activated`, report href | Probe events before hidden state set | `advanceWeek` concealment tests; MVP slice 2 save/load |
| IC-08 | Probe after concealment | Same week: concealment then probe | If probe runs: infiltration notes reflect **post-tick** tracks in summary | — | Pre-tick awareness in enriched threshold text | `buildInfiltrationEncounterReportContextAfterProbe` unit behavior |
| IC-09 | Save/load prep continuity | Week 1: override + leave-behind + forensic flag; serialize/load; week 2 advance | Week 2 report includes infiltration or concealment family note | — | Lost override or leave-behind id on case | `weeklyMvpLoopProof.slice2.integration.test.ts` |
| IC-10 | Event ↔ report parity | Any infiltration event draft in weekly batch | Matching report note with same `type` and summary substring | Feed title uses type label; detail includes awareness % when present | Report note missing for emitted infiltration event | `events.coverage.test.ts`, `buildDeterministicReportNotesFromEventDrafts` |
| IC-11 | Non-eligible case | `hiddenState` unset and no activation; or missing infiltration-family tag | No infiltration probe notes | No infiltration events | Spurious `weekly_encounter` | `infiltrationProbe` eligibility tests |
| IC-12 | Report week navigation | Multiple reports (non-contiguous weeks OK) | — | — | Nav shows missing week as link | `reportWeekNavigation` tests; `weeklyMvpLoopProof.slice2` (4-week) |

---

## Edge-case checklist crosswalk

Manual regression should also walk **`qa/edge-case-checklist.md` §12.6–12.8** (infiltration-specific bullets) when changing `advanceWeek` or `reportNotes` infiltration branches.

---

## Failure triage

| Symptom | Likely owner |
| --- | --- |
| Event in feed, no report note | `reportNotes.ts` missing `case` for event type |
| Report note, no event | Event draft not pushed or filtered before persist |
| Duplicate weekly + threshold | `applyWeeklyInfiltrationProbe` guard |
| Override not in metadata | `pushInfiltrationEncounterEventDraft` missing `context` option |
| Leave-behind only in mission text | Mission resolve path not calling tradeoff draft |
| Wrong awareness in copy | Context built from pre-tick case instead of post-tick |

---

## See also

- `tuning/infiltration-probe-and-concealment.md`
- `qa/integration-tests.md` — Scenario F
- `qa/edge-case-checklist.md` §12.6+
- `qa/determinism-tests.md` — report note ordering
