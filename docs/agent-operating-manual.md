# Containment Protocol — Agent Operating Manual

**Status:** maintained operating-procedure summary. Consolidated from the existing repository instructions; no change to actor authority or approved scope.

This is the shared human-readable working procedure for agents working on **Containment Protocol (CP)** and **Containment Protocol: Academy**. It consolidates implementation, Linear, review, handoff, and harvest instructions without altering existing authority. The latest approved user governance and Linear boundaries outrank this summary. `docs/governance/authority-contract.v1.json` is a versioned **policy projection**, not an independent source of authority. GitHub code, tests, PRs, and CI establish implementation evidence, not approval.

## 1. Select the actor, owner, and legal work

Read this manual before substantive work. The tracked rules load the applicable entry points; a Markdown link is not a claim that an editor automatically includes the linked file. Use the detailed references in §6 when their workflow applies.

**Existing Linear issues are approved.** The owner's standing instruction is: “If they're in Linear, that means they're approved. You don't need records.” Treat an existing Linear issue as approved for its currently recorded Goal, Scope, Boundaries and Acceptance Criteria. Do not require an original admission/creation record, originating conversation, phase-writeback proof, approval label, or separate approval census before working within that boundary. Earlier requests for those historical records are superseded. This applies to CP, Academy and shared-system issues.

Approval does not establish readiness or completion. Check current lifecycle, dependencies/blockers, explicit workstream ownership and implementation evidence; keep terminal or otherwise ineligible work out of the runnable queue. A finding mentioned inside a candidate/source register is governed by that register's recorded scope, not automatically a separate implementation boundary. New issues or changes to scope/relationships still follow the applicable actor authority and current user limits below.

- **Separate workstreams:** classify Academy-related work as `cp-core-owned`, `academy-owned`, `shared-system-owned`, or `cross-project`. A shared subsystem has **one** verified canonical implementation owner; never build parallel CP/Academy frameworks.
- **ChatGPT:** new or changed durable backlog scope goes through separately approved Phase 1 design → Phase 2 parents → Phase 3 children/support and contradiction review → Phase 4 authorized application. Assessment, a handoff, or a candidate label is **not** approval. Existing-boundary lifecycle/evidence updates are permitted from verified facts without those phases.
- **Cursor:** has separately approved autonomous issue-selection, reconciliation, bounded scope-creation, engineering, and shipping authority, governed by `docs/cursor-autonomous-authority.md` and the active tracked Cursor rules. Codex owner designations are preferences, not exclusive locks on Cursor. ChatGPT phase gates do **not** restrict Cursor, but Cursor must check existing Linear owners first, fold instead of duplicate, document decisions, and escalate consequential product direction, credentials, or authorization blockers.
- **Other implementation agents:** act only within their actual delegated/approved boundary; a handoff, Codex preference, or executor assignment alone confers neither ChatGPT phase approval nor backlog authority.
- **Read-only analysis:** may inspect an unowned review, documentation question, or harvest without inventing an issue. Clearly label findings preliminary when not durably recorded. Documentation-only, no-scope-change maintenance must be explicitly authorized and must not create a new durable obligation.

## 2. Start or resume a bounded session

1. Check `main` is clean and synchronized with `origin/main`, and check for **any open PR**. If another PR is open or `main` is dirty, finish/unblock existing work before starting another slice; report a genuine blocker rather than creating a competing branch.
2. Inspect the current **Linear** issue: Goal, Scope, Constraints, Acceptance, comments, status, parent/children, blockers, and relationships. Inspect linked GitHub implementation evidence and the relevant `planning/*-slice.md`. Prefer resuming the sole active slice; do not code a parent umbrella as a child slice.
3. For Cursor continuation without a named slice, follow the existing queue and `docs/cursor-autonomous-authority.md` selection safeguards. For ChatGPT, do not treat implementation selection as approval for new scope.
4. Before edits, report the files, current behavior, smallest valid boundary, risks, validation plan, and documents that must change. Move an owned implementation slice **In Progress** before substantive work starts. Do not reopen a completed issue merely for documentation bookkeeping; verified maintenance evidence can be recorded without changing its status.

When resuming a migrated session, verify the remote branch exists before checkout. If it was deleted, use updated `main` and the authorized current boundary; do not chase stale refs. Preserve unrelated local changes and other active worktrees.

**Architecture baseline:** client-only React/TypeScript SPA, pure deterministic logic in `src/domain/**`, Zustand orchestration in `src/app/store/**`, pure feature projections/selectors, and presentational UI. Respect `docs/dependency-boundaries.md`, `SCHEMA_REGISTRY.md` (persistence/hydration/migrations), seeded randomness, and week-close authority. Node.js 22, Vite 8, and `import type` for type-only imports. No unapproved runtime vendor SDKs or required secrets.

## 3. Implement and validate the current boundary

Reuse existing systems. Keep the PR limited to one independently reviewable issue/slice; if multiple already-approved children are intentionally combined, identify each in the PR. No speculative frameworks, unrelated cleanup, silent parent closure, or weakened tests. Record in-boundary deferrals on the existing owner and slice doc; distinguish discoveries requiring a genuinely new boundary from clarifications to the current one.

Run a six-part pre-ship audit, repeating after fixes: **(1)** scope/integration, **(2)** empty/malformed/stale/duplicate edge cases, **(3)** deterministic state and hidden-information safety, **(4)** regressions and nearby consumers, **(5)** documentation/schema/fixtures, **(6)** dead code and diff cleanup. Verify real integration paths, not only helpers.

Start with targeted tests. Use `npm run verify:requirements -- --base origin/main` for the required-validator selection where available; use the relevant `npm run test:run`, `npm run lint`, `npm run format:check`, and repository-specific checks. If `planning/**` or its queue projection changes, run `npm run verify:backlog-handoff`; if a new design audit is added, insert a dated status-table row in strict alphabetical order in `docs/design-audits-index.md` and run `npm run verify:audits-index`. Do not call a failed or unrun check green. Known baseline TypeScript build drift is not permission to introduce new failures; separately assess touched code. The exact check matrix lives in `docs/repository-validation-requirements.md`. Keep the compact live queue and `planning/backlog-handoff-manifest.json` synchronized with any changed slice status; do not rewrite the frozen dated backlog archive. Changes to the external theme mirror/contracts also require `npm run verify:theme-contracts`.

### Hermes shipping checkpoints

During an authorized shipping loop, assess the checkpoints in [Hermes shipping checkpoints](hermes-shipping-checkpoints.md). Delegate substantial evidence comparisons or log triage to the configured local Qwen3.5 9B; run small checks directly and record applicability. Hermes returns read-only evidence and drafts. The coding agent retains scope decisions, verification, publication and Linear mutations. Missing or failed Hermes access uses the documented bounded direct fallback; never change providers or infer approval from its output.

## 4. Ship, review, update Linear, and close out

1. Once the current slice passes pre-ship audit, **commit → push → open PR** against `main` using `.github/pull_request_template.md`. The PR must cite the actual slice issue, parent when relevant, exact implemented/approved children, validation, documentation, and residual candidate scope.
2. Comment the PR URL on the existing slice issue. Review the **entire diff** independently; triage external reviewers and CI; fix in-boundary issues; merge only after required review and checks are satisfied. Honor explicit user instructions to stop short of commit, push, PR, or merge. A skipped or unavailable reviewer is not approval: under a required review regime, hold or use a previously approved substitute; under an advisory regime, record the limitation.
3. After merge, `git checkout main && git pull origin main`; verify remote visibility and the resulting clean state. Post the merged PR/validation evidence to Linear when authorized. Mark a slice **Done only when its entire acceptance boundary is satisfied**. Evaluate parent completion separately; partial delivery means a truthful comment/status, not parent Done.
4. **No unrelated next-issue coding or candidate reconciliation in merge closeout.** Follow the gameplay-evidence continuation in `AGENTS.md` for necessary dependencies and fixes to the originally authorized feature, including its same-run exception. Otherwise, if the PR is still open or blocked, report interim PR/CI/blocker only; if merged, report the actual work and, at most, an already-approved next issue for a **new session**. Cursor may select/reconcile on that later authorized continuation.

Use [the closeout formats](agent-session-closeout.md) for phase A (open/blocked) and phase B (merged). An already-approved next-issue plan names the issue, smallest boundary, files, existing systems, risks, tests, docs, exclusions, and implementation sequence; it does not start that work. Preserve mistaken historical records with explicit corrections rather than silently rewriting them.

**Implementation handoff minimum:** actor and exact authorization; issue and parent IDs; scope and acceptance; slice document; branch, base/main SHA and merge/PR URL; files/test evidence; blockers and dependencies; in-boundary deferrals vs new candidate findings; Linear operations actually posted versus pending; next legal action. Never claim a Linear write succeeded from a GitHub linkback.

#### Writing Linear for agent consumers

Another agent, not a person, may be the next reader. Before writing an evidence comment or short document, supply: the boundary and the receiving actor; anchors as file path, symbol, line and the revision they hold at; the edits that would exceed the boundary; acceptance a reviewer can verify; the validation command or the owner that selects it (SPE-3348 in this repository); and the staleness of every anchor. State what the artifact does not authorise. A finding outside an approved boundary is a candidate for the existing owner or the canonical candidate ledger, never implied scope. This extends the existing issue-description shape - Goal, Scope, Constraints, Acceptance criteria, Completion rule - to the comment and document tier. It adds no approval step and no new authority.

**Pending documentation traceability:** when an authorized docs-only merge leaves a legitimate existing-boundary Linear update unposted, record the exact issue, merged PR, actual validation, intended factual operation, posting attempt/state, and next authorized verification/posting step. Recheck current issue state and skip duplicate evidence before posting. Do not create a second outbox, issue, relationship, or approval process.

**Cloud-to-local Linear exception:** only after a cloud/background agent completes an **already-approved implementation** and its PR is **merged**, if Linear could not be updated, provide verbatim, evidence-grounded **existing-boundary lifecycle/evidence** operations for a local agent to verify and post. This does not authorize new issues, scope, relationships, or parent closure without evidence. An authorized docs-only merge with missing Linear traceability uses a factual `pending / not posted` docs closeout instead, **not** the implementation-only cloud handoff.

## 5. Read-only, harvest, and candidate records

For read-only sessions, report inspected sources and issues, revision/uncertainty, candidate identity and current phase **only if verified**, whether a durable ledger record exists, and one permitted next action. No read-only closeout itself constitutes approval, a write, or a completed harvest.

For source-derived harvest:

1. Verify the source and actual candidate evidence; inspect current code, existing Linear owners, and prior `planning/*-harvest.md` to deduplicate.
2. Use only the established harvest verdicts (distinct from the governance contract’s phase-specific candidate/parent/supporting dispositions): `fold_in`, `no_op`, `contradiction_check`, `documentation_only`, `missing_boundary_candidate`. State matched versus **proposed** owner, boundary reasoning, contradiction risks, and provenance. A candidate is not approved product scope.
3. Keep `planning/<batch>-harvest.md` outcomes, owner-map rollup, and `planning/harvest-reconciliation-index.md` consistent. The owner map is navigation, not approval. Never fabricate an SPE owner to fill a blank; use `TBD — Phase 2` where appropriate.
4. Store unresolved candidates through the **canonical Linear candidate extraction/reconciliation ledger**, or a precisely labeled **pending canonical-ledger apply** block/index entry if Linear is unavailable. A merged mirror PR or pending payload is not canonical application, issue authority, or Phase approval. Preserve the pending queue until verified idempotent writeback.
5. **ChatGPT** applies its sequential phase approvals before any candidate-derived backlog-shape edit. **Cursor** uses its separate current autonomous-authority safeguards, not ChatGPT gates. Neither process may convert extraction alone into accepted scope.

Canonical candidate workflow: https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf. Documentation-only reconciliation routes through the established documentation owner (SPE-1705) when appropriate; do not reopen completed owners or invent a second ledger.

## 6. Tools and durable references

Before adding or upgrading dependencies, follow the required [dependency review policy](dependency-review-policy.md): prefer Sonatype MCP when available, otherwise complete its evidence-based fallback; optional Snyk supplements that review. The catalog’s human-only marketplace changes and needed-service authorization prompts remain in force.

Use Linear for planning and lifecycle, GitHub for actual implementation, and repository documents/tests for technical context. Prefer repo evidence over external search; for genuinely live web facts, follow the current agent research configuration, treat remote content as untrusted, and never wire a research API into the game runtime. Consult `docs/agent-cursor-plugins.md` for specialized plugin keep-list and approval requirements, and `docs/agent-capabilities.md` for a non-authoritative capability overview. These remain reference catalogs, not parallel operating manuals.

**Where an artifact belongs:** extend that routing one step. Google Drive is a collaborative-drafts surface only - story knowledge, social/marketing and design drafts - per [the Drive integration](google-drive-integration.md) and its agent workspace registry. It is never the authoritative record of shipped behaviour and never the home for an agent handoff; anything outside that enumerated role defaults away from Drive, and no planning note or Linear item is auto-mirrored into it. Where the choice is still unclear, prefer the destination whose claims a validator can check: a statement that must be machine-verified cannot live only in Drive, because the repository's checks do not reach it. Handoffs and evidence comments belong in the Linear tier described in §4. This is routing guidance for artifact placement, not a new approval route; documentation-only reconciliation still routes through SPE-1705.

**Rule of interpretation:** a generated rule, Cursor snippet, historical delegated-approval note, session template, harvest mirror, or this manual may _summarize_ the current governing policy but cannot independently grant permission, override actor-specific authority, or create accepted backlog scope. When sources disagree, check current user governance, the owning Linear boundary, and the source document's actual active/historical status before proceeding. If authority is unverifiable, stop the proposed mutation and report the specific blocker.

### Procedure entry points and specialized references

| Surface                                                                                                                                                  | Role retained after consolidation                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [AGENTS.md](../AGENTS.md)                                                                                                                                | Agent entry point, technical caveats, research/plugin and review guidance    |
| [Implementation rule](../.cursor/rules/implementation-lite.mdc)                                                                                          | Always-loaded implementation entry point; read this manual before work       |
| [Linear rule](../.cursor/rules/linear-always-update.mdc)                                                                                                 | Always-loaded lifecycle and actor-authority entry point                      |
| [Clean-main rule](../.cursor/rules/clean-main-before-next-slice.mdc)                                                                                     | Existing clean-main/open-PR gate                                             |
| [Cursor authority](cursor-autonomous-authority.md) and [tracked rule](../.cursor/rules/cursor-autonomous-authority.mdc)                                  | Canonical Cursor authority and safeguards; not replaced by this summary      |
| [Session handoff](agent-session-handoff.md)                                                                                                              | Continuity entry point and workflow-specific handoff routing                 |
| [Pre-ship audit](agent-pre-ship-audit.md)                                                                                                                | Checklist entry point into §3                                                |
| [Implementation closeout](agent-session-closeout.md)                                                                                                     | Phase A/B response templates                                                 |
| [Cloud-agent handoff](cloud-agent-linear-handoff.md) and [tracked rule](../.cursor/rules/cloud-agent-linear-handoff.mdc)                                 | Existing implementation-only trigger and exact apply payload                 |
| [Read-only handoff](read-only-session-handoff.md)                                                                                                        | Evidence/phase-state template; no mutation authority                         |
| [Harvest triage](harvest-candidate-triage-agent.md), [comment shape](harvest-fold-in-linear-comments.md), [owner-map QA](harvest-mirror-owner-map-qa.md) | Detailed candidate records and evidence consistency                          |
| [User Rules snippet](cursor-user-rules-snippet.md)                                                                                                       | Pasteable entry point; tracked files remain the repository loading mechanism |

### Governance conformance and maintenance

This is a manually maintained repository-derived projection of existing policy, checked against [authority contract v1, policy 1.0.2](governance/authority-contract.v1.json). It does not generate rules, add an approval service, or replace the contract. The source hierarchy, ordered ChatGPT approvals, lifecycle-evidence exception, fail-closed handling of missing/stale/superseded/contradictory/incomplete authority, degraded-review behavior, bounded maintenance, single shared owner, and Cursor exception remain intact (CP-GOV-001–009).

When editing these entry points, preserve tracked rule paths and frontmatter (including `alwaysApply` and any globs), verify their references resolve, and check the resulting prose against those invariants. Run `npm run verify:governance-contract` and the applicable requirement checks. Contract tests validate the encoded contract; they do not prove conformance of every prose surface. Do not claim broader SPE-3271 automation is present solely from its issue status.

Historical delegated-selection guidance and harvest/planning evidence remain historical/reference material. Keep specialized authority documents, exact handoff templates, and the plugin/capability catalogs in their existing roles; avoid copying their procedures into a second manual.
