# Concealment activation event feed (SPE-2107 follow-up)

## Goal

When weekly `applyConcealmentActivationToCase` first applies hidden or displaced presence on an in-progress case, emit a deterministic operation event and weekly report note that surfaces `activation.reason` for the front desk / event feed.

## Scope

- `concealment.activated` event draft from `advanceWeek` when `hiddenState` transitions from unset to `hidden` or `displaced`
- Human-readable `summary` derived from `reason` (authored trigger, per-case flag, tag bridge, recon bridge)
- Event feed + report note wiring (mirror infiltration probe events)

## Out of scope

- Re-activation when already concealed
- Case prep UI changes (shipped in weekly prep panel)
- Full SPE-781 modality matrix

## Acceptance

- [x] `advanceWeek` emits `concealment.activated` with `mode`, `reason`, and `summary` on first activation
- [x] Event appears in `game.events` and weekly `report.notes`
- [x] Event feed renders title/detail with case link
- [x] Tests: summary formatter + integration on conceal flags and authored triggers

## See also

- `planning/concealment-case-prep-slice.md` (prep UI + consolidation done)
- `src/domain/hiddenStateActivation.ts`
- `src/test/advanceWeek.concealmentActivation.integration.test.ts`
