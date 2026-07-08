# SPE-1046 - File work queue file-content release delivery (slice 1)

One-page implementation plan. This slice shipped on `main` in commit `97da46e3` after file work queue release package handoff / base `14b3f29a`.

- **Linear:** SPE-1046 chain (historical shipped slice)
- **Status:** Shipped
- **Parent:** [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)
- **Branch:** `spe-1046-file-work-queue-file-release-delivery-slice-1`
- **Base `main` SHA:** `14b3f29a`

## Goal

Persist a durable metadata-only file-release delivery receipt after safe package handoff, without introducing file-byte transport, backend/storage services, mission routing mutations, procurement rules, weekly progression changes, or SPE-947 propagation.

## Scope

- **In:** Persisted `affiliationFileWorkQueueFileReleaseDeliveryRecords` ledger keyed by deterministic delivery id
- **In:** Store action gated on existing valid package handoff records
- **In:** Operations mirror controls/status after package handoff
- **In:** Hydration and page/view/store/domain tests for delivery records and no-op paths
- **Out:** Actual file payload storage, transport, or download
- **Out:** Mission routing, procurement, or weekly progression
- **Out:** SPE-947 propagation work
- **Out:** SPE-1046 parent closure

## Acceptance

- [x] Delivery records use deterministic id/ref:
  - `affiliation-file-release-delivery:${workQueueEntryId}:${sourcePackageKind}`
  - `file-release-delivery:${workQueueEntryId}:${sourcePackageKind}`
- [x] `safe_file_handoff_package` maps to `metadata_only_file_release_delivered` with label `Metadata-only file release delivered`.
- [x] Sanitizer drops invalid, mismatched-key, mismatched-ref, duplicate-id, non-integer-week, and wrong source/package pair records.
- [x] Delivery records persist through hydrate/export and do not mutate package/fulfillment ledgers.
- [x] Store action no-ops for missing package handoff, absent queue row, and already-recorded delivery.
- [x] Operations mirror shows `Record file delivery` only after package handoff and then shows `Metadata-only file release delivered W${week} (${deliveryRef})`.
- [x] File bytes/backends/download URLs/mission routing/procurement/weekly progression/SPE-947 remain untouched.
- [x] SPE-1046 parent remains **Backlog**.

## Validation

- `npm.cmd run test:run -- src/test/affiliationFileWorkQueueFileReleaseDeliveryRecords.test.ts src/app/store/gameStore.test.ts src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx`
- `npm.cmd run lint`
- Touched-file Prettier check.
- `git diff --check`
- `npm.cmd run test:run`

## Deferred

- **Actual file content release**
  Owner: SPE-1046 follow-up child
  Why: This slice records metadata-only delivery receipts, not file payload transport.
- **Mission routing / procurement**
  Owner: SPE-1046 follow-up child
  Why: Existing routing/procurement gates remain separate from this receipt ledger.
- **SPE-947 propagation work**
  Owner: SPE-947 child
  Why: Separate parent thread.
- **SPE-1046 parent closure**
  Owner: SPE-1046
  Why: Broader parent acceptance remains open.
- **Successor issue creation for actual file-content delivery**
  Owner: Human / next agent
  Why: Follow-up scope must be tracked under a new active successor issue.

## See also

- `planning/spe-1046-file-work-queue-release-package-handoff-slice-1.md`
- `planning/spe-1046-file-work-queue-file-release-fulfillment-slice-1.md`
- `planning/spe-1046-file-work-queue-release-outcomes-slice-1.md`
- `planning/backlog.md`
