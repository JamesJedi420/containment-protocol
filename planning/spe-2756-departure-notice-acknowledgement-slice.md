# SPE-2756 departure notice acknowledgement

**Status**: See Linear.

[SPE-2756](https://linear.app/spectranoir/issue/SPE-2756) owns notice state. James Dye is accountable and Codex executes CP-LANE-A-20261124-1820-NEXT on `codex/spe-2756-departure-notice-acknowledgement`, based on MSI `main` at `f71f7eb0316f93f4d054db0987217c7fcd133c66`. The live structured start check returned ready with zero open or draft PRs. The [SPE-2726 producer](https://github.com/JamesJedi420/containment-protocol/pull/3380) and [SPE-3462 natural expiry and reload evidence](https://github.com/JamesJedi420/containment-protocol/pull/5101) are on the base. The parent remains open.

## Acceptance

Front Desk’s Recent Reports / Events exposes departure history through the existing event presentation projection. Each newly produced departure appears unread. Players can search by name and mark it read, then acknowledge it using the same event-backed row. Repeating either command, using a stale ID, or changing one notice leaves sibling statuses and the event ledger intact. Historical notices without saved state start read. Both existing save paths reload explicit states without generating another event or changing a departure reason, destination, or visibility.

The write boundary is `src/domain/operationNoticeState.ts` and `src/domain/models.ts` for the additive contract, `src/app/store/gameStore.ts` and `src/app/store/runTransfer.ts` for lifecycle and hydration, `src/features/dashboard/eventFeedView.ts` for the notice projection, `src/features/operations/FrontDeskPage.tsx` and `src/data/copy.ts` for the live entry point and accessible controls, `src/app/store/runTransfer.test.ts` and `src/features/operations/FrontDeskPage.test.tsx` for regression coverage, and this slice plus `SCHEMA_REGISTRY.md` for the save contract.

Use existing weekly polling, the event feed, native button activation, keyboard and shared controller traversal, and the canonical save paths. Validate actual week-close production from a scouted candidate fixture, read and acknowledgement transitions, history retention, sibling isolation, and legacy and malformed saves. Run the SPE-3348 validator selection, build, lint, targeted and hosted checks. Review against the six pre-ship passes. Use direct evidence for this bounded checkpoint. The release coordinator owns the separate merge and deployment.
