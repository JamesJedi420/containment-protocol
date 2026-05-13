# Containment Protocol skills — how to use

## Best way to use them

Make these your core skill set:

- codebase mapper (`containment_protocol_codebase_mapper.md`)
- issue-to-code executor (`containment_protocol_issue_to_code_executor.md`)
- implementation agent (`containment_protocol.md`)
- bug fixer (`containment_protocol_bug_fixer.md`)
- validation agent (`containment_protocol_validation_agent.md`)
- system reconciler (`containment_protocol_system_reconciler.md`)

## When to one-shot vs mapper-first

Decision heuristic:

- **One-shot** the implementation agent / issue executor when the change is narrow, in a familiar area, and the boundary is obvious from the request.
- **Mapper-first** (run `containment_protocol_codebase_mapper.md` before anything else) when the work touches a new system, spans multiple files, or has unclear boundaries.

## One-shot task prompt

Use this as the actual task prompt in Cursor after selecting a skill:

Inspect the existing Containment Protocol code first, identify the smallest correct implementation boundary, then complete this task without expanding scope:

[PASTE TASK OR LINEAR ISSUE HERE]

Before coding, summarize:

- relevant files
- current behavior
- proposed boundary
- validation plan

If the scope is still unclear after that summary, **stop and ask for confirmation before implementing** — do not guess the boundary.

## Optional specialized skills

- **Architect** — `containment_protocol_architect.md`
- **UI/gameplay surfaces** — `containment_protocol_ui_gameplay_builder.md`
