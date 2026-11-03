# SPE-75 — Modifiable data-pack planning mirror and surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2492](https://linear.app/spectranoir/issue/SPE-2492) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2486](https://linear.app/spectranoir/issue/SPE-2486) per `planning/modifiable-data-pack-runtime-import-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2492 — Modifiable data-pack planning mirror and surfacing (slice 1)](https://linear.app/spectranoir/issue/SPE-2492) |
| **Status** | **Shipped** — PR #2904 @ `30b0099e` |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-modifiable-data-pack-surfacing-slice-1` |
| **Base `main` SHA** | `2e655e18` (pre SPE-2491 merge; branch includes SPE-2491 publish-queue live orchestration until main sync) |

## Goal

Surface persisted `modifiableDataPackRecords` via read-only planning mirror and CP-neutral projection helpers — no publish-queue changes, weekly orchestration, mission triage, or SPE-75 parent reopen.

## Prerequisite (on branch)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Validation envelope  | `src/domain/modifiableDataPackValidation.ts` (SPE-2479) |
| Runtime persistence | `modifiableDataPackRecords` on `GameState` (SPE-2486) |
| Planning mirror template | `publishQueueMirrorView.ts` + `PublishQueueMirrorPage.tsx` (SPE-2485) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `modifiableDataPackSurfacing.ts` projection helpers (CP-neutral labels) | Publish-queue or GitHub API changes |
| Planning mirror page + route `/modifiable-data-packs` + Front Desk link | SPE-75 parent reopen |
| Mirror + projection tests | Weekly `advanceWeek` orchestration (slice 2) |
| Slice doc (this file) + backlog handoff | Publish automation integration |
| Docs cross-ref in `docs/contribution-and-release-operations.md` | Mission triage chips (blocked) |

## Surfacing contract

- **Read-only mirror** — display hydrated `modifiableDataPackRecords`; no mutations from mirror surface.
- **Safe labels** — pack id, schema version, pack kind, import status, section summary, author ref, issue link.
- **Empty map** — mirror `isEmpty: true`; no throw.
- **Status discrimination** — `applied` vs `needs_revision` visible in mirror summary and per-record rows.
- **Rejected on hydrate** — invalid/rejected payloads never appear in mirror (sanitize drops them).

## Acceptance

- [x] Empty `modifiableDataPackRecords` renders mirror empty state without throw
- [x] Valid canonical fixture records display safe labels (id, schema version, pack kind, import status)
- [x] Rejected / invalid hydrated entries do not corrupt mirror output
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green (unverified locally — Node.js not on agent PATH; IDE lints clean)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/modifiableDataPackSurfacing.ts` |
| View   | `src/features/operations/modifiableDataPackMirrorView.ts` |
| UI     | `src/features/operations/ModifiableDataPackMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts` |
| Copy   | `src/data/copy.ts` |
| Tests  | `src/test/modifiableDataPackSurfacing.test.ts`, `src/features/operations/modifiableDataPackMirrorView.test.ts`, `src/features/operations/ModifiableDataPackMirrorPage.test.tsx` |
| Plan   | `planning/modifiable-data-pack-surfacing-slice-1.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly orchestration / report notes | SPE-75 follow-up child (slice 2) | Mirror must land before weekly tick |
| Publish automation integration for pack import | SPE-75 follow-up child | Out of surfacing boundary |
| Mission triage modifiable-pack chips | Backlog | Mission triage full refresh blocked |

## See also

- `planning/modifiable-data-pack-runtime-import-slice-1.md`
- `planning/modifiable-data-pack-validation-slice-1.md`
- `planning/publish-queue-surfacing-slice-1.md`
- `planning/backlog.md`
