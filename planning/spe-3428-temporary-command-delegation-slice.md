# SPE-3428 Temporary command delegation and deterministic handback (slice 1)

## Boundary
Pure domain helper for ordinary temporary command grants. Compact envelope, issuance validation, scope authorization check, and terminal transitions (expiry, withdrawal, handback, supersession). No permanent office mutation, no authority-graph rewrite, no succession.

## Files
- `src/domain/temporaryCommandDelegation.ts`
- `src/test/temporaryCommandDelegation.test.ts`

## Validation
- `npm run test:run -- src/test/temporaryCommandDelegation.test.ts`
- `npm run lint` on changed files

## Notes
Consumes existing command-routing path; does not invent a second lifecycle. Parent SPE-1096 remains open. Infrastructure and contested reassignment remain with sibling owners.
