# SPE-70 — Post-matrix hidden-state modality queue

Routing doc for optional modality families after matrix slices 1–6 shipped. **Linear is authoritative** for issue state; this file is git-visible sequencing for agent sessions.

## Shipped matrix stack (slices 1–6)

| Slice | Linear   | PR     | Theme                                      |
| ----- | -------- | ------ | ------------------------------------------ |
| 1     | SPE-2281 | #2403  | Scouting integration / modality compose    |
| 2     | SPE-2282 | #2405  | Weekly orchestration wiring                |
| 3     | SPE-2283 | #2407  | Modality report copy                       |
| 4     | SPE-2284 | #2409  | Persistent recon cache                     |
| 5     | SPE-2285 | #2411  | False-entity / structural-illusion lifecycle |
| 6     | SPE-2286 | #2415  | Mode-specific tells / observer threshold   |
| —     | SPE-2287 | #2417  | Docs reconciliation (not runtime)          |

Parent [SPE-70](https://linear.app/spectranoir/issue/SPE-70) remains **Backlog** — post-matrix optional families through slice 10 shipped or in flight; deferred anti-scan compartments and mission-triage chips remain out of scope.

## Post-matrix queue (complete)

| Order | Slice | Linear   | Modality family           | Plan |
| ----- | ----- | -------- | ------------------------- | ---- |
| 1     | 7     | SPE-2288 | Signature masking         | `planning/hidden-modality-matrix-slice-7.md` (shipped PR #2421) |
| 2     | 8     | SPE-2289 | False-detection output    | `planning/hidden-modality-matrix-slice-8.md` (shipped PR #2422) |
| 3     | 9     | SPE-2290 | Glamour / presentation overlay | `planning/hidden-modality-matrix-slice-9.md` (shipped PR #2423) |
| 4     | 10    | SPE-2302 | Out-of-phase / liminal presence | `planning/hidden-modality-matrix-slice-10.md` (in progress) |
| —     | —     | SPE-2291 | Docs reconciliation       | `planning/backlog.md` handoff (shipped) |

### Repo anchors (post-queue)

- `HiddenStateModalityKind`: `none`, `concealed_presence`, `false_position`, `disguised_identity`, `signature_masking`, `false_detection_output`, `glamour_overlay`, `out_of_phase_presence` — see `src/domain/hiddenStateModality.ts`.
- Authored layers distinct from rating layers: `layer:authored-signature-mask`, `layer:authored-false-detection`, `layer:authored-glamour`, `layer:authored-out-of-phase`.
- Rating-derived `layer:glamour` and `layer:signature-mask` remain in `concealmentLayersFromRating`.

### Explicitly deferred (not in queue)

- Anti-scan compartments (dead zones, Faraday, warded volumes)
- Mission triage illusion/tell chips
- Full SPE-70 parent Done (evaluate after owner review of deferred families)

## Agent handoff template (next runtime slice)

```text
PR #2423 merged. On main @ d031fd91. Next: https://linear.app/spectranoir/issue/SPE-2105 — see planning/extranormal-event-registry-slice-1.md — branch jamesdyedbq/spe-2105-extranormal-event-registry-brief-incident-intake-cover-up.
```

## See also

- `planning/backlog.md` — active queue item #1 (SPE-2105)
- `planning/extranormal-event-registry-slice-1.md`
- `architecture/hidden-state-displacement-counter-detection.md`
