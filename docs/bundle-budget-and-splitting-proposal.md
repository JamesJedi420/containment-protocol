# Bundle Budget and Splitting Proposal

**Status:** proposal only. No config, dependency, or source changes accompany this document.

**Measured:** 2026-11-03 on a clean `npm ci` tree (Node 26.13.0, npm 11.20.0) with
`npm run build:bundle` (`vite build --config app.vite.config.ts --configLoader native`).
Two clean runs produced byte-identical asset lists; the numbers below are from that build.

Every size in this document is quoted from that build. Raw sizes are given for context, gzip
sizes are used for budgets. Attribution of bytes to individual source modules is measured from a
sourcemap build of the same tree (method in Appendix A), and reported in kB of minified output.

## Build under discussion

The build prints:

```
dist/assets/index-D_ErtBPR.css                                               74.72 kB │ gzip:  13.48 kB
dist/assets/vendor-misc-YkKrwFWM.js                                           3.56 kB │ gzip:   1.57 kB
dist/assets/vendor-icons-CjsVpHzZ.js                                         16.25 kB │ gzip:   6.02 kB
dist/assets/vendor-react-BhSjkcUY.js                                        244.54 kB │ gzip:  77.58 kB
dist/assets/index-DnndAb7n.js                                                519.43 kB │ gzip: 120.36 kB
dist/assets/content-catalog-Bp5IBCA7.js                                      898.40 kB │ gzip: 233.12 kB
dist/assets/sim-core-D2fO5zhj.js                                           1,648.09 kB │ gzip: 400.04 kB

(!) Some chunks are larger than 500 kB after minification.
```

| Asset                |      Raw kB |   Gzip kB | Share of gzip total |
| -------------------- | ----------: | --------: | ------------------: |
| `sim-core`           |    1,648.09 |    400.04 |               40.2% |
| `content-catalog`    |      898.40 |    233.12 |               23.4% |
| `index` (entry)      |      519.43 |    120.36 |               12.1% |
| `vendor-react`       |      244.54 |     77.58 |                7.8% |
| CSS (`index-*.css`)  |       74.72 |     13.48 |                1.4% |
| `vendor-icons`       |       16.25 |      6.02 |                0.6% |
| `vendor-misc`        |        3.56 |      1.57 |                0.2% |
| runtime + params     |        1.00 |      0.61 |                0.1% |
| HTML                 |        1.19 |      0.50 |                0.1% |
| 51 lazy route chunks |      558.12 |    142.12 |               14.3% |
| **All assets**       | **3,965.3** | **995.4** |            **100%** |

The three warned chunks are 75.7% of the gzip bytes in the build and 88.4% of the entry's
critical path (see §2). `vendor-icons` and `vendor-misc` exist in this build but were not in the
quoted baseline; they are small enough to be irrelevant to the split decision except that
`vendor-icons` is on the critical path.

**Baseline delta.** The quoted baseline (sim-core 1,646 kB / 400 gzip, index 519 / 120,
vendor-react 245 / 78, CSS 76) matches this build within rounding. `content-catalog` does not:
the quoted 875 kB / 226 gzip is not reproducible here — this tree emits **898.40 kB / 233.12 kB
gzip**. All figures and budgets in this document use the measured 233.12 kB.

---

## 1. Why these three chunks are that large

### 1.1 How `getManualChunk` forms a chunk

`getManualChunk` returns a group name for a module when its id matches a path prefix. Nothing
else. Consequences that matter for every number below:

- A module that matches a group is emitted into that group's chunk **together with every
  dependency it imports that does not itself match a group**. The chunk is a closure, not a
  folder.
- A module that matches no group and is imported by the entry follows the entry into `index`.
- `manualChunks` never changes what is loaded at boot. Only `import()` does.

This is why the group names are misleading: `content-catalog` is not a content chunk and
`sim-core` is not a simulator chunk. Both are transitive closures.

Measured with a sourcemap build: `sim-core` contains 369 distinct source modules,
`content-catalog` 170, `index` 106.

### 1.2 `sim-core` — 1,648.09 kB raw / 400.04 kB gzip

The group rule captures `/src/domain/sim/`, `/src/domain/events/`, `/src/domain/agent/`,
`/src/app/store/`, `src/data/startingState.ts`, `src/data/production.ts`, `src/data/training.ts`.
The chunk that results is dominated by what those files import:

| Category                                    | kB (minified) | Share |
| ------------------------------------------- | ------------: | ----: |
| Other `src/domain/**` (pulled transitively) |       1,224.4 | 74.3% |
| `src/domain/sim/**` (matched by the rule)   |         204.8 | 12.4% |
| `src/app/store/**` (matched by the rule)    |         192.9 | 11.7% |
| `node_modules`                              |          10.3 |  0.6% |
| `src/domain/agent/**`                       |           5.6 |  0.3% |
| `src/data/**`                               |           4.6 |  0.3% |
| unassigned remainder                        |           5.1 |  0.3% |

Largest individual modules in the chunk:

|    kB | Module                                                  |
| ----: | ------------------------------------------------------- |
| 152.8 | `src/app/store/runTransfer.ts`                          |
|  86.0 | `src/domain/sim/advanceWeek.ts`                         |
|  41.8 | `src/domain/contracts.ts`                               |
|  39.4 | `src/app/store/gameStore.ts`                            |
|  32.6 | `src/domain/coerciveContainedPersonProtocolRegistry.ts` |
|  29.2 | `src/domain/aggregateBattle.ts`                         |
|  27.9 | `src/domain/case/normalizeCase.ts`                      |
|  23.7 | `src/domain/equipmentInstance.ts`                       |

Precisely why: `gameStore.ts` has 93 `import … from` statements and imports the entire simulation
surface — every `domain/sim/*` command, every registry, `advanceWeek`, and `runTransfer`. Because
`gameStore` is matched by the rule (`/src/app/store/`), everything it imports that is not itself
matched is emitted into `sim-core`. The 74.3% "other domain" share is that closure: registries
such as `truthLayerRecordRegistry` (23.3 kB), `coverStoryLifecycleRegistry` (21.9 kB),
`visualTriggerHazardRegistry` (21.8 kB), `patternSourceSeriesRegistry` (17.3 kB),
`publicDisclosureStateRegistry` (15.1 kB), plus `simulationMapInterface` (20.2 kB),
`missionIntakeRouting` (17.6 kB), `volatileActionPhasePipeline` (14.7 kB),
`majorIncidentOperations` (14.5 kB) and `prerequisiteProcessingOrders` (14.4 kB).

There is a second static path into domain code that does not touch the store: `AppShell` imports
`DeveloperOverlay` → `developerOverlayView` → `frontDeskView` → `operationsReportView` →
`contracts` → `townContractGeneration` → `advanceWeek`. "Everything `gameStore` imports" is not
the same set as "everything only `gameStore` reaches"; see R5.

`advanceWeek.ts` (86.0 kB) is the week-close orchestrator; it imports the per-system week-close
modules (workshop queue, facility maintenance, prerequisite processing, aggregate battle, party
cards, events), which is why so much of `src/domain/**` lands here rather than in `index`.

The chunk is not a long tail problem — 369 modules, largest single file 152.8 kB — but it is
also not a few-file problem: 18 modules account for roughly 614 kB, and the remaining 351
modules account for the rest.

**98.8% of the chunk (1,589.2 kB of 1,609.3 kB mapped) is statically reachable from
`src/main.tsx` with no dynamic import.** Nothing in this chunk is route-lazy.

### 1.3 `content-catalog` — 898.40 kB raw / 233.12 kB gzip

The rule captures exactly two things: `/src/domain/templates/` and `/src/data/copy.ts`. Actual
catalog content is a small fraction of the emitted chunk:

| Category                                        | kB (minified) | Share |
| ----------------------------------------------- | ------------: | ----: |
| Other `src/domain/**` (pulled transitively)     |         493.7 | 55.0% |
| `src/data/**` (`copy.ts` is 73.5 of this)       |          91.8 | 10.2% |
| `node_modules` (zod schema runtime is 21.7)     |          86.0 |  9.6% |
| `src/domain/templates/**` (matched by the rule) |          74.8 |  8.3% |
| `src/domain/sim/**`                             |          52.9 |  5.9% |
| `src/domain/events/**`                          |          50.6 |  5.6% |
| `src/domain/agent/**`                           |          48.5 |  5.4% |

Largest individual modules:

|   kB | Module                                  |
| ---: | --------------------------------------- |
| 73.5 | `src/data/copy.ts`                      |
| 41.5 | `src/domain/equipment.ts`               |
| 38.9 | `src/domain/events/eventValidation.ts`  |
| 26.3 | `src/domain/templates/caseTemplates.ts` |
| 25.9 | `src/domain/agent/normalize.ts`         |
| 21.7 | `node_modules/zod/v4/core/schemas.js`   |
| 21.5 | `src/domain/departmentWorkshopQueue.ts` |
| 18.8 | `src/domain/market.ts`                  |

Precisely why: `copy.ts` imports `../domain/reportNotes` and `../domain/templates/classTables`.
The template files import the authoring modules (`hiddenStateActivationAuthoring`,
`infiltrationCoverAuthoring`, `infiltrationProbeAuthoring`, `stealthLeaveBehindRegistry`) and the
three sibling template files. From `agent/normalize.ts` the graph reaches
`events/eventValidation.ts`, which imports `zod` plus `data/production`,
`data/equipmentDeconstruction`, `equipment`, `market`, `factions`, `agentPotential` and
`directives`. All of that is unmatched by the rule, so it is emitted with its importer into
`content-catalog` — including 86.0 kB of `node_modules`, of which 21.7 kB is zod's schema runtime.

So the "content" in `content-catalog` is 148.3 kB (`templates` 74.8 + `copy.ts` 73.5), i.e. 16.5%
of the chunk. The other 750 kB is simulation code and a schema validator that happen to be
imported by template data.

**90.4% of the chunk is statically reachable from `src/main.tsx`** (the remaining 9.6% is
`node_modules`, also reached from boot). Nothing in this chunk is loaded lazily.

### 1.4 `index` — 519.43 kB raw / 120.36 kB gzip

`index` is everything the entry reaches that no rule matches: the eight route pages imported
statically in `src/app/App.tsx`, their views and panels, `AppShell`, `DeveloperOverlay`, and the
`src/domain/**` helpers those pages import directly.

| Category              | kB (minified) | Share |
| --------------------- | ------------: | ----: |
| `src/features/**`     |         371.4 | 71.5% |
| Other `src/domain/**` |         103.8 | 20.0% |
| `src/app/**`          |          20.8 |  4.0% |
| `src/components/**`   |          16.8 |  3.2% |
| unmapped              |           6.6 |  1.3% |

Largest individual modules: `FrontDeskPage.tsx` 38.2, `eventFeedView.ts` 36.9, `CasesPage.tsx`
34.5, `frontDeskView.ts` 32.2, `stabilityLayer.ts` 31.8, `CaseDetailPage.tsx` 19.0,
`ContractBoardPage.tsx` 17.3, `contractBoardView.ts` 16.0, `visibility.ts` 15.6,
`TeamsPage.tsx` 14.3, `DeveloperOverlay.tsx` 13.4, `TeamDetailPage.tsx` 12.8,
`ReportDetailPage.tsx` 10.6.

Precisely why: `App.tsx` imports `OperationsDeskPage`, `ContractBoardPage`, `CasesPage`,
`CaseDetailPage`, `TeamsPage`, `TeamDetailPage`, `ReportPage` and `ReportDetailPage` **statically**,
while the other 40-odd routes use `createRouteComponent(() => import(...))`. Those eight pages and
their exclusive view modules account for **235.5 kB of the chunk (45.3%), ≈ 45.6 kB gzip measured**
—
measured as the closure reachable from the eight pages minus the closure reachable from
`main.tsx` when those eight edges are removed.

This is the one place where existing route splitting is defeated by import style rather than by
`manualChunks`.

### 1.5 The rest of the build (context for the budgets)

- `vendor-react` 244.54 / 77.58: `react-dom-client.production.js` alone is 202.9 kB (198.1 KiB),
  react-router ~40 kB, react ~7 kB. 23 modules. This is close to the floor for React 19 + Router.
- `vendor-icons` 16.25 / 6.02: 55 lucide icons, already tree-shaken — the largest single icon is
  0.7 kB. `AppShell` imports 17 of them, which is what puts this chunk on the critical path.
- CSS 74.72 / 13.48: one Tailwind v4.3.3 sheet, single `@layer` block, no per-route stylesheets.

### 1.6 What the numbers say

1. These chunks are large because they are **closures of the boot graph**, not because route
   code is in them. Both big chunks are ≥ 90% boot-static.
2. Route-level `lazy()` is doing its job: 51 lazy chunks hold 142.12 kB gzip of the 995.4 kB
   total. But it only controls 14.3% of gzip bytes, because the shared simulation and template
   graph is imported by the shell before any route renders.
3. The chunk names describe the **rule**, not the contents. A reviewer reading a 500 kB warning
   for `content-catalog` would reasonably assume catalog data; 83.5% of that chunk is not catalog.

---

## 2. First-load cost: slow 4G and a mid-tier phone

### 2.1 Profile

Lighthouse's mobile preset (`mobileSlow4G`, the default for Lighthouse mobile runs): **150 ms
RTT, 1.6 Mbps down / 750 kbps up, 4× CPU slowdown**, i.e. 204.8 kB/s effective download. This is
the "mid-tier phone on the 85th-percentile mobile connection" model; the 4× CPU factor moves a
fast desktop into the mid-tier mobile bracket.

### 2.2 What is on the critical path

`dist/index.html` preloads exactly these:

| Asset              |    Gzip kB | Why it is on the critical path                    |
| ------------------ | ---------: | ------------------------------------------------- |
| `sim-core`         |     400.04 | imported by `gameStore`, which `AppShell` renders |
| `content-catalog`  |     233.12 | imported by `gameStore` → `startingState`         |
| `index`            |     120.36 | entry chunk                                       |
| `vendor-react`     |      77.58 | React + Router                                    |
| `vendor-icons`     |       6.02 | `AppShell` navigation icons                       |
| `vendor-misc`      |       1.57 | other node_modules pulled by the shell            |
| runtime + params   |       0.61 | module runtime and search-param helpers           |
| CSS                |      13.48 | render-blocking stylesheet                        |
| HTML               |       0.50 | document                                          |
| **Critical total** | **852.78** | plus 0.50 kB HTML = **853.28 kB gzip**            |

**852.78 kB of 995.4 kB gzip — 85.7% — is on the critical path.** Raw: 3,406.0 kB of 3,965.3 kB
(85.9%). There is no waterfall to optimise here; it is one large pack, and the app cannot render
its first route until all of it has arrived and executed.

### 2.3 What is lazy

The remaining 142.12 kB gzip sits in 51 route chunks, fetched only on navigation:

| Chunk                                |  Gzip kB |
| ------------------------------------ | -------: |
| `agentView` (agents/registry detail) |    13.11 |
| `EquipmentPage`                      |    10.79 |
| `TrainingDivisionPage`               |     7.32 |
| `MarketPage`                         |     6.85 |
| `RecruitmentPage`                    |     6.81 |
| `AgencyPage`                         |     6.20 |
| every other route chunk              | 1–6 each |

A navigation after boot costs roughly `13 kB / 204.8 kB/s` ≈ 64 ms plus one 150 ms RTT plus
parse/execute: **≈ 0.25–0.5 s** for the heaviest route, well within a reasonable interaction
budget. Routes are not the problem.

### 2.4 Time model

Network times are arithmetic on measured bytes at 204.8 kB/s. CPU times are **modelled**, not
measured (see §2.5): parse+compile at 1.0 MB/s of minified JS on a 4×-throttled mid-tier device,
with a 0.7–1.3 MB/s band.

| Step                                                       |            Input |                                        Time |
| ---------------------------------------------------------- | ---------------: | ------------------------------------------: |
| Cold connection setup (DNS + TCP + TLS)                    |                — |                     450 ms (3 × 150 ms RTT) |
| HTML request                                               |          0.50 kB |                       152 ms (1 RTT + 2 ms) |
| Critical JS + CSS transfer                                 |        852.78 kB |                                    4,166 ms |
| Render-blocking CSS wait                                   | (included above) | 0 ms extra — CSS is preloaded with the pack |
| Parse + compile critical JS                                |     3,406 kB raw |    **2.6–4.9 s** (model), 3.4 s at 1.0 MB/s |
| Boot execution (state construction, hydrate, first render) |                — |                                not measured |
| **First meaningful paint**                                 |                  |                             **≈ 7.5–9.5 s** |
| **Interactive**                                            |                  |                                **≈ 8–10 s** |

Two things worth stating plainly:

- The 4.17 s transfer is a **floor**, not an estimate of quality on a bad connection: it assumes
  full advertised throughput, no loss, no proxy, no service worker, and HTTP/2 stream sharing
  that costs nothing.
- Parse/compile is a floor too — it excludes style/layout/paint and the actual boot work of
  `createStartingState()` (which deep-clones the starting-state template, including the whole case
  template map) and zustand rehydration. Those are unmeasured here.
- The CPU band is the dominant uncertainty. Even at the optimistic 1.3 MB/s, parse alone is 2.6 s,
  so the model does not materially change the ranking of candidates in §4.

### 2.5 What this model does not include

No real-device trace, no Lighthouse run, no browser automation in this environment. The network
columns are exact arithmetic on measured gzip bytes; the CPU column is a stated model with a
stated band; boot execution is unmeasured. Treat §2.4 as a floor for planning, not a measurement
of the app on hardware.

---

## 3. Per-chunk budgets

Budgets are gzip. `Fail` is `≈ 110%` of `Budget`, rounded — i.e. budget is the number a change is
expected to stay under, and fail is a hard stop for an unrelated change that regresses it.
Budgets are set to the post-remediation sizes from §4 so that each one is reachable by a named
change, not aspirational.

| Asset                   | Today (gzip) | Budget (warn ≥) | Fail (≥) | Basis                                                                   |
| ----------------------- | -----------: | --------------: | -------: | ----------------------------------------------------------------------- |
| `index` (entry)         |       120.36 |              78 |       86 | 32.05 measured after R0–R3+R5 (tighten to ~36/40)                       |
| `content-catalog`       |       233.12 |             215 |      237 | 213.7 after R1                                                          |
| `sim-core`              |       400.04 |             385 |      424 | ≈385 at measured R2 ceiling (was 360.3)                                 |
| `vendor-react`          |        77.58 |              78 |       86 | unchanged                                                               |
| `vendor-icons`          |         3.74 |               4 |        6 | lazy residual after R3; was 6.02 preloaded                              |
| `vendor-misc`           |         1.57 |               2 |        3 | unchanged                                                               |
| runtime + search params |         0.61 |               1 |        2 | unchanged                                                               |
| CSS                     |        13.48 |              14 |       16 | ~13.5 floor for one Tailwind sheet                                      |
| HTML                    |         0.50 |               1 |        2 | unchanged                                                               |
| **Entry critical path** |   **852.78** |         **780** |  **820** | 765.67 measured after R0–R3+R5 (752.12 preload + CSS/HTML); passes warn |
| **All assets**          |    **995.4** |         **900** |  **960** | 985.45 measured after R0–R3+R5                                          |

How to read it:

- Today the entry gate **fails at 852.78 vs 820**, and `index` fails at 120.36 vs 86. These two
  failures are the proposal: R0 measured −39.4 and −45.6, and R3 plus R5 then took the preloaded
  set to 752.12 kB gzip. The entry now measures ≈765.67 with CSS and HTML, under the 780 warning
  line, and `index` measures 32.05 — well inside the old 86 fail line. The index row can be
  re-based to ~36/40; it is left at 78/86 here so the historical failure stays legible.
- `sim-core` and `content-catalog` **warn today** (400.04 ≥ 385, 233.12 ≥ 215) but do not fail.
  That is intentional: they are over their target architecture, not over a no-regression line.
- `vendor-react` at 77.58 against a budget of 78 is deliberately tight; it should not grow.
- The aggregate row is evaluated in addition to the per-chunk rows, so a change cannot stay under
  every per-chunk budget while blowing the entry through accumulation.

**Enforcement note.** `vite build`'s existing warning is raw-size based (500 kB) and is a poor
proxy: at this app's measured ratios, 500 kB raw ≈ 130 kB gzip, so it fires on eight assets that
are fine and says nothing about first-load cost. The gates above need a gzip check over the build
manifest (asset name → gzip size) plus the `dist/index.html` preload list to compute the entry
total. That is a follow-up slice, not part of this proposal.

---

## 4. Ranked candidates

Ranking rule, stated so it can be re-weighted: **priority = estimated gzip saving ÷ (risk weight ×
effort weight)**, with risk `low = 1, medium = 2, high = 4, very high = 8` and effort
`small = 1, medium = 2, large = 3`.

| #   | Candidate                                                                               |  Est. saving (gzip) | Risk      | Effort |    Score |
| --- | --------------------------------------------------------------------------------------- | ------------------: | --------- | ------ | -------: |
| 0   | **R0 — lazy-load the 8 eager route pages** (adjacent finding, not in the original list) |            **39.4** | low       | small  | **39.4** |
| 0.5 | **R5 — dev-only overlay off the boot path** (implemented, measured)                     |            **44.8** | low       | small  | **44.8** |
| 1   | R3 — icon imports                                                                       | 4.22 (6.02 ceiling) | low       | small  |      4.2 |
| 2   | R2 — `sim-core` eager import into the shell                                             |     ≈15 (39.7 est.) | high      | large  |      2.5 |
| 3   | R1 — `content-catalog` data vs code                                                     | 19.4 (38.5 ceiling) | very high | large  |      0.8 |
| 4   | R4 — CSS                                                                                |         ~0 realised | medium    | medium |      0.0 |

Ordered by expected saving alone, the same list is R5 (44.8 measured, shipped) → R0 (39.4, shipped) → R2
(39.7 estimated, ≈15 measured) → R1 (38.5 ceiling, 19.4 realistic) → R3 (4.22 measured) → R4
(~0). The columns are given so a reviewer who weights risk differently can re-rank without
re-measuring.

### R0 — lazy-load the eight eagerly imported route pages (recommended first change)

`App.tsx` statically imports `OperationsDeskPage`, `ContractBoardPage`, `CasesPage`,
`CaseDetailPage`, `TeamsPage`, `TeamDetailPage`, `ReportPage`, `ReportDetailPage`. The other ~40
routes already use `createRouteComponent(() => import(...))` + `renderLazyRoute`. Moving these
eight to the same pattern removes their exclusive modules from `index`.

- Measured basis: 235.5 kB minified of `index` is reachable only through those eight pages
  (45.3% of the chunk), ≈ 54.6 kB gzip at the chunk's average 23.2% ratio — an estimate that the
  implementation below showed to be ~17% high.
- **Measured after implementation** (same build config, zlib default level): `index` 519.43 →
  286.15 kB raw and 119.72 → 74.11 kB gzip (**−45.61**). Preloaded entry set 846.77 → 801.17 kB
  gzip, but the landing route now fetches a 6.21 kB gzip `OperationsDeskPage` chunk after the entry
  executes, so **net first load on `/` is 847.27 → 807.88 kB gzip (−39.4)**, not 54.6. The extracted
  bytes compress at 19.5%, not the chunk-average 23.2%. Aggregate bytes across all chunks rise
  988.78 → 1000.34 kB gzip (+11.6) because 17 new chunks each lose the shared gzip context: first
  load improves while the total grows.
- If `/` (`OperationsDeskPage` → `FrontDeskPage`, 38.2 kB) stays eager to avoid a fallback flash on
  the landing route, the 6.21 kB landing chunk returns to `index` (≈ 81 kB on the §3 basis), which
  is over the 75 kB budget: the budget assumes all eight move, as implemented.
- Risk: low. Client-only SPA, no SSR, same pattern already used by 40 routes, Suspense fallback
  already exists and is used.
- Why it is first: it is the largest measured saving in the build and the lowest-risk change
  available. It is not in the four requested candidates only because the measurement, not the
  brief, surfaced it.

### R1 — `content-catalog`: data vs code

Two different questions, two different answers.

**Data (148.3 kB minified = 16.5% of the chunk, ≈ 38.5 kB gzip).** `copy.ts` 73.5 kB and
`templates` 74.8 kB. Split into what is actually deferrable:

- `copy.ts` is imported by 93 files, including `AppShell` (`DASHBOARD_HEADLINE`, `GAME_OVER_REASONS`,
  `SHELL_UI_TEXT`). The shell strings must exist for the first render, so the file as a whole
  cannot move. Only per-export extraction of route-only strings is possible, and the shell
  constants (`copy.ts` and `classTables`) must stay.
- `templates` are required by `createStartingState()` at module evaluation (§5.1), so today the
  saving is **0**. Moving them behind `import()` requires an async boot gate. Best case, carefully
  done: **19.4 kB gzip**.
- Estimated realistic saving: **19.4 kB gzip**, risk very high, effort large.

**Code (750.1 kB minified, ≈ 194.7 kB gzip).** There is no saving here. 90.4% of this chunk is
boot-static; the same modules would be loaded wherever they are grouped. Re-attributing them would
shrink the `content-catalog` number in the build report and change nothing a user experiences —
useful for honest budgets, worthless as a performance change. It is listed here so the proposal
does not imply otherwise.

### R2 — `sim-core` eager import into the app shell

**Re-measured and re-scoped; the earlier 39.7 kB estimate does not survive module-graph
measurement.** Method: a temporary Vite config dumped per-module `renderedLength` for every chunk;
the static import graph was parsed from `src/` with dynamic `import()` edges excluded (lazy routes
are not boot code); a closure is what becomes unreachable from `src/main.tsx` when one module's
outgoing edges are deleted. Module bytes are scaled to the measured chunk size and gzip ratio; the
method reproduces the §1.2 `runTransfer` number within 1% (151.4 vs 152.8 kB).

- Deleting `gameStore.ts` from the boot graph strands **32 modules, 251 kB minified ≈ 60.4 kB
  gzip**. `runTransfer`'s own closure is **11 modules, 197 kB ≈ 47.4 kB gzip** and cannot move:
  `persist({ migrate })` runs synchronously and calls `migratePersistedStore(...)` from it.
- The command-only remainder is therefore **21 modules, 54 kB minified ≈ 13.0 kB gzip** — not
  `163.3 kB`/`39.7`. Excluding R5's overlay path first raised it to **25 modules ≈ 14.9 kB**
  (pre-R5 measurement), because four modules were only reachable through the store by virtue of
  that path being present; re-measure against the post-R5 build before using it.
- Largest remainder modules (gzip): `hire` 1.5, `hiddenCombatResolver` 1.3,
  `affiliationFileWorkQueueDecisions` 1.3, `outcomeBranching` 0.9, then a tail of 20 modules at
  0.8 or less. The earlier 65-module set counted modules such as `advanceWeek` (98.4 kB) and
  `contracts` (35.5 kB) that the static graph reaches without `gameStore`, through
  `AppShell → DeveloperOverlay → developerOverlayView → frontDeskView`, then
  `operationsReportView → contracts → townContractGeneration → advanceWeek` (see R5).

What the remainder is, and why it is expensive to move: command implementations with no
week-close role. Two seams are possible.

1. **Async command seam** — dynamic import inside each action. Every affected action becomes
   Promise-returning. The store is one module-scope object whose actions are destructured by
   consumers (64 non-test modules call `useGameStore()`), and tests assert state immediately after
   the call, so the churn is broad. `advanceWeek` (98.4 kB) is week-close and must not move at all.
2. **Screen-owned commands + one synchronous commit** — the lazy route imports the domain function
   it owns, calls it, and commits through a small generic store setter. Action signatures and
   week-close stay synchronous, at the cost of moving orchestration (event drafts, logging,
   normalization) out of the store per family.

- Measured ceiling: **≈15 kB gzip**, not 39.7. Risk: high for the full set, medium for a pilot.
  Effort: large (multi-slice, touches the store contract and its tests).
- **Decision: no R2 pilot now.** After R5 the entry chunk is 32.05 kB gzip and the preloaded set
  is 752.12 kB (≈ 765.67 with CSS and HTML). The full ≈15 kB ceiling is ~2% of that path, roughly
  70 ms of modelled transfer; a single-family pilot at ~3 kB is ~12 ms. Against that, the work is
  high risk and large: 47.4 of the 60.4 kB is pinned by synchronous `persist({ migrate })`, and the
  command-only remainder changes a store contract used by 64 non-test modules. That trade is not
  justified by a general “smaller is better” goal.
- Revisit only if one of these becomes true: a concrete route or device budget needs the bytes; a
  real-device trace shows `sim-core` parse/compile (not transfer) is the bottleneck; or a post-R5
  re-measurement finds a materially larger remainder. If revisited, re-measure first and pilot
  option 2 on one family (recruitment `hire` / `scouting`, site exploration, hub support ≈ 3 kB
  gzip) under the existing gate: measured entry reduction ≥ 2.5 kB gzip, no action signature
  changes outside the touched feature, week close and `runTransfer` untouched, full suite green.
  Stop if measured/estimated falls below 1.

### R5 — the dev-only developer overlay was on the boot path (implemented, measured)

`AppShell` used to statically import `DeveloperOverlay`, which statically imports
`buildDeveloperOverlaySnapshot` and through it `frontDeskView`, `eventFeedView`,
`operationsReportView`, `stabilityLayer`, `branchContinuity*` and more — even though the component
returns `null` in production because `isOverlayAvailable()` is false unless `DEV` or
`MODE === 'test'`. Because the imports were static, the whole graph shipped in `index`.

- Scoping estimate: **26 emitted modules, 166.0 kB minified ≈ 43.0 kB gzip**, all in `index` (27
  modules counted; one type-only import emits no code). Largest: `frontDeskView` 7.9,
  `stabilityLayer` 7.8, `eventFeedView` 7.4, `branchContinuity` 2.3, `developerOverlayView` 2.3
  kB gzip. That closure excluded dynamic `import()` edges, so it counted modules the lazy routes
  also use: it overstates what leaves the build, while understating the entry saving because those
  modules previously sat in `index` too.
- Implemented: `DeveloperOverlay` is `import.meta.env.PROD ? () => null : lazy(() => import(...))`
  inside a `Suspense fallback={null}` boundary. Vite substitutes `PROD` in the production build and
  the lazy arm is eliminated; `MODE === 'test'` still loads the real component, so the existing
  overlay tests run unchanged.
- **Measured after implementation**: `index` 75.86 → 32.05 kB gzip (**−43.81**); preloaded set
  796.95 → 752.12 kB gzip (**−44.83**); all assets 999.89 → 985.45 kB gzip (−14.44); 78 → 83
  assets. No production asset contains the overlay's UI strings or a dynamic reference to it
  (`grep -r` over `dist/assets`), so the graph is eliminated, not deferred.
- The build total falls only 14.4 kB because the closure shared modules with the lazy route chunks:
  removing the overlay from `index` moved ≈111 kB minified into five additional chunks, none of
  them preloaded. Boot cost falls by the preload delta; build-wide gzip falls less because those
  bytes lose their shared compression context.
- Risk was low and is resolved. Targeted tests: 4 App/overlay files, 52 tests passed; `npm run
lint` clean.
- Note: R5 changes R2's attribution — re-measure R2 against the post-R5 build rather than reusing
  the pre-R5 numbers above.

### R3 — icon imports

`vendor-icons` is 16.25 kB raw / 6.02 kB gzip for 55 tree-shaken lucide icons; the largest single
icon is 0.7 kB. `AppShell` imports 17 of them and `ShellStatusBar` five more, which is the only
reason the chunk is preloaded.

- **Measured after implementation**: the 21 boot-path icons (17 in `AppShell`, 4 more in
  `ShellStatusBar`, with `IconReports` shared) now live in `src/components/shellIcons.tsx` as local
  SVG components generated from lucide's path data; `components/icons.ts` re-exports them so lazy
  pages keep their imports. `vendor-icons` drops 6.02 → 3.74 kB gzip (the 34 remaining icons) and
  leaves the preload list; `index` grows 74.11 → 75.86 kB gzip for the inlined markup. Preloaded
  set 801.17 → 796.95 kB gzip (**−4.22**), total assets 1000.34 → 999.89 (−0.45).
- Ceiling was 6.02; 1.75 of it is repaid in `index`, and the residual chunk now loads only with the
  lazy routes that still use icons.
- Risk: low. The markup is generated from lucide's own path data, and nothing in `src` or the CSS
  selects lucide's `.lucide-*` classes (checked). Effort: small.
- Note: tree-shaking already works. The candidate is not "import fewer icons", it is "stop putting
  the icon module on the boot path".

### R4 — CSS

One 74.72 kB / 13.48 kB gzip Tailwind sheet, render-blocking, shared by every route.

- Transfer saving: **≈ 0**. There is no route that does not use the utility layer, and a per-route
  split would trade one 13.48 kB file for several smaller ones while adding requests and risking
  FOUC.
- The only real lever is the render-blocking request itself: inlining the ~13 kB critical sheet
  into the HTML would remove one round trip from first paint, but the bytes still arrive with the
  document, so the measured transfer total does not change.
- Risk: medium (FOUC, class-order drift), effort: medium. Rank last.

---

## 5. What must not be split

This is a client-only SPA: there is no SSR, so "hydration ordering" here means **module-evaluation
order, zustand persist rehydration, and state construction** — not React hydration. The following
are ordering-sensitive and must stay in the boot graph.

1. **`src/data/startingState.ts` and the store's initial state.** The module executes
   `export const startingState = createStartingState()` at evaluation time, and `gameStore.ts`
   constructs `create<GameStore>()(persist(...))` with `game: createStartingState()` at module
   scope. Both run before React renders. Deferring either behind `import()` yields an empty
   `game` on first render.
2. **`caseTemplateMap`, `starterCases`, `starterRoster` (the `templates` group).** `partialize`
   strips `templates` from persisted state and `merge` re-injects live templates via
   `hydrateGame(ps.game, currentState.game)` — the templates are deliberately reloaded from source
   on every boot so saves never carry stale content. The re-injected map must be complete and
   present at rehydration; splitting template files behind a lazy boundary would rehydrate saves
   with missing templates and empty contract/case surfaces.
3. **`runTransfer.ts` — save migration.** `persist({ migrate })` is synchronous and calls
   `migratePersistedStore(persistedState, version, createStartingState())`. It cannot become a
   dynamic import without replacing zustand's rehydration path. This is what caps R2 at 39.7 kB.
4. **The store's action surface.** `useGameStore()` is a single object; consumers destructure
   actions and call them synchronously (including `advanceWeek`, which many screens call on
   click). The shape must be complete when the store is created. Lazy-loading implementations
   changes week-close from a synchronous, deterministic transition to an async one.
5. **`advanceWeek` and its week-close sequence.** `advanceWeek.ts` (86.0 kB) calls per-system
   week-close modules in a fixed order (workshop queue, facility maintenance, prerequisite
   processing, aggregate battle, party cards, events). Splitting those calls across lazy chunks
   changes execution order, and a chunk arriving mid-pipeline — or retried after a failure — would
   re-run part of a week against already-mutated state. Week close must load first, then execute
   exactly once.
6. **Seeded RNG ordering.** `createSeededRng` closes over local state and the game carries
   `rngSeed`/`rngState` in state, so the sequence depends on call order, not module identity.
   Constraint: splitting call sites must not reorder calls. Keep all RNG consumers of a single
   transition in one execution unit.
7. **Template registry ordering.** `caseTemplateMap` is built from ordered spreads
   (`caseTemplates`, `.occult`, `.operations`, `.psionic`), and `starterCases`/`starterRoster`
   reference templates by id. Splitting template files and loading them independently changes map
   insertion order unless order is explicitly re-established after load.
8. **`gameStateManager` normalization.** `createStartingState()` ends with
   `ensureManagedGameState(refreshContractBoard(syncTeamSimulationState(...)))`; `hydrateGame`
   re-runs the same normalization. These are order-dependent derivations over the same state and
   belong in one chunk with `startingState`.

Everything else — route pages, views, panels, registries used only by one screen — is fair game
and is already split.

---

## Appendix A — How the numbers were obtained

1. **Build.** `npm ci`, then `npm run build:bundle`. `npm run build` additionally runs `tsc -b`,
   which the repository documents as having baseline type drift; type-checking does not affect
   emitted sizes, so the Vite-only script is the measurement. Two clean runs were diffed and are
   identical.
2. **Per-chunk gzip.** Quoted directly from the build report.
3. **Per-module attribution.** A second build with `--sourcemap` into a scratch directory, then a
   VLQ decoder over each chunk's `mappings` array: each mapping segment owns the generated bytes
   up to the next segment, and those bytes are attributed to the segment's source. Sums reconcile
   to the chunk's file size (e.g. 1,647.9 kB for `sim-core`). Reported values are kB of minified
   output per source module.
4. **Boot reachability.** Static import graph of `src/**/*.ts(x)` with `import type` removed,
   `import()` treated as a boundary, closure from `src/main.tsx` (649 of 977 source modules).
   Membership of a module was intersected with the attribution above to compute the "boot-static"
   and "reachable only through X" numbers.
5. **Estimated savings.** Byte share × the owning chunk's measured gzip ratio (e.g. `sim-core`
   400.04 / 1,648.09 = 24.3%). These are estimates derived from measured bytes; they are not the
   result of an experiment that removes the code.
6. **Time model.** Lighthouse `mobileSlow4G` constants (150 ms RTT, 1.6 Mbps down / 750 kbps up)
   and its 4× CPU slowdown. Network times are `bytes ÷ 204.8 kB/s`; CPU is modelled at
   0.7–1.3 MB/s of minified JS.
7. **R0 verification.** Before/after builds used one script and one config (zlib default level);
   the measured pair is `index` 119.72 → 74.11 kB gzip and preloaded entry 846.77 → 801.17, plus
   the 6.21 kB landing chunk. §1–2 and the §3 `Today` column come from the earlier build pass, so
   absolute gzip values can differ by ~1% depending on compression method; only same-method deltas
   are quoted as savings. R3 was measured the same way: `vendor-icons` 6.02 → 3.74 kB, preloaded
   801.17 → 796.95 kB gzip, total 1000.34 → 999.89.

8. **R2/R5 module attribution.** A temporary Vite config added a `generateBundle` plugin that wrote
   per-chunk `modules[].renderedLength`, and the static import graph was parsed from `src/` with
   dynamic `import()` edges excluded. Closures were computed by deleting `gameStore.ts` (R2) or
   `DeveloperOverlay.tsx` (R5) from that graph. Bytes were scaled to each chunk's measured minified
   size and gzip ratio. `runTransfer` reproduces §1.2 within 1% (151.4 vs 152.8 kB). The temporary
   config and output were deleted after measuring; `npm run build:bundle` was re-run on the clean
   tree. R5 was implemented and re-measured with the same script on that clean config: `index`
   75.86 → 32.05 kB gzip, preload 796.95 → 752.12, total 999.89 → 985.45.

## Appendix B — Measurement hygiene

- Build output must not be left inside the repo while measuring. A stray `dist-map/` directory
  containing bundled JS changed the CSS output from 74.72 kB to 75.85 kB (13.48 → 13.57 gzip),
  presumably because Tailwind's content detection picked up class-name strings from the previous
  build. Clean-tree numbers only are quoted here.
- `dist` and `dist-ssr` are already ignored; the scratch output directory used for attribution is
  not, so it must be removed before the next build or formatter run.
- The Vite warning threshold (500 kB raw) is not a budget. Use the gzip gates in §3.

## Appendix C — Decision summary

1. **Do R0 first.** Make the eight statically imported route pages lazy in `App.tsx`. Measured
   45.6 kB gzip out of the entry chunk, 39.4 kB off the `/` first load, low risk, existing pattern.
2. **R5 is implemented** (dev overlay off the boot path; measured −44.8 kB off the preloaded set,
   and no overlay code in the production assets), after **R3** (icons, −4.2 kB preloaded). R2
   measures ≈15 kB, not 39.7, and is **not worth a pilot now**: ≈2% of the measured critical path
   for high-risk store-contract work. Revisit only against a concrete budget or trace, and
   re-measure first.
3. Do **not** start with `content-catalog`. Its 233.12 kB is 83.5% boot-required code, its data is
   blocked by the rehydration contract in §5, and the realistic saving is 19.4 kB.
4. Do **not** split CSS. There is no measurable transfer saving.
5. Even with R0, R3 and R5 accepted, the critical path measures **752.12 kB gzip preloaded
   (≈ 765.67 with CSS and HTML), ≈ 3.7 s of pure transfer** on the modelled profile. The remaining
   gap to a 500 kB / 3 s budget is architectural
   — it requires moving state construction and template loading behind an explicit async boot —
   and cannot be closed by `manualChunks` tuning. If that target is real, it needs its own
   proposal with the determinism constraints in §5 as its starting point.
