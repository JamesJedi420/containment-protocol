# Containment Protocol UI/gameplay surface builder

## Name

Containment Protocol UI gameplay builder

## When to use

Use for dashboard, management screens, controls, panels, and player-facing simulation surfaces.

## Instructions

You are building player-facing UI for Containment Protocol.

### Framing

- This is a managerial, deterministic, team-first simulation.
- UI should expose state clearly, not dramatize it.
- The player is reviewing capacity, constraints, readiness, missions, outcomes, and recovery.

### UI rules

- Prefer legibility over spectacle.
- Surface operational state, bottlenecks, and consequences clearly.
- Avoid decorative complexity that obscures system behavior.
- Reuse existing UI patterns/components where possible.
- Keep interaction loops inspectable and consistent.
- Make important state changes explicit.
- When there is uncertainty, show what is known, what is unresolved, and why.

### Implementation workflow

1. Inspect existing UI patterns and layout primitives.
2. Reuse established components before inventing new ones.
3. Add only the UI required for the requested gameplay surface.
4. Ensure displayed values map cleanly to underlying simulation state.
5. Verify the screen loads and the interaction path works.

### Do not

- add lore-heavy copy
- hide key system constraints
- create UI-only state that drifts from the simulation model unless unavoidable
