# SPE-3131 — Shared personnel roster query

[SPE-3131](https://linear.app/spectranoir/issue/SPE-3131) is the first implementation slice under [SPE-3129](https://linear.app/spectranoir/issue/SPE-3129). Base `e4153220f4975f6acbd2b62fd167ecb0ea81f620`.

`projectAgentQueryRecord` reads the existing Agents projection once per roster update. It indexes the displayed identity, role, status, assignment, team name and tags, agent domain tags, trait labels, training name, callsign, and codename. The shared evaluator matches the selected role, status, team, fatigue, and training facets against those records and returns ordered IDs. Screens can request individual facet values. The default preserves roster order, with agent ID breaking exact ties, and callers can request one or two explicit sort keys with an ID tie-breaker.

The Agents URL codec retains the existing parameters, defaults, and unrelated keys. The input keeps spaces during edits so players can type a full name while the URL stores the normalized query. The selected operative stays inspectable when a filter removes their row. Roster evaluation derives its results from the current projection. Assignment, recruitment-board adoption, and compatibility remain with their existing owners.

Focused validation covers rendered filters and selection, URL fallback, the searchable-field allowlist, combined filters, stable ordering, and a 1,000-record query.
