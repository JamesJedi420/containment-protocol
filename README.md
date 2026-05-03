# Containment Protocol

Containment Protocol is a deterministic systems-driven management sim about running a secretive containment organization under constant operational, political, and epistemic pressure.

You control an institution. Every decision passes through bounded, inspectable systems: research, staffing, training, logistics, public works, finance, secrecy, doctrine, response teams, evidence handling, containment infrastructure, and the slow spread of dangerous knowledge. Incidents are not isolated missions. They are failures, leaks, discoveries, and tradeoffs propagating through the same living organization.

## Core Pillars

**Deterministic systemic simulation**
No hidden dice. Outcomes come from state, preparation, constraints, and readable system interactions.

**Institution over avatar**
Staff, teams, facilities, archives, logistics, doctrine, and public-facing consequences matter more than single-character power.

**Containment as tradeoff**
Safety, secrecy, legitimacy, budget, morale, research progress, and operational reach all compete.

**Knowledge as risk and power**
Learning new things unlocks capability, but can also create exposure, overload, misuse, dependency, and escalation.

**Operational clarity**
The interface is built to support planning under pressure: inspectable state, exact blockers, explicit readiness surfaces, and bounded consequences.

## What You Do

As director of a growing containment organization, you will:

- investigate anomalies, incidents, and civic disturbances
- assign squads, specialists, kits, shifts, and staging surfaces
- build and maintain containment, research, and response infrastructure
- unlock new methods through research, recovery, study, teaching, and dissemination
- manage evidence, archives, secrecy, and public narrative pressure
- route teams through deployments, recovery, readiness loss, and doctrinal failure
- decide when to suppress knowledge, when to operationalize it, and when to leave it buried
- hold the institution together as systems collide under crisis load

## Major Systems

### Research and Capability Rollout

Capabilities do not appear for free. New methods enter the organization through explicit acquisition paths:

- canonical research programs
- recovered texts and artifacts
- incident-derived evidence
- prototype development
- teaching and dissemination pipelines
- non-standard anomaly-granted knowledge paths

Learned breadth is separate from operational readiness. Knowing something is not the same as being ready to use it safely, lawfully, or effectively.

### Response Teams

Response teams are explicit operational units with:

- metadata and doctrine
- role-slot composition
- kit templates and mismatch visibility
- shift schedules and deployable availability
- room-based readiness surfaces
- leader-dependence degradation when command structure fails

Teams degrade for readable reasons. Missing a leader, wrong room assignment, bad shift state, or incorrect kit all produce concrete operational consequences.

### Responder State

Individual staff are not generic tokens. They carry:

- duty state
- discipline
- specialization
- gear dependency
- readiness burden
- panic and overload risk
- competence fit and mismatch penalties

This lets squad-level planning and individual-level fragility coexist without collapsing into one stat.

### Infrastructure and Environment

Incidents run through the built world, not just rooms.

The simulation includes:

- roads, drains, sewers, utility lines, bridges, conduits, and access layers
- public works ownership and jurisdiction
- site-civil readiness and temporary works
- facility layout, staging, and service dependencies
- infrastructure-amplified anomaly behavior
- non-obvious response timing and spread routes

### Secrecy, Dissemination, and Public Pressure

Knowledge spreads. So do rumors, leaks, archives, and narrative collapse.

You will manage:

- suppression workflows
- restricted archives
- dissemination bottlenecks
- crisis communication
- legitimacy costs
- public-facing containment choices
- the tension between understanding and concealment

### Economics and Capacity

Every system consumes bounded institutional capacity:

- time
- staffing
- bandwidth
- facilities
- materials
- money
- containment margin
- political tolerance

The organization can expand, but never without cost.

## Game Structure

A campaign unfolds as a long-horizon institutional simulation:

1. Detect incidents, anomalies, or research opportunities
2. Assess evidence, risk, and missing capability
3. Prepare squads, kits, rooms, and logistics
4. Respond under hard constraints
5. Contain or stabilize the situation
6. Recover evidence, casualties, legitimacy, and readiness
7. Research what was learned
8. Operationalize new capability carefully
9. Absorb the long-tail consequences

Progress is not a straight power climb. New strength often opens new failure modes.

### A Weekly Turn at a Glance

The campaign advances one week at a time. A typical week looks like:

1. **Read the board.** Open incidents, deadlines, pressure changes, and recovery state from last week.
2. **Triage and route.** Sort new incidents by priority, assign each to a deployment path or defer it.
3. **Compose and equip.** Pick teams, leaders, kits, and supporting specialists; resolve readiness blockers.
4. **Deploy.** Commit teams to missions under the current readiness, training, and loadout constraints.
5. **Resolve.** Missions resolve deterministically from team state, mission state, and active modifiers.
6. **Absorb the aftermath.** Recovery, attrition, fallout, pressure shifts, and spawned cases land on the agency.
7. **Read the report.** Weekly report notes explain why outcomes happened and what changed.
8. **Plan the next week.** Adjust training, recruitment, procurement, research, and doctrine before advancing.

For a deeper walkthrough see [docs/game-loop.md](docs/game-loop.md).

## Where To Start In The Docs

New to the project? Read in this order:

1. [docs/rules-and-objectives.md](docs/rules-and-objectives.md) — what good play looks like and how a campaign can fail.
2. [docs/game-loop.md](docs/game-loop.md) — the weekly loop in detail with a worked example.
3. [docs/index.md](docs/index.md) — system map across team, mission, loadout, training, recruitment, readiness, pressure, and outcome.
4. [docs/glossary.md](docs/glossary.md) — canonical terminology used throughout the codebase, issues, and reports.
5. The audit notes under [docs/](docs/) — bounded design notes per system, linked from the system map.

For playtesting, see [docs/playtest-prompts.md](docs/playtest-prompts.md). For contributing, see [CONTRIBUTING.md](CONTRIBUTING.md). For change history, see [CHANGELOG.md](CHANGELOG.md).

## Design Principles

Containment Protocol is built around a few hard rules:

- prefer bounded, explainable systems over sprawling bespoke mechanics
- preserve real implementation boundaries
- keep important state inspectable
- use compact typed rules instead of vague simulation prose
- let consequences emerge from interacting systems rather than authored fiat
- separate "known," "usable," "safe," and "authorized"
- treat institutions as fragile, accumulative, and path-dependent

## Inspirations, Reframed

Containment Protocol draws from containment fiction, systems sims, research management, crisis command, public works, survival-horror logistics, and knowledge-hazard design.

It does not copy those sources literally. Their useful mechanics are translated into Containment Protocol terms and fitted into one deterministic institutional model.

## Current Version

In active development.

The current build is an in-progress implementation of the full Containment Protocol simulation. Core systems are being added in bounded slices, with deterministic behavior, explicit state, and implementation-first validation guiding each release step.

## How to Read the Simulation

If you are new, think in this order:

1. What is true?
2. What is known?
3. What is usable?
4. What is authorized?
5. What is ready?
6. What is affordable?
7. What breaks if this succeeds?

That is the game.

---

## For Contributors

### Architecture & Boundaries

- **Domain Layer** — pure simulation logic in [src/domain/](src/domain/)
- **Store / Orchestration** — state management, hydration, transfer, and selectors in [src/app/store/](src/app/store/)
- **Projection / View-Model** — pure selectors and view-models in `src/features/*View.ts`
- **UI / Components** — presentational React modules in [src/features/](src/features/) and [src/styles/](src/styles/)
- Shared explanatory output is owned by canonical domain helpers wherever possible
- Dependency boundaries are enforced by lint/test guardrails — see [docs/dependency-boundaries.md](docs/dependency-boundaries.md)

### Stack

- React 19
- TypeScript
- Vite 8
- ESLint 9
- Vitest
- Testing Library

### Scripts

- `npm run dev` — start the local Vite dev server
- `npm run build` — run TypeScript build mode and produce a production bundle
- `npm run lint` — run ESLint across the repo
- `npm run format` — rewrite files with Prettier
- `npm run format:check` — verify formatting without changing files
- `npm run test -- --run` — execute the Vitest suite once
- `npm run test:run` — execute the test suite in the repo's standard non-watch mode
- `npm run test:ui` — open the Vitest UI
- `npm run coverage` — run tests with coverage output

### Structure

- [src/main.tsx](src/main.tsx) mounts the live gameplay app
- [src/app/App.tsx](src/app/App.tsx) defines gameplay routes
- [src/app/store/gameStore.ts](src/app/store/gameStore.ts) holds simulation state and gameplay actions
- [src/app/store/runTransfer.ts](src/app/store/runTransfer.ts) handles run hydration / transfer compatibility
- [src/domain/models.ts](src/domain/models.ts) defines core simulation types and handoff contracts
- `src/domain/sim/*` contains assignment, resolution, spawning, escalation, and week-advance logic
- `src/domain/templates/*` contains starter content, roster/team setup, template sources, and seeded opening cases
- [src/data/startingState.ts](src/data/startingState.ts) assembles initial state from canonical templates
- `src/features/*` contains gameplay surfaces and projections
- `src/test/*` contains deterministic simulation and regression coverage
- `docs/archived/incident-shell/*` contains a preserved archived prototype, not part of the active runtime

### Event Schema & Versioning

- Operation event schemas, validation, and migration utilities live in `src/domain/events/`
- Schema ownership and migration guidance are documented in [SCHEMA_REGISTRY.md](SCHEMA_REGISTRY.md)
- Backward compatibility is maintained through canonical migration paths

### Validation & Testing

- Comprehensive simulation, determinism, regression, UI, and boundary-enforcement coverage
- Domain and feature tests live in `src/test/` and `src/features/**/*.test.tsx`
- Cross-scale handoff contracts are covered by `src/test/crossScaleContracts.test.ts` and `src/test/campaignToIncidentHook.integration.test.ts`
- See also [docs/cross-scale-integration.md](docs/cross-scale-integration.md)
