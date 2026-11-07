# SPE-2095 — Institutional actor dossier helper

## Boundary and plan

Codex implements the approved pure-helper slice under the continuous shipping-loop authorization. Parent SPE-158 remains Backlog with broader lineage/wealth/runtime acceptance. Base/main `db06939bcad412a8963a5fcb0ea4427d8648b63c`; branch `codex/spe-2095-actor-dossier`. Fresh Linear issue/parent/relations read, all 64 comments retrieved; boundary clarification `00badbcf-bd49-4610-b7a3-b8e66ad463cc` explicitly treats repeated harvest entries as field-candidate traceability, not runtime mandates. No recorded blockers, no open PR, clean synced main, preflight ready; owner In Progress before implementation.

Implement `src/domain/actorDossier.ts`, targeted `src/test/actorDossier.test.ts`, architecture/schema notes, then six-pass audit, requirements-selected validation, independent review and merge. Reuse Agent identity/assignment data as input and source-qualified records; do not copy vitals or implement access grants, social graphs, persona lifecycle, career attribution, snapshot generation, persistence or UI. The newly shipped SPE-382 contract remains the compact presentation owner; SPE-2736 owns subsequent screen integration.

## Contracts and acceptance

Eight role categories, sparse Agent adapter, explicit per-field clearance plus need-to-know, immutable dated patches, visible alias/name collision warnings, provenance-bearing supplied career evidence, bounded read-only shared/persona references and separately typed player annotation. Missing access fails closed; absent facts remain unavailable and uncertainty is retained. Snapshot metadata is separately gated, no present-state fallback. An initial baseline is explicitly supplied by the caller rather than invented by the adapter. Canonical record ID/existence must already be authorized for the caller; no hidden cross-record names participate in collision warnings.

Initial focused run: 17 tests passed (24.97s); additional display-name collision assertion added during audit. Fixtures demonstrate schema behavior only. Reachable/connected gameplay and normal UI observability belong to later consumers; persistence is inapplicable here; no end-to-end gameplay claim. The schema-only acceptance explicitly calls for pure helpers and tests.

Modern Web Guidance is inapplicable to pure domain work. No dependency changes. Existing failed Hermes capability uses bounded direct fallback; no Freebuff/provider change or savings claim.

## Six-pass audit

1. Scope: pure institutional projection, one local actor ID, no duplicated simulation or relationship authority. Parent acceptance remains separate.
2. Edges: legacy missing identity returns null; absent policies redact; clearance and all grants required; bounded text/list values; duplicate visible aliases warn without merge; snapshots reject invalid/backdated append.
3. State: snapshots copy/freeze prior history and preserve original patches; historical omissions never read current fields. Provenance and hidden metadata cannot bypass field/snapshot gates. Player annotations do not write canonical fields.
4. Regression: no existing runtime consumers modified; focused fixtures cover all role variants and history/knowledge separation. Full required validation pending.
5. Documentation: architecture/schema notes explain patch semantics, explicit baseline, source-owner obligations, no persistence and broader parent work.
6. Cleanup: no packages, UI scaffolding, unrelated refactors or external runtime tools. Final diff, compiler and review gates remain pending.

## Final local validation

Final focused run: 17 tests (1.75s). Required validation passed: 11,110 tests / 1,029 files (112.97s), full lint, backlog and production bundle (1.90s). Paired compiler capture had zero diagnostics; literal `npm run build` passed (Vite 8.81s). Touched formatting and diff whitespace checks pass. The sole remaining local advisory is the verified pre-existing five-link architecture-index omission on unchanged main. Local browser advisory omitted because this pure helper has no runtime consumer; hosted browser checks remain enabled. No checks were weakened. All six passes completed with no in-boundary gap found; independent review/hosted CI remain required.

## Review clarification

Initial Codex review clean at `7edfd1328f36658333b66122ba8a20283df9cba8`. Amazon Q requested unique weeks; the approved snapshot contract has no such constraint, and append order preserves multiple legitimate changes in one coarse week. Added explicit same-week baseline/assignment coverage and documentation; backdated appends still reject. Seventeen focused tests pass (2.23s) with touched lint. No production semantics changed or assertions weakened. CodeRabbit initial free review cooldown five minutes; independent final-head review and hosted CI pending.

CodeRabbit's subsequent full review found two valid boundary defects: viewer grant lists wrongly inherited the 32-policy-entry cap, and generated provenance for a 320-character Agent ID exceeded the ordinary string limit. Viewer grant validation now has no policy-count cap while retaining per-entry validation; provenance has a separate bounded 512-character allowance, retaining the full canonical ID. Added both regression cases and strengthened same-week coverage to overwrite an existing value while preserving both patches. Nineteen focused tests pass (1.75s), touched lint and literal build pass (Vite 1.49s). Final-head independent review/CI remain pending.
