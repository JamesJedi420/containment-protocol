# SPE-3283 — production Agency route test readiness

## Boundary and evidence

Codex resumes the existing maintenance-purchase acceptance boundary after SPE-3352's full execution at `b121d4f2a977309a120804b154ee596784d44f59` failed `src/app/App.systemBoundary.route.test.tsx:27`. The test could not find “Buy maintenance package”; 10,971 other tests passed. The unchanged isolated file passed four tests under the same Node 22, CI and strict-console settings. The exact full-run timing cause was unverified; no purchase-mechanic defect was established.

SPE-3283 explicitly owns the paid Agency purchase and production-route tests. Its prior shipped implementation remains valid historical evidence, but current acceptance repair is In Progress. Parent SPE-1052 is unchanged. New branch `codex/spe-3283-agency-route-readiness`, base `c54d9fe3a20397b9fb992a69be4988aaf3ac4ec7`; preflight ready at 2026-11-06T15:36:50.189Z after #4891 closeout, clean synchronized main, no open PR or owner blocker. No new child or broader product scope.

## Controlled diagnosis and correction

At the base, `src/app/App.tsx:79` lazy-loads AgencyPage inside the existing Suspense boundary. The first purchase test used Testing Library's default query wait without explicit route readiness. Existing workflow tests use bounded five-second waits for real lazy-route surfaces.

A disposable copy of the production route test delayed the actual AgencyPage import by 1,200ms using a test-only async module factory. With the original query, the purchase test failed while the captured DOM explicitly showed “Loading route…”. With the readiness correction, the same controlled delay passed the complete original purchase/recovery assertions. This constructed diagnostic verifies the timeout assumption, not the exact scheduling of the historical full-run failure. The artificial delay/mock is not shipped; the temporary test was removed before normal validation.

The permanent change waits up to five seconds for the actual level-two Agency Command heading, then queries the purchase button synchronously. All original funding debit, purchased resources, debt preservation, disabled repeat purchase and subsequent recovery-consumption assertions remain unchanged. No sleep, route mock, skipped assertion, retry, global timeout or performance gate is introduced. A genuinely missing purchase button still fails immediately once the real page is ready. Production domain/store/UI, price, resources, save behavior and schema are unchanged.

## Validation and audits

Node 22.23.4, CI=true, STRICT_TEST_CONSOLE=1, forks pool. Controlled before probe: one expected failure / three unselected tests; after probe: one pass / three unselected tests, 5.52s. These are explicitly fault-injected diagnostics, not ordinary suite coverage. The normal route, App workflow and App suites then passed all 51 tests across three files, 21.95s.

Retained host-local artifacts: `C:/Users/james/.codex/tmp/spe3283-delayed-before.log`, `spe3283-delayed-after.log`, `spe3283-delayed-probe.test.tsx` and `spe3283-targeted.log` in that directory. The probe file preserves the corrected test plus its temporary delay; the original query remains available at the base revision. These are provenance locators, not public downloads. The blocked b121d4f2 release snapshot remains immutable.

Six direct audit passes check the existing owner, cold-versus-ready/missing-control behavior, unchanged state/price assertions, adjacent route regressions, factual diagnostic limits and removal of temporary scaffolding. Delegation overhead exceeds this small evidence volume; no Hermes approval, Freebuff or new tooling. Test-only readiness does not change browser behavior or require frontend implementation guidance. Required full validation, actual browser purchase coverage, independent PR review and final-head CI remain acceptance gates before closeout.

Final local validation passed all 10,972 tests across 1,007 files under strict console/forks (531.57s). The registered selector passed required backlog, lint, unit tests and Vite bundle plus advisory Playwright and zero-diagnostic typecheck. All 24 campaign browser checks and five synthetic error checks passed without retries. The existing `e2e/cp-smoke.spec.ts:137` performs the actual Agency purchase and reload: resources/funding remain visible and persisted, repeat purchase stays disabled, and the insufficient-funding explanation remains. The production-route test separately exercises purchased-resource consumption by recovery; that part is a constructed React/store interaction, not claimed as an additional browser playthrough. This preserves reachable, connected, observable and persistent purchase evidence without inventing new gameplay.

Log: `C:/Users/james/.codex/tmp/spe3283-required.log`. Both changed files pass formatting, targeted lint and diff whitespace checks. No literal full-build rerun is claimed here; the selected bundle and separate typecheck both passed. The historical failed release execution remains blocked at its pinned revision; this new passing run does not rewrite it. Independent PR review and final-head hosted CI remain merge gates.
