# Scope-discipline grooming pass (roadmap §15)

One-page audit record. **Docs + Linear hygiene only** — no application code, no new slice Linear issue unless the owner creates one.

| Field | Value |
| --- | --- |
| **Branch** | `jamesdyedbq/docs-scope-discipline-grooming-pass` (June 2026); post-SPE-2480 refresh on `main` @ `74cbd67e` |
| **Base `main`** | `74cbd67e` (June 2026, post SPE-2480 backlog handoff / PR #2879 merge) |
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
| [SPE-70](https://linear.app/spectranoir/issue/SPE-70) | Done | Matrix slices 1–11 + SPE-2306 triage chips + prep-stack (#2821–#2822) shipped; parent AC rows 1–8 **Yes** per `planning/spe-70-parent-reconciliation-slice.md`; no new modality slices without §14 pass |
| [SPE-521](https://linear.app/spectranoir/issue/SPE-521) | Done | Substrate slices 1–4 + full prep-stack shipped (PR #2824–#2833); parent AC rows 1–4 **Yes** per `planning/spe-521-parent-reconciliation-slice.md`; batch-4+ **deferred** per audit doc |
| [SPE-31](https://linear.app/spectranoir/issue/SPE-31) | Done | Hub shell + SPE-31a + children SPE-2465–SPE-2469 shipped; parent AC rows 1–6 **Yes** per `planning/spe-31-parent-reconciliation-slice.md`; multi-district contracts / site-gen hooks **deferred** |
| [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Done | Intake wave + parent integration slices 1–2 shipped; no stale “open parent” in backlog |
| [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Done | Unified engine slices 1–7 + grooming slice 6; parent AC rows 1–3 **Yes** per `planning/spe-1309-parent-acceptance-review-slice-6.md` |
| [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Done | Truth-layer registry slices 1–4 + cover pairing + historical-icon fixtures; groomed SPE-2401 / SPE-2446 / SPE-2450 |
| [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) | Done | Integrated health bundle slices 5–10 shipped; parent **Done** on Linear |
| [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) | Done | Registry slices 1–11 + grooming slices 1–7; parent AC rows 1–6 **Yes** per `planning/spe-1888-parent-acceptance-review-slice-7.md`; SPE-1882 + full SPE-1047/1131 deferred |
| [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | Done | Lifecycle slices 1–6 + [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) / [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) registry waves shipped (slices 1–5 / 1–4) |
| [SPE-75](https://linear.app/spectranoir/issue/SPE-75) | Done | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) registry slices 1–4 + contribution/release domain baseline chain SPE-2474–SPE-2480 shipped (PR #2867–#2879); parent AC met; deferred runtime publish executor / publish-queue persistence / modifiable-pack import require **new** Linear children |
| [SPE-947](https://linear.app/spectranoir/issue/SPE-947) | Backlog | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) registry slices 1–4 shipped — grooming [SPE-2481](https://linear.app/spectranoir/issue/SPE-2481) **Done**; parent propagation/counter-memetic AC not met; status note + deferred table on Linear |
| [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Backlog | [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) registry slices 1–4 shipped — grooming [SPE-2482](https://linear.app/spectranoir/issue/SPE-2482) **Done**; parent affiliation/clearance AC not met; status note + deferred table on Linear |
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

- Registry slice-5+ waves (pattern source, visual trigger, entity welfare, etc.) — slices 1–4 shipped; umbrella parents stay **Backlog**
- New hidden-modality families beyond shipped 1–11 stack
- SPE-2250 batch-4+ template authoring — see audit gates below
- Full faction-ethics / accountability-matrix policy engines beyond bounded registry anchors ([SPE-1047](https://linear.app/spectranoir/issue/SPE-1047) / [SPE-1131](https://linear.app/spectranoir/issue/SPE-1131) marked **Done** on Linear for shipped mirror slices only)

## Phase 4 — Roadmap §14 review (candidates — updated post SPE-2480 @ `74cbd67e`)

| Candidate | §14 pass? | Notes |
| --- | --- | --- |
| Intake ↔ extranormal/minor/location cross-link surfacing | **N/A (closed)** | Shipped [SPE-2470](https://linear.app/spectranoir/issue/SPE-2470)–[SPE-2473](https://linear.app/spectranoir/issue/SPE-2473) / PR #2859–#2865 |
| SPE-75 contribution/release domain baseline chain | **N/A (closed)** | Shipped SPE-2474–SPE-2480 / PR #2867–#2879; parent **Done** on Linear |
| Registry umbrella grooming ([SPE-947](https://linear.app/spectranoir/issue/SPE-947) / [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)) | Partial | Docs/Linear hygiene only — [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) / [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) slices 1–4 Done; parent AC not met; no slice 5+ without fresh §14 pass |
| Branch continuity stability-audit category ([SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) follow-on) | Partial | Read-only `stabilityLayer.ts` category; dev/stability tooling — see `planning/branch-continuity-runtime-hooks-slice-1.md` § Deferred |
| Contribution/release ops follow-ons (publish executor, publish-queue persistence, modifiable-pack import) | Partial | New Linear child required — **do not reopen** Done [SPE-75](https://linear.app/spectranoir/issue/SPE-75); not weekly-loop truth |
| Dedicated exploit-access content | **No** | Validator substrate shipped; defer until scoped slice owner exists |
| Mission triage full refresh | **No** | Blocked — surfaces without loop truth |
| SPE-2250 batch-4+ content | **No** | Deferred — no eligible catalog templates (audit unchanged) |

## Phase 5 — Backlog outcome (updated June 2026 post SPE-2480 / PR #2879)

**Recommended next implementation (owner creates Linear child when starting):**

No single mandated slice — owner reprioritizes from §14-pass alternates in `planning/backlog.md` § Recommended next step.

**Alternate 1 (partial §14 — docs/Linear):** registry umbrella grooming for [SPE-947](https://linear.app/spectranoir/issue/SPE-947) / [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) — children slices 1–4 shipped; parent AC not met.

**Alternate 2 (partial §14 — dev tooling):** branch continuity stability-audit category — read-only `stabilityLayer.ts` category via `buildBranchContinuityRuntimeAuditSnapshot`; owner creates SPE-1464 child when starting; see `planning/branch-continuity-runtime-hooks-slice-1.md` § Deferred.

**Alternate 3 (partial §14 — ops infra, new child required):** contribution/release follow-ons from SPE-2480 / SPE-2479 deferred tables — runtime publish executor, publish-queue persistence, or modifiable-pack import wiring; **do not reopen** Done [SPE-75](https://linear.app/spectranoir/issue/SPE-75).

**Explicitly deferred:**

- SPE-2250 batch-4+ — `planning/infiltration-encounter-content-batch4plus-audit.md` (audit gates still fail)
- Dedicated exploit-access content — harvest row; validator substrate sufficient until scoped
- Mission triage full refresh — blocked
- Registry slice 5+ without fresh §14 pass
- Runtime publish executor without owner-scoped Linear child

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

## Phase 7 — Post SPE-31 queue refresh (June 2026)

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Active queue | Vague “pick from grooming pass” after SPE-31 merge | Repopulated §14-pass candidate — intake extranormal cross-link surfacing |
| `planning/backlog.md` § Recommended next step | Base SHA `dd80cb5d`; SPE-31 reconciliation still “next” | Bump to `236499f7`; handoff → intake extranormal cross-link surfacing |
| `planning/scope-discipline-grooming-pass.md` | Stale SPE-2117 slice 2 recommendation; Phase 2 parents outdated | Refreshed Phase 2 / §14 / Phase 5 @ `236499f7` |
| Intake cross-link surfacing gap | Compose shipped for extranormal/minor/location; only naming-hazard has surfacing ([SPE-2406](https://linear.app/spectranoir/issue/SPE-2406)) | Added `planning/information-intake-extranormal-cross-link-surfacing-slice-1.md` |

**SPE-31 thread closure:** [SPE-31](https://linear.app/spectranoir/issue/SPE-31) parent **Done** @ `planning/spe-31-parent-reconciliation-slice.md` (PR #2857); deferred hub/contract follow-ons remain sibling backlog, not parent AC debt.

## Phase 8 — Post SPE-2480 queue refresh (June 2026)

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Active queue | Vague grooming placeholder after SPE-2480 merge | Repopulated §14-pass alternates; owner reprioritizes |
| `planning/backlog.md` § Recommended next step | Base SHA `99161c79`; no post-SPE-2480 alternates | Bump to `74cbd67e`; three §14-pass alternates + explicit deferrals |
| `planning/backlog.md` context + Shipped table | SPE-75 cited as open parent | Reconciled — SPE-75 **Done** on Linear after SPE-2474–SPE-2480 chain |
| `planning/backlog.md` slice index | Missing SPE-2477 / SPE-2478 rows | Added `playbook-wrong-document-failure-slice-1.md`, `submission-governance-rights-slice-1.md` |
| `README.md` § Current design notes | Stale intake follow-up + open SPE-1309/SPE-1343 parent lines | Point to `planning/backlog.md`; parents Done on Linear |
| `planning/scope-discipline-grooming-pass.md` | Stale SPE-31 / intake surfacing recommendations | Refreshed Phase 2 / §14 / Phase 5 @ `74cbd67e` |

**SPE-75 thread closure:** parent **Done** on Linear (SPE-2474–SPE-2480 + SPE-2110 registry wave); deferred runtime publish executor / publish-queue persistence / modifiable-pack import documented in slice `## Deferred` tables — **new** Linear child required; do not reopen Done parent.

## Validation (this pass)

- [x] Docs-only diff
- [x] No `verify:audits-index` / `verify:theme-contracts` required (no `docs/*audit*` or SPE-186+ mirror edits)
- [x] Active queue + handoff aligned with `main` @ `74cbd67e`

## See also

- `planning/documentation-curation.md` — cadence after grooming PR merges
- `planning/infiltration-encounter-content-batch4plus-audit.md`
- `planning/backlog.md` — active queue after merge
