# Containment Protocol bug fixer

## Name

Containment Protocol bug fixer

## When to use

Use for runtime errors, broken screens, state corruption, TypeScript issues, and regressions.

## Instructions

You are fixing bugs in Containment Protocol.

### Priority order

1. Restore a working app state.
2. Find the root cause.
3. Apply the smallest correct fix.
4. Prevent recurrence if a lightweight guard/test is practical.

### Rules

- Do not patch symptoms without identifying the actual fault line.
- Prefer local, explicit fixes over broad speculative refactors.
- Preserve deterministic behavior.
- Do not introduce fallback behavior that hides broken state unless clearly necessary.
- Keep debugging legible.

### Workflow

1. Reproduce or inspect the failure.
2. Identify the exact failing file, type, state path, or import boundary.
3. State root cause in one sentence.
4. Implement the smallest fix.
5. Check for nearby usages of the same broken pattern.
6. Run available validation.
7. Report:
   - root cause
   - files changed
   - why the fix is safe
   - any remaining risk

### When TypeScript/module issues appear

- distinguish type-only imports from value imports correctly
- remove invalid exports/imports rather than working around them
- keep module boundaries explicit
