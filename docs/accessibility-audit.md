# Accessibility audit — WCAG 2.2 AA

**Date:** 2026-11-03
**Scope:** Static source audit of the player-facing React SPA plus a no-tooling manual test script and a regression-gate proposal.
**Method:** Read-only source inspection of the route table, shell, weekly-close controls, report surfaces, case triage, agent dossier, equipment confirmations, and the shared stylesheet. No component was edited, no dependency was added, and no test file was created.

## How to read this document

**Severity**

| Tag         | Meaning                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Blocker** | A WCAG A/AA failure on every route, or on the primary weekly task with no practical workaround. Must be fixed before release. |
| **Major**   | A WCAG A/AA failure that substantially impedes a task but has a workaround. Fix in the current milestone.                     |
| **Minor**   | Friction, robustness, or semantics gap with limited task impact. Fix opportunistically.                                       |

**Priority**

- **P1** — a Blocker or Major on a route reachable from the MVP navigation in `src/app/systemRegistry.ts`.
- **P2** — a Minor on an MVP route, or a Major on a future-expansion route.
- **P3** — a Minor on a future-expansion route, or a documentation/robustness gap.

Every P1 finding below carries a reproducible route, a `file:line` citation, and a one-sentence remediation. Findings were only recorded after the cited source was read; anything inferred rather than observed is labelled **Risk** rather than **Failure**.

**What this audit does not establish**

- No browser, screen reader, or assistive-technology session was run. These are source-level findings plus a script for a human to confirm them.
- Colour contrast was not measured. The repository uses heavy `opacity-*` text on dark surfaces and that is very likely a separate 1.4.3 debt, but no contrast ratio is claimed here.
- The four `aria-*`/`role` counts in the brief (542/234) were not re-derived; this audit targets behaviour, not attribute volume.
- Duplicate-`main` and tab-semantics findings are visible in source but their exact announcement behaviour depends on the screen reader and browser pair; the manual script is the confirmation step.

---

## 1. Route inventory

### 1.1 Source and counts

`src/app/routes.ts` defines `APP_ROUTES` (56 named entries, 55 distinct paths because `operationsDesk` and `dashboard` both resolve to `/`) and `APP_ROUTE_PATTERNS` (6 parameterised detail routes). `src/app/App.tsx` registers **49 static paths** under `AppShell` plus the 6 detail routes, for **55 navigable paths**, plus one catch-all `*` that renders the not-found boundary.

`src/app/appShellRoutePaths.ts` is documented as the list of "static path segments registered under AppShell". It currently contains **35** entries, so it omits 14 shell-registered paths:

- `department-workshop`
- `department-workshop/activate`
- `rule-document-compliance`
- `recurrent-catastrophe-amelioration`
- `post-incident-review`
- `post-incident-review-recommendations`
- `post-incident-review-recommendation-actions`
- `propagation-graph`
- `participatory-channels`
- `coercive-contained-person-protocol`
- `psychological-resilience`
- `cognitive-hazard-exposure`
- `surveillance-intervention-tuning`
- `naming-hazard-descriptor`

`App.tsx` is authoritative for routing; the parity list should be treated as incomplete. This matters for accessibility coverage because any route invented later will not automatically appear in a route-parity test or an axe smoke matrix.

### 1.2 Full inventory by surface

Nav tier comes from `src/app/systemRegistry.ts` (`PRIMARY_APP_SYSTEMS`, `SECONDARY_MVP_APP_SYSTEMS`, `FUTURE_EXPANSION_APP_SYSTEMS`).

| Route                                          | Component entry                           | Nav tier      | Notes                                       |
| ---------------------------------------------- | ----------------------------------------- | ------------- | ------------------------------------------- |
| `/`                                            | `OperationsDeskPage` → `FrontDeskPage`    | Primary       | Weekly hub; Advance Week lives in shell too |
| `/cases`                                       | `CasesPage`                               | Primary       | Triage list, filters, tab strip             |
| `/cases/:caseId`                               | `CaseDetailPage`                          | Primary drill | Assign, prep, resolver preview              |
| `/agents`                                      | `AgentsPage`                              | Primary       | Roster + embedded dossier                   |
| `/agents/:agentId`                             | `AgentDetailPage`                         | Primary drill | Only data table in the critical set         |
| `/recruitment`                                 | `RecruitmentPage`                         | Primary       | Candidate pipeline                          |
| `/contracts`                                   | `ContractBoardPage`                       | Secondary MVP | Launch contracts, filter tablist            |
| `/teams`                                       | `TeamsPage`                               | Secondary MVP | Squad builder, skip links                   |
| `/teams/:teamId`                               | `TeamDetailPage`                          | Secondary MVP | Assignment and readiness                    |
| `/cards`                                       | `CardsPage`                               | Secondary MVP | Party-card queue                            |
| `/training-division`                           | `TrainingDivisionPage`                    | Secondary MVP | Skip links                                  |
| `/equipment`                                   | `EquipmentPage`                           | Secondary MVP | 17 inline confirmation groups               |
| `/fabrication`                                 | `FabricationPage`                         | Secondary MVP | Queue actions                               |
| `/report`                                      | `ReportPage`                              | Secondary MVP | Report archive                              |
| `/report/:week`                                | `ReportDetailPage`                        | Secondary MVP | Weekly resolution dossier                   |
| `/registry`                                    | `RegistryPage`                            | Future        | Paginated registry                          |
| `/registry/:agentId`                           | `AgentDetailPage`                         | Future drill  | Same dossier component                      |
| `/intel`                                       | `IntelPage`                               | Future        | Template list                               |
| `/intel/:templateId`                           | `IntelDetailPage`                         | Future        | Template dossier                            |
| `/containment-site`                            | `SystemBoundaryPage`                      | Future        | Stage progression badges                    |
| `/markets-suppliers`                           | `MarketPage`                              | Future        | Suppliers                                   |
| `/factions`                                    | `FactionsPage`                            | Future        | Faction standing                            |
| `/rankings`                                    | `SystemBoundaryPage`                      | Future        | Ranking history                             |
| `/agency`                                      | `AgencyPage`                              | Future        | Directives and facility upkeep              |
| `/help`                                        | `HelpPlaceholderPage`                     | Future        | Placeholder                                 |
| `/pattern-source-series`                       | `PatternSourceSeriesMirrorPage`           | Future        | Read-only tables                            |
| `/publish-queue`                               | `PublishQueueMirrorPage`                  | Future        | Read-only tables                            |
| `/department-workshop`                         | `DepartmentWorkshopMirrorPage`            | Future        | Read-only tables                            |
| `/department-workshop/activate`                | `DepartmentWorkshopActivationCommandPage` | Future        | Form + status                               |
| `/modifiable-data-packs`                       | `ModifiableDataPackMirrorPage`            | Future        | Read-only tables                            |
| `/self-censoring-information`                  | `SelfCensoringInformationMirrorPage`      | Future        | 8-column table                              |
| `/public-disclosure-state`                     | `PublicDisclosureMirrorPage`              | Future        | Read-only tables                            |
| `/campaign/public-disclosure`                  | `PublicDisclosureCampaignPage`            | Future        | Campaign briefing                           |
| `/truth-layer-records`                         | `TruthLayerMirrorPage`                    | Future        | Read-only tables                            |
| `/cover-story-records`                         | `CoverStoryMirrorPage`                    | Future        | Read-only tables                            |
| `/mass-anomalous-population-emergence`         | mirror page                               | Future        | Read-only tables                            |
| `/visual-trigger-hazard`                       | mirror page                               | Future        | Read-only tables                            |
| `/hazardous-content-propagation`               | `Spe947EvaluatorMirrorPage`               | Future        | Six tables                                  |
| `/propagation-graph`                           | `Spe956PropagationGraphMirrorPage`        | Future        | Graph + tables                              |
| `/participatory-channels`                      | `Spe956ParticipatoryChannelMirrorPage`    | Future        | Read-only tables                            |
| `/entity-welfare-reclassification`             | mirror page                               | Future        | Read-only tables                            |
| `/affiliation-person-status`                   | mirror page                               | Future        | Two large tables                            |
| `/contained-person-therapeutic-care`           | mirror page                               | Future        | Read-only tables                            |
| `/coercive-contained-person-protocol`          | mirror page                               | Future        | Read-only tables                            |
| `/psychological-resilience`                    | mirror page                               | Future        | Read-only tables                            |
| `/cognitive-hazard-exposure`                   | mirror page                               | Future        | Read-only tables                            |
| `/surveillance-intervention-tuning`            | mirror page                               | Future        | Read-only tables                            |
| `/naming-hazard-descriptor`                    | mirror page                               | Future        | Read-only tables                            |
| `/contained-person-integrated-health-bundle`   | mirror page                               | Future        | Read-only tables                            |
| `/welfare-debt-accounting`                     | mirror page                               | Future        | Read-only tables                            |
| `/rule-document-compliance`                    | mirror page                               | Future        | Read-only tables                            |
| `/recurrent-catastrophe-amelioration`          | mirror page                               | Future        | Read-only tables                            |
| `/post-incident-review`                        | mirror page                               | Future        | Two tables                                  |
| `/post-incident-review-recommendations`        | mirror page                               | Future        | Read-only tables                            |
| `/post-incident-review-recommendation-actions` | mirror page                               | Future        | Two tables                                  |
| `*`                                            | `SystemBoundaryPage boundary="notFound"`  | —             | Catch-all                                   |

### 1.3 Ranked top 10 player-critical routes

Ranking is by necessity to complete the core loop — triage, staff, commit, advance, read the result — then by exposure of interactive controls and dense data. Every route below is P1 scope.

| Rank | Route              | Why it is player-critical                                                                              | Accessibility surface that matters most                         |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1    | `/`                | The hub. Holds the weekly directive, simulation controls, and the second Advance Week control.         | Weekly-close announcement, destructive reset, colour-coded feed |
| 2    | `/cases`           | The triage queue where every mission starts; filters, tabs, and row actions.                           | Tab semantics, filter status announcements, focus order         |
| 3    | `/cases/:caseId`   | The dossier where assignment, prep, and resolution preview happen.                                     | Heading order, form labels, decision controls                   |
| 4    | `/teams`           | Squad builder; moving agents between teams is required to staff cases.                                 | Skip links, filter semantics, per-agent selects                 |
| 5    | `/teams/:teamId`   | Per-squad assignment and readiness detail.                                                             | Assignment controls, status text                                |
| 6    | `/report/:week`    | The post-close result: score, outcomes, notes, team status. This is what "weekly resolution" produces. | Announcement on arrival, grouped outcome lists, colour use      |
| 7    | `/report`          | The archive; the only recovery path if a week's result is missed.                                      | Link names, colour-coded score deltas                           |
| 8    | `/contracts`       | Contract launch is the other main way work enters the board.                                           | Filter tablist misuse, launch button names                      |
| 9    | `/agents`          | Roster plus embedded dossier; the first place a player inspects readiness.                             | Duplicate `main`, dossier tabs, table                           |
| 10   | `/agents/:agentId` | Full operative dossier, including the only data table on a critical route.                             | Table headers, tab semantics, live region                       |

Near-misses: `/equipment` (rank 11 — gear destruction and repair confirmations), `/fabrication` (rank 12), `/agency` (rank 13 — weekly directives), `/cards` (rank 14).

---

## 2. Audit summary

| ID      | Sev     | Pri | Area               | Route(s)                      | One-line impact                                                       |
| ------- | ------- | --- | ------------------ | ----------------------------- | --------------------------------------------------------------------- |
| A11Y-01 | Blocker | P1  | Keyboard / bypass  | All                           | 17 nav links precede content on every route, with no shell skip link. |
| A11Y-02 | Blocker | P1  | Live region        | `/`, `/report/:week`          | Advance Week changes the week silently for screen reader users.       |
| A11Y-03 | Major   | P1  | Focus order        | All                           | Route changes keep focus in the nav and announce nothing.             |
| A11Y-04 | Major   | P1  | Landmarks          | `/agents`, `/agents/:id`      | Two `main` landmarks on one page.                                     |
| A11Y-05 | Major   | P1  | Focus management   | `/equipment`                  | Confirming a destructive action drops focus to `<body>`.              |
| A11Y-06 | Major   | P1  | Live region        | `/cases`                      | Filter result counts change without announcement.                     |
| A11Y-07 | Major   | P1  | Keyboard / ARIA    | `/cases`                      | `role="tab"` without tab behaviour or a tabpanel.                     |
| A11Y-08 | Major   | P1  | Live region        | `/agents`, `/agents/:id`      | Every tab switch re-announces the whole dossier panel.                |
| A11Y-09 | Major   | P1  | Reflow             | All                           | The shell overflows horizontally at 400% zoom.                        |
| A11Y-10 | Minor   | P2  | Tables             | `/agents/:agentId` + 27 files | 288 `<th>` cells, 0 `scope`, 0 `<caption>`.                           |
| A11Y-11 | Minor   | P2  | Keyboard / ARIA    | `/contracts`                  | Filter `tablist` has no tabs, tabpanel, or arrow keys.                |
| A11Y-12 | Minor   | P2  | ARIA state         | `/`                           | Weekly directive buttons expose no selected state.                    |
| A11Y-13 | Minor   | P2  | Colour-only status | `/`                           | Event feed severity is border/background colour only.                 |
| A11Y-14 | Minor   | P3  | Colour-only status | `/containment-site`           | Active vs cleared stage is red vs green only.                         |
| A11Y-15 | Minor   | P2  | Accessible name    | `/agents`, `/agents/:id`      | Overflow indicator is a bare `●` glyph.                               |
| A11Y-16 | Minor   | P3  | ARIA misuse        | `/registry`                   | `aria-label` on `<p>` overrides visible text.                         |

---

## 3. Findings

### A11Y-01 — No shell-level bypass block

**Severity:** Blocker · **Priority:** P1 · **WCAG:** 2.4.1 Bypass Blocks (A)
**Route:** every route; reproduce at `/`

**Evidence**

- [`src/app/AppShell.tsx:65`](../src/app/AppShell.tsx#L65) opens a single `<main>` that contains the status bar, page header, and all three navigation groups.
- Primary nav starts at [`src/app/AppShell.tsx:93`](../src/app/AppShell.tsx#L93), the MVP nav at [`src/app/AppShell.tsx:117`](../src/app/AppShell.tsx#L117), and the future-expansion nav at [`src/app/AppShell.tsx:147`](../src/app/AppShell.tsx#L147). `<Outlet />` (the page) is at [`src/app/AppShell.tsx:172`](../src/app/AppShell.tsx#L172).
- The primary nav alone renders four links; the MVP nav renders six; the future nav renders seven. With the four topbar utility controls, a keyboard user crosses **at least 17 focusable elements** before the first page control on every route.
- A `.skip-link` style exists at [`src/styles/components.css:309-335`](../src/styles/components.css#L309-L335), but no skip link is rendered in `AppShell`. Page-level skip links exist only inside `/cases` ([`src/features/cases/CasesPage.tsx:169`](../src/features/cases/CasesPage.tsx#L169)), `/teams` ([`src/features/teams/TeamsPage.tsx:101`](../src/features/teams/TeamsPage.tsx#L101)), and `/training-division` ([`src/features/training/TrainingDivisionPage.tsx:78`](../src/features/training/TrainingDivisionPage.tsx#L78)) — and because they are rendered after the shell nav, they cannot bypass it.

**User impact**
Keyboard and switch users must repeat the same 17–20 Tab presses on every page before they can interact with the game. Screen reader users navigating by Tab hear the same navigation block on every route with no way to jump to the page content, which makes the core loop exhausting and error-prone.

**Remediation**
Render a "Skip to main content" link as the first focusable element in `AppShell`, targeting a single `<main id="main-content" tabIndex={-1}>` that wraps only the routed page.

---

### A11Y-02 — Weekly close produces no status message

**Severity:** Blocker · **Priority:** P1 · **WCAG:** 4.1.3 Status Messages (AA), 2.4.3 Focus Order (A)
**Route:** `/` then `/report/:week`

**Evidence**

- The shell Advance Week control is [`src/components/layout/ShellStatusBar.tsx:139-151`](../src/components/layout/ShellStatusBar.tsx#L139-L151): `aria-label="Advance week"`, `onClick={advanceWeek}`, and no live region anywhere in the file.
- The Front Desk control is [`src/features/operations/FrontDeskPage.tsx:1160-1169`](../src/features/operations/FrontDeskPage.tsx#L1160-L1169).
- The only `aria-live` regions on either hub announce **seed feedback**, not the week close: [`src/features/dashboard/DashboardPage.tsx:538`](../src/features/dashboard/DashboardPage.tsx#L538) and [`src/features/operations/FrontDeskPage.tsx:1204`](../src/features/operations/FrontDeskPage.tsx#L1204).
- [`src/components/GlobalStateBar.tsx:12`](../src/components/GlobalStateBar.tsx#L12) defines a polite `role="status"` summary, but the component is imported only by its test (`src/components/GlobalStateBar.test.tsx`); it is mounted on no route.
- `/report/:week` has no live region and no focus target: the dossier starts at [`src/features/report/ReportDetailPage.tsx:171`](../src/features/report/ReportDetailPage.tsx#L171) with no `tabIndex`, and the week score is a plain `<p>` at [`src/features/report/ReportDetailPage.tsx:241`](../src/features/report/ReportDetailPage.tsx#L241).

**User impact**
A screen reader user activates the single most important action in the game and receives no confirmation that the week advanced, no resolution outcome, and no pointer to the new report. They must remember the previous week number and hunt through the report archive to discover whether anything happened — the weekly loop is effectively unusable non-visually.

**Remediation**
After `advanceWeek`, render a polite `role="status"` summary in the shell (new week, resolved/partial/failed counts, and a link to `/report/:week`) and move focus to it.

---

### A11Y-03 — Route changes do not move focus or announce the page

**Severity:** Major · **Priority:** P1 · **WCAG:** 2.4.3 Focus Order (A), 4.1.3 Status Messages (AA)
**Route:** all; reproduce by activating `/cases` from `/`

**Evidence**

- [`src/app/AppShell.tsx:65`](../src/app/AppShell.tsx#L65) through `:175` contains no `useEffect`, focus call, or route-announcement region.
- [`src/app/AppRouter.tsx:1-10`](../src/app/AppRouter.tsx#L1-L10) only chooses `BrowserRouter` or `HashRouter`; there is no navigation listener.
- The page title is the shell `<h1>` inside the header, which is not focusable and is not referenced by `aria-live`.
- The only focus-management code in the repository is tab-arrow handling ([`src/features/agents/AgentTabsContainer.tsx:66`](../src/features/agents/AgentTabsContainer.tsx#L66)), an onboarding heading ([`src/features/agencyEstablishment/AgencyEstablishmentPanel.tsx:113`](../src/features/agencyEstablishment/AgencyEstablishmentPanel.tsx#L113)), and the in-page skip-link target ([`src/components/InPageLink.tsx:18`](../src/components/InPageLink.tsx#L18)).

**User impact**
After choosing a nav link, focus remains on that link and the new page is not announced. The next Tab continues through the remaining nav items, so a screen reader user can overshoot the page they just opened and must explore backwards to find its heading.

**Remediation**
On `pathname` change, move focus to the route `<h1 tabIndex={-1}>` (or announce the title from a polite live region) and reset scroll to the top.

---

### A11Y-04 — Two `main` landmarks on the agent routes

**Severity:** Major · **Priority:** P1 · **WCAG:** 1.3.1 Info and Relationships (A), 2.4.1 Bypass Blocks (A)
**Route:** `/agents` and `/agents/:agentId`

**Evidence**

- The shell owns the page landmark at [`src/app/AppShell.tsx:65`](../src/app/AppShell.tsx#L65): `<main className="p-6 space-y-6">`.
- The dossier re-declares a main landmark at [`src/features/agents/AgentEntityPanel.tsx:37`](../src/features/agents/AgentEntityPanel.tsx#L37): `<div className="space-y-4" role="main" aria-label="Agent detail panel">`.
- The dossier is rendered inside the shell on both routes: [`src/features/agents/AgentsPage.tsx:362`](../src/features/agents/AgentsPage.tsx#L362) and [`src/features/agents/AgentDetailPage.tsx:81`](../src/features/agents/AgentDetailPage.tsx#L81).

**User impact**
The landmark list exposes two "main" regions, so "jump to main" is ambiguous. Because the inner one is a `div` nested inside the outer `main`, landmark navigation can land on a subsection while the real page content sits outside it, and the duplicate can trigger an accessibility-check failure in tooling and audits.

**Remediation**
Change the dossier container to `<section aria-label="Agent detail panel">` (or `role="region"`) and keep the single `<main>` in `AppShell`.

---

### A11Y-05 — Destructive confirmation drops keyboard focus

**Severity:** Major · **Priority:** P1 · **WCAG:** 2.4.3 Focus Order (A), 4.1.2 Name, Role, Value (A)
**Route:** `/equipment`

**Evidence**

- The trigger "Destroy exact copy" is rendered at [`src/features/equipment/EquipmentPage.tsx:439-454`](../src/features/equipment/EquipmentPage.tsx#L439-L454).
- Activating it sets `pendingDestructionInstanceId`, which **replaces** that button with the confirmation group at [`src/features/equipment/EquipmentPage.tsx:407-438`](../src/features/equipment/EquipmentPage.tsx#L407-L438). The group is `role="group"`, not a dialog, and focus is never moved.
- The same replace-the-trigger pattern repeats for repair, stabilize, inspect, re-aggregate, and return-to-lot, using 19 inline `role="group"` confirmation panels in the same file.
- There is no `Escape` handler and no focus-return call anywhere in the file (no `onKeyDown`, no `.focus()`; verified by repository search).

**User impact**
A keyboard user presses Enter on "Destroy exact copy"; the focused element unmounts, focus falls back to `<body>`, and the Confirm/Cancel pair that appeared is not announced. The next Tab restarts at the top of the page, so the user must traverse the entire equipment screen again to reach the confirmation they just opened — and may not realise the destructive dialog is waiting.

**Remediation**
Move focus to the confirmation group's first button when it appears, return focus to the trigger on Cancel, and close on Escape (ideally via one shared confirm-dialog primitive).

---

### A11Y-06 — Case filter results change silently

**Severity:** Major · **Priority:** P1 · **WCAG:** 4.1.3 Status Messages (AA)
**Route:** `/cases`

**Evidence**

- The result summary is plain text at [`src/features/cases/CasesPage.tsx:515-521`](../src/features/cases/CasesPage.tsx#L515-L521): `Showing {cases.length} of {totalCases} cases` and `Active query: ...`.
- The filter inputs use `FilterInput`/`FilterSelect` with `aria-controls` ([`src/components/FilterInput.tsx:29-37`](../src/components/FilterInput.tsx#L29-L37)) but no `aria-live` and no status role.
- The filtered list at [`src/features/cases/CasesPage.tsx:569`](../src/features/cases/CasesPage.tsx#L569) is replaced in place; focus stays in the select that changed.

**User impact**
A screen reader user changes Status, Mode, Stage, Sort, or the risk toggle and hears nothing about how many cases remain or whether any match. They must leave the filter, navigate to the list, and count items to know whether the filter did anything.

**Remediation**
Wrap the "Showing X of Y cases" line in `role="status" aria-live="polite"` so each filter change announces the new count.

---

### A11Y-07 — Case triage uses tab roles without tab behaviour

**Severity:** Major · **Priority:** P1 · **WCAG:** 4.1.2 Name, Role, Value (A), 2.1.1 Keyboard (A)
**Route:** `/cases`

**Evidence**

- [`src/features/cases/MissionTriageTabs.tsx:16`](../src/features/cases/MissionTriageTabs.tsx#L16) sets `role="tablist"`, and each button at `:24-35` sets `role="tab"`.
- There is no `aria-controls`, no `aria-labelledby`, no `tabIndex` management, no `onKeyDown`, and no element with `role="tabpanel"`. The filtered results are a `<ul aria-label="Triage list">` at [`src/features/cases/CasesPage.tsx:569`](../src/features/cases/CasesPage.tsx#L569).
- By contrast, the agent tabs implement the pattern correctly with roving `tabIndex`, arrow/Home/End handling, `aria-controls`, and a `tabpanel` ([`src/features/agents/AgentTabsContainer.tsx:186-263`](../src/features/agents/AgentTabsContainer.tsx#L186-L263)) — so the codebase already knows the pattern; this implementation diverges.

**User impact**
Screen readers announce "tab" and users expect Left/Right arrows to move between tabs; here arrows do nothing, every tab is a separate Tab stop, and the panel the tab claims to control does not exist. Keyboard users get a control that behaves like a filter button while claiming to be a tab widget.

**Remediation**
Either implement the ARIA tabs pattern for the triage strip (roving tabindex, arrow/Home/End, `aria-controls` pointing at a `role="tabpanel"` wrapper) or drop `role="tab"`/`role="tablist"` and expose the strip as pressed filter buttons.

---

### A11Y-08 — Agent tab panel is a live region

**Severity:** Major · **Priority:** P1 · **WCAG:** 4.1.3 Status Messages (AA), 2.4.3 Focus Order (A)
**Route:** `/agents`, `/agents/:agentId`

**Evidence**

- [`src/features/agents/AgentTabsContainer.tsx:258-262`](../src/features/agents/AgentTabsContainer.tsx#L258-L262) renders the tabpanel with `role="tabpanel"`, `aria-labelledby`, **and** `aria-live="polite"`.
- The panel is the full dossier tab body (`<TabComponent view={view} />` at `:264`), not a short status message; it can contain long lists such as history and equipment.
- The panel also sets both `aria-labelledby` and `aria-label` (`:260-261`); `aria-labelledby` wins, so the `aria-label` is dead code.

**User impact**
Every tab switch causes the screen reader to queue the entire panel content as a live update. Users hear a long readout they did not request, cannot interrupt it cleanly, and can lose their place; the tab's own selected-state announcement is buried.

**Remediation**
Remove `aria-live` from the tabpanel and let `aria-selected` on the tab announce the change; drop the redundant `aria-label`.

---

### A11Y-09 — Shell overflows horizontally at 400% zoom

**Severity:** Major · **Priority:** P1 · **WCAG:** 1.4.10 Reflow (AA)
**Route:** every route; reproduce at `/` with 1280 px width and 400% zoom

**Evidence**

- [`src/styles/components.css:2-6`](../src/styles/components.css#L2-L6) defines `.topbar-shell` as a three-column grid with `minmax(180px, 1fr) auto minmax(320px, 1fr)`.
- The ≤960 px override at [`src/styles/components.css:345-353`](../src/styles/components.css#L345-L353) still keeps `minmax(140px, 1fr) minmax(0, 1fr) auto`.
- `.topbar-right` is `min-width: max-content` at [`src/styles/components.css:182-190`](../src/styles/components.css#L182-L190), and it contains four utility controls plus the Advance Week button ([`src/components/layout/ShellStatusBar.tsx:87-151`](../src/components/layout/ShellStatusBar.tsx#L87-L151)).
- `body` has `min-width: 320px` ([`src/index.css:73`](../src/index.css#L73)) and `AppShell` adds `p-6` ([`src/app/AppShell.tsx:65`](../src/app/AppShell.tsx#L65)), leaving roughly 256 px of content width at a 320 CSS px viewport.

At 400% zoom on a 1280 px window the layout viewport is 320 CSS px. The left column's 140 px minimum plus `.topbar-right`'s max-content width (four ~32 px buttons plus the Advance Week label and padding) exceeds the available content width, so the shell cannot reflow and the page scrolls horizontally.

**User impact**
Low-vision users who zoom to 400% must pan horizontally on every route to reach Advance Week and the topbar utilities, and content is clipped at the edge of the viewport. This is the exact condition WCAG 1.4.10 is meant to prevent.

**Remediation**
Collapse the shell to a single column below 640 px and allow `.topbar-right` to wrap (`flex-wrap: wrap` plus `min-width: 0`), keeping only the metrics strip horizontally scrollable.

---

### A11Y-10 — Table headers have no `scope` and tables have no caption

**Severity:** Minor (Risk) · **Priority:** P2 · **WCAG:** 1.3.1 Info and Relationships (A)
**Route:** `/agents/:agentId` (and `/agents`); repository-wide

**Evidence**

- Repository search finds **288 `<th>` elements and 0 `scope` attributes** across `src/**/*.tsx`; `<caption>` count is **0**.
- The critical-route table is [`src/features/agents/AgentEntityPanel.tsx:427-433`](../src/features/agents/AgentEntityPanel.tsx#L427-L433): four `<th>` cells ("Domain", "Base", "Effective", "Weighted") with no `scope`, no caption, and no `aria-labelledby`.
- The other 27 table files are the operations mirror pages, e.g. [`src/features/operations/SelfCensoringInformationMirrorPage.tsx:88-98`](../src/features/operations/SelfCensoringInformationMirrorPage.tsx#L88-L98) with eight unlabelled column headers.

**User impact**
In these simple tables most screen readers still infer column headers from position, so this is a robustness failure rather than a proven blocker on `/agents/:agentId`. In the dense mirror tables, and whenever a user horizontally scrolls the `overflow-x-auto` wrapper, header association becomes less reliable and the table has no announced name to orient the user.

**Remediation**
Add `scope="col"` to column headers and `scope="row"` to row-label cells, and give each table a `<caption>` or `aria-labelledby` pointing at its section heading.

---

### A11Y-11 — Contract filter tablist has no tab behaviour

**Severity:** Minor · **Priority:** P2 · **WCAG:** 4.1.2 Name, Role, Value (A)
**Route:** `/contracts`

**Evidence**

- [`src/features/contracts/ContractBoardPage.tsx:105`](../src/features/contracts/ContractBoardPage.tsx#L105) sets `role="tablist"` and `:110` sets `role="tab"` on the filter buttons.
- There is no `aria-controls`, no `tabIndex` management, no arrow-key handler, and no `tabpanel`; the filtered list is a plain `<div data-testid="contract-board-list">` at `:124`.

**User impact**
Screen reader users are told these are tabs but arrows do not move between them and there is no panel relationship. The controls still work with Enter/Space, so the cost is confusion and extra Tab stops, not blockage.

**Remediation**
Use ordinary buttons with `aria-pressed`, or complete the tabs pattern.

---

### A11Y-12 — Weekly directive buttons expose no selected state

**Severity:** Minor · **Priority:** P2 · **WCAG:** 4.1.2 Name, Role, Value (A)
**Route:** `/`

**Evidence**

- [`src/features/dashboard/DashboardPage.tsx:275-301`](../src/features/dashboard/DashboardPage.tsx#L275-L301) renders three directive buttons. State is carried by `data-selected` (`:284`) and by visible "Selected"/"Available" text (`:291-293`); there is no `aria-pressed`, `role="radio"`, or group label.

**User impact**
The state is still in the accessible name ("... Selected"), so the control is usable, but it is not programmatically a toggle or radio group. Users cannot query "which directive is selected" with a screen-reader shortcut, and selecting a new directive silently deselects the old one.

**Remediation**
Add `aria-pressed={selected}` to each directive button, or convert the set to a labelled `radiogroup`.

---

### A11Y-13 — Event feed severity is colour-only

**Severity:** Minor · **Priority:** P2 · **WCAG:** 1.4.1 Use of Color (A)
**Route:** `/`

**Evidence**

- Each event list item applies tone only through a border/background class at [`src/features/dashboard/EventFeedPanel.tsx:294`](../src/features/dashboard/EventFeedPanel.tsx#L294).
- `getToneClassName` at [`src/features/dashboard/EventFeedPanel.tsx:334-347`](../src/features/dashboard/EventFeedPanel.tsx#L334-L347) returns only `border-*`/`bg-*` utilities for success, warning, and danger — there is no text severity label in the item, and the two visible chips are source and type (`:299-303`).

**User impact**
A colour-blind user cannot distinguish a success event from a danger event at a glance; the severity signal is invisible and they must read every sentence to infer it. Severity is not otherwise conveyed in text.

**Remediation**
Add a text severity chip ("Danger", "Warning", "Success") to each event, matching the existing source/type chip pattern.

---

### A11Y-14 — Stage progression uses red/green only

**Severity:** Minor · **Priority:** P3 · **WCAG:** 1.4.1 Use of Color (A)
**Route:** `/containment-site`

**Evidence**

- [`src/features/containment/ContainmentSitePage.tsx:126-137`](../src/features/containment/ContainmentSitePage.tsx#L126-L137) styles each stage badge with a conditional class: active is red, cleared is emerald, pending is neutral. The visible text is only `{stage.index}. {stage.label}` — the status word itself is never rendered.

**User impact**
"Active" and "cleared" stages are distinguishable only by hue, so colour-blind players cannot tell which stage is currently in play on this future-expansion surface.

**Remediation**
Append the stage status label to the badge text (for example "3. Containment — active").

---

### A11Y-15 — Overflow indicator is an unlabelled glyph

**Severity:** Minor · **Priority:** P2 · **WCAG:** 1.1.1 Non-text Content (A)
**Route:** `/agents`, `/agents/:agentId`

**Evidence**

- [`src/features/agents/AgentTabsContainer.tsx:179-181`](../src/features/agents/AgentTabsContainer.tsx#L179-L181) renders `{isOverflowing && <span className="ml-2">●</span>}` after the "X of Y" tab counter. The glyph has no `aria-hidden`, no `title`, and no visually hidden text.

**User impact**
A screen reader announces "black circle" (or nothing meaningful) after the tab position, adding noise without telling the user that more tabs are scrollable off-screen.

**Remediation**
Replace the glyph with visually hidden text such as "more tabs available", or mark the glyph `aria-hidden` and add an `sr-only` equivalent.

---

### A11Y-16 — `aria-label` on non-interactive paragraphs

**Severity:** Minor · **Priority:** P3 · **WCAG:** 4.1.2 Name, Role, Value (A)
**Route:** `/registry`

**Evidence**

- [`src/features/registry/RegistryAgentItem.tsx:36`](../src/features/registry/RegistryAgentItem.tsx#L36), `:45`, `:49`, `:52`, and `:57` put `aria-label` on `<p>` elements (`Agent status`, `Team`, `Operational state`, `Fatigue level`, `Tags`).

**User impact**
`aria-label` is not reliably supported on generic paragraphs. Where it is honoured it replaces the visible text, so the announced value may differ from what sighted users read; where it is ignored, the added context is lost. Either way the duplication is fragile.

**Remediation**
Remove `aria-label` from the paragraphs and prefix the visible text with the label, or use a description list (`<dl>`).

---

## 4. Manual test script (no tooling)

The script needs only the running app, a keyboard, and (for section 4.2) NVDA or VoiceOver. Record **Pass / Fail / Blocked** and paste failing text into the evidence column. Run against a fresh run unless a step says otherwise. Expected results describe the WCAG-conformant behaviour; where the current build differs, record the failure against the matching finding ID.

### 4.0 Setup

1. `npm run dev`, open `http://localhost:5173` in Chrome or Edge at 100% zoom, 1280×800.
2. Clear site data so the run starts fresh; confirm Week 1 on `/`.
3. For screen reader steps: Windows + NVDA (Chrome), or macOS + VoiceOver (Safari). Use the default browse mode and the default verbosity.
4. Keep a notes file with the step number and the exact announcement text.

### 4.1 Keyboard-only walkthrough

Do not use a mouse or trackpad. Unplug it if you are prone to reaching for it.

| #   | Action                                                                  | Expected result                                                                                                    | Pass/Fail |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| K1  | Load `/` and press Tab once.                                            | A visible "Skip to main content" control receives focus **before** the status bar and nav.                         |           |
| K2  | If K1 exists, press Enter.                                              | Focus lands on the page `<main>` or its `<h1>`; the next Tab enters page content, not the nav.                     |           |
| K3  | Press Tab repeatedly from the top of `/`.                               | Every focused control has a clearly visible ring (2 px+), and the order follows status → page header → nav → page. |           |
| K4  | Count the focus stops before the first page control on `/`.             | 0–2 (a skip link plus page heading). Record the actual count; today it is at least 17.                             |           |
| K5  | On `/`, Tab to "Advance Week" and press Enter.                          | Week number increments; a visible confirmation appears; a screen reader would announce the result (see 4.2).       |           |
| K6  | Shift+Tab immediately after K5.                                         | Focus remains on a sensible control (the Advance button or the new status message), not `<body>`.                  |           |
| K7  | Go to `/cases`. Tab through the filter row.                             | Search, Status, Mode, Stage, Sort, Clear, Risk are reachable in visual order; each has a visible label.            |           |
| K8  | On the triage tab strip, press Right Arrow then Left Arrow.             | Focus moves between tabs (if the tab pattern is implemented). If focus does not move, record A11Y-07 as confirmed. |           |
| K9  | Change Status to a value with no matches, using only the keyboard.      | The result count updates and is announced (listen in 4.2); "No matching" state is reachable without a mouse.       |           |
| K10 | Open a case, then go to `/equipment` and activate "Destroy exact copy". | Focus moves into the Confirm/Cancel pair. If focus falls to the page top, record A11Y-05 as confirmed.             |           |
| K11 | On the confirmation, press Escape, then Cancel.                         | Escape closes the confirmation (or Cancel does), and focus returns to "Destroy exact copy".                        |           |
| K12 | Open `/agents`, focus the dossier tab strip, press End.                 | Focus and selection move to the last tab; `aria-selected` is true on exactly one tab.                              |           |
| K13 | Navigate `/` → `/cases` via the primary nav.                            | The new page heading receives focus (or is announced). If focus stays on the nav link, record A11Y-03.             |           |
| K14 | Tab through the whole of `/` once.                                      | There is no keyboard trap: focus can leave every panel, overlay, and confirmation group.                           |           |

### 4.2 Screen reader script — weekly close flow

Use NVDA (Windows, Chrome) or VoiceOver (macOS, Safari). Announce each numbered step aloud in the notes so the transcript is reproducible.

**NVDA setup:** start NVDA, open Chrome, confirm "browse mode". Use `H` for headings, `D` for landmarks, `B` for buttons, `T` for tables.
**VoiceOver setup:** `Cmd+F5`, use `VO+U` for the rotor, `VO+Right` to move, `VO+Space` to activate. (`VO` = Control+Option.)

| #   | Action                                                             | What you should hear                                                                                              | Pass/Fail |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------- |
| S1  | Load `/`.                                                          | Page title and the "Operations Desk" heading; the shell banner and navigation are announceable.                   |           |
| S2  | Open the landmarks list (`D` in NVDA, `VO+U` → Landmarks).         | Exactly one `main`, one `banner`, and named navigation regions. On `/agents` there should still be one `main`.    |           |
| S3  | Use the landmarks list to jump to `main`.                          | Focus/reading position moves to the page content, not to a nested duplicate.                                      |           |
| S4  | Find the "Weekly directive" group.                                 | The three choices are identifiable, and the selected one exposes a selected/pressed state (not just the word).    |           |
| S5  | Find "Advance Week" and activate it.                               | The week advances and a status message is announced: new week number, outcome counts, and a link to the report.   |           |
| S6  | Without moving focus manually, wait 3 seconds.                     | The announcement finishes once; it does not repeat or queue the entire page.                                      |           |
| S7  | Activate the announced report link (or open `/report/<new week>`). | The report page is announced on arrival (title or heading) and the reading position is at the top of the dossier. |           |
| S8  | Read the report summary block.                                     | Week number, score with its sign, and outcome counts are read as text; no meaning depends on the colour.          |           |
| S9  | Navigate the seven case-outcome groups.                            | Each group has a heading and announces its count and empty state; the resolved group is distinguishable by name.  |           |
| S10 | Navigate the weekly notes list.                                    | Each note is read in order; the category filter is announced with its label.                                      |           |
| S11 | Open the team status list in the side panel.                       | Each team announces its name and status as text, not only as a coloured chip.                                     |           |
| S12 | Press `Shift+Tab` from the report back link.                       | Focus moves in reverse visual order and remains visible.                                                          |           |
| S13 | Return to `/` and press Advance Week a second time.                | The second announcement replaces the first; it does not concatenate both weeks into one long message.             |           |
| S14 | Open `/cases` and activate a triage tab.                           | The tab announces selected state and the result count changes; no full-list re-read is triggered.                 |           |
| S15 | Open `/agents`, switch dossier tabs.                               | The tab is announced; the panel is **not** re-read from the top as a live update.                                 |           |

**Evidence to capture:** the exact NVDA/VoiceOver speech output for S5, S7, S10, and S15. Those four cover A11Y-02, A11Y-03, A11Y-08, and the group-heading behaviour in one pass.

### 4.3 Zoom and reflow checklist

Run each row at **200%** and **400%** browser zoom. At 400% on a 1280 px-wide window the CSS viewport is about 320 px — the WCAG 1.4.10 condition.

Set zoom with `Ctrl/Cmd` `+` (Chrome) rather than OS scaling, so the CSS viewport actually changes.

| #   | Check                                                                                                     | Expected                                                                                                   | 200% | 400% |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- | ---- |
| Z1  | No horizontal page scrollbar on `/`, `/cases`, `/cases/:caseId`, `/teams`, `/report/:week`, `/equipment`. | Content fits; only allowed 2-D regions (data tables, the metrics strip) scroll inside their own container. |      |      |
| Z2  | The shell status bar (org name, metrics, Help/Mute/Report/Settings, Advance Week) is fully visible.       | Nothing is clipped; controls wrap to a second line if needed.                                              |      |      |
| Z3  | Advance Week is reachable without horizontal panning.                                                     | Visible on load at both zoom levels.                                                                       |      |      |
| Z4  | The primary, MVP, and future nav links wrap instead of overflowing.                                       | All links visible; no truncated labels.                                                                    |      |      |
| Z5  | `/cases` filter row remains usable.                                                                       | Inputs stack or wrap; labels stay attached; no control is cut off.                                         |      |      |
| Z6  | `/cases` triage list and detail pane stack vertically.                                                    | Both are readable; the detail heading is not clipped.                                                      |      |      |
| Z7  | `/report/:week` score/count grid and the team-status sidebar stack.                                       | All seven outcome groups and the team list are reachable without horizontal panning.                       |      |      |
| Z8  | `/agents/:agentId` domain table scrolls inside its `overflow-x-auto` wrapper, not the page.               | The page itself does not scroll sideways; the table does.                                                  |      |      |
| Z9  | Focus ring on a nav link is still visible at 400%.                                                        | The ring is at least 2 px and not clipped by `overflow: hidden`.                                           |      |      |
| Z10 | Text remains legible without zooming back out (no text-overlap or clipping).                              | No overlapping labels, no clipped buttons, no scroll-jail.                                                 |      |      |
| Z11 | Repeat Z1–Z10 with Windows display scaling at 150% and 200% (if available).                               | Same results; this catches mixed OS/browser zoom.                                                          |      |      |

**Recording:** a single failed Z1 on any MVP route confirms A11Y-09. Note which element overflows (use the browser's "inspect" without changing zoom) so the fix can target the shell rather than the page.

---

## 5. Smallest regression gate

The goal is to catch the classes of defect above without a full accessibility programme. Two layers are enough, and both already fit the repository's tooling.

### 5.1 Layer 1 — ESLint rules (static, seconds, blocks PRs)

Add `eslint-plugin-jsx-a11y` and extend only the rules with a low false-positive rate. Do **not** start with `recommended` wholesale: this codebase has intentional pointer handlers on `role="tablist"` and custom label wrappers, which trip the interaction rules.

```js
// eslint.config.js (additions, illustrative)
import jsxA11y from 'eslint-plugin-jsx-a11y'

// inside the existing files: ['**/*.{ts,tsx}'] block:
extends: [
  // ...existing...
  jsxA11y.flatConfigs.recommended,
],
rules: {
  'jsx-a11y/no-static-element-interactions': 'off',
  'jsx-a11y/click-events-have-key-events': 'off',
  'jsx-a11y/no-noninteractive-element-interactions': 'off',
  'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 3 }],
  'jsx-a11y/aria-props': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/aria-valid-attr-value': 'error',
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
  'jsx-a11y/no-redundant-roles': 'error',
  'jsx-a11y/tabindex-no-positive': 'error',
  'jsx-a11y/no-autofocus': 'error',
  'jsx-a11y/heading-has-content': 'error',
  'jsx-a11y/anchor-is-valid': 'error',
}
```

| Rule group                                                                                                     | Catches                                                                                                   | Expected initial findings | Expected false positives    |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------- |
| `aria-props`, `aria-role`, `aria-valid-attr-value`, `role-has-required-aria-props`, `role-supports-aria-props` | Invalid or mismatched ARIA attributes and roles. Does **not** detect a missing tab widget.                | 1–3                       | 0                           |
| `no-redundant-roles`, `tabindex-no-positive`, `no-autofocus`                                                   | Redundant roles, positive tabindex, and forced focus. Does **not** detect the duplicate `main` (A11Y-04). | 0–1                       | 0                           |
| `heading-has-content`, `anchor-is-valid`                                                                       | Empty headings and dead anchors                                                                           | 0–2                       | 0–1                         |
| `label-has-associated-control`                                                                                 | Unlabelled filters and form fields                                                                        | 0–2                       | 0–2 (custom label wrappers) |
| `jsx-a11y` recommended minus the three interaction rules                                                       | Broad ARIA and name coverage                                                                              | 2–6                       | 0–2 (label wrappers)        |

**Estimated cost:** 3–8 findings on first run, of which roughly **0–3 are false positives**, all from `label-has-associated-control` on custom wrappers. After the first cleanup, ongoing cost is near zero. The three disabled interaction rules are where the real noise lives; enabling them later requires refactoring the swipe handlers, not suppressing them.

**Why this is the smallest useful lint layer:** it catches invalid ARIA and name/label defects cheaply, but it does **not** catch the duplicate `main` (A11Y-04), the tab-pattern gaps (A11Y-07, A11Y-11), the live-region choices (A11Y-02, A11Y-06, A11Y-08), or the reflow defect (A11Y-09). Those need the runtime and manual layers below.

### 5.2 Layer 2 — Focused axe smoke spec (runtime, ~30 seconds)

Add one Playwright spec (`e2e/a11y-smoke.spec.ts`) using `@axe-core/playwright`, run in the existing `playwright-e2e` job. Six routes, one run each, with a deterministic seed (fresh `startingState` plus one `advanceWeek`) so `/report/2` and a populated `/cases` exist. The sample is phase 1: `region` is disabled as noise and `color-contrast` is routed to a separate non-blocking report until the 1.4.3 debt is paid; phase 2 removes the contrast exclusion.

| Route              | Why it is in the smoke set                              |
| ------------------ | ------------------------------------------------------- |
| `/`                | Shell, nav, weekly directive, event feed                |
| `/cases`           | Tabs, filters, lists                                    |
| `/cases/:caseId`   | Dossier forms and assignment controls                   |
| `/report/:week`    | Weekly resolution result                                |
| `/equipment`       | Confirmation groups and the densest interactive surface |
| `/agents/:agentId` | Table semantics, tabs, duplicate landmark               |

```ts
// e2e/a11y-smoke.spec.ts (shape, not a committed file)
import AxeBuilder from '@axe-core/playwright'

const tags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']

for (const route of routes) {
  test(`axe: ${route}`, async ({ page }) => {
    await seedDeterministicRun(page)
    await page.goto(route)
    const results = await new AxeBuilder({ page })
      .withTags(tags)
      .disableRules(['region', 'color-contrast']) // see the quarantine notes below
      .analyze()
    expect(results.violations).toEqual([])
  })
}
```

| axe rule / check                              | Expected initial hits | False-positive cost                                                                                                                                                                             |
| --------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color-contrast`                              | 10–40                 | **Low as FP, high as noise** — these are probably true 1.4.3 failures from `opacity-50` text. Quarantine to a non-blocking report for two sprints with a count budget; do not silently disable. |
| `landmark-no-duplicate-main`                  | 1                     | 0 — A11Y-04 is real                                                                                                                                                                             |
| `aria-prohibited-attr`                        | 1–5                   | 0 — A11Y-16 class                                                                                                                                                                               |
| `region` (all content in landmarks)           | 5–15                  | **High** — most flagged blocks are legitimate page sections; disable this rule or allow-list the page wrappers.                                                                                 |
| `heading-order`, `page-has-heading-one`       | 0–2                   | Low — the shell supplies one `h1` per route                                                                                                                                                     |
| `button-name`, `link-name`, `select-name`     | 0–2                   | 0 — icon-only topbar controls are already named                                                                                                                                                 |
| `aria-required-attr`, `aria-valid-attr-value` | 0–3                   | 0                                                                                                                                                                                               |
| `tabindex` / focus checks                     | 0–1                   | 0                                                                                                                                                                                               |

**Estimated cost:** 3–8 non-contrast violations on the first run, almost all true defects; 5–15 `region` notices, mostly noise; 10–40 contrast violations, real but too numerous to fix in one slice. Ongoing false positives after configuring `region` and the contrast quarantine: **0–2 per run**.

### 5.3 What the gate will not catch

- Live-region appropriateness (A11Y-02, A11Y-06, A11Y-08) — axe sees that a live region exists, not whether it is the right one or whether it over-announces.
- Focus loss on conditional render (A11Y-05) — axe runs on a static DOM; it will not press the button.
- Duplicate landmarks and incomplete tab widgets (A11Y-04, A11Y-07, A11Y-11) — axe checks ARIA values, not whether a widget implements the expected keyboard pattern; the manual script's K8 and S2 cover them.
- Reflow at 400% (A11Y-09) — needs a viewport test. Add one Playwright check with `viewport: { width: 320, height: 640 }` asserting `document.documentElement.scrollWidth <= window.innerWidth`; that single assertion covers the shell overflow.
- Route-change focus (A11Y-03) — needs a test that activates a nav link and asserts `document.activeElement` is the new `h1`.

Those four checks are the recommended follow-up once the two layers above are green; without them the gate is necessary but not sufficient.

---

## 6. Verification log

Commands run for this document (from the repository root, 2026-11-03):

| Command                       | Result                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts`     | Exit 0 — lockfile dependencies restored; no dependency added                                        |
| `npm run verify:audits-index` | **PASS** — `design-audits-index: OK 42 audit files`                                                 |
| `npm run format:check`        | **FAIL (baseline)** — 1,677 pre-existing files warn; the two files in this change pass individually |

**Baseline note:** `npm run format:check` fails on untouched files in this commit. Prettier 3.9.10 reports 1,677 warnings, and the sample diff is markdown table padding. Reformatting the whole tree would touch files outside this audit, so it was not done. `docs/accessibility-audit.md` and `docs/design-audits-index.md` both pass `prettier --check` individually.

Static checks used to support the findings (read-only):

| Check                                           | Result                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `grep -rn '<th' src --include=*.tsx`            | 288 matches; 0 contain `scope=`                                               |
| `grep -rn '<caption' src --include=*.tsx`       | 0 matches                                                                     |
| `grep -rn 'role="dialog"\|aria-modal\|<dialog'` | 0 matches — no modal primitive exists                                         |
| `grep -rn 'aria-live' src/features/report`      | 0 matches                                                                     |
| `grep -rn 'GlobalStateBar' src --include=*.tsx` | test-only import; not mounted                                                 |
| `grep -rn '\.focus(' src --include=*.tsx`       | 3 source sites: tabs, onboarding heading, in-page link; none on EquipmentPage |

No component, test, or dependency file was modified by this audit.
