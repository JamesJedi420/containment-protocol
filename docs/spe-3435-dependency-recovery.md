# SPE-3435 dependency recovery evidence

Approved owner: [SPE-3435](https://linear.app/spectranoir/issue/SPE-3435).
Parent SPE-3434 remains open for all four approved children.
Base: `3c65f387f00468231742aa739b00911a17399396`.
Branch: `jamesdyedbq/spe-3435-domain-to-feature-dependency-inversion-recovery-cp-core`.

## Ownership and consumer reconciliation

- `screenRouting.ts`: remove the unused `appRoutes` example and React import.
  Repository search found no consumers of that export. `src/app/App.tsx` owns
  active React routes and does not register `/incidents/major`; the incident
  README explicitly documents the page as dormant. No active route changes.
- `frontDeskTriggers.ts` and `frontDeskChoices.ts`: relocate authored definitions
  to domain, retaining feature compatibility re-exports. Existing feature, choice,
  scene-trigger, store-test and save-test consumers retain their import paths.
- `frontDeskAuthored.ts`: own canonical branch conditions, ordering, selected
  notice/route IDs, authored choices and selected subjects. Reuse domain agency,
  faction, public disclosure, branching, trigger and choice helpers.
- `frontDeskView.ts`: project those selections into existing copy, tones and action
  links. Retain hub projection and navigation ownership in the feature. Its page,
  developer-overlay and test consumers keep the same public view interfaces.
- `stabilityLayer.ts`: consume authored metadata directly, retaining target/context
  catalogs, issue IDs, categories, severities and recovery output. Director fallback
  availability uses the selected authored route; copy remains feature-owned.

No GameState, simulation outcomes, persistence, hydration, balance, CI configuration
or package declarations change. Store inversions, cross-feature classifications,
general enforcement and validator selection remain with SPE-3436, SPE-3438,
SPE-3437 and SPE-3348 respectively. No new issue scope was created.

## Validation and review

- Focused command: `npm run test:run -- src/test/frontDeskAuthored.contract.test.ts src/test/screenRouting.test.ts src/test/stabilityLayer.test.ts src/test/sceneTriggers.test.ts src/test/choiceSystem.test.ts src/test/frontDeskView.test.ts src/app/store/saveSystem.test.ts src/features/operations/FrontDeskPage.test.tsx src/features/incidents/MajorIncidentPage.test.tsx`.
- Contract regression checks metadata/view parity, state immutability, fallback
  availability and the recovered interfaces' import directions.
- Focused result: 9 files, 93 tests passed. `npm run lint`, targeted Prettier checks
  and `git diff --check` passed.
- A temporary differential test loaded the original main briefing/stability
  implementations and compared briefing JSON and complete stability reports over
  47 states: starting/consumed tutorial, five weeks, three response postures,
  valid queued follow-ups and invalid targets. All matched. Temporary baseline
  copies were removed after execution to avoid retaining duplicate implementations.
- `npm run build`: base and branch each emit 685 TypeScript diagnostics. Comparing
  file/code/message with line numbers removed found no additions or removals.
  No new diagnostic points to a recovered interface or consumer. Build remains
  blocked by baseline drift under the existing TypeScript recovery owners.
- Local environment: Node 24.18.0; installed packages differ from tracked manifest
  and lockfile requirements (`npm ls --depth=0` reports invalid versions), including
  Vitest 4.1.11. Local validation does not establish the Node 22 locked CI result.
- Independent read-only agent review of the full diff and new interfaces found no
  actionable P0/P1 findings. Trigger/choice definitions were checked as AST-identical
  after import relocation; branch order, copy, routing and canonical pressure
  interpretation were checked against main.
- Six pre-ship passes covered scope/integration, edge cases, determinism/state,
  regressions, documentation and cleanup. No unresolved in-boundary finding.

Keep SPE-3435 In Progress pending PR/CI evidence and the repository closure rule.
No automatic merge is authorized by this task.
