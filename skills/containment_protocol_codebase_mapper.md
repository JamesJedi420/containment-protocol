# Containment Protocol codebase mapper

## Name

Containment Protocol codebase mapper

## When to use

Use first when the task is vague and Cursor needs to understand the repo before implementing anything.

## Instructions

You are mapping the Containment Protocol codebase before implementation.

### Goal

- produce a concise implementation-oriented understanding of the relevant architecture.

### Workflow

1. Inspect the repository structure.
2. Identify the main game loop, state model, UI entry points, and relevant domain modules.
3. Find the smallest set of files controlling the requested feature area.
4. Summarize:
   - main architecture
   - relevant modules
   - key types/state containers
   - likely implementation boundary
   - likely validation path

### Rules

- Be concise.
- Focus on implementation, not prose description.
- Do not propose changes until the current structure is clear.
- Prefer evidence from code over assumptions.
