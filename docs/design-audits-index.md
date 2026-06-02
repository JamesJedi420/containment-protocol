# Design audits index

These `docs/*audit*.md` files are **integration and field-naming checklists**: they complement `architecture/` specs and `src/domain/` ownership. When an audit disagrees with an architecture semantic contract, the architecture doc wins for **meaning**; the audit wins for **concrete tables, flags, and test hooks** unless explicitly superseded.

**Systems map:** `architecture/game-state-and-core-loop.md`

### Maintaining this index

When you add a new top-level `docs/*audit*.md` file (integration checklist; not `design-audits-index.md`), add **one bullet** in **strict alphabetical order** using `- [\`filename.md\`](./filename.md)`.

**CI:** `npm run verify:audits-index` (also runs in GitHub Actions after lint) fails if any audit file is missing from this list, listed twice, out of order, or points to a non-existent file.

## Audits (alphabetical)

- [`agency-progression-audit.md`](./agency-progression-audit.md)
- [`agent-pre-ship-audit.md`](./agent-pre-ship-audit.md)
- [`aggregate-battle-audit.md`](./aggregate-battle-audit.md)
- [`case-generation-audit.md`](./case-generation-audit.md)
- [`combat-resolver-audit.md`](./combat-resolver-audit.md)
- [`conditions-modifiers-audit.md`](./conditions-modifiers-audit.md)
- [`content-branching-audit.md`](./content-branching-audit.md)
- [`contract-debrief-next-intent-audit.md`](./contract-debrief-next-intent-audit.md)
- [`cursor-pre-ship-audit-user-rules-snippet.md`](./cursor-pre-ship-audit-user-rules-snippet.md)
- [`debug-reset-audit.md`](./debug-reset-audit.md)
- [`deployment-readiness-time-cost-audit.md`](./deployment-readiness-time-cost-audit.md)
- [`encounter-tracking-audit.md`](./encounter-tracking-audit.md)
- [`escalation-threat-drift-time-pressure-audit.md`](./escalation-threat-drift-time-pressure-audit.md)
- [`event-logging-audit.md`](./event-logging-audit.md)
- [`event-queue-audit.md`](./event-queue-audit.md)
- [`factions-audit.md`](./factions-audit.md)
- [`funding-procurement-budget-pressure-audit.md`](./funding-procurement-budget-pressure-audit.md)
- [`gear-loadouts-audit.md`](./gear-loadouts-audit.md)
- [`investigation-economy-audit.md`](./investigation-economy-audit.md)
- [`knowledge-intel-partial-information-audit.md`](./knowledge-intel-partial-information-audit.md)
- [`major-incidents-audit.md`](./major-incidents-audit.md)
- [`market-economy-audit.md`](./market-economy-audit.md)
- [`mission-intake-triage-routing-audit.md`](./mission-intake-triage-routing-audit.md)
- [`one-shot-enforcement-audit.md`](./one-shot-enforcement-audit.md)
- [`operative-attrition-loss-replacement-audit.md`](./operative-attrition-loss-replacement-audit.md)
- [`outcome-branching-audit.md`](./outcome-branching-audit.md)
- [`progress-clock-audit.md`](./progress-clock-audit.md)
- [`protocols-audit.md`](./protocols-audit.md)
- [`recovery-trauma-downtime-audit.md`](./recovery-trauma-downtime-audit.md)
- [`report-notes-audit.md`](./report-notes-audit.md)
- [`research-system-audit.md`](./research-system-audit.md)
- [`save-load-audit.md`](./save-load-audit.md)
- [`scouting-recon-audit.md`](./scouting-recon-audit.md)
- [`spawn-rules-audit.md`](./spawn-rules-audit.md)
- [`stability-audit.md`](./stability-audit.md)
- [`team-composition-cohesion-audit.md`](./team-composition-cohesion-audit.md)
- [`training-certification-audit.md`](./training-certification-audit.md)
- [`trigger-system-audit.md`](./trigger-system-audit.md)
- [`visibility-layer-audit.md`](./visibility-layer-audit.md)
- [`weakest-link-mission-resolution-audit.md`](./weakest-link-mission-resolution-audit.md)

## Related (non-audit naming)

- [`cross-scale-integration.md`](./cross-scale-integration.md)
- [`unknown-interaction-runtime.md`](./unknown-interaction-runtime.md)
- [`linear-external-documentation-follow-ups.md`](./linear-external-documentation-follow-ups.md)
- [`../planning/backlog.md`](../planning/backlog.md)
- [`../planning/deferred-design-documents.md`](../planning/deferred-design-documents.md)
- [`../planning/documentation-curation.md`](../planning/documentation-curation.md)
