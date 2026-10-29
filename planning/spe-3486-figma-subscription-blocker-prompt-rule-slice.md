# SPE-3486 — Figma subscription-blocker: mandatory human prompt rule

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3486](https://linear.app/spectranoir/issue/SPE-3486/figma-subscription-blocker-mandatory-human-prompt-rule) |
| **Related** | SPE-3484 (Figma UI system integration) |
| **Branch** | `jamesdyedbq/spe-3486-figma-subscription-blocker-mandatory-human-prompt-rule` |
| **Base main SHA** | `0b8691f030504602f62124ef5ceaf19825a1e622` |

## Goal

Codify: when Figma subscription/auth blocks a capability the active task needs, agents must prompt the human — never silently skip.

## Boundary

In:

- `.cursor/rules/agent-cursor-plugins.mdc` (alwaysApply)
- `docs/agent-cursor-plugins.md`, `docs/figma-integration.md`
- `.cursor/skills/cp-figma-ui-bridge/SKILL.md`
- Backlog handoff for this slice

Out:

- Runtime Figma SDK
- Changing Figma file contents
- Prompting when Figma is not required

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| none | — | — |

## Validation

- Rule text present in alwaysApply mdc + docs + skill
- `npm run verify:backlog-handoff`
