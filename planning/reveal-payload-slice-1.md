# Tiered detection / reveal payloads — slice 1 (SPE-781)

## Shipped status

| Field             | Value                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Linear**        | [SPE-781 — Tiered detection and reveal payloads](https://linear.app/spectranoir/issue/SPE-781)                                                               |
| **Merged PR**     | [#2342](https://github.com/JamesJedi420/containment-protocol/pull/2342) — `feat(SPE-781): tiered reveal payloads — slice 1 + scouting integration`           |
| **Shipped scope** | Deterministic reveal-payload resolver (`revealPayload.ts`) and tiered scan families                                                                          |
| **Validation**    | `revealPayload.test.ts`, `revealPayloadScoutingIntegration.test.ts`; PR #2342 test plan — targeted reveal/scouting tests, `npm run lint`, `npm run test:run` |

## Goal (implemented)

Introduce a pure, deterministic reveal-payload resolver so scans can return **presence, category, active protection, hostility, or exact identity** in separate tiers instead of all-or-nothing truth.

Slice 1 is domain-only in scope — no UI wiring or encounter integration in this slice (scouting integration shipped as slice 2 in the same PR).

## Shipped artifacts (slice 1)

| Area                            | Files                                                    |
| ------------------------------- | -------------------------------------------------------- |
| Reveal taxonomy + scan families | `src/domain/revealPayload.ts`                            |
| Deterministic tests             | `src/test/revealPayload.test.ts`                         |
| Archived prototype guard        | `src/test/archivedPrototypeHygiene.test.ts` (backlog #5) |

## Shipped acceptance evidence (SPE-781 subset)

- [x] Detection returns presence/category without exact identity when layers block deeper tiers
- [x] Reveal action strips concealment layers before deeper tiers resolve
- [x] Active-effect scan shows active effects while dormant effects stay hidden
- [x] Targeted tests cover tier payloads, conceal reduction, ambiguous output policy, and absent/blocked edge cases

## Slice 2 (shipped in same PR #2342)

See `planning/reveal-payload-slice-2.md` — scouting integration via `resolveScoutingWithRevealPayload` in `src/domain/revealPayloadScoutingIntegration.ts`.

## Out of scope (later slices)

- Full hidden-modality matrix (`architecture/hidden-state-displacement-counter-detection.md`)
- Encounter / equipment scan integration (beyond scouting)
- Player-facing report copy for tiered payloads
- False-detection / instrumentation attack modalities

## See also

- Linear [SPE-781](https://linear.app/spectranoir/issue/SPE-781)
- `architecture/hidden-state-displacement-counter-detection.md` — SPE-70 modalities
- `docs/unknown-interaction-runtime.md` — SPE-59 provisional vs confirmed identity
