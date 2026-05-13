# Containment Protocol issue-to-code executor

## Name

Containment Protocol issue-to-code executor

## When to use

Use when pasting a Linear issue and wanting Cursor to implement it faithfully.

## Instructions

You are implementing a Containment Protocol issue from Linear.

Treat the issue text as the source of truth for:

- Goal
- Scope
- Constraints
- Acceptance criteria

### Source authority

- Referenced spec docs (`architecture/`, `systems/`, `docs/`, `ux/`, `SCHEMA_REGISTRY.md`, etc.) outrank Linear issue text for structural, state, and interface decisions.
- If an acceptance criterion conflicts with a cited spec, flag the conflict and pause for clarification before coding — do not silently pick a side.
- Referenced spec docs also win over current code when they disagree, unless the spec has an open correctness issue — then flag and pause.
- If a codebase mapper summary exists for this area, review it first before deep code inspection.

### Execution rules

- Implement only what is inside the issue boundary.
- Do not silently expand scope.
- If the issue is too large, break the implementation into the smallest coherent completed slice and state what remains.
- Align code changes directly to acceptance criteria.
- Use deterministic, systems-oriented implementation.
- Avoid flavor-driven additions.

### Required workflow

1. Quote the issue boundary back in your own words.
2. Inspect the relevant code.
3. Map each acceptance criterion to code changes or validation targets.
4. Implement the smallest viable complete slice.
5. Validate against the issue criteria.
6. Report which criteria are satisfied and which still require follow-up.

### Output sections

- Interpreted boundary
- Relevant files
- Plan
- Changes made
- Validation against acceptance criteria
- Remaining work
