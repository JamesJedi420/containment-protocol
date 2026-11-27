# SPE-1354 First-dossier triage guide

[SPE-1354](https://linear.app/spectranoir/issue/SPE-1354) owns player-facing week-loop framing and remains In Progress. [Lane A reservation CP-LANE-A-AFTER-5123-450D2](https://linear.app/spectranoir/issue/SPE-1354#comment-9c53aad8-4ce0-4aee-9838-b8387ccecde9) covers this record and `docs/first-run-week-loop.md` on `codex/first-dossier-triage-guide`. SPE-3752 returned ready from clean named MSI main `450d2c5b928cdfbcfe1354e2d98ee45f1f3ae7f9` with zero open or draft PRs. The SPE-100 reservoir and SPE-3067 triage resolver reservations have separate paths and no dependency on this documentation.

The November 20 acceptance calls for ordinary access to visible anomalous evidence and a permitted triage decision before unrelated setup. When deployment is ineligible, the player must be able to understand the blocker and the permitted alternative. A quiet start keeps ordinary planning available.

At the base revision, `FrontDeskPage.tsx:451` exposes **Review dossier and triage** and `FrontDeskPage.tsx:456` renders the quiet-start message. `CasesPage.tsx:772` exposes **Open intel dossier**, and its assignment controls at line 1050 use the required roles and tags. `MissionTriageDispositionActions` presents **Defer** when supported and exposes its stated consequence. Check the guide against those controls and run the existing eligible and quiet-start scenarios in `e2e/cp-smoke.spec.ts` plus the SPE-3348-selected validators.

The slice covers documentation of the existing Week 1 route. Gameplay rules, dossier eligibility, onboarding orchestration, weekly report guidance and deployment configuration are outside its boundary.
