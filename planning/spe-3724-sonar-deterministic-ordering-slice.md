# SPE-3724 — explicit deterministic string ordering

Owner: [SPE-3724](https://linear.app/spectranoir/issue/SPE-3724/make-deterministic-string-ordering-explicit-for-sonarcloud).
Base: `main` at `f3cda2d8be1cd037f48e791c2736681f86364868`.
Branch: `codex/sonar-deterministic-ordering`.

## Authority and boundary

The user approved the two-PR SonarCloud repair plan, including a standalone
shared-system owner. This issue owns only the ten reported `typescript:S2871`
sites. The admission, bounded design and contradiction checks were applied under
that authorization before recording this standalone owner In Progress. Completed
recovery issues remain closed.

| Domain module                          | Default sorts replaced |
| -------------------------------------- | ---------------------: |
| truthLayerRecordRegistry               |                      2 |
| scenarioDefinitionResolver             |                      1 |
| dutyObligationRegistry                 |                      1 |
| messageToServiceAvailabilityValidation |                      2 |
| hazardousResearchRiskPosture           |                      1 |
| researchThroughputExecution            |                      1 |
| environmentalOperationalContext        |                      1 |
| containmentRequirementFulfillment      |                      1 |

Each module uses a private string comparator returning -1, 0 or 1 from `<` and
`>` comparisons. This preserves default UTF-16 code-unit order, including
surrogates, without locale collation. Existing filtering, deduplication, copying,
mutation and freezing remain at their original call sites. No shared sorting
subsystem, public API, persisted schema or gameplay rule is introduced.

Excluded: nine workflow-security findings, dependency/action updates, older
Sonar findings, coverage thresholds, Sonar rules and the new-code period.
Workflow repair requires a separate owner, successful Sonatype review and a new
chat after this PR merges.

## Parity and validation

`src/test/sonarOrderingParity.test.ts` exercises the affected public boundaries.
Default string sort is the parity oracle. Inputs include mixed case,
numeric-looking strings, Unicode (including surrogate/BMP ordering), duplicates
and deterministic permutations where the contracts accept arbitrary IDs.
Finite preset/category vocabularies use their actual supported values; duplicate
categories remain invalid. Tests check runtime serialized bytes, registry
insertion order, input immutability and frozen outputs. Environmental comparisons
retain a differing-value control; deadline evaluation preserves its per-entry
results and repeat-call identity.

The initial environmental test fixture omitted the required three owners; the
fixture was corrected without changing production semantics. All nine affected
suites then passed: 122 tests. Full build, lint, regression and selected validators
passed before shipping: full regression 1,001 files / 10,860 tests with strict console checks and two workers; lint and full build exit 0. The initial default-worker run had one lazy-route timeout; the unchanged route suite passed in isolation and in the bounded full rerun. Hosted CI and current-main Sonar results are
recorded in the PR and Linear lifecycle evidence.

## Shipping checkpoints

- Scope/integration: exactly ten sort calls across the eight named modules.
- Edge cases/state: public parity tests plus existing parser/consumer suites.
- Regression: targeted suites, full regression, lint and full TypeScript/Vite build.
- Documentation: this bounded slice; no backlog/manifest scope changes.
- Cleanup: no exports, dependencies, shared subsystem or unrelated formatting.
- Hermes: bounded local acceptance/test mapping and independent first-pass
  review completed (local-aeec1c4e1e49ba052e41ec62f1d60f37303958cd420c5a7e2a3434262c94ec95), with no comparator bug. Suggested numeric/Unicode gaps were rejected because the oracle covers them. Small
  pre-commit documentation and PR communication checks run directly because
  delegation overhead exceeds their evidence volume. External research and
  frontend guidance are not applicable to this pure domain repair.
- After merge: sync main, verify the three repository closeout validators,
  record truthful Linear evidence and dispatch Hermes Linear Hygiene. No broader
  policy change or next-slice implementation belongs in this chat.

The live baseline also has 41 older bugs and two older vulnerabilities outside the
approved boundary. Overall ratings remain affected by those excluded findings;
the A ratings in this gate repair refer to new-code ratings.

Acceptance: the ten targeted findings disappear and main new-code reliability is A,
without suppressions or gate changes. Security A and all 19 resolved remain the
combined two-PR acceptance; nine security findings are explicitly pending PR 2.
