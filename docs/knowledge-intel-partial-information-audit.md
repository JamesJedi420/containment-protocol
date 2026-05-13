# Knowledge, Intel, & Partial Information Layer — Design Audit

## 1. Knowledge/Intel Categories

- **Mission Intel:** Case facts, threat details, containment requirements, environmental hazards, adversary profiles.

- **Agent/Team Knowledge:** Skills, certifications, prior mission experience, psychological state, fatigue, and readiness.

- **Facility Intel:** Layout, security, vulnerabilities, operational status, and resource inventories.

- **Adversary Intel:** Capabilities, tactics, weaknesses, and unknowns.

- **Operational Uncertainty:** Fog-of-war, misinformation, partial observations, and degraded signals.

- **Research/Discovery:** Unlockable knowledge, experimental findings, and emergent facts.

## 2. Canonical intel vs routed subsystems (SPE-22)

**SPE-22 owns the core knowledge / intel state** — distortion, confidence masking, partial truth, faction-filtered visibility, and save-load canonical fields for what the agency institutionally “knows.”

**Do not collapse these into one blob.** Maintain explicit routing boundaries:

| Concern | Owner issue | Responsibility |
| --- | --- | --- |
| Canonical intel state, confidence decay, institutional memory | SPE-22 | Ground truth for missions, routing, and reports |
| Clue artifacts, rumor packets, physical carriers | SPE-127 | Propagation mechanics separate from baseline intel tables; see `architecture/clue-artifacts-rumor-packets.md` |
| Pre-mission query budgets, briefing intel caps | SPE-112 | Limits on what planning UI may pull before deploy; see `architecture/pre-mission-query-budgets-briefing-intel.md` |
| Psychometric residue, object-history scans | SPE-631 | Bounded reads that may not back-write canonical intel blindly |
| Memory-erasure hazards, graded impairment | SPE-733 | Damage tracks that alter recall / evidence access without silently deleting SPE-22 rows |

### Partial observability vocabulary

- **Partial observability** — multiple hypotheses remain live; UI may show best-effort summaries while canonical state keeps explicit unknowns.
- **Rumor truth inversion** — socially sourced intel can be **deliberately false** or mirrored; track provenance separately from fact IDs.
- **Source-distance decay** — confidence erodes with time, chain length, or mediator count unless re-verified.
- **Knowledge visibility states** — facts may be **recovered** (reopened after loss), **suppressed** (withheld by policy or hazard), or **inherited** (passed across operatives/factions with attenuation).

### Canonical epistemic model (SPE-58)

For **actual world state vs observed vs interpreted vs agency-known**, uncertainty reduction, hypothesis/test/revision, competing truth systems, folklore or denial as interpreted pressure, **risky knowledge**, and routing to **SPE-529** (sensing/masking/relay), **SPE-587** (operational views / dispatch filters), **SPE-588** (dream / inherited / preserved channels), and **SPE-589** (freshness / decay / fragmentation), see **`architecture/knowledge-state-system.md`**.

## 3. Recommended Canonical Intel and Uncertainty State Fields

- `intel.knownFacts: Record<string, boolean | number | string>`

- `intel.confidence: Record<string, number>` (0–1 scale)

- `intel.uncertainty: Record<string, number>` (0–1 scale)

- `intel.lastUpdated: number` (week or timestamp)

- `intel.source: Record<string, string>` (e.g., agent, facility, event)

- `agent.knowledge: string[]` (unlocked facts per agent)

- `mission.intel: string[]` (intel tags per mission)

- `mission.intelConfidence: Record<string, number>`

- `facility.intel: string[]`

## 4. Deterministic Intel Acquisition and Degradation Rules

- **Acquisition:**
  - Intel is gained via explicit actions (scouting, research, interrogation, event triggers).
  - All gains are deterministic: same state and actions yield same intel.
  - Confidence increases with repeated/verified sources.

- **Degradation:**
  - Intel can degrade over time (stale, outdated, or countered by adversary actions).
  - Degradation is deterministic: based on time, events, or explicit triggers.
  - Uncertainty increases as intel ages or is contradicted.

## 5. Reliability, Confidence, and Uncertainty Guidance

- **Reliability:**
  - Track source and verification status for each intel item.
  - Use confidence scores to represent reliability (0 = unknown, 1 = certain).

- **Uncertainty:**
  - Explicitly model uncertainty for all critical facts.
  - Uncertainty should affect routing, triage, and outcome calculations.

- **Presentation:**
  - Overlay UI should surface confidence/uncertainty for all major intel.

## 6. Interaction with Other Systems

- **Mission Intake:**
  - Intake forms should reflect current intel and uncertainty.

- **Triage:**
  - Triage scores weighted by intel confidence.

- **Routing:**
  - Team assignment and pathing may depend on known/unknown factors.

- **Deployment:**
  - Deployment readiness and risk assessment incorporate intel reliability.

- **Weakest-Link Outcomes:**
  - Partial or missing intel increases risk of weakest-link failures.

- **Research:**
  - Research actions can unlock or clarify intel.

- **Facilities:**
  - Facility status and vulnerabilities depend on up-to-date intel.

- **Save/Load:**
  - All intel/confidence/uncertainty state must be serializable and restorable.

- **Overlay:**
  - Debug/overlay tools should expose current intel state and uncertainty.

- **Stability Checks:**
  - Stability audits should flag stale, contradictory, or missing critical intel.

## 7. Common Pitfalls

- Overwriting or losing intel state on save/load or mission transitions.

- Non-deterministic intel acquisition (e.g., random events without seed control).

- Failing to degrade or update intel after relevant events.

- Not surfacing uncertainty/confidence in UI or overlays.

- Hard-coding intel categories or fields, limiting extensibility.

## 8. Open Questions

- What is the canonical set of intel categories for all mission types?

- How should conflicting intel from multiple sources be resolved?

- What is the minimum viable uncertainty model for gameplay clarity?

- How should intel degradation interact with adversary countermeasures?

- What UI/UX patterns best communicate uncertainty and reliability to players?

- How should research and facilities systems extend or override base intel logic?

---

### Summary

- **Files created:** `docs/knowledge-intel-partial-information-audit.md`

- **Runtime code changed:** No

- **Overlap risks:** None; documentation-only, no runtime or test files modified.
