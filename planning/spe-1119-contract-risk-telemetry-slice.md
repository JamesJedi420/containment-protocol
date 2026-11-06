# SPE-1119 — authored contract-risk observation

Codex continues after #4904 closeout. Base `4203d9086afe9a8775225da2f25db68d73dc6adf`; branch `codex/spe-1119-contract-risk-telemetry`. Fresh preflight ready 2026-11-06T22:49:16.152Z: synchronized clean main, no PRs, owner In Progress/no blockers. Existing approved operational telemetry boundary unchanged.

## Contract

`buildContractCaseSkeleton` already copies authored offer template and risk label into the active case contract. The before-close hook copies those two fields on committed cases. No contract produces null; legacy contract metadata may carry null template/risk. No generic risk classification is inferred from difficulty, agency-standing danger bands or missing metadata.

The analyzer groups by recorded contract-template/risk pair, counting distinct observed case IDs and case-week exposure separately. Continuing cases do not become new observed cases each week. A case whose metadata changes can appear in more than one group; summing group counts is not a global unique-case count. These are observed commitments, not reconstructed launch events or claims of deliberate player selection. Medium and moderate remain distinct authored labels. Stable code-unit tuple-key ordering avoids locale-dependent output.

Event v6 and analysis v5 change together. Existing overall distinct-case counts and template summaries remain available; non-contract cases stay outside contract groups. Unknown metadata is explicit. Raw components permit an analyst to choose a stated denominator; no universal low-risk-share threshold, risk model or opaque dominance score is added.

## Evidence and limits

Test an actual `launchContract` command followed by capture, detachment and missing metadata. Separately constructed three-week traces show three distinct low-risk cases versus one continuing high-risk case while funding rises; known-risk observed-case share is 3/4, with unknown/non-contract cases explicitly excluded. That fixture is an analysis example, not an observed player campaign, and it does not claim all contract risk equals actual outcome danger. Test input-order invariance and preserve medium/moderate distinctions. Existing repeat/default-run tests protect harness noninterference.

No gameplay, persistence, reward, player UI or dependency changes. Broader SPE-1119 and risk/consequence comparisons remain open; historical evidence stays revision-pinned. Six direct audits cover source/scope, missing data/counting edges, deterministic audience isolation, regression, docs/contracts and cleanup. Bounded existing-source checkpoint handling; no Freebuff/new substantial Hermes synthesis. Node22.23.4 validation passed: 37 targeted tests/four files (8.21s); full strict-console forks suite 11,018 tests/1,013 files (502.22s); 24 campaign browser checks (3.8m) and five error checks (13.2s), no retries. Explicit six-path requirements passed backlog, lint, unit tests, Vite build, browser and zero-diagnostic typecheck. Literal production build passed. Existing exact-shape expectation updated for explicit contract:null; no behavior test weakened. Global advisory formatting excluded, not claimed green. Independent review and hosted CI pending.
