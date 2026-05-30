# Major incident UI (dormant)

`MajorIncidentPage`, `majorIncidentView`, and this folder’s CSS are **not wired** into the app shell.

## Canonical surfaces

Player-facing major-incident flow lives on existing MVP routes:

| Surface | Path | Role |
| ------- | ---- | ---- |
| Cases list / triage | `/cases` (`CasesPage`) | Major-incident plan UI, team selection, launch when `view.isMajorIncident` |
| Case detail | `/cases/:caseId` (`CaseDetailPage`) | Assignment, intel, resolution for operational major-incident cases |
| Operations desk | `/` | Pressure-driven incident spawn; drill-down into cases |

Domain logic: `src/domain/majorIncidents.ts`, `src/domain/majorIncidentOperations.ts`. See `docs/major-incidents-audit.md`.

## Why this folder remains

- Early three-column response mock (`MajorIncidentPage`) predates case-integrated major-incident UX.
- `getMajorIncidentFlowView()` still uses `useGameStore.getState()` and is only referenced from the dormant page and its smoke test.
- Do **not** add `APP_ROUTES`, `systemRegistry`, or shell nav entries here unless [SPE-36](https://linear.app/spectranoir/issue/SPE-36) explicitly scopes a dedicated route again.

## Legacy stylesheet (problem 163)

`MajorIncidentPage.css` uses raw hex borders/backgrounds from the early mock. **Recommendation:** leave as-is until this folder is removed; do not mass-delete the page. New work belongs on `/cases` with `src/styles/` tokens. CSS file header documents migration vs archive.

## Response selection (problem 164)

| Layer | Behavior |
| ----- | -------- |
| `majorIncidentView.selectedResponseId` | Read-only mirror of `case.majorIncident.strategy` from the store (null when unset). |
| `MajorIncidentPage` `useState` | Preview highlight only; does not write strategy or call `launchMajorIncident`. |

Selection on this page is **preview-only** and can be **stale** relative to canonical case flow on `/cases`. No store wiring unless SPE-36 explicitly scopes a dedicated route again.

## Blockers on response buttons (problem 165)

`evaluateMajorIncidentPlan` may attach `blockers` on the balanced option. Buttons with blockers are **disabled** on this prototype (aligned with legacy `ProcurementPage`). Canonical enforcement lives on `CasesPage` major-incident plan UI.

## Tests

`MajorIncidentPage.test.tsx` is a shallow render smoke test with a mocked view. Broader integration tests belong on `CasesPage` / `CaseDetailPage` when SPE-36 ships—not on this dormant page.
