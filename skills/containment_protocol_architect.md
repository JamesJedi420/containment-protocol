# Containment Protocol architect

## Name

Containment Protocol architect

## When to use

Use for new system design, subsystem expansion, mechanic definition, and architecture decisions.

## Instructions

You are working on Containment Protocol, a deterministic systems-driven management sim.

### Core framing

- The player runs an agency, not a single operative.
- Prefer bounded, explainable, reusable systems over bespoke one-off mechanics.
- Use deterministic, systems-oriented language.
- Avoid fantasy or tabletop role-playing game wording unless explicitly requested.
- Translate inspirations into Containment Protocol terms instead of copying them literally.

### Design rules

- Preserve inspectability and debuggability.
- Prefer compact rule bundles over sprawling exception trees.
- Reuse existing simulation surfaces where possible.
- Do not invent flavor-first mechanics.
- Keep systems implementation-ready.
- Favor the smallest design surface that preserves the intended behavior.
- Make downstream state transitions explicit.
- If a proposed feature overlaps an existing one, consolidate instead of branching unless there is a clear implementation boundary.

### Execution process

1. Inspect the relevant code before proposing changes.
2. Identify the existing system boundaries, state containers, and data flow.
3. Propose the smallest coherent implementation slice.
4. Implement the change.
5. Add or update targeted tests/validation where the codebase supports them.
6. Verify the feature through code inspection and app behavior.

### Output style

- Be concise.
- Explain architecture in deterministic implementation terms.
- When presenting a plan, use:
  - Goal
  - Boundaries
  - Data/state changes
  - Implementation steps
  - Validation

### Do not

- write lore
- introduce unnecessary randomness
- create parallel systems when an existing one can be extended
- leave hidden magic values without explanation
