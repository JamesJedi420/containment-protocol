# SPE-3131 — Shared personnel roster query

[SPE-3131](https://linear.app/spectranoir/issue/SPE-3131) is the first implementation slice under [SPE-3129](https://linear.app/spectranoir/issue/SPE-3129). Base `e4153220f4975f6acbd2b62fd167ecb0ea81f620`.

`projectAgentQueryRecord` reads the existing Agents projection once per roster update. It indexes the displayed identity, role, status, assignment, team name and tags, agent domain tags, trait labels, training name, callsign, and codename. The shared evaluator matches the selected role, status, team, fatigue, and training facets against those records and returns ordered IDs. Screens can request individual facet values. The default preserves roster order, with agent ID breaking exact ties, and callers can request one or two explicit sort keys with an ID tie-breaker.

The Agents URL codec retains the existing parameters, defaults, and unrelated keys. The input keeps spaces during edits so players can type a full name while the URL stores the normalized query. The selected operative stays inspectable when a filter removes their row. Roster evaluation derives its results from the current projection. Assignment, recruitment-board adoption, and compatibility remain with their existing owners.

Focused validation covers rendered filters and selection, URL fallback, the searchable-field allowlist, combined filters, stable ordering, and a 1,000-record query.

## SPE-3137 recruitment board adoption

[SPE-3137](https://linear.app/spectranoir/issue/SPE-3137) adds a recruitment adapter in `src/features/recruitment/recruitmentView.ts` from base `78b7be15dda2b4a736e37c1c31e104e930cb9ff1`. The adapter passes the shared evaluator displayed names and an explicit search list of visible category, role or specialty, source, impression, outlook, and rumor text. Searches match visible label parts with either a space or a spaced slash. The board applies its category and expiry filters before the shared query. Recruitment preferences still use the `RecruitmentListFilters` contract.

The shared evaluator orders names and breaks equal-name ties by candidate identity. Recruitment uses that order to break ties after comparing displayed wage, expiry, or revealed fit. Best fit compares revealed fit first and expiry second. Expiry first compares expiry first and revealed fit second. Missing or non-finite values sort after known values for the same key. Obscured fit, unlisted traits, and internal relationship or offer data are excluded from query ordering and matching.
