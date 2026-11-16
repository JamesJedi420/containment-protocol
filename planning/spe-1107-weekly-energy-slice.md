# SPE-1107 weekly responder-energy integration

| Field      | Value           |
| ---------- | --------------- |
| **Status** | **In Progress** |

**Owner:** [SPE-1107](https://linear.app/spectranoir/issue/SPE-1107/responder-exertion-and-energy-budget-model). This bounded repair supports the existing Combat Stim integration in SPE-695; it does not complete either issue's broader acceptance. Base: `9dd13af82cf8a15e5778cea4817666d06d17577d`.

The live weekly loop applies legacy fatigue without calling the older responder-energy pipeline. Apply the existing duty costs once during the live fatigue pass: deployed responders use prolonged field operation, training responders use patrol, and idle responders pay upkeep and receive the existing recovery. Use the pre-resolution team membership for the duty tick, and hand overdraw to the existing fatigue channels. Do not invoke the older full fatigue pipeline or duplicate Combat Stim expiry and recovery-debt ticks.

Validate actual week-close training, deployment and idle accounting, deterministic replay, save/load, overdraw and Combat Stim expiry/debt. Normal gameplay must separately demonstrate fabrication, equip, eligible activation, dose use, persistence and recovery debt; constructed-state tests are not a substitute for that observation. Preserve the existing action, injury, equipment and recovery owners. Non-locomotion costing and the remaining SPE-1107 acceptance stay open.

## Evidence and remaining gates

- At the local change on base `9dd13af8`, a headless player session used the Forgiving preset and in-game configuration controls, fabricated and equipped a Combat Stim, deployed a responder until depleted, and activated it on an eligible operation. The visible dose fell from 2/2 to 1/2; the activation survived reload and expired at the next week close. The following normal week reduced recovery debt from 2 to 1 and changed fatigue channels. The campaign then exceeded its active-case cap; the second debt tick was not observed in normal gameplay.
- The targeted constructed-state week-close test covers the second debt tick and its save/load continuity. It does not close the remaining normal-gameplay evidence gap.
- Node 22 literal `npm run build` reports 27 TypeScript diagnostics in six unchanged test files, identical to a fresh clean-base build. The required Vite bundle passed separately; neither result is a clean literal build claim. Independent review and exact-head CI remain required.
