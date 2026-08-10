# SPE-2748 — Equipment-Grade Deconstruction and Recovery Integration

| Field       | Value                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| **Status**  | **Shipped**                                                                                                       |
| **Linear**  | [SPE-2748](https://linear.app/spectranoir/issue/SPE-2748/equipment-grade-deconstruction-and-recovery-integration) |
| **Parent**  | [SPE-1055](https://linear.app/spectranoir/issue/SPE-1055/equipment-deconstruction-recovery-and-disposal)          |
| **Program** | [SPE-2746](https://linear.app/spectranoir/issue/SPE-2746/canonical-equipment-grade-taxonomy)                      |
| **Branch**  | `jamesdyedbq/spe-2748-equipment-grade-deconstruction-and-recovery-integration`                                    |

## Implemented boundary

This slice adds deterministic grade-aware recovery for supported catalog equipment without
changing equipment stats, rarity, condition, aggregate inventory semantics, or fabrication lots.
Seven craftable equipment definitions are eligible; every other current catalog definition is
explicitly deferred rather than silently receiving a fallback rule.

The two supported paths are:

- `component_reclamation`, whose authored yield thresholds may add material at higher grades;
- `ritual_disassembly`, whose handling thresholds extend careful processing without increasing
  recovered material.

This proves that grade can affect the appropriate recovery axis without becoming a universal
value or quantity multiplier.

## Resolution contract

Recovery rules consume canonical equipment-grade participation and the existing hidden-safe
projection contract. Strict validation rejects unknown rule kinds, grade IDs, paths, material IDs,
reversed thresholds, unexpected fields, malformed quantities, and incompatible grade
participation. Stable explanation and restriction codes drive both UI and tests.

Hidden Grade I and hidden Grade V resolve to exactly the same unavailable projection and expose
no grade identifier, rank, label, or grade-specific localization key. Damage contributes an
independent waste adjustment; it never changes or infers grade.

## Queue, completion, and persistence

Queueing snapshots the item, path, known canonical source grade, source condition, materials,
waste, duration, and explanation codes. The command atomically removes one aggregate inventory
unit, clears the item from the damaged-equipment recovery queue, and appends the recovery job.
Later catalog or rule edits cannot change that snapshot.

Week close completes mature jobs by crediting materials and writing one immutable recovery receipt
keyed by queue ID. An exactly matching receipt makes replay a no-op; a conflicting receipt fails
closed while retaining the live job. Start and completion events carry canonical source-grade and
recovery provenance.

`GameState.equipmentDeconstructionQueue` and `GameState.equipmentRecoveryOutcomes` are optional.
Legacy omission hydrates to an empty queue and registry. Malformed queue entries and receipts are
dropped independently, safe IDs remain unique across live and completed work, and future receipts
are rejected. `inventory` remains the stock authority. `GAME_STORE_VERSION` and
`GAME_SAVE_VERSION` remain unchanged.

SPE-2800 subsequently added explicit manual catalog/fabricated-lot source selection. Outstanding
lot units remain protected until selected, and their canonical grade/provenance is snapshotted
without mutating the fabrication receipt.

## Live assignments

| Equipment         | Path                  | Grade behavior     |
| ----------------- | --------------------- | ------------------ |
| Silver Rounds     | component reclamation | yield threshold    |
| Medkits           | component reclamation | yield threshold    |
| Signal Jammers    | component reclamation | yield threshold    |
| EMF Sensors       | component reclamation | yield threshold    |
| Ward Seals        | ritual disassembly    | handling threshold |
| Warding Kits      | ritual disassembly    | handling threshold |
| Ritual Components | ritual disassembly    | handling threshold |

## Deferred

| Item                                                         | Owner    | Boundary                                                           |
| ------------------------------------------------------------ | -------- | ------------------------------------------------------------------ |
| Evidence custody, contamination, relic, and specialist rules | SPE-1055 | Require explicit systems rather than grade inference               |
| Processed-material quality and batch semantics               | SPE-1056 | Recovered aggregate quantities do not author material grade        |
| Automated fabricated-lot selection                           | SPE-2749 | Manual selection shipped in SPE-2800; automation stays fail-closed |
| Grade-threshold Auto-Scrap routing                           | SPE-2749 | Must preserve hidden-grade opacity and explicit selection          |
| Remaining catalog recovery profiles                          | SPE-1055 | Explicitly deferred in the exhaustive registry                     |
