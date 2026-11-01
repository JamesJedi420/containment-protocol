# Design audits index

These `docs/*audit*.md` files are **integration and field-naming checklists**: they complement `architecture/` specs and `src/domain/` ownership. When an audit disagrees with an architecture semantic contract, the architecture doc wins for **meaning**; the audit wins for **concrete tables, flags, and test hooks** unless explicitly superseded.

**Systems map:** `architecture/game-state-and-core-loop.md`

## Review status

**Last reviewed** means documentation-inventory review, **not** verification against the current runtime. The 2026-11-01 pass checked document scope and evidence of replacement but did not establish implementation or API conformance.

- **Active reference:** an integration-linked audit with no confirmed replacement. Its implementation mapping still needs runtime verification.
- **Active spec / Active QA reference:** UX or QA reference retained for use; implementation/test conformance has not been independently verified.
- **Review needed:** a design proposal or documentation-only support note that needs a full architecture/runtime crosscheck before it can be called current.
- **Workflow review needed:** overlapping agent-process guidance needing operating-manual and governance reconciliation.
- **Archived / superseded:** archival requires verifiable canonical replacement or approved deprecation; archive path and replacement must remain traceable.

**Archival finding (2026-11-01):** none of these 41 audit files had a verified complete replacement or explicit approved retirement. No files were relocated based on overlap or age alone.

### Maintaining this index

For each new top-level `docs/*audit*.md` file (not this index), add **one alphabetically ordered table row** with a review date and defensible status. When a document is verifiably superseded, move it under `docs/archived/`, update inbound links, and document the replacement in **Archived audits**. The audit validator checks the active top-level audit table; UX/QA references are managed separately.

**CI:** `npm run verify:audits-index` checks the active table for completeness, duplicates, alphabetical order, and existing local file links.

## Audits (alphabetical)

| Audit                                                                                                | Last reviewed | Status                 |
| ---------------------------------------------------------------------------------------------------- | ------------- | ---------------------- |
| [`agency-progression-audit.md`](./agency-progression-audit.md)                                       | 2026-11-01    | Active reference       |
| [`agent-pre-ship-audit.md`](./agent-pre-ship-audit.md)                                               | 2026-11-01    | Workflow review needed |
| [`aggregate-battle-audit.md`](./aggregate-battle-audit.md)                                           | 2026-11-01    | Active reference       |
| [`case-generation-audit.md`](./case-generation-audit.md)                                             | 2026-11-01    | Active reference       |
| [`combat-resolver-audit.md`](./combat-resolver-audit.md)                                             | 2026-11-01    | Active reference       |
| [`conditions-modifiers-audit.md`](./conditions-modifiers-audit.md)                                   | 2026-11-01    | Active reference       |
| [`content-branching-audit.md`](./content-branching-audit.md)                                         | 2026-11-01    | Review needed          |
| [`contract-debrief-next-intent-audit.md`](./contract-debrief-next-intent-audit.md)                   | 2026-11-01    | Active reference       |
| [`cursor-pre-ship-audit-user-rules-snippet.md`](./cursor-pre-ship-audit-user-rules-snippet.md)       | 2026-11-01    | Workflow review needed |
| [`debug-reset-audit.md`](./debug-reset-audit.md)                                                     | 2026-11-01    | Review needed          |
| [`department-workshop-queue-audit.md`](./department-workshop-queue-audit.md)                         | 2026-11-01    | Active reference       |
| [`deployment-readiness-time-cost-audit.md`](./deployment-readiness-time-cost-audit.md)               | 2026-11-01    | Review needed          |
| [`encounter-tracking-audit.md`](./encounter-tracking-audit.md)                                       | 2026-11-01    | Review needed          |
| [`escalation-threat-drift-time-pressure-audit.md`](./escalation-threat-drift-time-pressure-audit.md) | 2026-11-01    | Review needed          |
| [`event-logging-audit.md`](./event-logging-audit.md)                                                 | 2026-11-01    | Review needed          |
| [`event-queue-audit.md`](./event-queue-audit.md)                                                     | 2026-11-01    | Review needed          |
| [`factions-audit.md`](./factions-audit.md)                                                           | 2026-11-01    | Active reference       |
| [`funding-procurement-budget-pressure-audit.md`](./funding-procurement-budget-pressure-audit.md)     | 2026-11-01    | Review needed          |
| [`gear-loadouts-audit.md`](./gear-loadouts-audit.md)                                                 | 2026-11-01    | Active reference       |
| [`investigation-economy-audit.md`](./investigation-economy-audit.md)                                 | 2026-11-01    | Active reference       |
| [`knowledge-intel-partial-information-audit.md`](./knowledge-intel-partial-information-audit.md)     | 2026-11-01    | Review needed          |
| [`major-incidents-audit.md`](./major-incidents-audit.md)                                             | 2026-11-01    | Active reference       |
| [`market-economy-audit.md`](./market-economy-audit.md)                                               | 2026-11-01    | Active reference       |
| [`mission-intake-triage-routing-audit.md`](./mission-intake-triage-routing-audit.md)                 | 2026-11-01    | Review needed          |
| [`one-shot-enforcement-audit.md`](./one-shot-enforcement-audit.md)                                   | 2026-11-01    | Review needed          |
| [`operative-attrition-loss-replacement-audit.md`](./operative-attrition-loss-replacement-audit.md)   | 2026-11-01    | Review needed          |
| [`outcome-branching-audit.md`](./outcome-branching-audit.md)                                         | 2026-11-01    | Review needed          |
| [`progress-clock-audit.md`](./progress-clock-audit.md)                                               | 2026-11-01    | Review needed          |
| [`protocols-audit.md`](./protocols-audit.md)                                                         | 2026-11-01    | Active reference       |
| [`recovery-trauma-downtime-audit.md`](./recovery-trauma-downtime-audit.md)                           | 2026-11-01    | Review needed          |
| [`report-notes-audit.md`](./report-notes-audit.md)                                                   | 2026-11-01    | Active reference       |
| [`research-system-audit.md`](./research-system-audit.md)                                             | 2026-11-01    | Active reference       |
| [`save-load-audit.md`](./save-load-audit.md)                                                         | 2026-11-01    | Active reference       |
| [`scouting-recon-audit.md`](./scouting-recon-audit.md)                                               | 2026-11-01    | Active reference       |
| [`spawn-rules-audit.md`](./spawn-rules-audit.md)                                                     | 2026-11-01    | Active reference       |
| [`stability-audit.md`](./stability-audit.md)                                                         | 2026-11-01    | Review needed          |
| [`team-composition-cohesion-audit.md`](./team-composition-cohesion-audit.md)                         | 2026-11-01    | Review needed          |
| [`training-certification-audit.md`](./training-certification-audit.md)                               | 2026-11-01    | Review needed          |
| [`trigger-system-audit.md`](./trigger-system-audit.md)                                               | 2026-11-01    | Review needed          |
| [`visibility-layer-audit.md`](./visibility-layer-audit.md)                                           | 2026-11-01    | Review needed          |
| [`weakest-link-mission-resolution-audit.md`](./weakest-link-mission-resolution-audit.md)             | 2026-11-01    | Review needed          |

## UX and QA specifications

| Specification                                                                                  | Last reviewed | Status              |
| ---------------------------------------------------------------------------------------------- | ------------- | ------------------- |
| [`agency-view.md`](../ux/agency-view.md)                                                       | 2026-11-01    | Active spec         |
| [`deployment-flow.md`](../ux/deployment-flow.md)                                               | 2026-11-01    | Active spec         |
| [`hub-view.md`](../ux/hub-view.md)                                                             | 2026-11-01    | Active spec         |
| [`mission-triage.md`](../ux/mission-triage.md)                                                 | 2026-11-01    | Active spec         |
| [`navigation-map.md`](../ux/navigation-map.md)                                                 | 2026-11-01    | Active spec         |
| [`operations-report.md`](../ux/operations-report.md)                                           | 2026-11-01    | Active spec         |
| [`procurement-support.md`](../ux/procurement-support.md)                                       | 2026-11-01    | Active spec         |
| [`determinism-tests.md`](../qa/determinism-tests.md)                                           | 2026-11-01    | Active QA reference |
| [`edge-case-checklist.md`](../qa/edge-case-checklist.md)                                       | 2026-11-01    | Active QA reference |
| [`feature-done-criteria.md`](../qa/feature-done-criteria.md)                                   | 2026-11-01    | Active QA reference |
| [`infiltration-concealment-report-matrix.md`](../qa/infiltration-concealment-report-matrix.md) | 2026-11-01    | Active QA reference |
| [`integration-tests.md`](../qa/integration-tests.md)                                           | 2026-11-01    | Active QA reference |

## Archived audits

None verified for archival as of 2026-11-01. Future rows must record the original filename, archived path, canonical replacement, and last review date.

## Related (non-audit naming)

- [`cross-scale-integration.md`](./cross-scale-integration.md)
- [`unknown-interaction-runtime.md`](./unknown-interaction-runtime.md)
- [`linear-external-documentation-follow-ups.md`](./linear-external-documentation-follow-ups.md)
- [`../planning/backlog.md`](../planning/backlog.md)
- [`../planning/deferred-design-documents.md`](../planning/deferred-design-documents.md)
- [`../planning/documentation-curation.md`](../planning/documentation-curation.md)
