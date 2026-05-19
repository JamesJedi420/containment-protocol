# SPE-70 / SPE-2107 slice 3 — Concealment case prep (UI)

## Recommendation (next best issue)

After the infiltration + investigation + leave-behind prep stack on case detail, the highest-leverage **scoped** follow-up is a **concealment case prep panel**: make weekly `resolveConcealmentActivation` legible and optionally let the player set `conceal.case.{caseId}` before `advanceWeek`.

| Candidate | Why / why not |
| --- | --- |
| **Concealment case prep (this plan)** | Domain shipped (`hiddenStateActivation.ts`, weekly wire in `advanceWeek`); **zero** case-detail UI today; closes backlog #1 player-facing gap; same patterns as SPE-626 / SPE-521 / SPE-2247 prep slices. |
| Case prep consolidation | **Done** — `WeeklyCasePrepPanel` on case detail (`weeklyCasePrepView.ts`). |
| Backlog #1 “full” hidden modalities | Too broad (SPE-781, modality matrix); defer. |
| SPE-1464 branch continuity | **Done** in repo + Linear; no new slice. |
| Route / multi-week navigation (backlog #3) | High value but different surface; does not complete covert-ops prep arc. |
| Infiltration follow-through (backlog #2) | Largely satisfied by SPE-521 stack + prep panel; remaining work is content/encounter depth, not one UI slice. |

**Suggested Linear child:** under SPE-70 or SPE-2107 — “Concealment case prep panel (slice 3 UX)”.

---

## Why this is next

| Already shipped | Gap |
| --- | --- |
| `resolveConcealmentActivation` + `applyWeeklyConcealmentActivation` in `advanceWeek` | Players cannot see *why* a case will go hidden/displaced or what triggers apply |
| Authored `concealmentTriggers[]` on templates (SPE-2113 / 2155 / 2202) | No preview of which authored row would win |
| Global flags `conceal.case.*`, `conceal.displace.*`, `conceal.*` | Only used in tests / sim; no store-driven prep action from case detail |
| Infiltration + investigation + leave-behind prep panels | Concealment is the missing fourth pillar on the same page |

---

## Goal

On **in-progress** cases that can still activate concealment (`hiddenState === undefined`), show:

1. Current concealment posture (none / would activate / already hidden or displaced).
2. **Next-week activation preview** from `resolveConcealmentActivation` (mode, reason code).
3. Authored trigger summary (ids + conditions) when `concealmentTriggers` present.
4. Optional player prep: toggle **`conceal.case.{caseId}`** via existing `setGlobalFlag` (deterministic, matches integration tests).

Do **not** add new weekly hooks, modalities, or persistence beyond flags already used by the domain.

---

## Out of scope (defer)

- SPE-781 tiered reveal payloads.
- Manual assignment of `hiddenState` on the case instance (bypasses resolver).
- Hub-wide “go covert” bulk actions.
- Developer-only debug overlay (can be a thin follow-up using same view model).
- Consolidating four panels into one accordion (separate small slice).

---

## Domain reuse (no new simulation math)

| API | Use |
| --- | --- |
| `resolveConcealmentActivation(case, { globalFlags, hiddenModifierCount? })` | Preview next activation; read-only |
| `applyConcealmentActivationToCase` | **Do not** call from UI (weekly path only) |
| `CONCEALMENT_ACTIVATION_TAGS` | Eligibility copy |
| `countCaseHiddenModifiers` (if used elsewhere for recon bridge) | Optional `hiddenModifierCount` in preview context |
| `setGlobalFlag` / `setPersistentFlag` on store | Player `conceal.case.{id}` toggle |

### Eligibility helpers (new, thin)

```ts
// src/domain/concealmentCasePrep.ts (or features view only)
canShowConcealmentCasePrepOnCase(case) =>
  case.status === 'in_progress' && case.hiddenState === undefined

canPlayerSetConcealCaseFlag(case) =>
  canShowConcealmentCasePrepOnCase(case) &&
  (hasConcealmentActivationTag(case) || (case.concealmentTriggers?.length ?? 0) > 0)
```

Already hidden/displaced cases: show **read-only status** strip (no flag toggle), or hide panel — pick one in implementation (recommend read-only one-liner under dossier, no full panel).

---

## View model

`buildConcealmentCasePrepView(caseData, game)` →

| Field | Source |
| --- | --- |
| `visible` | `canShowConcealmentCasePrepOnCase` |
| `activationTags` | intersection of case tags with `CONCEALMENT_ACTIVATION_TAGS` |
| `triggerRows` | map `concealmentTriggers` → label, mode, when summary |
| `previewApplied` | `resolveConcealmentActivation(...).applied` |
| `previewMode` | `hidden` \| `displaced` |
| `previewReason` | reason string (e.g. `global-flag:conceal.case.x`, `case-tag`, `authored:trigger-id`) |
| `playerConcealFlagActive` | `readPersistentFlag(game, 'conceal.case.{id}')` |
| `canToggleConcealFlag` | eligibility + not already applied on case |
| `hiddenModifierCount` | optional, from map layer when available on case |

**Preview context:** pass `game.runtimeState?.globalFlags ?? game.globalFlags` (match `advanceWeek` concealment context).

---

## UI

`ConcealmentCasePrepPanel.tsx` on `CaseDetailPage` — **first** in the prep stack (activation precedes infiltration):

1. Concealment prep (new)
2. Infiltration prep
3. Stealth leave-behind
4. Investigation questions

### Panel sections

- **Status:** “Open posture” vs “Will go hidden next week” vs flag-driven preview.
- **Triggers:** compact list of authored triggers (if any).
- **Player action:** “Request covert posture” / “Clear covert request” toggling `conceal.case.{caseId}` when `canToggleConcealFlag`.
- **Reason line:** humanized `previewReason` (map known prefixes to short labels).

Reuse `panel panel-support`, `aria-label="Concealment case prep"`, button patterns from `InfiltrationCasePrepPanel`.

---

## Store

No new store method required if using existing:

```ts
setGlobalFlag(`conceal.case.${caseId}`, true)
setGlobalFlag(`conceal.case.${caseId}`, false) // or clearPersistentFlag if project convention prefers
```

Guard: only when `canPlayerSetConcealCaseFlag(case)`; no-op otherwise (mirror infiltration override guards).

---

## Tests (TDD order)

1. **View** — `src/test/concealmentCasePrepView.test.ts`
   - in_progress + no hiddenState → visible
   - with `conceal.case.{id}` flag → preview applied, reason contains global-flag
   - with concealment tag only → preview applied, reason `case-tag`
   - resolved / already hidden → not visible (or read-only policy)
2. **Store** (optional) — flag toggle only when eligible
3. **`CaseDetailPage.test.tsx`** — panel renders; toggle updates `globalFlags`
4. **Regression** — `advanceWeek.concealmentActivation.integration.test.ts` unchanged; optional test that flag set via helper matches UI path

---

## Acceptance criteria

- [x] In-progress eligible case shows concealment prep with activation preview reason.
- [x] Player can set/clear `conceal.case.{caseId}` from case detail; next `resolveConcealmentActivation` reflects it.
- [x] Already-concealed cases do not offer bogus toggles (panel hidden when `hiddenState` set).
- [x] `npm run lint` + `npm run test:run` green (3518 tests).
- [x] Plan linked from `planning/backlog.md`.

---

## File touch list (expected)

| Area | Files |
| --- | --- |
| View | `src/features/cases/concealmentCasePrepView.ts` |
| UI | `src/features/cases/ConcealmentCasePrepPanel.tsx` |
| Page | `src/features/cases/CaseDetailPage.tsx` |
| Tests | `src/test/concealmentCasePrepView.test.ts`, `CaseDetailPage.test.tsx` |

Optional thin domain file: `src/domain/concealmentCasePrep.ts` if eligibility is reused outside React.

---

## Risks

- **Flag namespace collision:** only touch `conceal.case.{caseId}`; never write `conceal.` prefix from UI without explicit product decision.
- **Preview drift:** preview must use same `globalFlags` source as `applyWeeklyConcealmentActivation` in `advanceWeek` — verify call site when wiring.
- **Panel clutter:** addressed via weekly prep consolidation on case detail.

---

## Follow-ups (after this slice)

1. ~~**Covert ops prep consolidation**~~ — shipped (`WeeklyCasePrepPanel`, collapsible sections, shared forensic strip).
2. ~~**Concealment event feed**~~ — shipped (`concealment.activated` event + report notes; `planning/concealment-activation-event-feed-slice.md`).
3. **Remaining templates** without `concealmentTriggers` — content-only batches, not UI.

---

## See also

- `src/domain/hiddenStateActivation.ts`
- `src/test/hiddenStateActivation.test.ts`
- `src/test/advanceWeek.concealmentActivation.integration.test.ts`
- `planning/infiltration-case-prep-slice.md`
- `planning/investigation-question-case-prep-slice.md`
- `planning/backlog.md` item #1
