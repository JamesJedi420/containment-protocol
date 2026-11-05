# Mission escalation save compatibility — SPE-3730

- Owner: [SPE-3730](https://linear.app/spectranoir/issue/SPE-3730/fail-closed-on-missing-active-mission-escalation-rules-in-saves)
- Decision: [SPE-3403](https://linear.app/spectranoir/issue/SPE-3403/contradiction-check-cp-core-save-version-compatibility-and-load-policy); escalation owner: SPE-20; acceptance evidence: SPE-3352.
- Base: `a16bddb398568b00c8bcd5f2513c52bc62306ad2`; branch: `codex/escalation-save-compat`.

Reject a saved active case whose unresolved escalation increment is missing or invalid. Historical authored rule provenance is unavailable; neither zero nor the current template is a reliable substitute. Preserve explicit saved zero and resolved-case history. Validate manual save/run import and automatic local hydration before accepting the state. Failed manual imports preserve the current campaign; failed automatic loads retain and guard the source save and explain recovery. This decision does not settle general save compatibility or invent a migration.

The Playwright path starts a normal campaign, lets a mission spawn, tries an incomplete copy through the player-facing import controls, verifies that the current campaign remains intact, then imports the valid copy and observes the mission worsen, affect resources and standing, and persist across another week and reload. It also tests automatic hydration of current and older envelopes, the accessible recovery disclosure, attempted writes to the preserved save, and restoring a valid run after retaining a separate copy of the original. Focused Vitest checks cover invalid increments, explicit zero, resolved cases, and both import formats.

## Owner correction

The mandatory increment assumption above was superseded on 2026-11-05. Omitted increments and explicit zero are legitimate. SPE-3730 is reopened to correct rejection of optional rules and verify a constructed no-escalation/no-follow-up case through import, gameplay and reload. Reject only explicitly malformed increments. Consequences for each outcome must follow mission context; do not force follow-up missions.
