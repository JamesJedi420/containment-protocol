# Green full build recovery — SPE-3375

The recovery clears all **381 surviving occurrences / 266 identities / 134 files**
from synchronized main `7d4a9889dfdcdb1a21e90ffe3612d68da766114e`.
Two forced Node 22.23.4 / TypeScript 6.0.3 compiles return **zero diagnostics**,
and a separate literal `npm run build` exits 0 after TypeScript and Vite complete.
These are recovery-worktree captures; merged-main and hosted CI evidence belongs
in the PR and live Linear closeout, rather than being represented as already run.

## Evidence

- `before/build.txt` and `before/census.json`: fresh literal baseline, exit 2;
  the identity multiset equals the previous mechanical-contracts after-capture.
- `compiler-1.txt`, `compiler-2.txt`, `census.json`: paired forced after-compiles,
  exit 0. The empty compiler transcripts are intentional. The census records
  input/lockfile hashes and the actual dirty state against the pinned revision.
- `build.txt`, `execution.json`: separate literal full build, exit 0; Vite runs.
  The existing large-chunk warning remains. Transcript hash normalizes CRLF to LF.
- `delta.json`: all 170 bounded owners, canonical contract anchors, candidate
  targeted test paths and exactly-once attribution of all 381 removals. The one
  historical recruitment fingerprint mapping changes numeric union print order
  only, retaining the same members; it is recorded explicitly.
- `scripts/typecheck-census.test.mjs`: verifies baseline parsing, prior-capture
  agreement, allocation completeness, paired raw hashes and literal build evidence.

The baseline is a literal build, not a fresh paired forced capture; its agreement
with the prior paired capture is checked by identity and multiplicity. Existing
historical packets remain unchanged. No runtime-byte identity claim is made for
this recovery: some repairs correct real contract failures.

## Repairs and validation

The repairs use validated records and discriminator-specific event constructors,
retain raw hydration boundaries, and align fixtures with canonical constructors.
Malformed-input tests retain malformed inputs through the actual unknown-input
boundary. Optional fixtures assert presence, inherited-key scenarios retain their
prototype, and immutable fixtures are copied rather than mutated.

Behavior corrections include deterministic case-mode hydration, canonical contact
history/reward fields, safe-label projection, cognitive flags remaining arrays,
disguise-owned scan dispatch, omission of undefined report metadata, and keeping
pack-specific reason codes in the integration envelope. No gameplay enum is
expanded. Existing persisted hub/debrief data gains its canonical model type;
there is no new persisted field or schema migration. Unconsumed legacy integrity
helpers referring to a nonexistent persisted field are removed; the existing
pending-invariant owner remains intact.

Strict-console regression: **1,000 files / 10,851 tests pass**. Chromium:
**14 player/harness tests pass**. Full lint and the literal build pass; evidence
integrity: **16 tests pass**. One full-suite navigation timeout passed on focused
and full reruns without changing the assertion. See the linked slice and PR for
requirement-selection, document-validator, Hermes and hosted results.

The repository-wide format advisory reports existing drift outside this diff;
touched files are formatted. Existing locked dependencies were reused after
parsed lockfile comparison, so no clean-install or security clearance is claimed.
Compiler settings, dependencies, CI enforcement and historical budgets remain
unchanged. Full-build gate activation belongs separately to SPE-3348.

Scope and per-owner allocation: [recovery slice](../../../planning/spe-3375-green-full-build-slice.md).
