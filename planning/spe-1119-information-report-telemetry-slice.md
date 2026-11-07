# SPE-1119 — information-report provenance telemetry

Codex continues after #4910 closeout, base `6c8e84a17376f98c0ea5044dbf842b0260a101a1`, branch `codex/spe-1119-information-report-telemetry`. Fresh preflight ready 2026-11-07T02:03:29.209Z: synchronized clean main/no PR, owner In Progress. The 2026-05-15 mixed-source telemetry fold-in is relevant; SPE-854 remains Done for its calibrated bounded foundation, not all later design statements.

## Boundary

Copy existing information-intake report identity/topic, initial source class, credibility/plausibility/rumor risk, verification/confidence, corroboration/contradiction histories and retention flag immediately before and after week-close. Sort report IDs using existing code-unit ordering; preserve history order and source references. Distinguish an absent optional map (`null`) from explicit empty reports (`[]`). The existing internal analysis retains both observations; event and analysis schemas advance from 6 to 7.

No report creation, reconciliation, confidence calculation, source classification, routing or new sensor/witness semantics are implemented by telemetry. Missing coverage-gap or witness-memory fields are not invented. This remains internal inspection and is not filtered player knowledge. No UI, save, package or gameplay policy changes.

Constructed technical/witness reports use canonical report transitions to verify preservation of conflicting source states. Existing authored intake fixtures then run through the real `advanceWeek` corroboration tick and existing harness/analysis. This proves source-state → week-close → internal capture/consumer continuity, not normal gameplay generation of sensor/witness incidents or full information-model acceptance. Existing source histories and recorded synthetic weekly provenance remain visible as such.

## Audit and validation

Six direct audits cover scope/source authority, absent/empty/conflicting reports, deterministic order/nested isolation/internal audience, unchanged default observer behavior and existing consumers, schema/docs accuracy, and cleanup. Direct bounded source comparison reuses existing evidence; no Freebuff or new Hermes retry. Node22.23.4: 36 targeted tests/four files passed (7.77s). Full explicit-path requirements passed: 11,037 tests/1,018 files (532.43s); 24 campaign browser checks (4.0m) and five error checks (14.3s), no retries; lint/backlog/Vite pass and zero type diagnostics. Separate literal production build passed. Global advisory formatting excluded, not claimed green. Independent review and hosted CI remain merge gates. Broader SPE-1119 remains open.
