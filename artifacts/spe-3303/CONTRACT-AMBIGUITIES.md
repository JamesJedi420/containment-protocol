# SPE-3303 — contract ambiguities blocking approved instruction resolution

Status: synthetic fixtures only. No implementation exists for these questions, and nothing below is a recommendation to build one in this slice.

Each item states what the fixtures assume, what the repository actually establishes today, and what decision would close it. Anchors are to the tree at `6dc31ff9` unless noted. `static analysis` means the claim comes from reading source, not from running it.

## A1 — Session-level stable IDs are not registered

**Fixtures assume:** a progression reference is `moduleRef#session-<n>`, composed from the SPE-3304 shared stable-id space plus an ordinal.

**Repository state:** `scripts/validation/academy-authored-content.mjs` registers exactly two kinds, `course` and `module`, both in `SHARED_ID_SPACE = 'academy-stable-id'` with `DEFAULT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/`. There is no `lesson` or `session` kind, and `#` cannot appear in a registered stable ID. `planning/spe-3304-authored-content-validator-slice.md` §7 defers "Course, enrollment, condition/effect… schemas" to their content owners.

**Also:** `academy/content/` does not exist on `main` (`git ls-tree` and the slice doc §4 agree), so no authored lesson record currently exists to reference.

**Closes when:** an owner declares whether lesson/session identity is a registered content kind, a composite reference grammar, or a field on a module record — and the SPE-3304 registry (or its successor) carries that decision.

## A2 — Lesson credit has no approved currency

**Fixtures assume:** credit is counted in discrete session-equivalents (`deltaSessions ∈ {0,1}`, `creditedSessionsAfter` an integer). This is a counting contract, not a magnitude.

**Repository state:** the only existing progression currency is agent XP (`src/domain/progression.ts`, `applyAgentXp`), and the only existing academic completion path is training-queue completion in `src/domain/sim/training.ts`. There is no lesson-progress record, no per-module credit counter, and no `GameState` field for either.

**Deliberately not asserted:** whether a credited session converts to XP, to a stat gain, or to nothing. Fixtures list `xp_or_level_change` in `mustNotEmit` precisely because that is unapproved, not because it is forbidden forever.

**Closes when:** the progression owner names the lesson-credit unit and its conversion (if any) into XP/stat/level effects.

## A3 — Effect magnitude and grading formula are unapproved

**Fixtures assume:** effect strength is a symbolic expression over declared atoms (`E_base`, `E_prep`, `E_instructor_band_{0,1,2}`, `E_peer_assist`, `E_peer_interfere`, `E_makeup`) with only ordering relations. No numeric value appears anywhere in a magnitude.

**Repository state:** no code computes lesson effect strength. The nearest existing formula is training completion (`applyTrainingCompletionToAgent` in `src/domain/sim/training.ts`), whose `rawGain = statDelta + academyStatBonus + aptitude + instructorBonus` is a _training_ formula with approved constants (e.g. `ACADEMY_UPGRADE_COSTS` in `src/domain/sim/academyUpgrade.ts`, `TRAINING_FATIGUE_CURVE_EXPONENT` in `src/domain/sim/training.ts`). Reusing those constants for lesson credit would be an invention, so fixtures assert orderings instead.

**Closes when:** a tuning decision records the formula, or the project formally adopts "ordering-only" as the acceptance bar for resolution.

## A4 — Instructor context on lesson credit is unmodelled

**Fixtures assume:** an assigned instructor whose `specialty` equals the learner's `targetStat` contributes a non-negative effect, monotone in the existing efficiency band; a mismatch contributes exactly nothing.

**Repository state:** `INSTRUCTOR_SPECIALTY_KEYS = ['combat','investigation','utility','social']` and `getInstructorBonus(efficiency)` returning `2 / 1 / 0` at `>= 90 / >= 70 / else` are real (`src/domain/sim/instructorAssignment.ts`). The specialty-equality gate is also real (`getAgentInstructorBonus`). But both feed _training-completion_ stat gain, XP and fatigue tick — not lesson credit. `buildAcademyOverview` (SPE-2669 slice) additionally surfaces `bonus`, and `features/training/trainingView.ts` gates the displayed bonus on `instructorSpecialty === entry.targetStat`.

**Open:** whether lesson resolution reads instructor context at all, or whether that is training-path-only. The invariant `instructor_specialty_must_match_target_stat` encodes the _existing_ equality rule; it does not claim a lesson-level bonus.

## A5 — Peer assistance/interference has no owner

**Fixtures assume:** a caller-supplied peer list with `effect ∈ {assistance, interference}` and one atom per direction; assistance enters the expression positively, interference negatively.

**Repository state:** no domain concept matches. The closest is team chemistry (`relationships` clamped to `[-2, 2]`, `trainedRelationships` as integer bond depth in `applyTeamDrillCoordination`, `src/domain/sim/training.ts`), which is a pairwise bond measure, not a per-session assistance effect. `architecture/personnel-progression-veteran-drift.md` mentions command bonuses "in training contexts only" but does not define peers.

**Open:** who owns the peer-effect schema, and whether peer state is caller-supplied per session or derived from existing team relationships. Fixtures assume caller-supplied so the resolution contract stays testable without a new store.

## A6 — Skipped vs excused have no disposition contract

**Fixtures assume:** `skipped` resolves to `not_evaluated` with no progression reference and no disciplinary output; `excused` resolves to `deferred` with a `pending_makeup` reference on the original session and zero credit.

**Repository state:** neither status exists. `src/domain/models.ts:554` declares `AgentAssignmentStateKind = 'idle' | 'assigned' | 'recovery' | 'training'` and `:216` adds availability values `recovering | unavailable`; a case-insensitive search of `src/**` for `attendance` and `lessonProgress` returns no domain matches, so there is no attendance vocabulary and no absence handling. `systems/team-management.md:165` explicitly rejects attendance-only renewal for refreshers, which is adjacent but not this contract.

**Open:** whether deferral consumes an attempt (the fixtures do not model an attempt counter at all), whether excused absence is time-bounded, and whether `deferred` may be persisted at all — persistence would require state, which this slice forbids.

## A7 — Make-up authorization has no authority

**Fixtures assume:** a make-up carries `authorized: boolean` plus an opaque `authorizationRef`, credits the _original_ session reference, and never exceeds an ordinary session.

**Repository state:** there is no authorization or entitlement record for make-ups. Existing entitlement-shaped state is `progressionUnlockIds` and agency unlocks (`src/domain/agencyProgression.ts`), which is agency-level, not per-learner per-session.

**Open:** who may authorize a make-up, whether `authorizationRef` is a caller assertion or a verifiable record, and whether an authorized make-up consumes the same cap slot as the original session. The fixtures assume the same slot, which is the conservative reading.

## A8 — Repeated evaluation has no dedupe key

**Fixtures assume:** the dedupe key is the caller's `outcomeRef`, and `session.evaluationOrdinal` is a counter, not an identity. A re-delivered `outcomeRef` resolves to `duplicate_suppressed`.

**Repository state:** no lesson-outcome identity exists. CP has event-level identity (`src/domain/events`, queue ids like `training-${week}-${n}-${m}`) but nothing that keys "this attendance result was already resolved".

**Open:** whether idempotency is keyed by caller `outcomeRef`, by `(learnerRef, sessionRef)`, or by a caller-supplied idempotency token. Only the first is representable without new state.

## A9 — "Replay" has no ruleset anchor

**Fixtures assume:** replay means identical inputs produce an identical expectation, and the replay case is byte-identical to its base case (the checker enforces this).

**Repository state:** CP replay determinism rests on seeded RNG and a save-envelope version (`AGENTS.md` § Simulation and state; `SCHEMA_REGISTRY.md`). There is no `rulesetVersion` for academy content, and `academy/content/**` has no version field in the SPE-3304 slice-1 schema.

**Open:** what a replayed lesson resolution pins — content hash, ruleset version, or both. The fixture pack carries its own `fixtureVersion` and a `sha256` of its canonical form as a placeholder for that anchor.

## A10 — Cap source is undecided

**Fixtures assume:** capacity is authored per module (`moduleSessionCapacity`), and `credit_capped` means the learner already holds all authored sessions.

**Repository state:** two candidate sources exist and neither is canonical for lessons: `trainingCatalog[].durationWeeks` (`src/data/training.ts`) is a training-program duration, and module records under the SPE-3304 schema have no capacity field at all (`course.prerequisites`, `course.moduleRefs`, `module.prerequisites`, `module.courseRef` only).

**Open:** whether cap is an authored module field (a new SPE-3304 kind field), derived from session count, or supplied by the caller.

## A11 — No-change lessons are unaddressed

**Fixtures assume:** a session authored `lessonEffect: 'no_change'` resolves to `no_progression_change` with no delta and no reference, even when attendance is present.

**Repository state:** nothing represents a lesson that deliberately teaches nothing. The nearest analogue is a team drill being chemistry-only (`applyTrainingCompletionToAgent` returns zero stat gain and zero XP for `scope === 'team'`), which is a different mechanism.

**Open:** whether a no-change session still consumes a cap slot, an attempt, and scheduled time. Fixtures leave it uncounted (`deltaSessions: 0`, no reference) and do not assert attempt consumption.

## A12 — Preparation evidence has no provenance contract

**Fixtures assume:** `prepared` plus a caller-supplied `evidenceRef`; prepared sessions are non-regressive relative to unprepared ones.

**Repository state:** no preparation concept exists. The closest precedent for caller-attributed evidence is the read-only handoff's provenance discipline (`docs/read-only-session-handoff.md`), which is a documentation convention, not a runtime schema.

**Open:** whether preparation is caller-asserted or verified, and whether its effect is additive or bounded.

## A13 — Enrollment is explicitly out of scope but attendance is not

**Fixtures assume:** resolution proceeds from the caller's authoritative attendance result even when no enrollment record is supplied (`ir-17-no-enrollment-inference`), and never writes one.

**Repository state:** there is no enrollment model anywhere. `docs/academy-authored-content-validation.md` calls its validator "definition-only" and `planning/spe-3304-authored-content-validator-slice.md` §6 forbids defining enrollment schemas.

**Open:** what the resolver does when the caller supplies attendance for a learner with no enrollment record — the fixtures assert "resolve anyway, never infer". A future enrollment owner may contradict that.

## A14 — Disposition vocabulary and persistence are unowned

**Fixtures assume:** seven dispositions (`credit_granted`, `no_progression_change`, `credit_capped`, `deferred`, `not_evaluated`, `duplicate_suppressed`, `rejected_unauthorized_makeup`).

**Repository state:** no such enum exists. Persisting `deferred` or `duplicate_suppressed` would require a learning-state record, which this task explicitly forbids creating, so the fixtures treat dispositions as return values only.

**Open:** whether dispositions are transient return values or persisted, and which owner names them. If persisted, this collides with A6 and A8.

## A15 — Existing training completion may double-count

**Fixtures assume:** instruction resolution emits no `xp_or_level_change` and no `stat_cap_change`.

**Repository state:** `applyTrainingCompletionToAgent` already awards XP, may trigger a potential breakthrough (`applyPotentialBreakthrough`), and mutates base stats and derived stats on completion, with an instructor-bonus-backed XP term. If a future lesson resolver also awards XP for the same instruction, the same learner-week could be credited twice by two owners.

**Open:** whether lesson resolution replaces, feeds, or sits beside the training-completion path. This is the highest-risk interaction in the set and should be settled before any implementation.
