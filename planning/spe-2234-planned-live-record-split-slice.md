# SPE-2234 — planned and live record split

[SPE-2234](https://linear.app/spectranoir/issue/SPE-2234/planned-build-versus-live-staff-record-split-slice-1) is a schema-only slice under SPE-1443. It validates a planned build reference, an optional live record reference, and supplied promotion-gate evidence. A caller supplies the required gate kinds; this contract does not establish institutional policy or verify the truth of evidence.

An unready plan remains representable with deterministic missing and unmet reasons. A live reference is rejected when its required gate evidence is absent or unmet. Invalid, duplicate, or unknown gates and an absent or empty policy fail closed. The projected record is copied into stable gate order. The helper does not create a live record, perform promotion, persist state, or implement training, clearance, equipment, or validation workflows. Those remain with their existing owners.

Targeted tests cover linked records, missing and unmet gates, caller-selected policies, malformed data, stable ordering, and defensive copying. This is an authoring/validation contract; it does not establish gameplay reachability or prove live promotion.
