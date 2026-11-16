# SPE-1107 weekly responder-energy integration

| Field      | Value         |
| ---------- | ------------- |
| **Status** | **In Review** |

**Owner:** [SPE-1107](https://linear.app/spectranoir/issue/SPE-1107/responder-exertion-and-energy-budget-model). This bounded repair supports the existing Combat Stim integration in SPE-695; it does not complete either issue's broader acceptance. Base: `9dd13af82cf8a15e5778cea4817666d06d17577d`.

The live weekly loop applies legacy fatigue without calling the older responder-energy pipeline. Apply the existing duty costs once during the live fatigue pass: deployed responders use prolonged field operation, training responders use patrol, and idle responders pay upkeep and receive the existing recovery. Use the pre-resolution team membership for the duty tick, and hand overdraw to the existing fatigue channels. Do not invoke the older full fatigue pipeline or duplicate Combat Stim expiry and recovery-debt ticks.

Validate actual week-close training, deployment and idle accounting, deterministic replay, save/load, overdraw and Combat Stim expiry/debt. Normal gameplay must separately demonstrate fabrication, equip, eligible activation, dose use, persistence and recovery debt; constructed-state tests are not a substitute for that observation. Preserve the existing action, injury, equipment and recovery owners. Non-locomotion costing and the remaining SPE-1107 acceptance stay open.

## Evidence and remaining gates

- At the local change on base `9dd13af8`, a headless player session used the Forgiving preset and in-game configuration controls, fabricated and equipped a Combat Stim, deployed a responder until depleted, and activated it on an eligible operation. The visible dose fell from 2/2 to 1/2; the activation survived reload and expired at the next week close. The following normal week reduced recovery debt from 2 to 1 and changed fatigue channels. The campaign then exceeded its active-case cap; the second debt tick was not observed in normal gameplay.
- The targeted constructed-state week-close test covers the second debt tick and its save/load continuity. It does not close the remaining normal-gameplay evidence gap.
- Node 22 literal `npm run build` reports 27 TypeScript diagnostics in six unchanged test files, identical to a fresh clean-base build. The required Vite bundle passed separately; neither result is a clean literal build claim. Independent review and exact-head CI remain required.

## PR #5042 resolution attempt — 2026-11-16

Receiving actor: Codex/Cursor within the existing weekly-energy slice. PR head before these repairs: `6f634f73f999612923bff2e9714789f21e1dec36`; base remains `9dd13af82cf8a15e5778cea4817666d06d17577d`. The user explicitly authorized narrow test/fixture build repairs in this PR and prohibited Linear writes. Live Linear was read as **In Review**; this mirror does not change its lifecycle.

- Corrected 26 failure-only property accesses using 25 explicit unsuccessful-result guards in five contract suites. Supplied the required empty `environmentalConditions` array in the canonical procedure fixture while preserving its input compatibility. Assertions and production contracts remain unchanged. Literal `npm run build` now passes with Node 22.23.4, superseding the red-build gate above.
- A fresh seed-1337 campaign used the Forgiving preset and the existing Active Cap control set to 50. Green Tape covered The Whispering Archive; Night Watch covered Eclipse Ritual at the Riverfront. A Combat Stim Batch was queued at week 1, completed at week 2, and tracked with its fabricated provenance. Three deployed ticks reduced Ava's reserve 100 → 78 → 56 → 32. At week 4, after her assignment ended, the stored 2/2 copy was equipped in Utility 1. Assigning her to False Memories Cluster made the existing emergency-dose action eligible; confirming it consumed one dose. The 1/2 dose state and active overdrive survived reload. Week 5 expired overdrive with debt 2. Two Missing Persons Spike interventions were assigned before the next advance; week 6 reduced debt to 1 and applied physical/mental fatigue, but open cases grew 34 → 53 against the cap of 50. The campaign halted with `Active case capacity exceeded. Directorate overwhelmed.` Reload preserved the halt, debt 1, and 1/2 doses; Advance Week was disabled.
- Reachable, connected, observable, and activation/first-debt persistence evidence is observed normal play. The complete second recovery tick remains **unverified through normal play**; the existing constructed-state test is separate evidence. The halt is an observed campaign outcome, not proof of an energy defect or authority to alter case pressure. Escalation owner SPE-20 was inspected, but ownership of a necessary repair is unverified; no issue, gameplay change, or Linear mutation was made.
- Keep PR #5042 draft. Full-slice gameplay acceptance is incomplete; do not mark SPE-1107 or SPE-695 Done. Final-head independent review and CI must be refreshed after the build repairs. Safe merge automation remains unverified because merge is withheld.

### Validation and pre-ship audit

- Node 22.23.4: the nine targeted suites passed **125 tests**; the full four-worker suite passed **1,055 files / 11,534 tests**. The requirement-selected run against `9dd13af8` exited 0: required backlog-handoff, lint, unit tests, and production bundle passed; all **51 Playwright tests** passed. Literal `npm run build`, touched-file Prettier, and `git diff --check` passed.
- The first advisory compiler census rejected a checkout change during capture even though both compiler passes were clean. Repeating it on a stable checkout exited 0 with **zero diagnostics in both runs**. Repository-wide format checking remains an advisory failure (3,549 files); unrelated formatting was withheld.
- Six direct passes checked scope/integration, edge cases, deterministic state, regressions, documentation, and cleanup. No production change was added during this repair; the gameplay evidence gap remains a merge blocker. Dependency, frontend-guidance, and external-research checkpoints are not applicable to these test/fixture repairs.
- Hermes checkpoint session `local-2c70842360f7d12ed460d7143548b9778c3b14c2fff5c956147e634d7b507476` used configured local Qwen3.5 9B and exited 1. Its report mixed historical and current status/build/count claims; those claims were rejected. Bounded direct fallback verified the working diff, current Linear read, successful build/census logs, backlog consistency, and normal-play halt evidence. No retry or provider change was made.

Next legal action: establish an uninterrupted normal-player recovery sequence within this boundary, or obtain separate authorization for an evidence-backed prerequisite if one is actually necessary. Do not bypass game-over, inject saves, widen capacity, or change escalation rules to manufacture acceptance. SPE-1749 remains behind the open-PR gate.
