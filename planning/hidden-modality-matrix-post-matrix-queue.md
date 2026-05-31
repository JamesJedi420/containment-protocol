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
| 1     | 7     | SPE-2288 | Signature masking         | `planning/hidden-modality-matrix-slice-7.md` |
| 2     | 8     | SPE-2289 | False-detection output    | Linear body only (planning doc when slice 7 ships) |
| 3     | 9     | SPE-2290 | Glamour / presentation overlay | Linear body only (planning doc when slice 8 ships) |

### Repo anchors (pre-implementation)

- `HiddenStateModalityKind` today: `none`, `concealed_presence`, `false_position`, `disguised_identity` — see `src/domain/hiddenStateModality.ts`.
- `layer:signature-mask` and `layer:glamour` exist as **rating-derived** layers in `concealmentLayersFromRating`; post-matrix slices add **case-authored modality paths** without removing rating layers.
- False-detection output has **no** dedicated layer or modality kind yet.

### Explicitly deferred (not in queue)

- Out-of-phase / liminal presence
- Anti-scan compartments (dead zones, Faraday, warded volumes)
- Mission triage illusion/tell chips
- Full SPE-70 parent Done (evaluate after slice 9 or owner deferral)

## Agent handoff template (next implementation slice)

```text
PR #____ merged. On main @ <sha>. Next: https://linear.app/spectranoir/issue/SPE-2288 — see planning/hidden-modality-matrix-slice-7.md — branch jamesdyedbq/spe-2288-hidden-modality-matrix-slice-7-signature-masking.
```

## See also

- `planning/backlog.md` — active queue item #1
- `architecture/hidden-state-displacement-counter-detection.md`
