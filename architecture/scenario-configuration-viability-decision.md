# Scenario configuration viability and override authority (SPE-3396)

Frozen contradiction-check disposition. Implementation encodes in SPE-3397 plus existing domain owners. No universal override engine.

## Precedence (high → low)

1. World-law base (SPE-151 / SPE-2098)
2. Campaign / run configuration (SPE-1734 / SPE-3044)
3. Scenario configuration (SPE-3397 consumer of this contract)
4. Domain / local rules (SPE-883)
5. Progression / unlock state (SPE-1059 / SPE-2267 / SPE-27)
6. Persistent conditions
7. Temporary runtime modifiers (SPE-1499)

## Softlock viability

Invalid configurations that remove every legal route to mandatory continuity fail closed (SPE-3044 precedent). SPE-3397 aggregates owner validation results before commit.

## Starting grants

Allowed only as explicit `scenario_start_grant` entitlements with provenance. Must not fabricate earned progression history or a second capability authority (SPE-3081).

## Hard gates never bypassed by scenario

- World-law hard incompatibility (SPE-151)
- Competency activation (SPE-1059)
- Run-configuration viability (SPE-3044)

## Disposition

Fold into SPE-3397 + existing owners. No additional bounded issue required by this check.
