<!-- cspell:words psionic -->

# Case Template Authoring Guide

This project supports authored scenario variety by extending case templates in `src/domain/templates/`.

## Primary files

- `src/domain/templates/caseTemplates.ts` (base + starter/follow-up chains)
- `src/domain/templates/caseTemplates.operations.ts`
- `src/domain/templates/caseTemplates.occult.ts`
- `src/domain/templates/caseTemplates.psionic.ts`
- `src/data/copy.ts` (`CASE_LORE_STUBS` narrative intel entries)

## Required structural guardrails

The starter-content contract tests enforce the following:

- Every template must have exactly one tier tag: `tier-1`, `tier-2`, or `tier-3`.
- Every `spawnTemplateIds` reference must resolve to an existing template ID.
- Required tags/roles must be satisfiable by at least one starter team.
- Required-tag concentration cap: max frequency per tag is `8`.
- Required-role concentration cap: max frequency per role is `6`.
- Direct ingress templates that point to `raid-001` must stay at or below `10`.

## Tag and requirement conventions

- Prefer broad scenario tags in `tags` for classification and ambient generation weighting.
- Use `requiredTags` and `requiredRoles` sparingly; treat them as hard gates.
- Use `preferredTags` for soft composition guidance and scenario flavor.
- Keep tag casing/language consistent with existing authored tags.

## Spawn-graph design heuristics

- Include at least one non-raid escalation path where possible to increase mid-chain variety.
- Reserve raid conversion (`convertToRaidAtStage`) for true pressure spikes.
- Avoid overusing a single raid endpoint; branch into themed raid templates when available.

## Optional explicit spawn metadata

Templates can declare:

- `pressureValue`: explicit pressure contribution for pressure/intel surfaces
- `regionTag`: explicit region affinity (`network_grid`, `bio_containment`, `occult_district`, `perimeter_sector`, `global`)

If omitted, runtime inference remains active via tag/difficulty heuristics.

## Narrative content pass

When adding a new template, also add an entry in `CASE_LORE_STUBS` (`src/data/copy.ts`) so Intel details remain flavorful and complete.
This is enforced by starter-content contract tests in both directions:

- Every authored template ID must have a non-empty lore stub.
- Every lore stub key must map to an authored template ID (no orphan keys).

## Validation

Run tests in non-watch mode after edits:

- `npm test -- --run`
