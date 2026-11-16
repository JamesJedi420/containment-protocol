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

## Complete normal-play recovery — 2026-11-16

This evidence supersedes the incomplete normal-play and unverified automation gates above. Production behavior is unchanged from `691042443d42f7e6c66c5347c94e81e237403a26`; the follow-up adds a repeatable player-control regression and evidence only. Linear remains read-only and both broader issues remain incomplete.

### Campaign-capacity trace and existing owners

At `69104244`, `src/domain/sim/advanceWeek.ts:3899` `spawnFollowUps` limits authored follow-ups to remaining case slots, then `processRaidPressure` at line 4095 invokes `executePressurePipeline` (`src/domain/sim/pressurePipeline.ts:62`) and `applyRaids` (`src/domain/sim/raid.ts:96`), which can add further cases. The final `activeCaseCount > config.maxActiveCases` check at line 4661 intentionally halts the campaign; `src/test/sim.advanceWeek.test.ts` covers that outcome. Neglected opening incidents produced the earlier cascading pressure. That outcome does not establish an energy defect or authorize weakening defeat rules.

Live Linear inspection identifies [SPE-20](https://linear.app/spectranoir/issue/SPE-20) (Escalation, Threat Drift, & Time Pressure; Done) as the existing authored escalation/consequence owner and [SPE-3352](https://linear.app/spectranoir/issue/SPE-3352) (In Progress) as integrated campaign-acceptance owner. SPE-3352 routes verified remediation to subsystem owners. SPE-1630's spawn-overflow boundary is local hostile representation, not campaign case capacity. No owner was reopened and no new scope was created. A repair was unnecessary for this validation: covering the opening incidents with existing squad-builder controls kept the campaign live through both recovery ticks.

### Reproduction through player controls

Use a fresh isolated context, default seed 1337, Forgiving preset, and the existing Active Cap control set to 50. Do not change any other balance control, inject a save, invoke store actions, or bypass game-over.

1. Week 1: create **Stockyard Response** seeded with Mina. Assign it to **Vampire Nest in the Stockyards**, Green Tape to **The Whispering Archive**, and Night Watch to **Eclipse Ritual at the Riverfront**. Queue **Combat Stim Batch**.
2. Week 2: track one copy from the completed fabricated batch. Week 3: reassign Stockyard Response and Green Tape to their opening incidents. Week 4: Ava is idle after Eclipse, reserve **100 → 78 → 56 → 32**; equip the tracked **2/2** copy to Utility 1 and reassign Night Watch to Eclipse.
3. Week 5: reassign Green Tape to Archive; leave the Nest unassigned. Advance through week 7, when the Nest's authored deadline consequence makes it a major incident. Create **Juno Relief** and **Eli Relief**, seeded with Juno and Eli from Green Tape. Assign Eli Relief to Archive. In the Nest incident planner select Green Tape, Juno Relief and Night Watch, provision Medical Supplies, and launch.
4. Week 7: in Equipment, review and confirm Ava's emergency dose. Observe **2/2 → 1/2**, active overdrive and debt **2**; reload. Week 8 expires overdrive, retains debt **2**, and remains live with **9** open cases; reload.
5. Assign Stockyard Response to the first **Missing Persons Spike**. Week 9 reduces debt **2 → 1**, applies exactly **+6 mental exhaustion / +2 combat stress**, and remains live with **17** open cases. Reload and observe the Equipment recovery-debt label and retained **1/2** doses.
6. Reassign Eli Relief to Archive. Week 10 clears the overdrive/debt record, applies the second exact **+6 / +2**, retains **1/2** doses, and remains live with **35** open cases (cap 50). Reload confirms persistence; the recovery-debt label disappears and Advance Week remains enabled. Zero page errors were observed.

`e2e/combat-stim-recovery.spec.ts` reproduces this sequence with real UI controls and read-only saved-state observations. It asserts a live campaign after every advance, dose persistence, expiry, both separate debt ticks, exact downstream mental/combat deltas, and reload continuity. This differs from constructed-state tests, which still separately cover deterministic boundaries, training completion, pre-resolution deployment membership, idle recovery and once-per-week debt.

All five gameplay conditions are satisfied for this bounded interaction: **reachable** by ordinary fabrication/assignment/equipment controls; **connected** to canonical energy, equipment and fatigue; **observable** in Equipment and enabled week advance; **persistent** across activation, expiry and both recovery reloads; **end to end** through a live week-10 campaign. This is not a claim that broader SPE-1107 or SPE-695 acceptance is complete.

### Review and merge safeguards

Read-only inspection of SpectraNoir **Settings → Team → Automations** confirmed **On PR or commit merge → No action**, with no branch-specific rules. Parent/sub-issue auto-close is off. No Linear settings, issues, comments or lifecycle were written. Final-head CI and independent review must cover the regression/evidence commit before merge. No capacity, pressure, escalation, directive, schema, dependency or production UI change belongs to this follow-up.

### Follow-up validation and audit

Node **22.23.4**: the new normal-play regression passed alone (**44.3 seconds**) and again inside the complete browser run (**54.1 seconds**). Literal `npm run build`, required lint/backlog-handoff selected for the three follow-up paths, all-PR touched-file Prettier and `git diff --check` passed. The prior base-selected **1,055 files / 11,534 tests** and **125 targeted tests** remain applicable to unchanged production/test-repair inputs; final-head hosted checks must refresh that evidence. Repository-wide formatting remains advisory (**3,546 files** at this capture); unrelated formatting was withheld.

The complete local browser attempt used port 5189 to isolate checkout provenance. Four pre-existing comparison tests hard-code 5173 and returned `ERR_CONNECTION_REFUSED`; that port was free. A server from this exact worktree was then started on 5173 for a focused rerun, without modifying those tests or the harness. Final browser/CI results belong in PR #5042's current validation record; an environment failure is not a pass.

Six direct passes checked the full base diff: bounded integration and existing consumers; absent/terminal agents and fixture compatibility; seeded control-only state and reload continuity; real weekly training/deployment/idle and Stim consumers; current owner/slice/backlog consistency; and cleanup. No blocking finding remained in the inspected diff. Hermes follow-up checkpoints: **direct — delegation overhead exceeds evidence volume** for this regression/evidence delta and PR text; the earlier rejected Hermes report is not reused as approval. External research, dependency selection and frontend implementation guidance are not applicable. Final-head independent review and CI remain separate merge gates.
