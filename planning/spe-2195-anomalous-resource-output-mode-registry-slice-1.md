# SPE-2195 — Anomalous resource-output mode registry (slice 1)

| | |
| --- | --- |
| **Status** | **Recently shipped** (draft PR pending) |
| **Linear** | [SPE-2195](https://linear.app/spectranoir/issue/SPE-2195) |
| **Parent** | [SPE-177](https://linear.app/spectranoir/issue/SPE-177) |
| **Branch** | `grok/spe-2195-anomalous-resource-output-mode-registry` |

Bounded artifact-side output definition registry. No inventory, allocation, or resource mutation.

## Acceptance boundary

- `outputMode`, `flowRate`, `commandInterface`, `hazardBand`, canonical resource reference, and deterministic occurrence identity.
- Validation fail-closed on malformed/unknown/unmapped values.
- Normalization produces deterministic ordered output.
- Targeted tests cover legal, malformed, unknown refs, duplicates, and stability.

## Exclusions

No GameState, persistence, UI, or downstream resource admission logic. Economy integration remains SPE-1189.
