# Role-Specific Gear Loadouts Audit (Documentation-Only Support)

> Scope: design support note for a bounded role-specific gear loadout system in Containment Protocol.
>
> Constraints honored: no runtime logic edits, no test edits, no symbol renames, docs-only output.

## 1) Loadout categories

Recommended category model (compact and deterministic):

- **Primary tools**
  - Core role-defining equipment (e.g., containment rig, recon scanner, breach kit).
  - High impact on mission role output.

- **Secondary tools**
  - Tactical complements (e.g., fallback sidearm-equivalent, utility backup, sensor backup).
  - Moderate impact, lower uniqueness constraints than primary.

- **Protective gear**
  - Survivability and risk control equipment (e.g., warded gear, hazard suits, trauma armor).
  - Primarily affects fatigue/injury risk and reliability modifiers.

- **Utility modules**
  - Operational support and specialty adapters (e.g., occult detector, relay injector, med patcher).
  - Flexible slot family for role tailoring.

- **Consumables / mission kits**
  - Limited-use mission prep items (e.g., med packs, seal charges, disruption charges).
  - Typically assignment-time constraints, not permanent kit identity.

- **Protocol-linked or synergy-linked equipment (optional tier)**
  - Items unlocked by academy/progression/faction influence.
  - Should remain explicit and deterministic (no hidden random unlocks).

## 2) Recommended slot model

Use explicit, finite slots with clear semantics:

- `primary` (0..1)
- `secondary` (0..1)
- `headgear` (0..1)
- `armor` (0..1)
- `utility1` (0..1)
- `utility2` (0..1)
- `consumablePack` (0..1, optional if consumables are represented as bundles)

Slot model guidance:

- Keep slot count fixed across roles for simplicity.
- Enforce one-item-per-slot deterministically.
- Prefer explicit empty slot states over implicit defaults.
- Keep assignment logic separate from effect calculation logic.

## 3) Role constraint rules

Define deterministic rule layers:

### A. Hard constraints (must pass)

- Item allowed roles include agent role (or specialization) OR item marked universal.
- Slot compatibility must match exactly.
- Prerequisites satisfied (academy tier, unlock flag, certification).
- Mutually exclusive tags cannot coexist in same loadout.

### B. Soft preferences (should guide, not block)

- Role affinity score per item (e.g., recon + sensor).
- Team composition synergies (e.g., one med utility recommended per squad).
- Mission-type affinity recommendations.

### C. Safety constraints

- Prevent equipping duplicate unique-id items across different agents if item is singleton.
- Prevent assignment of unavailable inventory stock.
- Prevent assignment while agent state disallows changes (if deployed-lock policy applies).

## 4) Assignment and validation guidance

Recommended pipeline:

1. **Pre-check**
   - Validate slot, role, inventory, unlock prerequisites.
2. **Apply assignment**
   - Write loadout state only if pre-check passes.
3. **Post-check**
   - Validate full-loadout consistency (conflicts, required role baseline, mission readiness profile).
4. **Return compact result**
   - `applied`, `reasons`, `warnings`, `deltaSummary`.

Validation result shape should be compact and inspectable:

- `valid: boolean`
- `blockingIssues: string[]`
- `warnings: string[]`
- `missingRecommendedSlots: string[]`
- `conflicts: string[]`
- `inventoryAdjustments: Array<{ itemId, delta }>`

Prefer deterministic, explicit validation reasons over inferred/heuristic error text.

## 5) Integration guidance

### Recruitment

- Candidate role inclination can seed recommended default loadout templates.
- No auto-equip on hire unless explicitly configured.
- Keep candidate-to-agent transition deterministic; use role defaults as recommendations only.

### Training

- Training/certification should unlock additional role-legal equipment or increase efficiency with specific item tags.
- Certification gates should be explicit and visible in validation output.

### Teams

- Team readiness should account for loadout coverage (e.g., no scanner coverage warning).
- Expose team-level loadout diagnostics: coverage, redundancy, conflicts.

### Deployment

- Optional deployment lock policy: once deployed, restricted loadout edits.
- Enforce policy via explicit validation rules; never mutate silently.

### Mission resolution

- Loadout effects should enter mission scoring through explicit modifiers (power, reliability, fatigue mitigation, risk).
- Avoid hidden nonlinear stacking; keep additive/multiplicative rules bounded and explainable.

### Save/load

- Persist slot assignments as stable IDs.
- On load, sanitize stale item refs (missing item definitions, removed inventory) into explicit invalid-state diagnostics.
- Do not silently drop unknown equipment without reporting in debug/stability surfaces.

### Overlay/debug surfaces

- Show per-agent loadout summary (slot → item ID).
- Show validation status + top blocking issues.
- Show team-level coverage and conflict summaries.

### Stability checks

- Detect invalid slot assignments (wrong slot/type/role).
- Detect missing inventory for equipped items.
- Detect stale saved equipment IDs after content updates.
- Detect illegal deployed-state mutations if policy says locked.

## 6) Common pitfalls

- **Constraint drift**
  - Role constraints and UI recommendations diverge over time.

- **Hidden auto-fixes**
  - Silent reassignment/unequip masks actual data issues and confuses QA.

- **Over-stacking modifiers**
  - Unbounded cumulative effects destabilize mission balance.

- **Inventory desync**
  - Loadout assignment not synchronized with stock movement rules.

- **Unclear uniqueness policy**
  - Single-instance items accidentally equipped to multiple agents.

- **Deployment policy ambiguity**
  - Mid-deployment edits inconsistently allowed/blocked.

- **Save/load stale refs**
  - Missing item definitions after content changes without deterministic recovery guidance.

## 7) Open questions

- Should there be role-specific default templates auto-applied at hire, or only suggested?
- Is loadout editing allowed during deployment, and if so, under what constrained conditions?
- Which items are singleton/unique vs stackable across the agency?
- Should utility slots support duplicate item IDs or enforce uniqueness per loadout?
- How should certification/training gates be represented in validation results for UX clarity?
- What is the canonical order of modifier application in mission resolution (base → role → gear → team synergy)?
- Should fallback behavior for stale save refs be “invalidate and block deploy” or “mark warning and continue with zero effect”?
- Do we need deterministic “recommended loadout generator” helpers per role + mission archetype?
