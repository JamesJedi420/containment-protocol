# Contribution Intake and Modular Release Operations (SPE-75)

## Purpose

This document captures **project operational infrastructure**: how external or internal contributions move from raw submission to **normalized, credited, packaged releases** — not gameplay simulation.

## Workflows (explicit stages)

1. **Intake** — channel, format, and license check; automated lint where applicable.
2. **Triage** — risk, scope, and dependency classification (content vs code vs doc-only).
3. **Review** — human or maintainer review against acceptance criteria and architecture contracts.
4. **Normalization** — structure fixes, naming alignment, migration hooks, test fixtures.
5. **Crediting** — CONTRIBUTORS / changelog / attribution metadata per project policy.
6. **Release packaging** — version bump, artifact bundling, compatibility notes, segmented announcements.

## Correction and clarification packets

Non-release **correction or clarification packets** (errata, hotfix docs, semver patches) ship **without** full feature fanfare when they only fix correctness or safety.

## Compatibility declarations

Releases declare **compatibility surfaces**: engine/runtime versions, save format expectations, schema versions (`SCHEMA_REGISTRY.md`), and breaking-change callouts.

Domain packaging baseline: `src/domain/modularReleasePackaging.ts` (SPE-2475) consumes accepted curation output from `src/domain/contributionIntakeCuration.ts` and emits sorted compatibility declarations plus delivery assumptions — no publish side effects.

## Artifact-type packaging

Different artifact types (domain templates, UX specs, tuning tables, binaries if any) use **distinct packaging rules** — do not mix incompatible consumers in one bundle without explicit manifests.

## Segmented feedback channels

Separate **bug reports**, **balance discussion**, **security disclosures**, and **RFC-style design feedback** so triage stays deterministic and low-noise.

Domain feedback baseline: `src/domain/segmentedFeedbackWorkflow.ts` (SPE-2476) accepts structured channel payloads and emits weighted ranking decisions with channel-type discrimination and grouping policy — no publish side effects.

## Disaster playbook variants

Disaster-type playbooks carry distinct procedural assumptions and resource risks. Teams under pressure must apply the variant that matches the active disaster — wrong-document application fails deterministically rather than silently.

Domain playbook baseline: `src/domain/playbookWrongDocumentFailure.ts` (SPE-2477) accepts structured playbook variant payloads and emits bounded application decisions with variant-type discrimination and wrong-document failure — no publish side effects.

## Submission governance

- **Required metadata** — issue link, scope statement, test evidence for code.
- **Branch / PR policy** — small reviewable units; no silent force-push to protected branches.
- **Noncanonical side-content** — fan mods, unofficial tools, or narrative experiments live **outside** canonical release manifests unless explicitly promoted through intake.

Domain governance baseline: `src/domain/submissionGovernanceRights.ts` (SPE-2478) accepts structured submission governance payloads and emits bounded rights/policy decisions with tier discrimination, license enforcement, and attribution assumptions — no publish side effects.

## Modifiable data packs

Authoring tools and contribution pipelines may ship **modifiable data packs** (tuning tables, reference sheets, doctrine notes) with typed section definitions. Packs must pass schema validation before import — corrupt structure fails safely rather than silently corrupting downstream state.

Domain validation baseline: `src/domain/modifiableDataPackValidation.ts` (SPE-2479) accepts structured modifiable data-pack payloads and emits bounded schema-validation decisions with section-shape checks and borderline schema-version remediation — no publish side effects.

Runtime import (SPE-2486) persists validated packs on `GameState.modifiableDataPackRecords` with sanitize/hydration on save import — rejected payloads drop without corrupting downstream state.

Modifiable data-pack surfacing (SPE-2492) exposes a read-only planning mirror at `/modifiable-data-packs` over hydrated `modifiableDataPackRecords` with CP-neutral import-status and section-summary labels.

Modifiable data-pack weekly orchestration (SPE-2493) wires `applyWeeklyModifiableDataPackGovernanceTick` into `advanceWeek`: re-validates persisted records, drops invalid entries without re-importing rejected payloads, and emits `contribution_release.modifiable_data_pack_governance` weekly report notes for `needs_revision` governance observations. Applied records are idempotent skips with no notes.

Modifiable data-pack publish automation integration (SPE-2494) composes validated pack import with the contribution intake → release packaging → governance → publish-intent chain via `src/domain/modifiableDataPackPublishIntegration.ts` — rejected payloads produce no record and no publish-intent side effects; `needs_revision` import status caps publish-intent below `ready_to_publish`.

## Publish automation and crediting hooks

After packaging and governance gates pass, publish-intent evaluation composes crediting targets (CONTRIBUTORS, changelog entries, version bumps) and bounded publish channel hooks without executing publish actions.

Domain publish baseline: `src/domain/publishAutomationCreditingHooks.ts` (SPE-2480) consumes packaged release envelopes plus applied governance metadata and crediting manifest inputs, emitting sorted crediting and publish hook descriptors — no publish execution side effects.

Publish-queue persistence (SPE-2483) stores bounded publish-intent snapshots on `GameState.publishQueueRecords` with sanitize/hydration on save import — still no publish execution.

Domain publish executor baseline: `src/domain/publishQueueExecutor.ts` (SPE-2484) consumes persisted queue records and SPE-2480 hook descriptors through bounded dry-run channel stubs with deterministic `ready_to_publish` → `published` transitions — no CI/GitHub API calls or real publish side effects.

Publish-queue GitHub API wiring (SPE-2488) adds an injectable `publishQueueGitHubClient` and `executePublishQueueRecordLive` path for the canonical `pr-merge` channel. Live mode is opt-in via `PUBLISH_QUEUE_EXECUTOR_MODE=live` plus `GITHUB_REPOSITORY` / `GITHUB_TOKEN` (or an injected client in tests). Failed API calls reject without mutating queue records.

Publish-queue live orchestration (SPE-2491) wires `applyWeeklyPublishQueueExecutionTickOrchestrated` into `advanceWeek`: dry-run remains the default for browser and CI tests; live `pr-merge` execution runs when live mode, complete GitHub credentials, and an injectable sync client are supplied via `publishQueueOrchestrationDeps`. Weekly notes surface `executionMode` and `publishChannelRef` for live receipts.

Publish-queue manual-approval channel (SPE-2498) extends the live executor with target dispatch for `manual-approval` via injectable sync `publishQueueManualApprovalClient`. Live mode may run approval-only automation when `manualApprovalClient` is supplied through `publishQueueOrchestrationDeps` even without GitHub credentials; mixed queues pass both clients. Approval token resolution mirrors `pr-merge` conventions (`channel:manual-approval[:token]` or `release:approval:{token}`). Failed or unresolved approvals reject without mutating queue records; receipt persistence and mirror surfacing reuse SPE-2495/2496 unchanged.

Publish-queue webhook channel (SPE-2499) extends the live executor with target dispatch for `webhook` via injectable sync/async `publishQueueWebhookClient`. Live mode may run webhook-only automation when `webhookClient` is supplied through `publishQueueOrchestrationDeps` even without GitHub credentials; mixed queues pass all configured clients. Endpoint resolution mirrors other channel conventions (`channel:webhook[:endpointId]` or `release:webhook:{endpointId}`; bare payload uses endpoint id `default`). Endpoint URLs resolve from a config map keyed by endpoint id; optional CI env keys `PUBLISH_QUEUE_WEBHOOK_{ENDPOINT_ID}_URL` and `_TOKEN` (uppercase id with hyphens as underscores). Auth token priority: hook payload suffix → endpoint config → env token. Failed HTTP or unresolved endpoints reject without mutating queue records; receipt persistence and mirror surfacing reuse SPE-2495/2496 unchanged.

Publish-queue surfacing (SPE-2485) wires the weekly execution tick in `advanceWeek`, emits `contribution_release.publish_queue_execution` weekly report notes for reportable receipts, and exposes a read-only planning mirror at `/publish-queue` over hydrated `publishQueueRecords`.

Publish-queue execution-receipt persistence (SPE-2495) stores bounded executor receipts on `GameState.publishQueueExecutionReceipts` keyed by `${recordId}@${executionWeek}` with sanitize/hydration on save import. `advanceWeek` merges reportable tick receipts after queue record updates; malformed, duplicate, and orphaned entries drop without corrupting queue state.

Publish-queue execution-receipt mirror surfacing (SPE-2496) extends the `/publish-queue` planning mirror with a read-only execution-receipt ledger over hydrated `publishQueueExecutionReceipts`, joined to queue record labels where available. Live vs dry-run discrimination uses `publishChannelRef` presence; the mirror does not re-validate hidden truth.

## Notation and docs standards

- Prefer **issue IDs** (SPE-\*) in commit and PR titles when mandated by team workflow.
- **Docs-only changes** skip runtime gates but still require format/lint where configured.
- **Design audits** — when adding a new `docs/*audit*.md` checklist, register it in `docs/design-audits-index.md` in **strict alphabetical order**; `npm run verify:audits-index` must pass (CI enforces this after lint).
- **SPE-186+ mirror and theme map** — when refreshing `docs/linear-external-documentation-follow-ups.md` or editing `architecture/external-design-theme-contracts.md`, run `npm run verify:theme-contracts` (CI enforces after the audit index step).

## Onboarding and demo kits

**Demo / onboarding kits** are versioned alongside releases so first-run experience matches packaged behavior; stale kits are treated as release defects.

## See also

- `README.md` — scripts, validation, repository layout
- `docs/dependency-boundaries.md`
- `docs/design-audits-index.md` — audit catalog maintenance
- `planning/backlog.md` — near-term priority queue
- `planning/documentation-curation.md` — ongoing doc and planning curation playbook
- `AGENTS.md` — agent-facing operational notes
