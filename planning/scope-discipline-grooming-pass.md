# Scope-discipline grooming pass (roadmap §15)

One-page audit record. **Docs + Linear hygiene only** — no application code, no new slice Linear issue unless the owner creates one.

| Field | Value |
| --- | --- |
| **Branch** | `jamesdyedbq/docs-scope-discipline-grooming-pass` |
| **Base `main`** | `17df0ed3685053caabe924b6e9b48d0180a6acce` (June 2026) |
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
| [SPE-521](https://linear.app/spectranoir/issue/SPE-521) | Backlog | Probe/cover/prep/content stack shipped (incl. SPE-2250 Done, SPE-2305, SPE-2308); batch-4+ **deferred** per audit doc; broad encounter-state/guides remain |
| [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Done | Intake wave + parent integration slices 1–2 shipped; no stale “open parent” in backlog |
| [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Backlog | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) slice 1 only — defer slice-2+ until MVP loop needs cognitive hazard engine depth |
| [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Backlog | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) slice 1 only — defer slice-2+ |
| [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) | Backlog | [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) slice 1 only — defer slice-2+ |
| [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Backlog | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117), [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) slice 1 — defer slice-2+ |
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

## Phase 4 — Roadmap §14 review (candidates)

| Candidate | §14 pass? | Notes |
| --- | --- | --- |
| **MVP weekly loop proof slice 3** | **Yes** | Extends SPE-2251 harness toward Claims 1–2 (`mvp-scope.md` §8): triage/deployment path + institutional carryover in one test-backed flow; reuses shipped intake + triage integration |
| SPE-70 parent Done review | Partial | Hygiene only — no runtime unless owner reopens AC |
| Mission triage residual | **No** | Blocked — surfaces without loop truth |
| Registry slice-2 wave | **No** | Breadth before central-machine proof |
| SPE-2250 batch-4+ content | **No** | Deferred — no eligible catalog templates |

## Phase 5 — Backlog outcome

**Recommended next implementation (owner creates Linear child when starting):**

**MVP weekly loop proof slice 3** — extend `weeklyMvpLoopProof` harness to cover mission triage routing and/or intake verification notes in the multi-week persistence path (Claims 1–2, 6 in `mvp-scope.md` §8). Plan anchor: `planning/mvp-weekly-loop-proof-slice-1.md` (add slice-3 section when scoped).

**Explicitly deferred until owner pick or new template batch:**

- SPE-2250 batch-4+ — `planning/infiltration-encounter-content-batch4plus-audit.md`
- Registry parent slice-2+ waves
- Mission triage full refresh

## SPE-2250 revisit gates (unchanged)

Reopen optional template stack authoring only when **all** are true:

1. New/revised template has **covert narrative** (not raid/escalation/combat-only).
2. Template has infiltration-family tags **or** receives them via a concealment migration batch (SPE-2249 pattern).
3. `concealmentTriggers` authored first (or same slice).
4. Smallest set: **1–3 templates** per PR.
5. Not duplicating batch-4 IDs (`INFILTRATION_CONTENT_BATCH_FOUR_TEMPLATE_IDS`).

## Validation (this pass)

- [x] Docs-only diff
- [x] No `verify:audits-index` / `verify:theme-contracts` required (no `docs/*audit*` or SPE-186+ mirror edits)

## See also

- `planning/documentation-curation.md` — cadence after grooming PR merges
- `planning/infiltration-encounter-content-batch4plus-audit.md`
- `planning/backlog.md` — active queue after merge
