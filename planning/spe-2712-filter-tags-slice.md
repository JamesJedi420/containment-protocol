# SPE-2712 — Responsive filter tags

## Boundary and plan

Codex implements the existing approved SPE-2712 boundary under the continuous shipping-loop authorization. Parent SPE-1080 remains separate. Base/main `7e89c4f09949e2b1edc73147470145c5022823aa`, branch `codex/spe-2712-filter-tags`. Fresh Linear issue/comments/relations: no blockers; preflight ready and owner In Progress before implementation. SPE-587 remains Backlog with its separate audience/knowledge transformation acceptance; this slice must not claim that feature complete. Canceled SPE-2679/SPE-2672 remain closed.

Reuse controlled URL facets on the live Cases and Intel pages. A shared `FilterTagGroup` renders labeled native pressed buttons, wraps natural-width controls, and preserves feature-owned state and selectors. It does not create tabs, replace route navigation or change mission semantics. The initial Dashboard feed integration was removed after browser verification showed that component is not mounted by the current route; only live integrations remain.

## Contracts

- `src/components/FilterTagGroup.tsx`: native fieldset/legend and buttons; controlled selection; disabled choices cannot activate; no local copy of filter state. Native Tab/Shift+Tab, Enter and Space remain browser-owned. Options retain authored DOM order without CSS order/dense packing. Empty/stale values do not invent selection.
- `src/app/inputActions.ts`: focused filter previous/next/activate actions use the existing canonical registry, preference compatibility and remapping UI. Defaults Alt+Shift+J/K/L and standard controller buttons 14/15/0. Consumers act only while a button in their own group is focused, skip disabled buttons, stop at group boundaries and unregister on unmount. Normal modal barriers remain intact. No second poller or input registry.
- Cases and Intel mode selectors retain their existing filter readers/writers, URL restoration and projection behavior. Cases triage tabs remain tabs. No simulation/save/event change, no dependencies, no new knowledge visibility claims.
- CSS wraps via flex with gap, natural sizing capped by available width, readable long labels and at least 48px targets. Selected controls have accent border/inset and bold text; hover underline, focus outline, disabled dashed border/opacity distinguish states. No motion. Panel/inline padding is bounded so doubled text does not consume the label area.

## Guidance and validation

Modern Web Guidance searched `wrap filter controls` with reviewed CLI 0.0.197 and skill 2026_10_30-58d055df. Read `css-layout` and `typography` in full; reused already-read forms/accessibility. Applied “Use `flex-wrap: wrap` whenever overflow is a possibility” with subsequent balance enhancement/fallback, gap and logical sizing; did not reorder interactive content. Typography's “Allow users to resize text up to 200% without loss of content or functionality” drove actual root-font-size assertions and bounded padding. No package addition.

Targeted final-integration tests: 45 tests/five files passed (10.32s). Initial live browser run passed three cases (17.8s), but screenshot inspection exposed excessively narrow long labels at doubled text. Padding was corrected and a minimum usable group-width assertion added. Final required validation and independent review remain pending.

Browser evidence distinguishes real URL filtering/native keyboard/touch from constructed Gamepad snapshots and a constructed localization-expanded label. No physical controller, screen-reader device or shipped localization catalogue certification. Tests cover two live consumers, native tab semantics preserved, URL hydration/reload, selected state, 320px/doubled text, DOM reading order, 48px targets and controller traversal/activation. Component tests cover disabled traversal, controlled state and empty/stale options.

Existing Hermes failed-capability bounded direct fallback applies; small checks are direct, no Freebuff or paid switch and no savings claim. Six-pass pre-ship audit and full requirement-selected validation must finish before PR.

## Six-pass audit

1. Scope/integration: only live Cases/Intel mode facets adopt the shared group; existing case triage tabs and route navigation remain unchanged. SPE-587 visibility transformation remains separate and unimplemented by this slice.
2. Edges: controlled state has no default-selection side effect; empty/stale sets and disabled buttons are covered. Controller focus cannot move beyond the group or trigger another unfocused group. Existing modal and editing guards are preserved.
3. State/compatibility: feature readers/writers retain URL ownership and selectors. No campaign/event/save mutation. Added explicit saved-button-0 compatibility coverage: older navigation overrides suppress the new colliding filter default rather than losing user preferences.
4. Regression: live browser navigation caught and removed the inactive Dashboard integration. Full browser run exposed an old fixture that assumed controller button 0 was unassigned; use unassigned button 2 for the same remapping behavior. Conflict prevention remains intact, not weakened.
5. Presentation/evidence: actual doubled root text and 320px touch inspection caught overly generous nested padding; only the integrated filter panels use bounded padding/narrow margins. Long-label evidence is a constructed translation expansion. Full-unit and final browser/check results remain to be recorded.
6. Cleanup: no second input system, local selection cache, CSS visual reordering, dependency or runtime/CI vendor wiring. Guidance, schema note and this boundary record are current. No required scope deferral identified; remaining validation/review gates still apply.

## Final local results

The first requirement-selected run passed lint/backlog/bundle and both compiler passes (zero diagnostics), but failed the old controller fixture and one aborted browser reload; it also recorded one App route-query timeout while the browser rerun was running concurrently. Those failures are retained in the logs, not described as green. The controller fixture now uses unassigned button 2; the unchanged navigation browser test passes in the complete rerun. The unchanged App file passed all 44 tests alone (43.41s), followed by a sequential full unit rerun: 11,085 tests/1,027 files (105.93s). Complete final browser rerun: all 44 Chromium scenarios (7.0m). The expanded-label screenshot was inspected after the final padding correction. No test assertions, lint or CI rules were relaxed. These reruns satisfy the failed validators selected by the requirements runner; final hosted CI remains an independent gate.
Final literal production build and touched lint passed. New/fully formatted touched files pass Prettier; legacy Cases files retain unrelated baseline formatting, with touched hunks and diff whitespace checked.
