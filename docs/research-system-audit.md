# Research System Audit & Design Note

## 1. Research Categories
- **Occult Research:** Anomalous phenomena, rituals, psionics, artifacts, containment protocols, and supernatural threats.
- **Technical Research:** Equipment, weapons, vehicles, surveillance, cybernetics, medical, and operational technology.
- **Hybrid/Interdisciplinary:** Projects requiring both occult and technical expertise (e.g., anti-occult tech, hybrid containment).

## 2. Recommended Canonical Research State Fields
- `researchProjects: Record<Id, ResearchProjectInstance>` — All active and completed research projects.
- `researchQueue: Id[]` — Ordered queue of pending research projects.
- `activeResearchSlots: number` — Number of concurrent research projects allowed.
- `completedResearchIds: Set<Id>` — Set of completed research project IDs.
- `researchProgress: Record<Id, number>` — Progress (in weeks or points) for each active project.
- `researchUnlocks: string[]` — Unlocked capabilities, items, or mechanics.

## 3. Project Queue and Concurrency Rules
- Projects are queued; only `activeResearchSlots` projects progress per week.
- New projects are added to the queue; completed projects free up slots.
- Slots may be increased by facility upgrades, staff, or special events.

## 4. Deterministic Progression and Completion Rules
- Each active project advances by a fixed or calculated amount per week (e.g., 1 week or N points).
- No random skips or jumps; all progress is explicit and inspectable.
- Completion occurs when `researchProgress[projectId] >= required`.
- Partial progress is saved and resumes if interrupted.

## 5. Cost Model Guidance (Time, Materials, Data)
- **Time:** Each project has a base duration (weeks or points).
- **Materials:** May require specific items, resources, or funding to start or complete.
- **Data:** Some projects require intel, case data, or field samples as prerequisites.
- Costs are explicit and checked before project start or completion.

## 6. Unlock Output Categories
- **Equipment/Item Unlocks:** New gear, weapons, or consumables.
- **Protocol Unlocks:** New containment, response, or operational protocols.
- **Facility/Upgrade Unlocks:** New rooms, labs, or facility upgrades (without merging systems).
- **Intel/Analysis Unlocks:** Reveal new case types, threat info, or strategic options.
- **Training Unlocks:** New training programs or agent upgrades.

## 7. Prerequisite and Dependency Rules
- Projects may require completion of other research, specific cases, or facility levels.
- Prerequisites are explicit and checked before project start.
- Dependencies are tracked and surfaced in the UI/overlay.

## 8. Interaction with Facilities (Without Merging Systems)
- Facilities provide research slots, speed multipliers, or efficiency bonuses.
- Facility upgrades do not directly merge with research state; they amplify throughput.
- Research may gate facility tiers, but not vice versa.
- Facility state and research state remain separate but reference each other for bonuses.

## 9. Integration Points
- **Gear:** Research unlocks new equipment and upgrades.
- **Intel/Recon:** Some research requires or produces intel.
- **Mission Types/Modifiers:** Research may unlock new mission types or modifiers.
- **Training:** Research unlocks new training programs or agent upgrades.
- **Save/Load:** All research state is explicit and serializable.
- **Overlay/Debug:** Research progress, queue, and unlocks are inspectable in overlays.
- **Stability Checks:** Deterministic progression ensures no lost progress or skipped unlocks.

## 10. Common Pitfalls
- Implicit or hidden research progress (not inspectable).
- Merging research and facility state (causes migration and logic issues).
- Random or non-deterministic progression (breaks save/load and testing).
- Unclear prerequisites or unlocks.
- Overlapping unlocks with other systems (gear, training, facilities).

## 11. Open Questions
- Should research be cancelable or only pausable?
- How are hybrid (occult + technical) projects handled for slot allocation?
- Can research be accelerated by staff assignment or only by facilities?
- Should some research require field completion (e.g., successful missions) to finish?
- How are research failures or setbacks handled, if at all?

---

### Summary
- **Files created:** `docs/research-system-audit.md`
- **Runtime code changed:** No
- **Overlap risks:** None; documentation-only, no symbol or logic changes, no test edits.
