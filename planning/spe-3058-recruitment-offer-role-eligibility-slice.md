# SPE-3058 operative offer role eligibility

[SPE-3058](https://linear.app/spectranoir/issue/SPE-3058) owns operative offer eligibility within [SPE-107](https://linear.app/spectranoir/issue/SPE-107). Codex implements the first live slice on `codex/recruitment-offer-role-eligibility` from `b722f9371ce6ef83cc1192d960e2f211df87ae1a`.

The board projects the existing `getCandidateHireRole` result for operative offers. Its Hire action carries the displayed role to `hireCandidate`, where `previewCandidate` rechecks it against the current candidate and existing recruitment policy. An obsolete role rejects the offer before funding, roster, events, or candidate-pool changes. Policy or role eligibility leaves the discovery rules intact.

Acceptance for this slice is a current matching offer that hires, an obsolete offer that preserves the visible candidate and leaves funds, personnel, and hiring events intact, and an interacting faction-policy rejection after the role matches. Existing staff and instructor hires continue through their current role contracts. Additional capability, qualification, and clearance gates require canonical offer inputs outside this slice. SPE-2222 governs assessment channels and SPE-3719 governs their live adoption. Full SPE-3058 acceptance remains open.
