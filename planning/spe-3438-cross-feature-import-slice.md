# SPE-3438 — targeted cross-feature import correction

| Field             | Value                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                    |
| **Issue**         | [SPE-3438](https://linear.app/spectranoir/issue/SPE-3438)               |
| **Parent**        | SPE-3434 — remains Backlog                                              |
| **Branch**        | `jamesdyedbq/spe-3438-targeted-cross-feature-import-correction-cp-core` |
| **Main baseline** | `e9de01e30936b36fc38fa426c335c087a3b6c75e`                              |

Delivery status is effective on merge. Keep Linear In Progress until the PR merges.

## Authority and boundary

Implement the existing approved issue named by the user on 2026-10-25.
The supplied `ab6af5b4` baseline is an ancestor of fetched current main above.
Preserve the existing untracked workspace files. No simulation, persistence,
state, routing behavior, markup, or repository-wide enforcement changes.

## Pre-edit dependency classification

Inventory covers all sibling imports in the cited report/case pages and dashboard
production modules, plus necessary consumers of the recovered navigation helper.
The stable projection-interface exception is explicit in
`test/boundary-enforcement.test.ts:isProjectionInterfaceImport`; this permits UI
consumption, not projection-to-projection dependencies. Domain/store directions
remain unchanged.

| Consumer                                                | Existing dependency                                         | Classification and disposition                                                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| dashboard/OperationsReportPanel                         | operations/HistoricalRouteReplayExplanationPanel            | **Prohibited** sibling UI; move the canonical component to `src/components`.                                                                          |
| dashboard/OperationsReportPanel                         | operations/HistoricalRouteReplayMapChromePanel              | **Prohibited** sibling UI; move the canonical component to `src/components`.                                                                          |
| dashboard/OperationsReportPanel                         | operations/historicalRouteReplayExplanationAdapter          | **Prohibited** deep implementation import; expose its existing pure canonical function through `operations/historicalRouteReplayView.ts`.             |
| dashboard/OperationsReportPanel                         | operations/historicalRouteReplayMapChromeAdapter            | **Prohibited** deep implementation import; expose its existing pure canonical function through the same stable view interface.                        |
| dashboard/OperationsReportPanel                         | operations/historicalRouteReplayVisibilityFromKnowledge     | **Prohibited** deep implementation import; expose the existing knowledge gate through the same stable view interface.                                 |
| dashboard/OperationsReportPanel                         | report/operationsReportView                                 | **Allowed** stable canonical projection interface; retain unchanged.                                                                                  |
| report/ReportDetailPage                                 | operations/operationsRouteDrillDown                         | **Prohibited** direct sibling utility without a documented exception; relocate its unchanged implementation to `features/shared`.                     |
| cases/CaseDetailPage                                    | operations/operationsRouteDrillDown                         | **Prohibited**; consume the shared navigation helper.                                                                                                 |
| dashboard/EventFeedPanel                                | operations/operationsRouteDrillDown                         | **Prohibited**; consume the shared navigation helper.                                                                                                 |
| agents/AgentDetailPage and cases/CaseWeeklyReportsPanel | operations/operationsRouteDrillDown                         | **Prohibited** necessary consumers; update imports with the canonical relocation.                                                                     |
| shared/operationsRouteDrillDown (formerly operations)   | dashboard/eventFeedView codec                               | **Prohibited** replacement dependency into dashboard; extract the unchanged filter codec, types, labels, and allowed sets to shared/eventFeedFilters. |
| dashboard/OperationsLeftPanelProjection                 | operations/OperationsLeftPanel                              | **Prohibited** UI re-export; move component to src/components and remove alias.                                                                       |
| dashboard/TrendSummaryPanelProjection                   | report/TrendSummaryPanel                                    | **Prohibited** UI re-export; move component to src/components and remove alias.                                                                       |
| dashboard/dashboardView                                 | cases/caseView and teams/teamView                           | **Prohibited** projection-to-sibling-projection imports; consume canonical shared case-row and team projections.                                      |
| dashboard/sharedDashboardView                           | cases/caseView and teams/teamView types, builders, defaults | **Prohibited**; consume canonical shared case rows, filters, and team views.                                                                          |
| dashboard/dashboardReportProjection                     | report/reportIntelProjection                                | **Prohibited**; extract template-family helpers to shared ownership and retain original report/intel compatibility exports.                           |

The replay view interface only exports the owning feature's pure adapters; it
imports no sibling feature or UI. Shared replay components consume domain/view
types and props, with no store or feature component imports. The navigation helper
remains a UI utility, not a simulation or store dependency. Existing adapter paths
and their tests stay intact. Only the four confirmed sibling UI components move.

## Validation and review

Run replay projection/visibility contracts, route drill-down, dashboard operations
report, case dossier, and weekly MVP navigation integration tests. Add a bounded
import contract for the audited consumers and prove stable replay exports retain
canonical function identity. Run lint and handoff verification. Audit all six
pre-ship passes and independently review the complete branch diff before merge.

## Deferred and separate ownership

| Item                                    | Existing owner | Reason                                                                                 |
| --------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| Repository-wide deep import enforcement | SPE-3437       | Separate approved sibling boundary; focused coverage here protects this recovery only. |
| Required-validator selection            | SPE-3348       | Existing tooling ownership remains unchanged.                                          |

No approved in-boundary work deferred. No new candidate scope identified.

## Resolved ownership contract

The user selected **Extract shared projection ownership** on 2026-10-25.
Dashboard aggregation does not receive a sibling projection exception. Shared
case-row calculations, case filter contracts, team views, template-family helpers,
and feed filter codecs have one canonical implementation in features/shared,
which imports no feature modules. Cases retain triage augmentation and existing
public exports. Shared row and signal type declarations preserve the complete
existing public types; signal calculations remain feature-owned. The
team/report/intel compatibility interfaces delegate to shared
owners. Preserve default case row fields, priority and fatigue ordering, limits,
filter round-trips, and feed return-link semantics. UI may still consume existing
stable sibling projection interfaces; this does not permit projection composition
across sibling features.

## Pre-ship evidence

- Scope/integration: classify every inventoried import; use shared owners and UI
  interfaces only. No domain, store, persistence, dependency, or CI changes.
- Edge cases: empty rows, resolved-case exclusion, ordering and limits, filter
  round-trips, report/case return links, and hidden replay knowledge retain coverage.
- Determinism/state: output parity and no-input-mutation regression pass; no new state.
- Regression: Node 22.23.4 strict-console full suite passes **899 files / 9,806
  tests**, using the documented local vmThreads pool with four workers. The latest
  type-contract recovery/triage rerun passes **8 files / 63 tests**.
- Documentation: inventory, clarified shared ownership, real enforcement limits,
  backlog and manifest agree. Parent remains open; other approved owners stay separate.
- Cleanup: no debug artifacts, duplicated calculations, or rule suppressions. The initial four
  relocated component bodies, the team projection body, and 15 extracted functions
  have unchanged syntax trees apart from imports/formatting.
- Lint, audit index, backlog handoff, theme contracts, governance contract, and diff
  checks pass. TypeScript still reports known repository-wide contract drift;
  diagnostic checks found no errors in recovered files. No build-pass claim.

All six passes were repeated after the default-field, public-type, and component
formatting corrections. Independent post-PR review and Linux CI remain merge gates.

## PR review and quality-gate follow-up

The independent full-branch review found 180 unchanged/relocated top-level
functions and 52 unchanged top-level variable declarations. The four intentional
function changes implement the shared case-row split and its two dashboard
consumers; no critical or warning findings remained at that review.

SonarCloud then identified an existing duplicate case/intel link footer in the
relocated trend panel as new-code duplication (3.6%, gate 3%). Replace only that
repeated footer with the local TrendReferences renderer; retain the same DOM,
links, keys, and historical text. The new two-bucket link regression plus dashboard,
app-route, and ownership checks pass **4 files / 81 tests**. Repeated all six audit
passes for this bounded correction; no additional product scope or gate weakening.

Amazon Q's blanket app-import findings were rejected with checked-in rule and
source evidence on the PR: the app-prefix prohibition applies to domain, while
projections prohibit UI and sibling-feature imports. Existing app/searchParams is
an import-free pure URL utility; preserving it introduces no application-state
inversion. Its repeated triage-read finding also preserves unchanged deterministic
main behavior, not a new defect. Global enforcement remains the sibling owner.
