# File work queue actual file-content release delivery (slice 2)

One-page implementation plan. This slice follows metadata-only delivery receipts shipped in `planning/spe-1046-file-work-queue-file-release-delivery-slice-1.md`.

- **Linear:** [SPE-2542](https://linear.app/spectranoir/issue/SPE-2542/file-work-queue-actual-file-content-release-delivery-slice-2)
- **Status:** In Progress
- **Parent context:** [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) historical chain
- **Branch:** `spe-file-work-queue-actual-file-content-release-delivery-slice-2`
- **Base `main` SHA:** `b177998e`

## Goal

Add a deterministic, durable actual file-content release delivery workflow on top of existing release package handoff and metadata-only delivery receipts, without changing mission routing, procurement, weekly progression, or SPE-947 propagation.

## Scope

- **In:** New delivery kind and label for actual file-content release after eligible package handoff
- **In:** Deterministic id/ref creation and sanitizer coverage for the new delivery record kind
- **In:** Store no-op and guard rails for missing prerequisites, missing queue row, and already-recorded delivery
- **In:** Operations mirror action/status surface for actual content release after metadata-only and/or package prerequisites
- **In:** Domain/store/view/page tests for new delivery flow and regression coverage for existing metadata-only behavior
- **Out:** Backend transport/storage service integration
- **Out:** File byte payload persistence beyond the existing deterministic ledger model
- **Out:** Mission routing/procurement/weekly progression changes
- **Out:** SPE-947 propagation and parent closure work

## Acceptance

- [ ] A new release package or delivery mapping exists for actual file-content release and is deterministic.
- [ ] Delivery id/ref format remains stable and sanitizer rejects malformed or mismatched records.
- [ ] Store action only records delivery when prerequisites exist; otherwise no-op with no ledger mutation.
- [ ] Existing metadata-only delivery behavior remains unchanged.
- [ ] Operations mirror displays clear action availability and post-delivery status text for actual content release.
- [ ] No mission routing/procurement/weekly progression/SPE-947 behavior changes occur.

## Validation

- `npm.cmd run test:run -- src/test/affiliationFileWorkQueueFileReleaseDeliveryRecords.test.ts src/app/store/gameStore.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- `npm.cmd run test:run`

## Deferred

- **Backend file transport/storage wiring**
  Owner: dedicated infrastructure/application slice
  Why: This slice only extends deterministic local release ledger behavior.
- **Mission routing/procurement policy coupling**
  Owner: policy/routing slices
  Why: Keep release-delivery workflow isolated from routing policy changes.
- **SPE-947 propagation**
  Owner: SPE-947 successor issue
  Why: Separate parent/thread.

## See also

- `planning/spe-1046-file-work-queue-file-release-delivery-slice-1.md`
- `planning/spe-1046-file-work-queue-release-package-handoff-slice-1.md`
- `planning/spe-1046-file-work-queue-file-release-fulfillment-slice-1.md`
- `planning/spe-1046-file-work-queue-release-outcomes-slice-1.md`
- `planning/backlog.md`
