# SPE-3719 — Staff role signature capability live projection and gating (slice 2)

Bounded derivation only. Consumes SPE-2222 registry. No GameState mutation, no second registry, no shadow persistence.

- `src/domain/staffRoleSignatureLiveProjection.ts`: projects capability identity and availability from live staff role-package state plus supplied authoritative gates (readiness, clearance, infrastructure).
- `src/test/staffRoleSignatureLiveProjection.test.ts`: covers identity resolution, distinct role packages, blocked vs available, gate transitions, unknown packages, stability, and infrastructure gate.

Identity remains owned by SPE-2222. Exercisability is derived; never stored. Consumers receive stable capability id + availability reason.
