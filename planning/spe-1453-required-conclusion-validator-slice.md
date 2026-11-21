# SPE-1453 — Required conclusion validator (slice 1)

| Field      | Value                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| **Status** | **In Progress** (draft)                                                                        |
| **Linear** | [SPE-1453](https://linear.app/spectranoir/issue/SPE-1453/required-conclusion-validator)       |
| **Parent** | none (standalone tooling slice)                                                                |
| **Branch** | `grok/spe-1453-required-conclusion-validator`                                                  |
| **Base**   | `03a504e021d5d3bac5807f98cca96186c37b8bd3`                                                     |

## Boundary and plan

Add a pure deterministic validator for required conclusions. It consumes caller-owned conclusion records and clue paths, counts independent paths by unique `underlyingSourceId`, and returns frozen validation results with sufficiency and warnings for insufficient paths, false independence, and single-clue bottlenecks. It does not mutate inputs, evaluate runtime knowledge/access, assert conclusion truth, or own clue storage.

## Deferred

| Item                          | Owner    | Boundary                                      |
| ----------------------------- | -------- | --------------------------------------------- |
| Runtime knowledge consumption | SPE-58   | Validator remains authoring-time only.        |
| Clue artifact ownership       | existing | Paths are caller-owned references.            |
| Full authoring UI integration | SPE-1453 | Linear remains open for broader integration.  |

## Validation

- `npm run test:run -- src/test/requiredConclusionValidator.test.ts`
- `npm run lint`
- Prettier on changed files
- `git diff --check`
