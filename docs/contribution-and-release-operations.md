# Contribution Intake and Modular Release Operations (SPE-75)

## Purpose

This document captures **project operational infrastructure**: how external or internal contributions move from raw submission to **normalized, credited, packaged releases** — not gameplay simulation.

## Workflows (explicit stages)

1. **Intake** — channel, format, and license check; automated lint where applicable.
2. **Triage** — risk, scope, and dependency classification (content vs code vs doc-only).
3. **Review** — human or maintainer review against acceptance criteria and architecture contracts.
4. **Normalization** — structure fixes, naming alignment, migration hooks, test fixtures.
5. **Crediting** — CONTRIBUTORS / changelog / attribution metadata per project policy.
6. **Release packaging** — version bump, artifact bundling, compatibility notes, segmented announcements.

## Correction and clarification packets

Non-release **correction or clarification packets** (errata, hotfix docs, semver patches) ship **without** full feature fanfare when they only fix correctness or safety.

## Compatibility declarations

Releases declare **compatibility surfaces**: engine/runtime versions, save format expectations, schema versions (`SCHEMA_REGISTRY.md`), and breaking-change callouts.

Domain packaging baseline: `src/domain/modularReleasePackaging.ts` (SPE-2475) consumes accepted curation output from `src/domain/contributionIntakeCuration.ts` and emits sorted compatibility declarations plus delivery assumptions — no publish side effects.

## Artifact-type packaging

Different artifact types (domain templates, UX specs, tuning tables, binaries if any) use **distinct packaging rules** — do not mix incompatible consumers in one bundle without explicit manifests.

## Segmented feedback channels

Separate **bug reports**, **balance discussion**, **security disclosures**, and **RFC-style design feedback** so triage stays deterministic and low-noise.

Domain feedback baseline: `src/domain/segmentedFeedbackWorkflow.ts` (SPE-2476) accepts structured channel payloads and emits weighted ranking decisions with channel-type discrimination and grouping policy — no publish side effects.

## Disaster playbook variants

Disaster-type playbooks carry distinct procedural assumptions and resource risks. Teams under pressure must apply the variant that matches the active disaster — wrong-document application fails deterministically rather than silently.

Domain playbook baseline: `src/domain/playbookWrongDocumentFailure.ts` (SPE-2477) accepts structured playbook variant payloads and emits bounded application decisions with variant-type discrimination and wrong-document failure — no publish side effects.

## Submission governance

- **Required metadata** — issue link, scope statement, test evidence for code.
- **Branch / PR policy** — small reviewable units; no silent force-push to protected branches.
- **Noncanonical side-content** — fan mods, unofficial tools, or narrative experiments live **outside** canonical release manifests unless explicitly promoted through intake.

Domain governance baseline: `src/domain/submissionGovernanceRights.ts` (SPE-2478) accepts structured submission governance payloads and emits bounded rights/policy decisions with tier discrimination, license enforcement, and attribution assumptions — no publish side effects.

## Modifiable data packs

Authoring tools and contribution pipelines may ship **modifiable data packs** (tuning tables, reference sheets, doctrine notes) with typed section definitions. Packs must pass schema validation before import — corrupt structure fails safely rather than silently corrupting downstream state.

Domain validation baseline: `src/domain/modifiableDataPackValidation.ts` (SPE-2479) accepts structured modifiable data-pack payloads and emits bounded schema-validation decisions with section-shape checks and borderline schema-version remediation — no publish side effects.

## Notation and docs standards

- Prefer **issue IDs** (SPE-\*) in commit and PR titles when mandated by team workflow.
- **Docs-only changes** skip runtime gates but still require format/lint where configured.
- **Design audits** — when adding a new `docs/*audit*.md` checklist, register it in `docs/design-audits-index.md` in **strict alphabetical order**; `npm run verify:audits-index` must pass (CI enforces this after lint).
- **SPE-186+ mirror and theme map** — when refreshing `docs/linear-external-documentation-follow-ups.md` or editing `architecture/external-design-theme-contracts.md`, run `npm run verify:theme-contracts` (CI enforces after the audit index step).

## Onboarding and demo kits

**Demo / onboarding kits** are versioned alongside releases so first-run experience matches packaged behavior; stale kits are treated as release defects.

## See also

- `README.md` — scripts, validation, repository layout
- `docs/dependency-boundaries.md`
- `docs/design-audits-index.md` — audit catalog maintenance
- `planning/backlog.md` — near-term priority queue
- `planning/documentation-curation.md` — ongoing doc and planning curation playbook
- `AGENTS.md` — agent-facing operational notes
