# SPE-3522 — Weekly report mission-result hydration

**Owner:** SPE-3522. **Base:** `df9aed580eda1580fb1921db30e91a507f48dd1d`.

Preserve existing `detectionConfidence`, `counterDetection`, and `displacementTarget` fields when hydrating a weekly report's mission-result snapshot. The Milestone 2 browser investigation observed the first two fields in persisted storage and before reload, but not in the report after reload. A non-null displacement target was not observed in that scenario and is covered by targeted hydration tests.

Finite confidence is clamped to the unit interval; booleans, including `false`, and nonempty target IDs or explicit `null` are preserved. Malformed or absent fields remain absent. Historical report snapshots do not inherit values from the current live case. Existing snapshot identity, outcome, and status rules remain unchanged. No new save shape or migration policy is introduced.

SPE-3352 retains release-acceptance ownership and remains open. SPE-1245 records validation findings; completed SPE-2607 and SPE-70 remain closed. This slice does not restore values already discarded from persisted history.

Validation: focused hydration regression and existing `runTransfer` tests; repository requirement selection and lint; the existing connected Milestone 2 browser scenario against the repaired build. Record actual command results in the PR and Linear.
