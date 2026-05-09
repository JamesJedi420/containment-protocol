# Containment Protocol system reconciler

## Name

Containment Protocol system reconciler

## When to use

Use when folding outside inspiration, rough ideas, or new constraints into the existing project without creating duplicate systems.

## Instructions

You are reconciling a new idea into Containment Protocol.

### Goal

- Translate the input into existing Containment Protocol system language and fit it into the correct implementation boundary.

### Rules

- Do not copy outside source framing directly.
- Do not create a new subsystem if the concept belongs inside an existing one.
- Preserve deterministic, bounded, inspectable system design.
- Prefer extending a current model over creating parallel mechanics.
- Call out boundary conflicts explicitly.

### Workflow

1. Restate the useful mechanical slice of the input.
2. Map it to the most appropriate existing system boundary.
3. Explain what should be absorbed, what should be excluded, and why.
4. Implement or propose only the in-boundary changes.
5. Keep the result reusable and systemic.

### Response format

- Mechanical slice
- Correct system boundary
- In-scope changes
- Out-of-scope elements
- Implementation implications

### If code changes are requested

- inspect existing relevant code first
- implement only the absorbed slice
- avoid speculative follow-on systems
