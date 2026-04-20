# Knowledge, Intel, & Partial Information Layer — Design Audit

## 1. Knowledge/Intel Categories

- **Mission Intel:** Case facts, threat details, containment requirements, environmental hazards, adversary profiles.

- **Agent/Team Knowledge:** Skills, certifications, prior mission experience, psychological state, fatigue, and readiness.

- **Facility Intel:** Layout, security, vulnerabilities, operational status, and resource inventories.

- **Adversary Intel:** Capabilities, tactics, weaknesses, and unknowns.

- **Operational Uncertainty:** Fog-of-war, misinformation, partial observations, and degraded signals.

- **Research/Discovery:** Unlockable knowledge, experimental findings, and emergent facts.

## 2. Recommended Canonical Intel and Uncertainty State Fields

- `intel.knownFacts: Record<string, boolean | number | string>`

- `intel.confidence: Record<string, number>` (0–1 scale)

- `intel.uncertainty: Record<string, number>` (0–1 scale)

- `intel.lastUpdated: number` (week or timestamp)

- `intel.source: Record<string, string>` (e.g., agent, facility, event)

- `agent.knowledge: string[]` (unlocked facts per agent)

- `mission.intel: string[]` (intel tags per mission)

- `mission.intelConfidence: Record<string, number>`

- `facility.intel: string[]`

## 3. Deterministic Intel Acquisition and Degradation Rules

- **Acquisition:**
  - Intel is gained via explicit actions (scouting, research, interrogation, event triggers).
  - All gains are deterministic: same state and actions yield same intel.
  - Confidence increases with repeated/verified sources.

- **Degradation:**
  - Intel can degrade over time (stale, outdated, or countered by adversary actions).
  - Degradation is deterministic: based on time, events, or explicit triggers.
  - Uncertainty increases as intel ages or is contradicted.

## 4. Reliability, Confidence, and Uncertainty Guidance

- **Reliability:**
  - Track source and verification status for each intel item.
  - Use confidence scores to represent reliability (0 = unknown, 1 = certain).

- **Uncertainty:**
  - Explicitly model uncertainty for all critical facts.
  - Uncertainty should affect routing, triage, and outcome calculations.

- **Presentation:**
  - Overlay UI should surface confidence/uncertainty for all major intel.

## 5. Interaction with Other Systems

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

## 6. Common Pitfalls

- Overwriting or losing intel state on save/load or mission transitions.

- Non-deterministic intel acquisition (e.g., random events without seed control).

- Failing to degrade or update intel after relevant events.

- Not surfacing uncertainty/confidence in UI or overlays.

- Hard-coding intel categories or fields, limiting extensibility.

## 7. Open Questions

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
