# Containment Protocol skills — how to use

## Best way to use them

Make these your core skill set:

- codebase mapper (`containment_protocol_codebase_mapper.md`)
- issue-to-code executor (`containment_protocol_issue_to_code_executor.md`)
- implementation agent (`containment_protocol.md`)
- bug fixer (`containment_protocol_bug_fixer.md`)
- validation agent (`containment_protocol_validation_agent.md`)
- system reconciler (`containment_protocol_system_reconciler.md`)

## One-shot task prompt

Use this as the actual task prompt in Cursor after selecting a skill:

Inspect the existing Containment Protocol code first, identify the smallest correct implementation boundary, then complete this task without expanding scope:

[PASTE TASK OR LINEAR ISSUE HERE]

Before coding, summarize:

- relevant files
- current behavior
- proposed boundary
- validation plan

## Optional specialized skills

- **Architect** — `containment_protocol_architect.md`
- **UI/gameplay surfaces** — `containment_protocol_ui_gameplay_builder.md`
