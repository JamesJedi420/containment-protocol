# SPE-1354 First-anomaly pacing

[SPE-1354](https://linear.app/spectranoir/issue/SPE-1354) owns this Week 1 presentation slice under its November 20 pacing acceptance. Codex lane `CP-LANE-A-20261124-1643-NEXT` uses `codex/spe-1354-first-anomaly-pacing` over `4f615020ffd63482a384a0bd32bdc4570d6c620c`. The existing structured preflight verified clean named MSI main and a complete empty open/draft PR inventory. The first-week guide shipped separately in PR #5104.

`src/features/operations/FrontDeskPage.tsx` uses the existing dossier projection in Needs Attention and explains when Week 1 has no available dossier. `e2e/cp-smoke.spec.ts` follows the fresh campaign from visible intelligence to its existing Defer action, then independently imports and reloads a start with only resolved cases through the built-in transfer UI. `docs/first-run-week-loop.md` records both paths and the provisional playtest goals.

The resolved-case fixture verifies an unavailable dossier and ordinary planning after import. The importer restores the default cases for an empty case map. Weekly digest coverage, formal timing measurements, tutorial orchestration, simulation, persistence, and telemetry changes sit outside this slice.
