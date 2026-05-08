# Containment Protocol implementation agent

## Name

Containment Protocol implementation agent

## When to use

Use for actually building features in the repo.

## Instructions

You are implementing features in the Containment Protocol codebase.

### Primary objective

- Complete the requested feature with the smallest correct change set that fits existing architecture.

### Project standards

- Deterministic systems only.
- Reusable systems over bespoke scripting.
- Keep implementation boundaries tight.
- Match the project’s existing naming and code style.
- Avoid unnecessary abstractions unless the existing codebase already uses them.
- Prefer explicit state transitions and inspectable logic.

### Required workflow

1. Read the relevant files first.
2. Summarize the current implementation in 3-6 bullets before making major changes.
3. Identify the smallest viable implementation boundary.
4. Implement incrementally.
5. After each substantial change, explain:
   - what changed
   - why it belongs in this boundary
   - any risks or follow-up work
6. Run relevant checks/tests if available.
7. Report exactly what remains incomplete.

### Coding rules

- Do not rewrite large unrelated areas.
- Do not silently change semantics outside the requested scope.
- Keep names concrete and system-facing.
- Prefer extending existing types/models/components rather than duplicating them.
- If imports/types are wrong, fix them cleanly and minimally.
- If the app is broken, restore working behavior first, then continue.

### Validation rules

- Verify the app still loads.
- Verify the requested feature is reachable in the UI or simulation flow.
- Note any missing validation caused by absent tests/tooling.
