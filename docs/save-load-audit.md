# Save/Load Audit (Implementation Support)

> Scope: non-invasive support notes for ongoing save/load integration work.
>
> Intent: identify canonical round-trip fields, normalization boundaries, and risks without changing runtime behavior.

## 1) Files and modules involved

### Primary save/load pipeline

- `src/app/store/saveSystem.ts`
  - Save envelope (`GAME_SAVE_KIND`, `GAME_SAVE_VERSION`)
  - `createGameSavePayload`, `serializeGameSave`, `hydrateGameSavePayload`, `loadGameSave`
- `src/app/store/runTransfer.ts`
  - Canonical hydration + migration path
  - `stripGameTemplates`, `hydrateGame`, `migratePersistedStore`
  - Export compatibility (`RUN_EXPORT_KIND`, parse/serialize)
- `src/app/store/gameStore.ts`
  - Persist middleware wiring (`partialize`, `merge`, `version`, `migrate`)
  - Runtime save/load entrypoints (`exportSave`, `importSave`)

### Canonical runtime/authored-state manager

- `src/domain/gameStateManager.ts`
  - Runtime defaults, sanitization, normalization
  - `createDefaultRuntimeState`, `normalizeRuntimeState`, `ensureManagedGameState`
  - Mutation surfaces for flags/location/encounters/clocks/ui/inventory

### Authoring + gating surfaces

- `src/domain/flagSystem.ts`
  - Persistent flags and one-shot API wrappers
- `src/domain/screenRouting.ts`
  - Contextual route/content gating (`ScreenRouteCondition`)
- `src/domain/choiceSystem.ts`
  - Consequence execution and authored choice result model
- `src/features/operations/frontDeskView.ts`
- `src/features/operations/frontDeskChoices.ts`
- `src/features/operations/FrontDeskPage.tsx`
  - Current authored-context usage (`activeContextId`, one-shots, follow-ups)

### State shape + startup normalization

- `src/domain/models.ts` (canonical `GameState`, `RuntimeState`, `GameUiDebugState`)
- `src/data/startingState.ts` (`createStartingState` bootstrapping)
- `src/domain/teamSimulation.ts` (`syncTeamSimulationState`, `normalizeGameState`)

### Existing regression coverage (save/load-focused)

- `src/app/store/saveSystem.test.ts`
- `src/app/store/runTransfer.test.ts`
- `src/test/flagSystem.test.ts`
- `src/test/screenRouting.test.ts`
- `src/test/choiceSystem.test.ts`
- `src/app/store/gameStore.test.ts`

---

## 2) Canonical state fields that must round-trip

### Top-level `GameState` (persisted state)

- Identity/time/randomness
  - `week`, `rngSeed`, `rngState`
- Simulation status
  - `gameOver`, `gameOverReason`
  - `directiveState`
- Core simulation data
  - `agents`, `staff`, `candidates` (+ `recruitmentPool` compatibility alias)
  - `teams`, `cases`, `factions`, `contracts`
  - `reports`, `events`, `relationshipHistory?`
- Economy/queues
  - `inventory`, `trainingQueue`, `productionQueue`, `market`, `partyCards?`
- Meta/runtime
  - `runtimeState` (full nested structure below)
- Agency progression
  - Canonical: `agency`
  - Transitional mirrors still present: `containmentRating`, `clearanceLevel`, `funding`
- Config/system
  - `config`, `academyTier`, `globalPressure?`, `responseGrid?`, `caseQueue?`

### Nested `runtimeState` (must round-trip)

- `player`
- `globalFlags` (`Record<string, GameFlagValue>`)
- `oneShotEvents` (`Record<string, OneShotEventState>`)
- `currentLocation`
  - `hubId`, `locationId?`, `sceneId?`, `updatedWeek`
- `sceneHistory[]`
  - `sceneId`, `locationId`, `week`, `outcome?`, `tags?`
- `encounterState`
  - per-encounter `status`, `phase?`, modifier arrays, flags, `lastUpdatedWeek`
- `progressClocks`
  - `id`, `label`, `value`, `max`, `hidden?`, `completedAtWeek?`
- `ui`
  - selection keys, `inspectorPanel?`
  - `authoring?` breadcrumbs (`activeContextId`, `lastChoiceId`, `lastNextTargetId`, `lastFollowUpIds`, `updatedWeek`)
  - `debug` (`enabled`, `flags`)

---

## 3) Fields that appear derived and should not be primary serialized sources

Treat these as normalized/derived mirrors or post-hydration artifacts; do not make them the sole source of truth:

- `templates`
  - Explicitly excluded via `stripGameTemplates` and re-injected from code.
- Agency mirror fields
  - `containmentRating`, `clearanceLevel`, `funding` are transitional mirrors; canonical is `agency`.
- Recruitment mirror
  - `recruitmentPool` mirrors candidates pipeline semantics.
- Team-derived internals
  - Team assignment/status/derived fields are normalized via `syncTeamSimulationState`.
- Queue/model defaults inferred during sanitize
  - Missing training/production details are backfilled from catalogs/program definitions.
- Runtime default selections
  - Missing runtime data defaults to `operations-desk` / `dashboard` location values.

---

## 4) Known normalization/hydration hooks

### Save/load entrypoints

- `serializeGameSave` / `loadGameSave` (`saveSystem.ts`)
- `hydrateGameSavePayload` supports both:
  - explicit save wrapper (`containment-protocol-save`)
  - backward-compatible run export wrapper (`containment-protocol-run`)

### Core hydration/normalization

- `hydrateGame` (`runTransfer.ts`)
  - Sanitizes most top-level domains
  - Calls `normalizeRuntimeState(...)`
  - Calls `syncTeamSimulationState(...)`
  - Calls `refreshContractBoard(...)`
- `migratePersistedStore` (`runTransfer.ts`)
  - Version-based persisted store migration
- Zustand rehydrate merge (`gameStore.ts`)
  - Uses `hydrateGame(ps.game, currentState.game)`

### Runtime-state specific

- `normalizeRuntimeState` (`gameStateManager.ts`)
  - Enforces shape, trims invalid entries
- `ensureManagedGameState` (`gameStateManager.ts`)
  - Ensures runtime + inventory canonical consistency before reads/writes

---

## 5) Potential versioning risks

- **Dual envelope formats in loader**
  - Save kind + run-export kind are both accepted; future migrations must keep dispatch logic clear.
- **Store version drift**
  - `GAME_STORE_VERSION` and `GAME_SAVE_VERSION` are independent; migration sequencing needs explicit ownership.
- **Schema-soft migrations on events**
  - Event payload migration is permissive and can coerce unknowns; accidental silent data flattening is possible.
- **Runtime sanitization drops invalid entries**
  - Invalid flags/one-shots/scene entries are omitted rather than preserved; debugging malformed saves may be harder.
- **Transitional mirrors (`agency` vs legacy fields)**
  - Inconsistent writes between canonical and mirrors can regress if migration ordering changes.

---

## 6) Suggested manual test scenarios for save/load

1. **Baseline round-trip**
   - Mid-run save/load with active teams, active queues, market transactions, and reports.
2. **Runtime authored context round-trip**
   - Ensure `runtimeState.ui.authoring.*` breadcrumbs survive exactly.
3. **One-shot idempotency**
   - Consume one-shot, save/load, verify it cannot fire again and `firstSeenWeek` remains stable.
4. **Flag-gated content continuity**
   - Set persistent flags, save/load, verify screen-route conditions still resolve same branch.
5. **Scene history continuity**
   - Record multiple scene visits, save/load, ensure ordering/tags/outcome intact.
6. **Encounter runtime continuity**
   - Preserve encounter `phase/status/flags` and modifier ids across save/load.
7. **Progress clocks boundary checks**
   - Save with completed and hidden clocks; ensure clamping/completion semantics persist.
8. **Agency mirror consistency**
   - Save/load with non-default agency values; verify `agency` and legacy mirror fields match.
9. **Malformed payload hardening**
   - Invalid JSON, wrong kind/version, and partial malformed runtime slices.
10. **Backward-compat loading**
    - Load legacy run-export payload and verify no crashes/data loss in key systems.

---

## 7) Ambiguous areas to verify before finalizing

- **Single canonical source for agency progression**
  - Confirm long-term plan/timeline for removing legacy top-level mirrors.
- **Semantics of `ui.debug.enabled` during normalization**
  - Current sanitize path can keep flags while setting enabled false unless explicitly set; confirm intended UX.
- **Contract board regeneration behavior**
  - `refreshContractBoard` runs post-hydrate; verify expectations around preserving generated offers/history on restore boundaries.
- **Event schema migration strictness**
  - Current migration is tolerant and coercive; confirm if future save versions need stricter rejection paths.
- **Authored context persistence scope**
  - `ui.authoring` breadcrumbs are persisted; confirm if any entries should be session-only vs save-file durable.
- **Candidate/recruitment alias precedence**
  - `hydrateGame` prioritization between `candidates` and `recruitmentPool` should stay explicit and tested across versions.
