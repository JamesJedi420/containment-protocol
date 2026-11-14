# SPE-2158 — Incidental witness promotion and suspicion registry (slice 1)

Approved schema-only boundary: witness actor references, promotion state, detection channel, suspicion band and delayed action references. Authored fixtures are not live campaign state. Existing witness/case actor authority remains SPE-902; no NPC persistence, suspicion engine, confrontation or action execution is added here.

Validation rejects malformed identifiers, enum values, duplicate canonical record IDs and malformed delayed references. Optional delayed step counts must be nonnegative safe integers; omission is preserved. Normalization parses each record once, returns null on invalid registries, and returns sorted frozen copies of valid records and their delayed metadata. The test completeness inventory includes the new test file.

Shipping verification covers malformed and duplicate cases separately, canonical normalization, ordering, input preservation and frozen copies. Gameplay reachability, player observability and save/load are outside this explicitly bounded schema slice; no gameplay-use claim follows from its tests.
