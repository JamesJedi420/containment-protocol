# SPE-2711 local Main Menu slice

[SPE-2711](https://linear.app/spectranoir/issue/SPE-2711/main-menu-and-campaign-entry-navigation) owns campaign entry. The user assigned `CP-LANE-A-SPE-2711-LOCAL-MENU` to Codex on the original MSI checkout, branch `codex/local-main-menu`, base `0fef84ce281560149897c977f8bb6ec2ed033376`. The November 24, 2026 preflight verified clean live `main`, zero open PRs including drafts, no competing claim in the checked sources, and [SPE-2709](https://linear.app/spectranoir/issue/SPE-2709/persistent-game-settings-access) Done.

## Implementation and acceptance

- `src/app/routes.ts`, `src/app/App.tsx` and `src/app/appShellRoutePaths.ts` register `/main-menu`. The index route continues to load the Operations Desk, and `App` checks the existing campaign recovery condition before routing.
- `src/app/AppShell.tsx`, `src/app/NavigationHistoryControls.tsx` and `src/components/layout/ShellStatusBar.tsx` provide entry from the Operations Desk, keep campaign chrome and history mounted, and suspend their hidden commands on the menu. The menu heading receives focus on entry, and the main region receives focus on return.
- `src/app/MainMenu.tsx` uses the existing `SettingsAccess` and Zustand persistence read APIs. Continue navigates to the Operations Desk when the current persisted snapshot confirms the active campaign. It checks again on activation. The menu leaves unconfirmed data untouched and distinguishes initial unavailability from a failed recheck.
- `src/app/MainMenu.test.tsx` exercises keyboard navigation, shared settings, valid and unconfirmed campaigns, a save changed after menu entry, the Operations Desk round trip, and the existing recovery route. The repository validator selection is owned by SPE-3348.

## Deferred acceptance

The current persistence API can normalize or substitute fields during hydration. Hydration alone does not prove that an on-disk snapshot identifies the live campaign. A cold menu entry stays unavailable when the already-hydrated projection differs from storage. [SPE-3403](https://linear.app/spectranoir/issue/SPE-3403/contradiction-check-cp-core-save-version-compatibility-and-load-policy) owns authoritative corruption, compatibility and storage outcomes.

The existing [parent hold](https://linear.app/spectranoir/issue/SPE-2711/main-menu-and-campaign-entry-navigation#comment-3f97d77a-1c93-41d8-ba06-dea8e0e962e7) remains active. [SPE-3064](https://linear.app/spectranoir/issue/SPE-3064/main-menu-transition-through-deferred-report-and-notice-state) owns the report and notice transition. The rest of SPE-2711 remains open, including broader campaign actions, shared sessions, release information and destructive replacement. The coordinator owns merge release after independent review and CI on the exact PR head.
