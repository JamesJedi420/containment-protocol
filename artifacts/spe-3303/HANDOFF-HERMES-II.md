# Hermes II handoff — SPE-3303 instruction-resolution fixture package

**Status: DRAFT — not sent.** This is the exact report to post in the Hermes II ChatGPT conversation. It has not been delivered: the Cloud browser has no signed-in ChatGPT session, so that conversation is unreachable from this environment.

---

## Message body (post verbatim)

---

**From: Freebuff.** Reporting a completed analysis-and-fixtures task for SPE-3303. No implementation was performed and no Linear record was changed.

### Issue and task

- **Linear issue:** SPE-3303 (Academy instruction resolution). Not read live in this session — status, description and any parent/child relations are **unverified**. This report does not assert or change its lifecycle.
- **Task as received:** spend 45–75 minutes producing standalone synthetic instruction-resolution fixtures for SPE-3303, using a **caller-supplied authoritative attendance/session result**, with no enrollment implementation; cover ordinary teaching, no-change lesson, skipped/excused attendance, authorized make-up, preparation and instructor-context effects, peer assistance/interference, capped progression, repeated evaluation and replay; at least 10 input/expected-outcome pairs with deterministic identity, canonical progression references and invariants; where effect magnitude or grading formulas are not approved, use explicit symbolic expected properties rather than invented constants.
- **Explicit exclusions honoured:** no new learning-state store, no faculty-quality model, no disciplinary resolver, no game engine, no repo change on `main`, no Linear entry.

### What changed

Four new files, committed on a dedicated branch. Nothing else in the repository was touched:

| Artifact | Path |
| --- | --- |
| Fixture pack (18 cases, 8 symbolic atoms, 17 invariants) | `artifacts/spe-3303/fixtures/instruction-resolution.fixtures.json` |
| Standalone checker (Node, no dependencies) | `artifacts/spe-3303/check-instruction-resolution-fixtures.mjs` |
| Contract-ambiguity list (15 items) | `artifacts/spe-3303/CONTRACT-AMBIGUITIES.md` |
| Pack README (contract, coverage, limits) | `artifacts/spe-3303/README.md` |

- **Branch:** `artifacts/spe-3303-instruction-resolution-fixtures`
- **Commit:** `a66d5367311f8505f506ec2bdf8873ddc2a84130` carries the four artifacts; this handoff report is added in the commit immediately after it on the same branch. Use the branch head.
- **Base:** `main` at `6dc31ff9`
- **Reach it:** `git fetch origin artifacts/spe-3303-instruction-resolution-fixtures`
- **Browse it:** `https://github.com/JamesJedi420/containment-protocol/tree/artifacts/spe-3303-instruction-resolution-fixtures/artifacts/spe-3303`
- **No PR opened, no merge, `main` untouched.** Diff against `main` is 4 added files / 2739 insertions, all under `artifacts/spe-3303/`. No change under `src/`, `scripts/`, `test/`, `docs/`, CI, dependencies or `SCHEMA_REGISTRY.md`.

### Design summary

The resolver contract is treated as an observable function: one lesson session plus the caller's authoritative attendance result in, one disposition plus one canonical progression reference out. No state is owned, no attendance is inferred, nobody is enrolled.

Two rules keep the pack from inventing physics:

1. **Credit is counted, effect is symbolic.** `deltaSessions` is a discrete session-equivalent (`0` or `1`) so arithmetic is checkable. `effectStrength` is an expression over declared atoms (`E_base`, `E_prep`, `E_instructor_band_{0,1,2}`, `E_peer_assist`, `E_peer_interfere`, `E_makeup`) carrying orderings only — no numeric magnitude or grading constant appears anywhere in the pack.
2. **Order properties must be provable.** Every `order` property is discharged by non-negative linear cancellation over the declared atom relations; an unprovable ordering is a failure, not a warning.

Grounding is cited per field, not assumed: stable-ID grammar and shared ID space from `scripts/validation/academy-authored-content.mjs`; stat keys and instructor efficiency bands from `src/domain/sim/instructorAssignment.ts`; program IDs from `src/data/training.ts`.

### Case coverage (18)

| Case | Class | Disposition | Delta |
| --- | --- | --- | --- |
| `ir-01-ordinary-teaching` | ordinary_teaching | credit_granted | +1 |
| `ir-02-preparation-effect` | preparation_effect | credit_granted | +1 |
| `ir-03-no-change-lesson` | no_change_lesson | no_progression_change | 0 |
| `ir-04-skipped-attendance` | skipped_attendance | not_evaluated | 0 |
| `ir-05-excused-attendance` | excused_attendance | deferred (pending_makeup) | 0 |
| `ir-06-authorized-makeup` | authorized_makeup | credit_granted (original session) | +1 |
| `ir-07-unauthorized-makeup` | unauthorized_makeup | rejected_unauthorized_makeup | 0 |
| `ir-08-instructor-context-effect` | instructor_context_effect | credit_granted | +1 |
| `ir-09-instructor-specialty-mismatch` | instructor_context_effect | credit_granted (no instructor effect) | +1 |
| `ir-10-peer-assistance` | peer_assistance | credit_granted | +1 |
| `ir-11-peer-interference` | peer_interference | credit_granted | +1 |
| `ir-12-capped-progression` | capped_progression | credit_capped | 0 |
| `ir-13-near-cap-final-session` | capped_progression | credit_granted (reaches cap) | +1 |
| `ir-14-repeated-evaluation` | repeated_evaluation | duplicate_suppressed | 0 |
| `ir-15-replay-of-ordinary-teaching` | replay | identical to `ir-01` | +1 |
| `ir-16-attendance-authority-missing` | attendance_authority_missing | not_evaluated | 0 |
| `ir-17-no-enrollment-inference` | ordinary_teaching | credit_granted without enrollment | +1 |
| `ir-18-combined-context-effects` | instructor_context_effect | credit_granted | +1 |

Every case excludes `enrollment_record` and `learning_state_snapshot` from its allowed emissions; no case asserts XP, level or stat-cap change.

### Checks actually run

All run locally in this workspace against the committed tree.

| Command | Result |
| --- | --- |
| `node artifacts/spe-3303/check-instruction-resolution-fixtures.mjs` | exit `0`, `OK` |
| Two consecutive runs, `cmp` on captured output | byte-identical, exits `0 0` |
| Pack content hash (canonical JSON, sha256) | `2b51eb0d82c0c2eb76e98bb917b962d30bdb0e19e18923f37bd4ebe667b917e0` |

Green-run summary, verbatim:

```
pack: spe-3303.instruction-resolution v1.0.0
cases: 18
classes: attendance_authority_missing, authorized_makeup, capped_progression, excused_attendance, instructor_context_effect, no_change_lesson, ordinary_teaching, peer_assistance, peer_interference, preparation_effect, repeated_evaluation, replay, skipped_attendance, unauthorized_makeup
order properties proven: 7
structural properties (human-asserted): 10
atoms: E_base, E_prep, E_instructor_band_0, E_instructor_band_1, E_instructor_band_2, E_peer_assist, E_peer_interfere, E_makeup
effect magnitudes: symbolic, unapproved
content hash: sha256:2b51eb0d82c0c2eb76e98bb917b962d30bdb0e19e18923f37bd4ebe667b917e0
OK
```

Eight negative controls, each mutating one field of the pack and each expected to fail. **All 8 exited `1`:**

| Mutation | Checker caught it as |
| --- | --- |
| Numeric literal in a magnitude (`E_base + 2`) | `magnitude-expression` |
| Invented `deltaSessions: 2` | `delta` + `progression-arithmetic` |
| Cap overshoot on the capped case | `invariant-credit_within_capacity` |
| Replay expectation diverging from its base | `replay-divergence` |
| Double credit on a re-delivered outcome ref | `invariant-idempotent_by_outcome_ref` |
| Flipped an order property to unprovable | `property-unproven` |
| Deleted the only replay case | `replay-coverage` + `class-coverage` |
| Malformed `sessionRef` | `session-ref` + `lesson-reference` |

**Not run, and not claimed:** `npm run lint`, `npm run format:check`, `npm run test:run`, any `verify:*` validator, `npm run build`, and CI. Dependencies are not installed in this workspace and the diff touches no path any of those gates select, so no gate was expected to exercise it. No PR exists to run CI against.

### Open ambiguities (15 recorded, see the file for evidence and anchors)

Grounded in the tree at `6dc31ff9`; each item states what the fixtures assume, what the repo actually establishes, and what would close it.

Blocking a resolver contract:

1. **A1 — Session identity is unregistered.** SPE-3304 registers only `course` and `module` in `academy-stable-id` with `/^[a-z0-9][a-z0-9-]*$/`; `#` cannot appear. Fixtures compose `moduleRef#session-<n>`. `academy/content/` does not exist on `main`.
2. **A2 — No approved lesson-credit currency.** Existing progression currency is agent XP; existing academic completion is `applyTrainingCompletionToAgent`. There is no lesson-progress field.
3. **A3 — Effect magnitude and grading formula unapproved.** Fixtures assert orderings only. Reusing approved training constants (`ACADEMY_UPGRADE_COSTS`, `TRAINING_FATIGUE_CURVE_EXPONENT`) for lesson credit would be an invention.
4. **A9 — Replay has no ruleset anchor** (content hash vs ruleset version).
5. **A10 — Cap source undecided** (authored module field vs session count vs caller).
6. **A14 — Disposition vocabulary and persistence unowned** (persisting `deferred` would require the learning-state record this task forbids).
7. **A15 — Highest-risk interaction: double counting.** `applyTrainingCompletionToAgent` already awards XP, mutates base and derived stats, and can trigger `applyPotentialBreakthrough`. A lesson resolver that also grants XP for the same instruction could credit the same learner-week twice through two owners.

Unmodelled effects:

8. **A4 — Instructor context on lesson credit.** `getInstructorBonus` bands (90/70 → 2/1/0) and the `instructorSpecialty === targetStat` gate are real, but both feed training completion, not lesson credit.
9. **A5 — Peer assistance/interference has no owner.** Nearest existing concept is team chemistry clamped to `[-2, 2]`, which is a pairwise bond, not a per-session effect.
10. **A12 — Preparation evidence has no provenance contract.**

Attendance semantics:

11. **A6 — Skipped vs excused unmodelled.** `AgentAssignmentStateKind` is `idle | assigned | recovery | training`; no attendance vocabulary exists in `src/**`.
12. **A7 — Make-up authorization has no authority.** No entitlement record; fixtures assume the make-up consumes the original cap slot (conservative reading).
13. **A8 — Repeated evaluation has no dedupe key.** Fixtures key on caller `outcomeRef`, the only option representable without new state.

Boundaries:

14. **A11 — No-change lessons unaddressed** (attempt/cap consumption left uncounted).
15. **A13 — Enrollment out of scope but attendance is not**; fixtures assert "resolve anyway, never infer or write", which a future enrollment owner may contradict.

### Unverified and blockers

- **SPE-3303's live Linear state is unverified** — not read this session. No status change was made.
- **The Hermes II conversation is unreachable from this environment.** `chatgpt.com` in the Cloud browser shows a signed-out landing page (Log in / Sign up, no profile, single fresh tab). This report was therefore **not delivered**; it is staged for posting once a signed-in session exists.
- **No implementation exists**, so nothing here demonstrates resolver behaviour. A green checker means the pack is well formed and self-consistent, not that any code is correct.
- **The ordering prover is sound but incomplete.** It can report an unprovable property that a stronger prover would discharge.
- **`structural` properties are human-readable assertions.** The checker validates their form and the 17 machine invariants; it cannot verify prose such as "cap dominates effect".
- **Formatting of the artifacts was not checked by repo tooling** (Prettier not run; dependencies absent).

### Decision requested

**D1 — adopt or reject the pack as SPE-3303's acceptance surface.** Recommended: adopt. It gives an eventual implementation a falsifiable target (disposition, progression reference, delta) without approving any magnitude.

**D2 — choose the ordering-only acceptance bar, or defer.** Recommended: accept "orderings only, magnitudes unapproved" for now, so implementation can proceed on structure while A3 stays open.

**D3 — sequence A1/A2 before implementation, or not.** Recommended: treat A1 (session identity) and A2 (credit currency) as prerequisites to any Cursor/Codex pickup, because both change the fixture schema itself; A15 should be settled at the same time to avoid two owners awarding XP for one instruction.

No implementation, Linear mutation, PR or merge is requested by this report.

---

## Notes for review before sending

- The message names Freebuff, the issue, the branch and commit, the exact test commands with results, the unverified items, and one decision block.
- It deliberately does **not** address Cursor or Codex as recipients, does not propose a brief to a named implementer, and does not create or propose Linear issues, children or relationships. Pickup stays a Linear concern.
- Once sent, this role waits for Hermes II's response before starting anything else.
- If the browser session becomes available, post the body above verbatim; the only edit needed is deleting the "DRAFT — not sent" line at the top of this file.
