# SPE-70 / SPE-2107 slice 3 — Concealment case prep (UI)

## Shipped status

| Field             | Value                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parent**        | [SPE-70 — Hidden-State, Displacement, & Counter-Detection Layer](https://linear.app/spectranoir/issue/SPE-70) (domain: [SPE-2107](https://linear.app/spectranoir/issue/SPE-2107)) |
| **Merged PR**     | [#2326](https://github.com/JamesJedi420/containment-protocol/pull/2326) — `feat(SPE-70): concealment case prep panel on case detail`                                              |
| **Shipped scope** | `ConcealmentCasePrepPanel` + `buildConcealmentCasePrepView`; player `conceal.case.{caseId}` toggle; activation preview via `resolveConcealmentActivation`                         |
| **Validation**    | `concealmentCasePrepView.test.ts`, `CaseDetailPage.test.tsx`; integrated in `WeeklyCasePrepPanel` stack                                                                           |

---

## Original implementation plan (historical)

### Queue context (May 2026, pre-ship)

After infiltration + investigation + leave-behind prep on case detail, concealment case prep closed the fourth covert-ops prep pillar on the same surface.

| Candidate                             | Verdict (historical)                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| **Concealment case prep (this plan)** | Shipped — case-detail UI for weekly activation preview and `conceal.case.*` prep |
| Case prep consolidation               | Shipped — `WeeklyCasePrepPanel`                                                  |
| Backlog #1 full hidden modalities     | Deferred (SPE-781)                                                               |
| SPE-1464 branch continuity            | Shipped                                                                          |
| Route / multi-week navigation         | Shipped separately (backlog #3)                                                  |
| Infiltration follow-through           | Domain + prep largely complete (SPE-521 / SPE-2250)                              |

### Pre-ship gap (resolved)

| Already shipped (domain)                                                             | Gap addressed by this slice                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `resolveConcealmentActivation` + `applyWeeklyConcealmentActivation` in `advanceWeek` | Case-detail preview of activation mode/reason and authored triggers |
| Authored `concealmentTriggers[]` on templates                                        | Trigger summary in prep panel                                       |
| Global flags `conceal.case.*`, …                                                     | Store-driven `conceal.case.{caseId}` toggle from case detail        |
| Infiltration + investigation + leave-behind prep panels                              | Concealment prep as fourth pillar on case detail                    |

### Goal (implemented)

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

| API                                                                         | Use                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------- |
| `resolveConcealmentActivation(case, { globalFlags, hiddenModifierCount? })` | Preview next activation; read-only                |
| `applyConcealmentActivationToCase`                                          | **Do not** call from UI (weekly path only)        |
| `CONCEALMENT_ACTIVATION_TAGS`                                               | Eligibility copy                                  |
| `countCaseHiddenModifiers` (if used elsewhere for recon bridge)             | Optional `hiddenModifierCount` in preview context |
| `setGlobalFlag` / `setPersistentFlag` on store                              | Player `conceal.case.{id}` toggle                 |

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

| Field                     | Source                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `visible`                 | `canShowConcealmentCasePrepOnCase`                                                   |
| `activationTags`          | intersection of case tags with `CONCEALMENT_ACTIVATION_TAGS`                         |
| `triggerRows`             | map `concealmentTriggers` → label, mode, when summary                                |
| `previewApplied`          | `resolveConcealmentActivation(...).applied`                                          |
| `previewMode`             | `hidden` \| `displaced`                                                              |
| `previewReason`           | reason string (e.g. `global-flag:conceal.case.x`, `case-tag`, `authored:trigger-id`) |
| `playerConcealFlagActive` | `readPersistentFlag(game, 'conceal.case.{id}')`                                      |
| `canToggleConcealFlag`    | eligibility + not already applied on case                                            |
| `hiddenModifierCount`     | optional, from map layer when available on case                                      |

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

## Shipped acceptance evidence

- [x] In-progress eligible case shows concealment prep with activation preview reason.
- [x] Player can set/clear `conceal.case.{caseId}` from case detail; next `resolveConcealmentActivation` reflects it.
- [x] Already-concealed cases do not offer bogus toggles (panel hidden when `hiddenState` set).
- [x] `npm run lint` + `npm run test:run` green (3518 tests).
- [x] Plan linked from `planning/backlog.md`.

---

## File touch list (expected)

| Area  | Files                                                                 |
| ----- | --------------------------------------------------------------------- |
| View  | `src/features/cases/concealmentCasePrepView.ts`                       |
| UI    | `src/features/cases/ConcealmentCasePrepPanel.tsx`                     |
| Page  | `src/features/cases/CaseDetailPage.tsx`                               |
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
3. ~~**Remaining templates** without `concealmentTriggers`~~ — shipped batch 4 ([SPE-2249](https://linear.app/spectranoir/issue/SPE-2249), `planning/concealment-triggers-migration-batch-4-slice.md`).

---

## See also

- `src/domain/hiddenStateActivation.ts`
- `src/test/hiddenStateActivation.test.ts`
- `src/test/advanceWeek.concealmentActivation.integration.test.ts`
- `planning/infiltration-case-prep-slice.md`
- `planning/investigation-question-case-prep-slice.md`
- `planning/backlog.md` item #1
