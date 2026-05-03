# Containment Protocol Docs System Map

Use this index as the navigation layer for the core operations loop. The audit notes are intentionally focused, but the gameplay systems are not isolated: teams, missions, loadouts, training, recruitment, readiness, pressure, and outcomes all feed each other.

## Core Loop

```text
Pressure + world activity
        |
        v
Mission intake -> triage -> routing
        |
        v
Readiness gate <-------- Team composition and cohesion
        ^                 ^
        |                 |
Loadouts + certs <- Training <- Recruitment + replacement pressure
        |
        v
Mission resolution -> outcome branching -> recovery / attrition / budget / escalation
        \_______________________________________________________________/
```

The practical rule: canonical state should feed derived summaries, and derived summaries should feed decisions with explicit reason codes. Avoid hidden coupling between systems.

## Primary System Links

| System      | Start here                                                                                               | Key links                                                                                                                                                                                                                                                          | Outputs to watch                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Team        | [Team Composition & Cohesion Audit](team-composition-cohesion-audit.md)                                  | [Team Management System](../systems/team-management.md), [Deployment Readiness & Time-Cost Audit](deployment-readiness-time-cost-audit.md), [Weakest-Link Mission Resolution Audit](weakest-link-mission-resolution-audit.md)                                      | Role coverage, team validity, cohesion band, fatigue, member availability, staffing gaps                   |
| Mission     | [Mission Intake, Triage, & Routing Audit](mission-intake-triage-routing-audit.md)                        | [Case Generation Audit](case-generation-audit.md), [Case Template Authoring](case-template-authoring.md), [Spawn Rules Audit](spawn-rules-audit.md), [Major Incidents Audit](major-incidents-audit.md)                                                             | Mission category, priority, required roles/tags, deadline, routing blockers, assigned team IDs             |
| Loadout     | [Role-Specific Gear Loadouts Audit](gear-loadouts-audit.md)                                              | [Funding, Procurement, & Budget Pressure Audit](funding-procurement-budget-pressure-audit.md), [Conditions and Modifiers Audit](conditions-modifiers-audit.md), [Protocols Audit](protocols-audit.md)                                                              | Loadout readiness, required equipment gates, countermeasure tags, procurement blockers, cert compatibility |
| Training    | [Training & Certification Audit](training-certification-audit.md)                                        | [Deployment Readiness & Time-Cost Audit](deployment-readiness-time-cost-audit.md), [Team Composition & Cohesion Audit](team-composition-cohesion-audit.md), [Protocols Audit](protocols-audit.md)                                                                  | Training status, certification state, training locks, queue ETA, training debt                             |
| Recruitment | [Operative Attrition, Loss, & Replacement Pressure Audit](operative-attrition-loss-replacement-audit.md) | [Scouting and Recon Audit](scouting-recon-audit.md), [Team Management System](../systems/team-management.md), [Training & Certification Audit](training-certification-audit.md)                                                                                    | Candidate pool, candidate intel, hiring outcomes, replacement requests, staffing gap, recruitment priority |
| Readiness   | [Deployment Readiness & Time-Cost Audit](deployment-readiness-time-cost-audit.md)                        | [Visibility Layer Audit](visibility-layer-audit.md), [Team Composition & Cohesion Audit](team-composition-cohesion-audit.md), [Role-Specific Gear Loadouts Audit](gear-loadouts-audit.md), [Training & Certification Audit](training-certification-audit.md)       | Eligibility, hard blockers, soft risks, time-cost estimate, weakest-link contributors                      |
| Pressure    | [Escalation, Threat Drift, & Time Pressure Audit](escalation-threat-drift-time-pressure-audit.md)        | [Funding, Procurement, & Budget Pressure Audit](funding-procurement-budget-pressure-audit.md), [Recovery, Trauma, & Downtime Audit](recovery-trauma-downtime-audit.md), [Progress Clock Audit](progress-clock-audit.md), [Event Queue Audit](event-queue-audit.md) | Deadline pressure, global escalation, budget pressure, unresolved-case pressure, recovery burden           |
| Outcome     | [Weakest-Link Mission Resolution Audit](weakest-link-mission-resolution-audit.md)                        | [Outcome Branching Audit](outcome-branching-audit.md), [Encounter Tracking Audit](encounter-tracking-audit.md), [Combat Resolver Audit](combat-resolver-audit.md), [Report Notes Audit](report-notes-audit.md)                                                     | Outcome category, failure margin, aftermath branches, follow-up spawns, recovery pressure, report notes    |
| Capability  | [Capability Dissemination & Teaching Audit](capability-dissemination-audit.md)                           | [Capability Readiness Audit](capability-readiness-audit.md), [Training & Certification Audit](training-certification-audit.md), [Protocols Audit](protocols-audit.md)                                                                                                                                                                                                 | Transfer eligibility, teaching requirement, dissemination result, operational readiness                   |

## Reading Paths

### Can this mission launch?

Start with [Mission Intake, Triage, & Routing Audit](mission-intake-triage-routing-audit.md), then check [Team Composition & Cohesion Audit](team-composition-cohesion-audit.md), [Role-Specific Gear Loadouts Audit](gear-loadouts-audit.md), [Training & Certification Audit](training-certification-audit.md), and finally [Deployment Readiness & Time-Cost Audit](deployment-readiness-time-cost-audit.md).

Expected answer: an explicit eligibility result with blockers, soft risks, time cost, and routing reason codes.

### Why did this outcome happen?

Start with [Deployment Readiness & Time-Cost Audit](deployment-readiness-time-cost-audit.md), then trace into [Weakest-Link Mission Resolution Audit](weakest-link-mission-resolution-audit.md), [Outcome Branching Audit](outcome-branching-audit.md), and [Report Notes Audit](report-notes-audit.md).

Expected answer: a stable outcome category with listed contributors, aftermath effects, and player-facing report notes.

### How does loss become staffing pressure?

Start with [Weakest-Link Mission Resolution Audit](weakest-link-mission-resolution-audit.md), then follow [Recovery, Trauma, & Downtime Audit](recovery-trauma-downtime-audit.md), [Operative Attrition, Loss, & Replacement Pressure Audit](operative-attrition-loss-replacement-audit.md), [Scouting and Recon Audit](scouting-recon-audit.md), [Training & Certification Audit](training-certification-audit.md), and [Team Composition & Cohesion Audit](team-composition-cohesion-audit.md).

Expected answer: loss and recovery state should become visible staffing gaps, candidate priorities, training debt, and team readiness changes.

### Why is pressure rising?

Start with [Escalation, Threat Drift, & Time Pressure Audit](escalation-threat-drift-time-pressure-audit.md), then check [Funding, Procurement, & Budget Pressure Audit](funding-procurement-budget-pressure-audit.md), [Progress Clock Audit](progress-clock-audit.md), [Spawn Rules Audit](spawn-rules-audit.md), and [Mission Intake, Triage, & Routing Audit](mission-intake-triage-routing-audit.md).

Expected answer: pressure should have a named source, bounded progression rule, visible impact, and clear route into mission priority or outcome risk.

### How do we debug or persist this?

Use [Visibility Layer Audit](visibility-layer-audit.md), [Stability Audit](stability-audit.md), [Save/Load Audit](save-load-audit.md), [Save/Load Test Checklist](save-load-test-checklist.md), [Event Logging Audit](event-logging-audit.md), and [Dependency Boundaries](dependency-boundaries.md).

Expected answer: decisions should be explainable, save/load safe, event-backed where needed, and not re-derived inconsistently in UI surfaces.

## Cross-Cutting References

- [Glossary](glossary.md) for shared terms.
- [Content Style Guide](content-style-guide.md) for player-facing wording, report tone, and outcome phrasing.
- [Knowledge, Intel, & Partial Information Audit](knowledge-intel-partial-information-audit.md) for uncertainty, scouting, and explainability boundaries.
- [Visibility Layer Audit](visibility-layer-audit.md) for routing, readiness, weakest-link, and weekly pressure explanations.
- [Stability Audit](stability-audit.md) for impossible states and guardrails.

## Maintenance Notes

- When adding a new audit note, add it to the relevant row above and identify what it consumes and emits.
- Recruitment is currently split across attrition/replacement, scouting, and the team-management system note. If a dedicated recruitment audit is added, make it the primary recruitment link.
- Pressure is intentionally multi-source. Keep pressure docs linked by source, not by a single generic pressure bucket.
- Prefer linking to canonical docs from feature notes instead of duplicating field lists in multiple places.
