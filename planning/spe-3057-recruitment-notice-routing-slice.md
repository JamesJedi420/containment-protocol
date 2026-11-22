# SPE-3057 recruitment notice contextual routing

- Issue [SPE-3057](https://linear.app/spectranoir/issue/SPE-3057/recruitment-notice-contextual-routing), under [SPE-107](https://linear.app/spectranoir/issue/SPE-107/recruitment-markets-contract-quality-and-impressment-fallout)
- Executor Codex on MSI, branch `codex/recruitment-notice-routing`, based on `28a8d83822fe74a0363fc2f53b0b2e1c9e195608`

An initiated, refined, or confirmed scouting notice uses the candidate ID already carried by the event. Its Recruitment URL applies a candidate filter to the live board. The ID must match a candidate in the current board results who is still available and within their expiry week. The notice can open a confirmed candidate for inspection. The existing scouting and hiring controls continue to enforce their own eligibility.

Changing a board filter retains the target while the candidate still matches. Clearing the candidate filter retains the other board filters. A missing, expired, unavailable, or excluded candidate falls back to the ordinary board with any valid URL filters. Removing the stale target replaces the current URL so Back still returns to the prior view. Departure notices retain their general Recruitment link.

The route uses the existing player-visible notice, board projection, and candidate controls. The URL carries only the candidate ID. Scouting and campaign persistence continue through their existing owners. [SPE-3130](https://linear.app/spectranoir/issue/SPE-3130/recruitment-board-query-state-persistence) owns future preference restore and explicit-route precedence.
