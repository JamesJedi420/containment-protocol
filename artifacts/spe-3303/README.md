# SPE-3303 — synthetic instruction-resolution fixtures

Standalone fixture pack, optional checker, and contract-ambiguity list for the Academy instruction-resolution contract. **No repository files are modified by this artifact set**, and no implementation is proposed here.

- [Fixtures](fixtures/instruction-resolution.fixtures.json) — 18 cases, 8 symbolic atoms, 17 invariants
- [Checker](check-instruction-resolution-fixtures.mjs) — dependency-free Node validator for the pack
- [Contract ambiguities](CONTRACT-AMBIGUITIES.md) — 15 items that block an approved resolver

## What this is for

An instruction resolver takes one lesson session and the caller's **authoritative** attendance/session result and returns a disposition plus a canonical progression reference. It does not enrol anyone, does not infer attendance, and does not own progression state.

These fixtures pin the *observable contract* of that resolver before any of it exists, so the eventual implementation has something falsifiable to satisfy instead of an invented specification.

## Run

```bash
node artifacts/spe-3303/check-instruction-resolution-fixtures.mjs
```

Exit `0` valid, `1` violations (one line each, deterministically ordered), `2` bad invocation. `--pack <path>` points at another copy; `--quiet` prints nothing on success.

The checker validates the pack. **It does not resolve lessons and does not verify any implementation.**

## Case shape

| Field | Meaning |
| --- | --- |
| `caseId` | `ir-<nn>-<slug>`, unique, sorted |
| `class` | one of the declared scenario classes |
| `identity.learnerRef` | canonical stable ID |
| `lesson.courseRef` / `lesson.moduleRef` | must exist in `lessons[]` and belong together |
| `lesson.makeup` | present only on make-up cases: `authorized`, `authorizationRef`, `forSessionRef` |
| `session.sessionRef` | `moduleRef#session-<n>`, a declared session of that module |
| `session.evaluationOrdinal` | how many times this session has been evaluated (a counter, not an identity) |
| `attendance` | `authority` (`caller` or `none`), `status`, `outcomeRef` |
| `instructorContext` | `assigned`, `specialty`, `efficiencyBand` |
| `preparation` | `prepared`, `evidenceRef` |
| `peers[]` | `peerRef`, `effect`, `magnitudeAtom` |
| `enrollment` | `supplied` only — never required, never written |
| `progressionState` | `creditedSessionsBefore`, `targetStat` |
| `expect` | `disposition`, `progression`, `deltaSessions`, `effectStrength`, `properties`, `invariants`, `mustNotEmit` |
| `replay` | `{ of, ordinal }` — inputs and expectation must equal the base case |

Capacity is a property of the module (`lessons[].moduleSessionCapacity`), so cases do not repeat it; session identity is carried by `sessionRef`, so cases do not repeat an ordinal; and caller attendance authority replaces a separate "evaluated" flag. Every remaining field is read by the checker or asserted by a case — there is no decorative state.

## Coverage

| Required scenario | Case |
| --- | --- |
| Ordinary teaching | `ir-01`, `ir-17` |
| No-change lesson | `ir-03` |
| Skipped attendance | `ir-04` |
| Excused attendance | `ir-05` |
| Authorized make-up | `ir-06` (plus unauthorized control `ir-07`) |
| Preparation effect | `ir-02` |
| Instructor context | `ir-08` matching, `ir-09` mismatched, `ir-18` combined |
| Peer assistance | `ir-10` |
| Peer interference | `ir-11` |
| Capped progression | `ir-12` at cap, `ir-13` reaching cap |
| Repeated evaluation | `ir-14` |
| Replay | `ir-15` |
| Missing attendance authority | `ir-16` |
| No enrollment inference | `ir-17` |

All 14 classes are listed in `requiredClasses`, so deleting any scenario fails the run.

## Two rules that keep this honest

**Credit is counted, effect is symbolic.** `deltaSessions` is a discrete session-equivalent count (`0` or `1`) so arithmetic is checkable. `effectStrength` is a symbolic expression over declared atoms and carries no number, because the grading formula is not approved.

**Order properties must be provable.** Every `order` property is proved from the atom relations by non-negative linear cancellation; an unprovable ordering is a violation, not a warning. Structural properties are human-readable assertions the checker only checks for form — it cannot verify prose like "cap dominates effect". A declared invariant that no case cites is also a violation, so the registry cannot grow unverified entries.

## Grounded versus unapproved

| Grounded in existing code / docs | Unapproved, therefore symbolic |
| --- | --- |
| Stable-ID grammar and shared ID space (`scripts/validation/academy-authored-content.mjs`) | Lesson credit unit and conversion to XP/stat |
| Stat-key allowlist and instructor efficiency bands (`src/domain/sim/instructorAssignment.ts`) | Instructor effect on lesson credit |
| Academy tier bonus semantics (`src/domain/sim/academyUpgrade.ts`) as context only | Peer assistance/interference schema |
| Specialty-equality gate (`getAgentInstructorBonus`) | Make-up authorization semantics |
| | Dedupe key for repeated evaluation |

## Checker scope — what a green run does not prove

- It does not prove any resolver is correct; there is no resolver.
- It does not prove a real lesson pack would validate; the `lessons[]` block is fixture-local.
- It cannot verify `structural` property prose.
- Its ordering prover is sound but incomplete: it may report an unprovable property that a stronger prover could discharge.
- It does not check persistence, events, UI, or gameplay reachability, because none of that exists for this contract.

## Usage by a later implementation review

Treat the pack as the acceptance surface: an implementation that disagrees with `expect.disposition`, `expect.progression.sessionRef`, or `deltaSessions` on any case is wrong. An implementation that invents a magnitude is not covered by this pack either way — that decision lives in [CONTRACT-AMBIGUITIES.md](CONTRACT-AMBIGUITIES.md) A3 and A4.

Fixtures are definitions, not a runtime store: nothing here should be imported by `src/**`, and no case implies a new `GameState` field.
