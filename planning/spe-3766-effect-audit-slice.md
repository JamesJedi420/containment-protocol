# SPE-3766 — Prisma/Effect dependency audit repair

Approved 2026-11-20 for the existing PR merge queue. Base `6dc31ff951f049688f7aa098745fadb6cdbc508b`; branch `codex/spe-3766-effect-audit`.

The required audit reports GHSA-7589-6fvf-x4pw through `@trigger.dev/build` → `@prisma/config@6.19.3` → `effect@3.21.0`. Prisma pins that Effect release. The first patched release is 3.22.1.

Change only the existing scoped npm override for Prisma config, the Effect lock record, and the Trigger.dev compatibility note. Preserve the nested optional `magicast@0.3.5` peer record required by npm 10. No runtime or simulation code changes.

Acceptance is a scripts-disabled clean install, a passing required dependency audit, Trigger.dev compatibility check, production build, relevant tests, full CI, independent final-head review, and merged PR with synchronized main. Sonatype MCP returned insufficient credits, so record the documented fallback review on the issue and PR. The existing open PRs retain their own scope and review gates.
