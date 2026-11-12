# Harvest mirror — `panel-transcript-authoring-1`

**Purpose:** Repository mirror of candidate adjudication for harvest batch `panel-transcript-authoring-1`. Non-authoritative for Linear ownership, backlog shape, or implementation sequencing. Linear remains the source of truth.

**Canonical ledger:** [Candidate reconciliation ledger — panel-transcript-authoring-1 (2026-11-12)](https://linear.app/spectranoir/document/candidate-reconciliation-ledger-panel-transcript-authoring-1-2026-11-fc54ec1ac0cd). Batch-level canonical-ledger synchronization outcome: **`applied`**.

**Batch:** `panel-transcript-authoring-1` · **Candidates:** `C510–C520` (11) · **Reconciled:** 2026-11-12.

**Approval basis:** Phases 1–4 approved by the human operator for the reconciling session under explicit delegation ("treat this session as delegated"). Exceptional scope, canon, credential, and destructive actions stayed outside that delegation and were not attempted. Delegation is a record of the session's authority, not a standing grant for later batches.

## Provenance and coverage

- Source: a human-authored web-comic corpus that publishes creator-written complete scene and panel transcripts for each strip; Creative Commons BY-NC; recovered through Stash item `PX92-S3CT` after applying the `cp-sent` tag.
- Read: pages 1–2 of 14 (20 strips, dated 2023-04 to 2024-07).
- **Not read: 12 of 14 pages.** This batch does not claim corpus exhaustion, and no later batch may assume `C510–C520` is the source's complete mechanic set.
- Evidence is structural only: transcript shape, actor personification, enforcement framing, evidence amplification, workload arithmetic, consent framing, and naming lineage.
- **No reproduced source content:** no dialogue, character names, creator name, source URL, or setting label appears in this doc, the Linear ledger, the issue comments, or any repo file. The Stash item ID is the durable provenance handle; the external title is intentionally omitted under the CP-native translation rule.

## Phase summary

| Phase                              | Result                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 — assessment/decomposition | 11 candidates normalized to atomic CP concepts; compounds kept only where they share a state owner (`C510`/`C515` statement records; `C511`/`C516` institution identity)                        |
| Phase 2 — parent reconciliation    | No new parent; every accepted concept already has an open owner                                                                                                                                 |
| Phase 3 — child/supporting work    | No new child; each accepted candidate is a schema field, acceptance case, or contradiction rule inside an existing boundary. Contradiction check **PASS**                                       |
| Phase 4 — writeback                | Ledger document created; 11 fold-in comments on 11 owners; 1 duplicate-preservation note (12 comments total); no issue created, retitled, reprioritized, reparented, relabeled, or transitioned |

## Disposition counts (mirror vocabulary)

`fold_in=6; no_op=3; contradiction_check=2; documentation_only=0; missing_boundary_candidate=0`

`no_op=3` covers two ledger-level `REJECT` records (`C518`, `C519` — no mechanic or out of scope) and one `ALREADY_EXISTS` record (`C520`). The mirror vocabulary has no separate reject value, so rejected candidates must not be read as accepted scope.

## Candidate outcomes

| ID   | CP concept                                                                                                                                                           | Verdict | Disposition           | Matched owner(s)                       | Mirrored change                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| C510 | Panel-segmented transcript record: scene heading, relational continuity marker, action description separate from attributed speech, off-screen/voice-over provenance | accept  | `fold_in`             | SPE-3509                               | Segment schema and acceptance cases folded in                                                                                 |
| C511 | Institution, platform, or automated service as a non-person counterparty; binding commitment requires recorded representative authority                              | accept  | `fold_in`             | SPE-698 (primary), SPE-1445            | Representative permission, non-person counterparty flag, authority-attribution rule                                           |
| C512 | Enforced-but-unpublished rule: sanctions fire on an unrecorded detection trigger, creating rule/record divergence                                                    | accept  | `fold_in`             | SPE-286 (primary), SPE-1185            | `enforced_unpublished` state, detection event, divergence finding                                                             |
| C513 | Amplification must not promote a low-confidence observation; algorithmic reconstruction produces synthesized detail that cannot become identification                | accept  | `fold_in`             | SPE-1910 (primary), SPE-1201, SPE-1919 | Provenance split observation/inference/synthesis; promotion prohibition                                                       |
| C514 | A plan claim can total more than the available pool; surface the arithmetic contradiction against the commitment ledger                                              | accept  | `contradiction_check` | SPE-3463                               | Claim-side impossible-total finding; no new allocation enforcement                                                            |
| C515 | Compelled restatement retains a voluntariness/duress marker and is not read as voluntary endorsement                                                                 | accept  | `fold_in`             | SPE-3509 (primary), SPE-475            | `voluntariness` field and handoff contract                                                                                    |
| C516 | Institution rename/absorption/succession leaves unresolvable names in records; needs bidirectional alias-to-identity resolution                                      | accept  | `fold_in`             | SPE-3379 (primary), SPE-698            | Alias resolution directions, unresolved-alias finding, authorship retention                                                   |
| C517 | A record whose subject is its sole author/authority cannot validate that subject; break to a second source or stay contested                                         | accept  | `contradiction_check` | SPE-1919                               | Self-authorship integrity condition                                                                                           |
| C518 | Combining separately owned properties requires every rights holder to authorize; refusal is terminal                                                                 | deny    | `no_op`               | none (SPE-75 checked, not applicable)  | Rejected: would require an asset-licensing subsystem with no in-game owner                                                    |
| C519 | Non-human companion provides running commentary and emotional read                                                                                                   | deny    | `no_op`               | none                                   | Rejected: no durable state, trigger, or validation path                                                                       |
| C520 | Staff distress framed as an individual therapy conversation                                                                                                          | deny    | `no_op`               | SPE-1615                               | Rejected as `ALREADY_EXISTS`: operator resilience already modeled, distinct from fatigue channels and responder energy budget |

## Contradiction findings (Phase 3)

| #   | Conflict                                                                                                                                                                                                                          | Resolution                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Ontology: institution/automation as an actor class would collide with the living-actor taxonomy (`src/domain/actorTaxonomy.ts`, SPE-1064 `ActorClass` = human/animal/anomalous/humanoid/spirit/construct/servitor/possessed host) | Institution identity stays in SPE-698; no class added; `RESOLVED_NO_SCOPE_CHANGE`                      |
| 2   | Ownership: SPE-1241 is `Duplicate` of SPE-1201; the visual capture-provenance half of C513 must not recreate the merged boundary                                                                                                  | Capture provenance to SPE-1201; promotion rule to SPE-1910; SPE-1241 receives a preservation note only |
| 3   | Implementation evidence: `src/domain/staffTimeAllocation.ts` `commitStaffTime` already blocks double-booking, insufficient effective capacity, and destination conflicts                                                          | C514 is a claim-vs-ledger contradiction, not new enforcement; no duplicate validator                   |
| 4   | Ownership: `src/domain/interrogationSelfIncrimination.ts` (SPE-475) owns coercion-to-confession; C515 only owns downstream statement provenance                                                                                   | Separate owners, cross-referenced; no merged boundary                                                  |
| 5   | State contract: SPE-3379 records that authority-graph `precursor`/`successor` edges are relationship records and do not allocate identity                                                                                         | C516 alias resolution consumes the identity decision; no second allocator                              |
| 6   | Visibility guardrail: unpublished enforcement must not grant the player hidden knowledge or imply legitimacy                                                                                                                      | C512 exposes divergence through sanction evidence only                                                 |
| 7   | Cumulative ledger: no prior batch reconciled this source; no earlier decision contradicted or revived                                                                                                                             | `PASS`                                                                                                 |

Contradiction routing authorities inspected: SPE-2927, SPE-2928, SPE-2929, SPE-151.

## Owner map

| Owner                                                     | State at reconciliation | Fold-in scope                                                                |
| --------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| [SPE-3509](https://linear.app/spectranoir/issue/SPE-3509) | Backlog                 | C510, C515 — segment schema and statement voluntariness                      |
| [SPE-475](https://linear.app/spectranoir/issue/SPE-475)   | Backlog                 | C515 — compelled-statement handoff                                           |
| [SPE-698](https://linear.app/spectranoir/issue/SPE-698)   | Backlog                 | C511, C516 — representative authority, non-person counterparty, alias fields |
| [SPE-1445](https://linear.app/spectranoir/issue/SPE-1445) | Backlog                 | C511 — institution vs anomaly-bearing occupant attribution                   |
| [SPE-286](https://linear.app/spectranoir/issue/SPE-286)   | Backlog                 | C512 — enforced-but-unpublished conduct rule                                 |
| [SPE-1185](https://linear.app/spectranoir/issue/SPE-1185) | Backlog                 | C512 — sanction-without-rule finding class                                   |
| [SPE-1910](https://linear.app/spectranoir/issue/SPE-1910) | Backlog                 | C513 — no evidentiary promotion through amplification                        |
| [SPE-1201](https://linear.app/spectranoir/issue/SPE-1201) | Backlog                 | C513 — capture and reconstruction provenance                                 |
| [SPE-1919](https://linear.app/spectranoir/issue/SPE-1919) | Backlog                 | C513, C517 — synthesized content and self-authored record integrity          |
| [SPE-3463](https://linear.app/spectranoir/issue/SPE-3463) | Backlog                 | C514 — claim vs capacity contradiction                                       |
| [SPE-3379](https://linear.app/spectranoir/issue/SPE-3379) | Backlog                 | C516 — continuity decision consumed by alias resolution                      |
| [SPE-1241](https://linear.app/spectranoir/issue/SPE-1241) | Duplicate of SPE-1201   | Preservation note only; do not reactivate                                    |

## Repo anchors checked (read-only)

- `src/domain/actorTaxonomy.ts` — `ActorClass` has no institution or automation class.
- `src/domain/staffTimeAllocation.ts` — `commitStaffTime` blocks `insufficient_capacity`, `conflict`, `stale_request`; capacity query derives from `deriveOperationalStaffCapacity`.
- `src/domain/interrogationSelfIncrimination.ts` — SPE-475 break-state ladder with coercion modifiers.
- `src/domain/asyncDiscussionSurface.ts` — SPE-2629 discussion/transcript retention surface; checked and rejected as an evidence-transcript owner.
- `src/domain/psychologicalResilienceRegistry.ts` — SPE-1615 operator resilience anchor.
- `src/domain/authorityGraph.ts` — predecessor/successor relationship kinds; identity allocation remains SPE-3379's.
- `planning/harvest-reconciliation-index.md` — this batch row.

## Cumulative-state note for later batches

Treat `C510–C517` as already-owned extensions of the owners above. Reproposing them against unchanged owners is a duplicate, not a new boundary. `C518–C520` were rejected and must not be revived without explicit reconsideration. The 12 unread source pages remain available for a later, separately bounded batch.
