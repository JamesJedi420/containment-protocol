# SPE-2711 local Main Menu slice

[SPE-2711](https://linear.app/spectranoir/issue/SPE-2711/main-menu-and-campaign-entry-navigation) owns campaign entry. The user assigned `CP-LANE-A-SPE-2711-LOCAL-MENU` to Codex on the original MSI checkout, branch `codex/local-main-menu`, base `0fef84ce281560149897c977f8bb6ec2ed033376`. The November 24, 2026 preflight verified clean live `main`, zero open PRs including drafts, no competing claim in the checked sources, and [SPE-2709](https://linear.app/spectranoir/issue/SPE-2709/persistent-game-settings-access) Done.

## Implementation and acceptance

- `src/app/routes.ts`, `src/app/App.tsx` and `src/app/appShellRoutePaths.ts` register `/main-menu`. The index route continues to load the Operations Desk, and `App` checks the existing campaign recovery condition before routing.
- `src/app/AppShell.tsx`, `src/app/NavigationHistoryControls.tsx` and `src/components/layout/ShellStatusBar.tsx` provide entry from the Operations Desk, keep campaign chrome and history mounted, and suspend their hidden commands on the menu. Campaign Back and Forward skip the menu while preserving router offsets. The menu heading receives focus on entry, and the main region receives focus on return.
- `src/app/MainMenu.tsx` uses the existing `SettingsAccess` and Zustand persistence read APIs. Continue navigates to the Operations Desk when the current persisted snapshot confirms the active campaign. It checks again on activation. The menu leaves unconfirmed data untouched and distinguishes initial unavailability from a failed recheck.
- `src/app/MainMenu.test.tsx` exercises keyboard navigation, shared settings, valid and unconfirmed campaigns, a save changed after menu entry, the Operations Desk round trip, and the existing recovery route. The existing SPE-3427 test-file inventory records this suite. The repository validator selection is owned by SPE-3348.

## Deferred acceptance

The current persistence API can normalize or substitute fields during hydration. Hydration alone does not prove that an on-disk snapshot identifies the live campaign. A cold menu entry stays unavailable when the already-hydrated projection differs from storage. [SPE-3403](https://linear.app/spectranoir/issue/SPE-3403/contradiction-check-cp-core-save-version-compatibility-and-load-policy) owns authoritative corruption, compatibility and storage outcomes.

The existing [parent hold](https://linear.app/spectranoir/issue/SPE-2711/main-menu-and-campaign-entry-navigation#comment-3f97d77a-1c93-41d8-ba06-dea8e0e962e7) remains active. [SPE-3064](https://linear.app/spectranoir/issue/SPE-3064/main-menu-transition-through-deferred-report-and-notice-state) owns the report and notice transition. The rest of SPE-2711 remains open, including broader campaign actions, shared sessions, release information and destructive replacement. The coordinator owns merge release after independent review and CI on the exact PR head.

## Failed Continue focus recovery

Lane A claim `CP-LANE-A-AFTER-5118-27E2` covers predictable focus after a failed Continue recheck on `codex/main-menu-continue-focus`, based on clean named MSI `main` at `27e2b6ed243b39bcfd3d014400d505d4dc33de5c`. SPE-3752 returned ready with zero open or draft PRs. SPE-2711 remains In Progress.

`src/app/MainMenu.tsx` returns focus to the Main Menu heading when a save no longer matches on activation. The existing status message explains the rejection, and the next Tab reaches Settings. `src/app/MainMenu.test.tsx` verifies the keyboard sequence and save preservation. The Chromium smoke in `e2e/cp-smoke.spec.ts` enters from Operations Desk, advances the campaign in a second tab, and checks keyboard focus, the unchanged route, and preservation of the newer save.

## Credits action

[Lane A reservation `CP-LANE-A-AFTER-5146-601489D6`](https://linear.app/spectranoir/issue/SPE-2711#comment-771a2f96-9bc8-40fe-9b90-ffed83d3d428) covers `codex/main-menu-credits` from clean MSI main `601489d6183b0be7ce2200f5076dba0bdf125388`. SPE-3752 returned ready with the separate Agent P hold on #5128.

SPE-2711 requires a working Credits action and predictable focus and return behavior. The compiled baseline opened Main Menu from Operations Desk and focused its heading, but Chromium found no Credits button. `MainMenu` adds a named native dialog with the project attribution in `LICENSE` and the existing modal-dismiss action. The Chromium smoke opens it by keyboard and pointer, verifies dismissal and focus return, checks that the same URL and campaign bytes are preserved, and continues to Operations Desk. SPE-2711 remains In Progress for its other acceptance criteria.
