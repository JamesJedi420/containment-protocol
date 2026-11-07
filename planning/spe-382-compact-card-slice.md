# SPE-382 — Cross-category compact card records

## Boundary and plan

Codex implements approved SPE-382 under the continuous shipping-loop authorization. No parent or recorded blockers. Base/main `1c4d7f58339f331df0f796e2357d5c2a21319612`; branch `codex/spe-382-compact-cards`. Clean-main/no-open-PR and fresh Linear checks passed; preflight ready and issue In Progress before implementation.

Implement a pure bounded domain contract and deterministic immutable projection, then acceptance fixtures, architecture/schema documentation, targeted tests, requirement-selected checks and full diff audit. Existing source projections retain clearance, personnel calculations and historical truth. SPE-2736 consumes the contract for quick-reference interaction; SPE-2095 owns dossier helpers. No UI, persistence, snapshot generation, gameplay changes or dependency additions.

## Contract and evidence

`src/domain/compactCards.ts` provides shared qualified identity/hook/source tags and browse/inspect operational fields for six categories. Actor-only optional summaries and explicit live/historical/memorial/unavailable modes preserve recorded context. Suppressed values discard raw payload/provenance. Historical records require a source reference and reconstruction qualifier; there is no live-state lookup or fallback. Public metadata must already be visibility-safe. Structural validation cannot establish source authenticity.

`src/test/compactCards.test.ts` uses constructed actor/item/anomaly records. Targeted run: seven tests passed (1.92s). Fixtures cover operational stats plus a provenance hook, qualified estimates, optional personnel, archived/live separation, unavailable legacy data, suppressed rogue payloads, deterministic key-order-independent output and invalid/bounded records. Broader validation remains pending.

Gameplay evidence: reachable and connected apply to future consumers, not this explicitly schema-only boundary; observable contract output is tested through fixtures; persistence is inapplicable because no state is stored; end-to-end gameplay is not claimed. The receiving quick-reference/dossier owners must demonstrate their own integration before claiming playable use.

Modern Web Guidance is inapplicable to pure domain data. No dependency research required. Existing failed Hermes capability uses the documented bounded direct fallback; no Freebuff, provider change or savings claim. Independent PR review remains required.

## Six-pass audit

1. Scope: one shared grammar with category extension, no parallel interaction or simulation ownership.
2. Edges: malformed categories/fields, duplicate/reserved field IDs, missing historical sources, bounded lists/strings and nonfinite values reject with codes. Unknown display payload is omitted.
3. State/safety: pure copies, frozen nested output, deterministic set ordering; authored field order retained. Suppressed values cannot leak attached data. Source authenticity remains the caller's obligation.
4. Regression: no existing consumer replaced; focused tests exercise contract acceptance. Required validation pending.
5. Documentation: architecture contract and schema registry distinguish transient fixtures from gameplay and persistence. Future owners retain their boundaries.
6. Cleanup: no dependencies, unused UI paths, runtime vendor tools or unrelated edits. Final diff/review pending.

## Final local validation

All eight contract tests passed within the full suite: 11,093 tests / 1,028 files (104.31s). Required lint, backlog and production bundle passed. Initial compiler capture found six union-narrowing diagnostics and detected concurrent edits; the redacted/unavailable variants were separated. Final stable paired compiler capture reports zero diagnostics, literal `npm run build` passed, and final touched lint/Prettier and diff whitespace checks passed. No checks were weakened.

Architecture-index advisory remains non-green: five unrelated files lack See-also links on unchanged main. Browser advisory was omitted locally because this is an unconsumed domain contract; hosted browser checks remain enabled. Repository-wide formatting advisory was replaced by touched-file formatting to preserve unrelated legacy formatting. Independent PR review and hosted checks remain pending. No gameplay integration or dossier persistence claim is made.
