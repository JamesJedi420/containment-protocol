# Scope-discipline grooming pass (roadmap §15)

One-page audit record. **Docs + Linear hygiene only** — no application code, no new slice Linear issue unless the owner creates one.

| Field | Value |
| --- | --- |
| **Branch** | `jamesdyedbq/docs-scope-discipline-grooming-pass` (June 2026); post-SPE-2362 refresh on `main` @ `11d57c13` |
| **Base `main`** | `11d57c13` (June 2026, post SPE-2362 / PR #2592) |
| **Roadmap anchor** | `planning/roadmap.md` §15, §14 review questions |
| **Queue authority** | `planning/backlog.md` |

## Goal

Reconcile stale planning handoffs, classify blocked vs deferred vs promotable work, and leave a single honest **recommended next implementation** without opening parallel planning branches.

Core question (`planning/roadmap.md` §17): does the next chunk make the central weekly machine more real, or just make the project look larger?

## Phase 1 — Handoff drift (complete)

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Recommended next step | Cited stale SHA `22550174` | Updated to `17df0ed3` + grooming outcome |
| `README.md` § Recommended next step | Pointed at SPE-2110 / PR #2430 | Replaced with link to `planning/backlog.md` |
| `planning/hidden-modality-matrix-post-matrix-queue.md` | Historical agent handoff (SPE-2105 / old SHA) | Marked historical; links to backlog |

**Rule:** One ordered sequencing source — `planning/backlog.md`. README and slice docs **link**, not restate priorities.

## Phase 2 — Parent / umbrella ledger

Linear progress comments posted (June 2026 grooming) on open parents with shipped children:

| Parent | Status | Grooming summary |
| --- | --- | --- |
| [SPE-70](https://linear.app/spectranoir/issue/SPE-70) | Backlog | Matrix slices 1–11 + SPE-2306 triage chips shipped; parent AC largely met — **owner** evaluates Done vs Backlog; no new modality slices without §14 pass |
| [SPE-521](https://linear.app/spectranoir/issue/SPE-521) | Done | Substrate slices 1–4 + full prep-stack shipped (PR #2824–#2833); parent AC rows 1–4 **Yes** per `planning/spe-521-parent-reconciliation-slice.md`; batch-4+ **deferred** per audit doc |
| [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Done | Intake wave + parent integration slices 1–2 shipped; no stale “open parent” in backlog |
| [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Backlog | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) slice 1 only — defer slice-2+ until MVP loop needs cognitive hazard engine depth |
| [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Backlog | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) slice 1 only — defer slice-2+ |
| [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) | Backlog | [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) slice 1 only — defer slice-2+ |
| [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Backlog | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117), [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) slice 1 shipped — **next:** persistence slice 2 per active queue |
| [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) | Done | Substrate + [SPE-2361](https://linear.app/spectranoir/issue/SPE-2361) harvest + [SPE-2362](https://linear.app/spectranoir/issue/SPE-2362) runtime hooks shipped — optional stability-audit follow-on only |
| [SPE-2250](https://linear.app/spectranoir/issue/SPE-2250) | Done | Batch-4+ template stacks **deferred** — `planning/infiltration-encounter-content-batch4plus-audit.md` |

## Phase 3 — Blocked / deferred / active

### Keep blocked (backlog)

- Mission triage full refresh (compare-top-2, bulk actions, spec §13 grouping) — UI breadth without new loop truth
- Core UX specs residual triage — tied to blocked triage expansion

### Keep in deferred-design (not active queue)

- Knowledge children SPE-529 / 587 / 588 / 589 — `planning/deferred-design-documents.md`
- SPE-186+ external prompt mirror — theme contracts until TypeScript contracts needed
- SPE-522 / SPE-1007 broad infiltration frameworks

### Do not promote without §14 pass

- Registry slice-2 waves (pattern source, visual trigger, welfare, etc.)
- New hidden-modality families beyond shipped 1–11 stack
- SPE-2250 batch-4+ template authoring — see audit gates below

## Phase 4 — Roadmap §14 review (candidates — updated post SPE-2362)

| Candidate | §14 pass? | Notes |
| --- | --- | --- |
| **SPE-2117 recurrent catastrophe registry persistence (slice 2)** | **Yes** | Slice 1 shipped (PR #2436); no `GameState` key yet — mirrors SPE-2312 / SPE-2313 pattern; strengthens loop under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) |
| **SPE-2123 rule-document compliance registry persistence (slice 2)** | **Yes** | Slice 1 shipped (PR #2442); sibling persistence slice under SPE-1310; weekly hook deferred to slice 3+ |
| Branch continuity stability-audit category ([SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) follow-on) | Partial | Read-only `analyzeRuntimeStability` seam; explicit-node adapter only; deferred from [SPE-2362](https://linear.app/spectranoir/issue/SPE-2362) — dev/stability tooling, not player loop |
| Dedicated exploit-access content | **No** | Validator substrate shipped; defer until scoped slice owner exists |
| SPE-70 parent Done review | Partial | Hygiene only — no runtime unless owner reopens AC |
| Mission triage residual | **No** | Blocked — surfaces without loop truth |
| SPE-2250 batch-4+ content | **No** | Deferred — no eligible catalog templates (audit unchanged) |

## Phase 5 — Backlog outcome (updated June 2026 post SPE-2362 / PR #2592)

**Recommended next implementation (owner creates Linear child when starting):**

**SPE-2117 recurrent catastrophe amelioration registry GameState persistence (slice 2)** — mirror `planning/extranormal-event-registry-slice-2.md` against `src/domain/recurrentCatastropheAmeliorationRegistry.ts`; branch `spe-2117-recurrent-catastrophe-persistence-slice-2`, base `main` @ `11d57c13`.

**Alternate (same grooming pass):** branch-continuity stability-audit category — read-only `stabilityLayer.ts` category via `buildBranchContinuityRuntimeAuditSnapshot`; owner creates SPE-1464 child when starting; see `planning/branch-continuity-runtime-hooks-slice-1.md` § Deferred.

**Explicitly deferred:**

- SPE-2250 batch-4+ — `planning/infiltration-encounter-content-batch4plus-audit.md` (audit gates still fail)
- Dedicated exploit-access content — harvest row 74; validator substrate sufficient until scoped
- Mission triage full refresh — blocked

## SPE-2250 revisit gates (unchanged)

Reopen optional template stack authoring only when **all** are true:

1. New/revised template has **covert narrative** (not raid/escalation/combat-only).
2. Template has infiltration-family tags **or** receives them via a concealment migration batch (SPE-2249 pattern).
3. `concealmentTriggers` authored first (or same slice).
4. Smallest set: **1–3 templates** per PR.
5. Not duplicating batch-4 IDs (`INFILTRATION_CONTENT_BATCH_FOUR_TEMPLATE_IDS`).

## Phase 6 — Post SPE-2362 queue refresh (June 2026)

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Active queue | Empty after SPE-2362 closure; handoff still cited SPE-2362 as next | Repopulated §14-pass candidates; handoff → SPE-2117 slice 2 @ `11d57c13` |
| `planning/backlog.md` slice index | `contained-person-integrated-health-bundle-slice-9.md` stale **In progress**; missing `branch-continuity-runtime-hooks-slice-1.md` | Marked SPE-2349 / SPE-2362 **Shipped** |
| `planning/contained-person-integrated-health-bundle-slice-9.md` | Status still **In progress** | **Shipped** — PR #2566 |

**Branch continuity thread closure:** [SPE-2361](https://linear.app/spectranoir/issue/SPE-2361) harvest reconciliation + [SPE-2362](https://linear.app/spectranoir/issue/SPE-2362) runtime hooks both **Done**; [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) parent stays **Done** — do not reopen.

## Validation (this pass)

- [x] Docs-only diff
- [x] No `verify:audits-index` / `verify:theme-contracts` required (no `docs/*audit*` or SPE-186+ mirror edits)
- [x] Active queue + handoff aligned with `main` @ `11d57c13`

## See also

- `planning/documentation-curation.md` — cadence after grooming PR merges
- `planning/infiltration-encounter-content-batch4plus-audit.md`
- `planning/backlog.md` — active queue after merge
