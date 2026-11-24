# SPE-714 — Activation prerequisites and compatibility checks (slice 1)

Bounded deterministic schema and evaluation only. No GameState, no cadence/timer system, no full compatibility simulator.

- `src/domain/activationPrerequisite.ts`: prerequisite kinds (free hands, exposed skin, role, environment, formation, paired contact), validation, action-level eligibility evaluation with inspectable failure reasons.
- `src/test/activationPrerequisite.test.ts`: missing-prerequisite failure, role/environment compatibility changing legality, action independence, deterministic reasons, malformed/duplicate rejection.

Action-level checks; sibling actions remain independent. Cooldown/cadence state is consumed from the owning action contract, not invented here. Compatibility is distinct from charge economy and passive traits.

This is schema evidence only; live inventory integration and full prerequisite graphs remain outside slice 1.
