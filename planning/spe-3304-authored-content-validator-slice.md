# SPE-3304 — Academy authored-content validator (slice 1)

**Approved slice-1 boundary** under `docs/cursor-autonomous-authority.md`. SPE-3304 stays open after this slice for deferred families; this document narrows coding to the invocation surface + definition-only skeleton only.

| Field                     | Value                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Status**                | **In Progress — Cursor-approved slice 1**                                                    |
| **Linear**                | [SPE-3304](https://linear.app/spectranoir/issue/SPE-3304) — In Progress                      |
| **Parent**                | None (standalone issue)                                                                      |
| **Branch**                | `feat/spe-3304-authored-content-validator-slice-1`                                           |
| **Base main SHA**         | `ac8fdf1fdb706bd0075dd12c32b18271c0a8b88f`                                                   |
| **Registry policy owner** | SPE-3348 — Done. `scripts/validation/validators.v1.json` is not modified by this slice.      |
| **Downstream**            | SPE-3304 currently blocks the Academy content queue; this slice is its unblocking dependency |

## 1. Why this boundary exists

`scripts/validation/validators.v1.json:194-204` registers `academy-authored-content` as `enforcement: required`, `whenUnavailable: fail`, with an `npmScript` and no `command`. `package.json` has no `verify:academy-authored-content` script, so the resolver cannot invoke it.

That state is deliberate, not broken:

| Evidence                                                      | What it establishes                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `docs/repository-validation-requirements.md:45`               | "Unavailable until Academy ships its npm script; fail-closed"              |
| `scripts/validation/requirement-model.check.mjs:182-210`      | A passing unit test asserts the unavailable case is a missing requirement  |
| `scripts/validation/requirement-model.mjs:247-251`, `268-284` | Missing npm script → `unavailable`; `fail` policy → missing required       |
| `.github/workflows/test.yml:34-44`                            | CI runs the resolver, so the gate becomes real the moment a path activates |
| `scripts/validation/validators.v1.json:22-27`                 | The `academy` change class activates only through its four path globs      |
| `scripts/validation/requirement-model.check.mjs:143-152`      | The selection fixture assumes `academy/content/courses.json`               |
| SPE-3348 shipped comment `5817bf22`                           | Recorded the entry as an "Academy SPE-3304 selection stub (fail-closed)"   |
| `git ls-tree -r origin/main`                                  | No path matches the `academy` class today, so the gate cannot trigger      |

The residual dependency is therefore SPE-3304's own deliverable: the invocation surface plus enough engine to make the gate meaningful. Today the first PR that creates an Academy content path fails CI with a message that names no owner and offers no fix.

## 2. What this slice narrows

SPE-3304's body is a registry of fold-ins — naming taxonomy, provenance crosswalks, scenario/location/item references, condition and effect targets, storyline and cadence references, research targets, competency catalogs, entitlements, staged fabrication, and more, each with its own additional acceptance coverage. Its full acceptance criteria cannot fit one coherent reviewable PR.

This slice delivers **the invocation surface, the deterministic engine skeleton, and the definition-only reference rules that need no unshipped schema**. It is an explicit narrowing: SPE-3304 stays **open**, and no criterion that depends on an unshipped schema is claimed or satisfied here.

The narrowing is supported by an existing approved Phase 4 comment on SPE-3304 (2026-10-25) that describes prerequisite-linked authored checks as "existing Academy authored-data checks for stable IDs, valid references, impossible prerequisites, and actionable deterministic validation", while stating that SPE-3397 owns CP scenario initialization validation and SPE-3139 keeps its bounded incident/case/hazard scope.

## 3. In scope

1. **Invocation surface.** `package.json` gains `"verify:academy-authored-content": "node scripts/validation/academy-authored-content.mjs && node --test scripts/validation/academy-authored-content.check.mjs"`. The name is fixed by the registry contract; do not rename it. The bundled `node --test` half is deliberate: no workflow step discovers `scripts/**/*.check.mjs`, so a separate test-only script would never run.
2. **Validator engine** at `scripts/validation/academy-authored-content.mjs`:
   - deterministic, read-only discovery of `academy/content/**/*.json`; non-JSON files are never candidates and never fail the gate;
   - one **content-type registry** (kind → loader + validator pair) so later Academy content types register without editing a monolithic function;
   - fail-closed handling of unknown/unclassifiable content, malformed JSON, and malformed record shape;
   - stable-ID grammar and duplicate detection within a registered kind and across kinds that declare a shared ID space;
   - cross-reference integrity for references resolvable from the loaded content;
   - statically provable impossible prerequisites only (no runtime evaluation, no unbounded playthrough solving);
   - source-oriented diagnostics with deterministic ordering;
   - exit `0` on a valid, empty, or absent content root, `1` on any violation, `2` on invalid invocation.
3. **Fixture corpus** at `scripts/validation/fixtures/academy-authored-content/` (valid and invalid cases below). Committed fixtures are parseable JSON only; the malformed-JSON case is generated into an `fs.mkdtemp` directory inside the test. `.prettierignore` covers only `coverage`, `dist`, `dist-ssr` and `node_modules`, so a committed unparseable file would break `npm run format` for every developer while leaving advisory `format-check` green. Fixtures are the only content this slice authors; the real root stays empty.
4. **Tests** at `scripts/validation/academy-authored-content.check.mjs`, using the existing `node:test` convention in `scripts/validation/`. CI wiring is two declared `package.json` edits: the bundled script above, and `verify:requirements:test` becoming `"node --test scripts/validation/requirement-model.check.mjs scripts/validation/academy-authored-content.check.mjs"` — the only registered validator that activates on `scripts/validation/**`.
5. **Docs** at `docs/academy-authored-content-validation.md`: content root, registered kinds, how to register a new kind, diagnostic format, exit semantics, and the definition-only guarantee. One line in `docs/repository-validation-requirements.md:45` changes from "Unavailable until…" to point at the script and the doc — availability text only; `enforcement`, `whenUnavailable`, `ownerIssue` and `activation` are unchanged.
6. **README Scripts row.** `README.md` gains one row in the Scripts table matching the existing `verify:requirements` wording, because `AGENTS.md` requires every `package.json` script to be listed there. `README.md` is a `shared-config` path, so this edit also puts the full `unit-tests` validator in the required set.

## 4. Content root decision

The slice uses **`academy/content/**`**.

This is not cosmetic. The `academy` change class activates on `academy/**` (`scripts/validation/validators.v1.json:23`), and the resolver's own selection fixture already uses `academy/content/courses.json`. Placing content anywhere else — for example `content/academy/**`, matching the existing `content/incidents/**` convention — would fail to activate the gate, producing a green CI that never validates anything.

Choosing `content/academy/**` instead is **outside this boundary**: it needs an added activation glob in `validators.v1.json` plus a matching activation case in `requirement-model.check.mjs`, which is SPE-3348 policy work rather than SPE-3304 semantics. If a reviewer prefers that location, the slice must be re-approved with that amendment named explicitly.

## 5. Rules delivered in slice 1

| Rule                                        | Fails closed on                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Content file unclassified / unknown kind    | A discovered `*.json` file whose container type no registered kind claims |
| Malformed JSON                              | Unparseable file                                                          |
| Malformed record shape                      | Missing/extra-typed required fields, wrong container type                 |
| Stable ID grammar                           | IDs outside the declared pattern for their kind                           |
| Duplicate stable ID                         | Same ID twice in one kind, or in two kinds sharing an ID space            |
| Dangling cross-reference                    | A declared reference with no matching authored record                     |
| Statically provable impossible prerequisite | Prerequisite cycles (missing targets report as `dangling-reference`)      |
| Absent or empty root                        | No — both are valid and exit `0`                                          |

Discovery is `academy/content/**/*.json`. A non-JSON file in the root — a README, a `.gitkeep`, notes — is not a candidate and never fails the gate, so documentation can sit beside content without weakening the unclassified rule. Only a discovered JSON file that no registered kind claims fails closed.

Diagnostics are one line per violation: `<relative-path>:<line> — <rule> — <record-id or "file"> — <field-path>: <message>`. Ordering is by path, then line, then rule, then record ID, so two runs are byte-identical.

Every rule is definition-only. The validator must not materialize records, choose runtime candidates, mutate content, or touch campaign state.

## 6. Explicit non-goals

- Do not edit `scripts/validation/validators.v1.json` — not its enforcement, `whenUnavailable`, owner note, or activation globs.
- The only `package.json` edits are the two declared in §3: the new script value and the `verify:requirements:test` file list. No other script changes, and neither edit alters the registry.
- Do not restate or relocate registry policy. The only `docs/repository-validation-requirements.md` change is the single availability cell in §3 item 5.
- Do not reopen SPE-3348, add `--exception` entries, or add `continue-on-error`.
- Do not define production schemas owned by other issues (courses, enrollment, conditions, inventory, locations, storyline runtime).
- Do not implement SPE-3304's naming taxonomy, Founding Core distinctiveness, alias-collision policy, or procedural name profiles; these depend on the shared identity contract (SPE-3334) and remain deferred.
- Do not implement provenance crosswalks, storyline cadence, research targets, instructor-context references, entitlements, or staged fabrication.
- Do not duplicate SPE-3397 (CP scenario initialization validation) or SPE-3139 (incident/case/hazard authored references).
- No `src/domain`, store, projection, UI, GameState, save/migration, or simulation change. The validator lives in `scripts/`, so `docs/dependency-boundaries.md` and the boundary-enforcement test are unaffected.
- No second validator framework: reuse `scripts/validation/` and the resolver as-is.
- No new Linear issue, parent, child, or relationship.

## 7. Deferred from SPE-3304

| Deferred family                                              | Blocking dependency                      |
| ------------------------------------------------------------ | ---------------------------------------- |
| Academy Name Taxonomy / ID grammar beyond the base pattern   | Shared identity contract (SPE-3334)      |
| Provenance crosswalks, Level C descriptor rejection          | Canonical actor/region/civilization keys |
| Course, enrollment, condition/effect, location, item schemas | Their content owners                     |
| Storyline composition, cadence, role slots, adventure stages | Storyline/period identifiers             |
| Research targets, instructor context, entitlements           | Attribute/skill and favor contracts      |
| Competency catalogs and crafting requirements                | SPE-3262 / SPE-3198 resolved model       |
| Event/checkpoint and delayed-fulfillment rules               | Event queue and vendor schemas           |

Each stays owned by SPE-3304 and keeps its existing acceptance coverage. Slice 1 must not add placeholder checks for them, because a check that cannot see its schema would produce false confidence.

## 8. Test matrix

| Fixture                              | Expected                                                |
| ------------------------------------ | ------------------------------------------------------- |
| `valid/minimal-pack`                 | exit `0`, no diagnostics                                |
| `valid/empty-root`                   | exit `0`, no diagnostics                                |
| `valid/absent-root`                  | exit `0`, no diagnostics                                |
| `invalid/unknown-kind`               | exit `1`, one diagnostic naming the unclassified file   |
| `invalid/malformed-json` (generated) | exit `1`, parse error with file and line                |
| `invalid/malformed-record`           | exit `1`, field path in the message                     |
| `invalid/duplicate-id-same-kind`     | exit `1`, both occurrences identified                   |
| `invalid/duplicate-id-shared-space`  | exit `1`, cross-kind duplicate reported once per record |
| `invalid/id-grammar`                 | exit `1`, offending ID quoted                           |
| `invalid/dangling-reference`         | exit `1`, source record plus missing target             |
| `invalid/impossible-prerequisite`    | exit `1`, prerequisite cycle named                      |
| repeated run of any fixture          | byte-identical output, identical exit code              |

Additionally: the validator leaves the fixture tree byte-identical (hash before/after), an unregistered content kind is rejected rather than silently skipped, and `npm run format:check` stays clean over every committed fixture.

## 9. Acceptance for slice 1

- [ ] `npm run verify:academy-authored-content` exists, is deterministic, and exits `0` on the current absent root — `academy/content/` does not exist on `main` today.
- [ ] That same command runs the fixture suite, so the gate carries its own regression tests whenever it fires.
- [ ] `npm run verify:requirements:test` runs the new check file, so the suite executes on the PR that adds it.
- [ ] `README.md` lists the script in the Scripts table, and `npm run format:check` passes over the committed fixture tree.
- [ ] `npm run verify:requirements -- --files academy/content/example.json --include academy-authored-content` flips from `[unavailable]` / exit `1` to `[passed]` / exit `0` **without** editing `validators.v1.json`.
- [ ] Invalid fixture content fails deterministically with clear error paths (SPE-3304 acceptance).
- [ ] Valid fixture content passes repeatedly with identical results (SPE-3304 acceptance).
- [ ] Duplicate IDs and broken cross-references are always detected (SPE-3304 acceptance).
- [ ] Tests cover valid content, duplicate IDs, missing references, invalid prerequisites, and extensibility (SPE-3304 acceptance).
- [ ] Later content registries can register validators without importing UI/features into domain/data validation (SPE-3304 acceptance).
- [ ] Validator failures do not mutate runtime campaign state (SPE-3304 acceptance).
- [ ] `validators.v1.json` and every other registered validator remain untouched. The only existing-validator change is the declared `verify:requirements:test` file list, which adds a path and changes no selection logic.

Criteria SPE-3304 lists for naming IDs, display-name/title separation, alias collisions, procedural name profiles, Level C provenance, capability claims, and cross-schema coverage are **not** claimed by this slice.

## 10. Validation to run in the implementation PR

```bash
npm run verify:academy-authored-content
npm run verify:requirements -- --files academy/content/example.json --include academy-authored-content
npm run verify:requirements:test
npm run verify:requirements -- --base origin/main
npx eslint scripts/validation/academy-authored-content.mjs scripts/validation/academy-authored-content.check.mjs
npx prettier --check scripts/validation/academy-authored-content.mjs scripts/validation/academy-authored-content.check.mjs docs/academy-authored-content-validation.md docs/repository-validation-requirements.md README.md package.json
npm run format:check
git diff --check
```

The first command runs the fixture suite, so no separate `node --test` line is needed. `scripts/validation/**` is inside the `tooling` change class and the `requirements-model-tests` activation glob, so `verify:requirements:test` is a required check for this PR. Editing `package.json` also activates `shared-config`, which makes `unit-tests` required; `verify:requirements -- --base origin/main` runs it, and it is the largest check in this list.

## 11. Risks and open questions for Phase 4

1. **Root location.** `academy/content/**` activates the gate; `content/academy/**` does not. A reviewer preferring the latter must amend the registry glob, which moves that decision into SPE-3348 policy.
2. **ID grammar scope.** Slice 1 needs a base ID pattern to detect duplicates meaningfully, but the full taxonomy is SPE-3334-dependent. Slice 1 should accept a declared per-kind pattern and default to a conservative `[a-z0-9][a-z0-9-]*` rather than encode naming policy.
3. **Fixture location.** Fixtures live under `scripts/validation/fixtures/`, not the production root, so real content cannot be mistaken for test data.
4. **Gate activation is still content-dependent.** Until a real `academy/content/**` file lands, CI runs the validator only for PRs touching the class; that is the correct fail-open-to-nothing posture and should be stated in the doc. This is also why the suite must ride inside the script and `verify:requirements:test` rather than a new entry: this PR touches no `academy/**` path, so nothing else would execute it.
5. **One SPE-3348-adjacent edit is declared.** Extending `verify:requirements:test` broadens what a validator owned by a Done issue runs. It is a file list, not selection logic, and the registry stays untouched — but it should be named in the PR body so a reviewer sees it rather than discovering it in the diff.

## 12. Approval record

| Phase                     | State                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — candidate assessment  | Complete (evidence above)                                                                                                                                                         |
| 2 — parent reconciliation | Complete — SPE-3304 selected; no parent created or changed                                                                                                                        |
| 3 — contradiction review  | Complete — no contradiction with SPE-3348, the registry, or SPE-3304 itself                                                                                                       |
| 4 — approved update       | **Cursor-approved** 2026-10-30 under `docs/cursor-autonomous-authority.md` (ChatGPT Phase gates do not bind Cursor). Slice 1 boundary only; deferred families remain on SPE-3304. |

Implementation proceeds on this branch with SPE-3304 In Progress.

## References

- `scripts/validation/validators.v1.json` — academy entry, change classes
- `scripts/validation/requirement-model.mjs` — availability probe and missing-required detection
- `scripts/validation/requirement-model.check.mjs` — selection and unavailable-case tests
- `docs/repository-validation-requirements.md` — validator registry policy
- `docs/dependency-boundaries.md` — layer rules (validator lives in `scripts/`)
- [SPE-3304](https://linear.app/spectranoir/issue/SPE-3304) — owning issue
- [SPE-3348](https://linear.app/spectranoir/issue/SPE-3348) — registry policy, Done
