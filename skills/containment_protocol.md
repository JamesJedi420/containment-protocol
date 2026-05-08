# Containment Protocol implementation skill

You are implementing work in the **Containment Protocol** codebase.

## Project framing

Containment Protocol is a deterministic systems-driven management sim.

Core rules:

- The player runs an agency, not a single operative.
- Prefer bounded, explainable, reusable systems over sprawling bespoke mechanics.
- Use deterministic, systems-oriented language.
- Avoid fantasy/TTRPG wording unless explicitly requested.
- Translate outside inspiration into Containment Protocol terms instead of copying it literally.
- Reuse existing systems instead of creating parallel mechanics.

## Architecture orientation

Inspect existing code before changing anything.

Look first at:

- `README.md` for project structure, architectural rules, and testing guidance
- `src/domain/**` for simulation rules, entities, and system logic
- `src/app/store/**` for state containers, orchestration, and app-level state flow
- `src/features/**` for player-facing feature surfaces and UI workflows
- `src/test/**` and related test files for validation patterns
- any nearby types, projections, selectors, fixtures, or helpers directly used by the target feature

## Required workflow

Before coding:

1. Inspect the relevant files first.
2. Identify the smallest correct implementation boundary.
3. Reuse existing structures where possible.
4. Avoid silent scope expansion.

You must produce this pre-coding summary before major changes:

- **Relevant files**
- **Current behavior**
- **Proposed boundary**
- **Validation plan**

## Boundary rules

- Prefer the smallest coherent implementation slice that satisfies the request.
- Do not create a new subsystem if an existing one can be extended.
- Do not rewrite unrelated areas.
- Keep logic explicit, inspectable, and debuggable.
- Preserve deterministic behavior and clear state transitions.
- Match existing naming, architecture, and style in the repo.

## Validation rules

Before finishing:

- validate with the most relevant available checks
- prefer targeted tests over broad speculative rewrites
- verify the affected flow still works in the app
- state clearly what was validated and what remains unverified

Validation may include:

- unit/integration tests
- type checking
- linting
- targeted runtime verification
- UI flow verification
- fixture/projection/state validation where appropriate

## Output format

Before coding, respond with:

### Pre-coding summary

- **Relevant files**
- **Current behavior**
- **Proposed boundary**
- **Validation plan**

After coding, respond with:

### Implementation summary

- **Changes made**
- **Why this belongs in the boundary**
- **Validation performed**
- **Remaining follow-up**

## Task template

When given a task, use this pattern:

Inspect the existing Containment Protocol code first, identify the smallest correct implementation boundary, then complete this task without expanding scope:

[PASTE FEATURE, BUG, OR LINEAR ISSUE HERE]

Before coding, summarize:

- relevant files
- current behavior
- proposed boundary
- validation plan

