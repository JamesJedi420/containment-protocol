# SPE-2827 — Generic Ordinary-Equipment Instance Authority

| Field      | Value                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **Status** | **Done**                                                                                                |
| **Linear** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority) |
| **Scope**  | Durable identity and lifecycle authority for ordinary equipment copies                                  |

Parent AC scored in `planning/spe-2827-parent-reconciliation-slice.md` against shipped children
SPE-2828–SPE-2859. SPE-2827-owned rows **Yes**. Residual **none this program still owns**.

## Ownership reconciliation

SPE-98 remains the completed runtime-item precedent and is not reopened. SPE-462 owns taxonomy,
SPE-1658 owns readiness/access, SPE-877 owns maintenance and integrity, SPE-1027 owns facility
stock and replenishment, and SPE-1766 owns artifact-specific approval and depletion. SPE-1055,
SPE-2800, and later recovery work consume instance authority but do not own generic identity.

The parent owned stable ordinary-equipment instance identity, authoritative location, validated
mutable state, persistence, and the lifecycle integration program. That program shipped as
SPE-2828–SPE-2859. Compact condition and payload fields do not complete SPE-1658 or SPE-877.

## Child sequence (shipped)

1. SPE-2828 — optional registry, persistence, and loadout-assignment foundation. **Done.**
2. SPE-2829 — Combat Stim exact two-dose activation and durable consumption events. **Done.**
3. SPE-1027 stock-provider replenishment — **adjacent** (SPE-1027 owns facility stock). Not a
   remaining SPE-2827 child.
4. Loss, destruction, re-aggregation, lot-return, and instance-aware recovery selection shipped
   as SPE-2840–SPE-2857. SPE-2858 confirms resignation does not destroy equipped copies.
   SPE-2859 confirms non-mission death does not either; SPE-2830 terminal-carrier recovery
   remains for those residual carriers. Repair/mutation stations remain SPE-877. Broader salvage
   economics remain SPE-1055 / SPE-2749.

## Remaining / deferred

**Remaining SPE-2827-owned children:** none.

| Item | Owner | Why |
| --- | --- | --- |
| SPE-2858 resignation recovery remains | **Done** | Not a destroy trigger |
| SPE-2859 non-mission death recovery remains | **Done** | Not a destroy trigger |
| Facility stock-provider / refill | SPE-1027 | Adjacent replenishment authority |
| Integrity labor / mutation stations | SPE-877 | SPE-2851 shipped stored condition flip under SPE-877 |
| Broader salvage / Auto-Scrap instance routing | SPE-1055 / SPE-2749 | Beyond ID-only / 0/2 instance selection |
| Ready versus stowed | SPE-1658 | Access-state layer |
| Destroy-on-resignation or destroy-on-non-mission-death | do not author | Would reverse SPE-2858 / SPE-2859 |
| SPE-2847 | do not pick | Out of SPE-2827 remaining sequence |
