# Tiered detection / reveal payloads — slice 1 (SPE-781)

## Goal

Introduce a pure, deterministic reveal-payload resolver so scans can return **presence, category, active protection, hostility, or exact identity** in separate tiers instead of all-or-nothing truth.

Slice 1 is domain-only — no UI wiring or encounter integration yet.

## Shipped (slice 1 — pending merge)

| Area | Files |
| --- | --- |
| Reveal taxonomy + scan families | `src/domain/revealPayload.ts`                            |
| Deterministic tests             | `src/test/revealPayload.test.ts`                         |
| Archived prototype guard        | `src/test/archivedPrototypeHygiene.test.ts` (backlog #5) |

## Acceptance (Linear SPE-781 subset)

- [x] Detection returns presence/category without exact identity when layers block deeper tiers
- [x] Reveal action strips concealment layers before deeper tiers resolve
- [x] Active-effect scan shows active effects while dormant effects stay hidden
- [x] Targeted tests cover tier payloads, conceal reduction, ambiguous output policy, and absent/blocked edge cases

## Slice 2 (stacked — scouting integration)

See `planning/reveal-payload-slice-2.md` — `resolveScoutingWithRevealPayload` in `src/domain/revealPayloadScoutingIntegration.ts`.

## Out of scope (later slices)

- Full hidden-modality matrix (`architecture/hidden-state-displacement-counter-detection.md`)
- Encounter / equipment scan integration (beyond scouting)
- Player-facing report copy for tiered payloads
- False-detection / instrumentation attack modalities

## See also

- Linear [SPE-781](https://linear.app/spectranoir/issue/SPE-781)
- `architecture/hidden-state-displacement-counter-detection.md` — SPE-70 modalities
- `docs/unknown-interaction-runtime.md` — SPE-59 provisional vs confirmed identity
