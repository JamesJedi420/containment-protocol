# SPE-3130 recruitment board preferences

[SPE-3130](https://linear.app/spectranoir/issue/SPE-3130/recruitment-board-query-state-persistence) owns this presentation slice. SPE-107 retains recruitment simulation authority. SPE-3137 owns shared personnel-query adoption on the board.

The browser stores the compact `RecruitmentListFilters` query under `containment-protocol-recruitment-list-v1`. An ordinary board visit restores the saved search, category, sort and expiring-soon control values. The board applies the same bounded query and enum normalization it uses for direct links. A missing, unusable or inaccessible value falls back to defaults.

Explicit board links use their own normalized filters. A candidate link opens its live context even when saved preferences would exclude that candidate. Navigation and URL normalization leave browser preferences alone. Queryless board entries snapshot their effective filters in router history state, so Back restores the earlier board even after a candidate view changes saved preferences. If an explicit entry normalizes to an empty query, router history state preserves that entry's default filters. Clearing a candidate keeps the current board filters. Consecutive edits accumulate for the same history entry until the router renders the latest edit, even if it renders earlier replacements first. Editing a board filter saves the resulting settings, and Reset filters clears saved preferences and the candidate target.

`RecruitmentPage.test.tsx` covers interleaved router replacements, preference restoration, reset, contextual precedence, invalid inputs and campaign-state isolation. The Chromium smoke in `e2e/cp-smoke.spec.ts` exercises normal navigation, reload and keyboard reset at a narrow viewport.

The restoration status is mounted before its text is updated. The automated DOM test verifies that mutation and live-region attributes; actual screen-reader announcements have not been manually verified.
