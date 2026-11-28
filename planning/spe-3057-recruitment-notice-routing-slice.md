# SPE-3057 recruitment notice contextual routing

- Issue [SPE-3057](https://linear.app/spectranoir/issue/SPE-3057/recruitment-notice-contextual-routing), under [SPE-107](https://linear.app/spectranoir/issue/SPE-107/recruitment-markets-contract-quality-and-impressment-fallout)
- Executor Codex on MSI, branch `codex/recruitment-notice-routing`, based on `28a8d83822fe74a0363fc2f53b0b2e1c9e195608`

An initiated, refined, or confirmed scouting notice uses the candidate ID already carried by the event. Its Recruitment URL applies a candidate filter to the live board. The ID must match a candidate in the current board results who is still available and within their expiry week. The notice can open a confirmed candidate for inspection. The existing scouting and hiring controls continue to enforce their own eligibility.

Changing a board filter retains the target while the candidate still matches. Clearing the candidate filter retains the other board filters. A missing, expired, unavailable, or excluded candidate falls back to the ordinary board with any valid URL filters. Removing the stale target replaces the current URL so Back still returns to the prior view. Departure notices retain their general Recruitment link.

The route uses the existing player-visible notice, board projection, and candidate controls. The URL carries only the candidate ID. Scouting and campaign persistence continue through their existing owners. [SPE-3130](https://linear.app/spectranoir/issue/SPE-3130/recruitment-board-query-state-persistence) owns future preference restore and explicit-route precedence.

## Scouting notice smoke repair

Lane A claim `CP-SHIP-1125-POST5115` assigns Codex the smoke repair on `codex/scouting-notice-smoke-row` from named MSI main `2d2b1d5204fa14ad1394050dcc8763600b1fde04`. The SPE-3752 preflight returned ready with zero open or draft PRs. [SPE-2248](https://linear.app/spectranoir/issue/SPE-2248) is Done, and [PR #5076](https://github.com/JamesJedi420/containment-protocol/pull/5076) established the existing route.

[PR #5116](https://github.com/JamesJedi420/containment-protocol/pull/5116) opened later and covers a Cases test under SPE-1245. Its [release coordinator hold](https://linear.app/spectranoir/issue/SPE-1245#comment-396c3a68-add6-4429-b265-9e2f48193521) was verified against live GitHub. The refreshed SPE-3752 preflight returned ready for this independent repair with the hold in place.

In [main Playwright](https://github.com/JamesJedi420/containment-protocol/actions/runs/45711637041/job/139547256450), the test waited for Rowan Bennett’s notice, while the failure snapshot recorded a successful scout and a candidate link for Avery Hale. The Playwright retry passed in 5.4 seconds within the same workflow attempt. `e2e/cp-smoke.spec.ts` now reads the candidate name from the rendered Scout button’s row and clicks that same button, even if sorting moves it or another row has the same name. The smoke still sorts the live board, scouts on a narrow viewport, activates the matching notice with Enter, checks focus and the single matching candidate, and verifies Back restores the original sorted board. SPE-3348 selects validation. The repair is limited to the smoke and this evidence note.

## Focus after hiring from a notice

[Lane A reservation](https://linear.app/spectranoir/issue/SPE-3057#comment-c070a2af-c595-418b-b1bb-01765db28bab) covers the Recruitment page, its component test, the existing browser scenario and this record on `codex/recruitment-notice-hire-focus`, based on clean MSI main `f9fc1f7922cf38b120c74cc18f2aa27e750d4c97`. SPE-3752 returned ready with the independent #5128 owner hold.

Hiring from the notice removes the candidate and its focused Hire button. The page returns focus to the Candidate board heading when that action consumes the live target. Existing URL normalization restores the board, and Back retains the previous filters. The focus handoff requires a successful hire from the notice. The regression uses the existing scouting and hiring actions and checks the resulting board, focus and history by keyboard. The component test reproduced focus returning to the document body on the base. SPE-3057 remains In Progress and the parent SPE-107 retains its existing scope. Acceptance mapping and documentation review are direct because the evidence is small.

## Focus when reopening an unavailable scouting candidate

[Lane A reservation `CP-LANE-A-AFTER-5145-688196E5`](https://linear.app/spectranoir/issue/SPE-3057#comment-70570907-53fb-42ef-a5ac-c08b6ba6d4ef) covers `RecruitmentPage.tsx`, `e2e/cp-smoke.spec.ts` and this record on `codex/scouting-notice-fallback-focus` from clean MSI main `688196e5eefcdbd5ce9beb309cb5c9b4b1864b93`. SPE-3752 returned ready with the independent Agent P hold on #5128.

Activating a historical scouting notice for a candidate who is no longer available focuses the existing Candidate board heading. The existing fallback removes the stale candidate from the URL and restores the ordinary board. The Chromium smoke scouts and hires through the player UI, returns to the sorted board, reopens the same notice with Enter, and checks the fallback heading, candidate list and Back destination. On the compiled base it reached the ordinary board and failed at the heading-focus assertion. This slice covers explicit notice navigation and keeps the existing candidate resolution and filter behavior.
