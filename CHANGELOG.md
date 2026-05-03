# Changelog

All notable changes to Containment Protocol are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows milestone-based release notes (see [planning/milestones.md](planning/milestones.md)).

## [Unreleased]

### Added

- Player-facing onboarding docs: [docs/game-loop.md](docs/game-loop.md), [docs/rules-and-objectives.md](docs/rules-and-objectives.md), [docs/playtest-prompts.md](docs/playtest-prompts.md).
- Glossary reference sections for canonical role names, mission categories, readiness states, blocker codes, and outcome categories.
- README "Weekly turn at a glance" walkthrough and "Where to start in the docs" pointer.
- Repository health files: [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md).
- GitHub issue templates: Bug, Playtest Finding, Docs Gap, System Proposal.

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [Pre-changelog baseline]

A consolidated snapshot of the build at the time this changelog was introduced. Detailed per-change history before this point lives in Linear (SPE-prefixed issues) and merged pull requests.

### Foundations

- Canonical campaign state, entity-relationship model, event schema, and persistence model.
- Deterministic weekly state transition (`advanceWeek`) with bounded, inspectable rules.
- Save/load with migration utilities and schema registry; see [SCHEMA_REGISTRY.md](SCHEMA_REGISTRY.md).

### Core loop

- Incident generation, mission triage, deployment, deterministic resolution, and weekly report flow.
- Cross-scale handoff between campaign and incident layers.

### Institutional systems

- Team composition and cohesion with role coverage and validation.
- Deployment readiness with categorical states and explicit blocker/soft-risk codes.
- Loadouts, training and certification, recruitment and replacement pressure.
- Support operations and specialist bottlenecks.
- Recovery, trauma, downtime, attrition, and replacement pressure flows.
- Funding, procurement, and budget pressure.
- Escalation, threat drift, time pressure, and progress clocks.
- Faction standing, reputation tiers, and faction pressure.
- Protocols and doctrine with scope-based agent application.
- Belief tracks, recon and intel confidence, partial-information surfaces.
- Major incidents with archetype-based scaling.
- Outcome branching, encounter tracking, weakest-link resolution, and report notes.

### Tooling

- React 19 + TypeScript + Vite 8 build with ESLint 9, Prettier, Vitest, and Testing Library.
- Lint/test guardrails enforcing dependency boundaries; see [docs/dependency-boundaries.md](docs/dependency-boundaries.md).
- Determinism, regression, integration, and UI test suites under `src/test/` and `src/features/**/*.test.tsx`.

---

[Unreleased]: ./
