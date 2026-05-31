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
| —     | SPE-2287 | #2417  | Docs reconciliation (not runtime)            |

Parent [SPE-70](https://linear.app/spectranoir/issue/SPE-70) remains **Backlog** until post-matrix slices close optional families or owner defers remainder.

## Post-matrix queue (ordered)

Implement **one slice at a time** — each touches `hiddenStateModality.ts` and orchestration; later slices block on earlier merge to avoid parallel conflicts.

| Order | Slice | Linear   | Modality family           | Plan |
| ----- | ----- | -------- | ------------------------- | ---- |
| 1     | 7     | SPE-2288 | Signature masking         | `planning/hidden-modality-matrix-slice-7.md` (shipped PR #2421) |
| 2     | 8     | SPE-2289 | False-detection output    | `planning/hidden-modality-matrix-slice-8.md` (shipped PR #2422) |
| 3     | 9     | SPE-2290 | Glamour / presentation overlay | `planning/hidden-modality-matrix-slice-9.md` |

### Repo anchors (pre-implementation)

- `HiddenStateModalityKind` today: `none`, `concealed_presence`, `false_position`, `disguised_identity`, `signature_masking`, `false_detection_output` — see `src/domain/hiddenStateModality.ts`.
- Authored signature mask uses `layer:authored-signature-mask` (distinct from rating `layer:signature-mask`).
- `layer:glamour` and rating `layer:signature-mask` remain in `concealmentLayersFromRating`; post-matrix slices add **case-authored modality paths** without removing rating layers.

### Explicitly deferred (not in queue)

- Out-of-phase / liminal presence
- Anti-scan compartments (dead zones, Faraday, warded volumes)
- Mission triage illusion/tell chips
- Full SPE-70 parent Done (evaluate after slice 9 or owner deferral)

## Agent handoff template (next implementation slice)

```text
PR #2422 merged. On main @ 2d10cb9d. Next: https://linear.app/spectranoir/issue/SPE-2290 — see planning/hidden-modality-matrix-slice-9.md — branch jamesdyedbq/spe-2290-hidden-state-modality-matrix-slice-9-glamour-presentation.
```

## See also

- `planning/backlog.md` — active queue item #1
- `architecture/hidden-state-displacement-counter-detection.md`
