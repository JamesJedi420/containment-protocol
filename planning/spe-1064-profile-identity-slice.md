# SPE-1064 — Known-profile correction identity integrity

- Owner: [SPE-1064](https://linear.app/spectranoir/issue/SPE-1064), In Progress; no parent.
- Actor: Codex, authorized continuous shipping loop; CP core.
- Branch: `codex/spe-1064-profile-identity`.
- Base/main: `7015e8c1eaf7e01fc599be2d9d53ceb0829efbe5`.

## Boundary and implementation

At the base revision, `src/domain/actorTaxonomy.ts` `correctKnownProfile`
retains `known.actorId` while accepting all confirmed fields from any supplied
truth declaration. Thus another actor's capabilities can be confirmed under the
original actor's ID, even when both actors share a class.

Compare canonical IDs before constructing a correction. Mismatch throws the
stable `actor-profile-identity-mismatch` error without mutating either input.
Matching IDs preserve the existing correction behavior, including correction of
misclassified class, physicality and capabilities. Separate object instances are
valid; identity must not depend on object reference or apparent class.

Only the domain helper, `src/test/sim.actorTaxonomy.test.ts`, and this document
change. No capability rules, actor identity generation, persistence, runtime
materialization, UI, or knowledge-discovery policy is added.

## Acceptance and evidence

- Different-class and same-class mismatched IDs reject before confirmation.
- A cloned declaration with a matching ID still corrects misclassification.
- Both successful and rejected calls preserve their inputs.
- Red regression: two expected failures, eight passes on the unmodified helper.
- Green targeted run: 10 tests, 1 file, 1.54 seconds, Node 22.23.4 / Vitest 5.0.5.
- `verify:requirements -- --files src/domain/actorTaxonomy.ts,src/test/sim.actorTaxonomy.test.ts,planning/spe-1064-profile-identity-slice.md`:
  required lint, backlog-handoff, unit suite (11,040 tests / 1,018 files, 88.44
  seconds) and Vite bundle passed. Advisory Chromium checks: 24 passed in 3.8
  minutes; typecheck: zero diagnostics. Global formatting remains an advisory
  baseline failure; touched files pass Prettier.
- Literal `npm run build` passed (TypeScript plus production bundle).
- `git diff --check` passed. Independent hosted review and CI follow publication.

The regressions are constructed domain fixtures. The helper currently has no
production correction caller, so this does not establish gameplay reachability,
player observation or persistence. These broader SPE-1064 obligations remain
open; successful shipping must not mark the owner Done.

## Six-pass pre-ship audit

1. Scope/integration: correction identity is owned here; existing callers in the
   targeted suite retain valid same-ID behavior. No runtime integration claim.
2. Edges: same-class different identity and different-class identity reject;
   misclassification for the same ID remains correctable. This typed helper is
   not a new untrusted-input parser.
3. Determinism/information: exact canonical ID comparison; no random or temporal
   inputs, no cross-actor confirmed information, no input mutation.
4. Regressions: existing physicality/interaction tests pass; same-ID object
   copies work. Required broad checks passed as recorded above.
5. Documentation/schema: this repair changes no persisted fields or schema.
6. Diff/dead code: one guard, focused regression cases; no new subsystem.

Hermes: bounded direct fallback reuses the earlier failed local-Qwen checkpoint
evidence; this small repair does not justify repeating the failed dispatch.
Codex owns evidence checks and publication. Freebuff is disabled by explicit user
instruction. No measured token savings claimed. Modern Web Guidance does not
apply to this pure-domain change.
