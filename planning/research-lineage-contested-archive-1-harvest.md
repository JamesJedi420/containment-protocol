# Harvest mirror — `research-lineage-contested-archive-1`

**Purpose:** Repository mirror of candidate adjudication for harvest batch `research-lineage-contested-archive-1`. Non-authoritative for Linear ownership, backlog shape, or implementation sequencing. Linear remains the source of truth.

**Canonical ledger:** [Candidate reconciliation ledger — research-lineage-contested-archive-1 (2026-11-14)](https://linear.app/spectranoir/document/candidate-reconciliation-ledger-research-lineage-contested-archive-1-4610df56a912). Batch-level canonical-ledger synchronization outcome: **`applied`**.

**Batch:** `research-lineage-contested-archive-1` — **Candidates:** `C531–C538` (8) — **Reconciled:** 2026-11-14.

**Approval basis:** Phases 1–4 delegated by the human operator for the reconciling session ("run it through phase 1-4"). No exceptional scope, canon establishment, credential handling, publication, or destructive action was requested or attempted. The run produced no backlog-shape mutation, so the delegation was used only for fold-in traceability. Delegation is a session record, not a standing grant for later batches.

**Post-review correction (2026-11-14):** human review of the first applied pass found five defects, now corrected in the ledger, the owner comments, and this mirror: two pre-existing owners were missed (`SPE-3379` organization continuity/successor identity, `SPE-3518` corpus completeness); two retained snapshots stop at exactly 8,000 characters, so the completeness claim required separate full-page review; some mechanics were presented as source facts and are now labeled CP inferences; rumor wording risked equating investigation/action with verification; and causal wording risked excluding provisional/conflicting claims that existing rules preserve. Dispositions are unchanged.

## Provenance and coverage

- Sources: four `cp-queue` Stash items — `R24T-R35B`, `6EB6-9S35`, `JPGA-P5NK`, `CEZX-PGD4`. The Stash item IDs are the only provenance handles retained.
- Structural character: one publisher locator for recovered material that is not yet inspectable; one first-person retrospective by a participant in a dissolved collective; one conceptual interview on belief-driven feedback; one revision-pinned third-party summary carrying its own citation warning.
- Read: full private intake note for all four items, plus retained `metadata.page_text` for three. **Retained-text limitation:** two snapshots stop at exactly 8,000 characters while reporting `enrichment_status: done` — `6EB6-9S35` ends mid-question and `CEZX-PGD4` ends mid-sentence. `JPGA-P5NK` is 7,914 characters and reaches the page footer. `R24T-R35B` has no page text and its enrichment is `failed`.
- **Separate full-page review (2026-11-14):** the two truncated pages were fetched and read in full outside Stash before any coverage or completeness statement. For `CEZX-PGD4` this included the later history, members/affiliates, and legacy sections beyond the cut; for `6EB6-9S35` it included the remainder of the interview. Claims depending on that material are marked accordingly.
- Completeness standard: source coverage is claimed only for material actually read, never inferred from `enrichment_status`, the 8,000-character cap, or snapshot length.
- Evidence grade: weak-to-moderate — bibliographic locator (availability only), self-interested participant account, unsupported conceptual claim, and a derivative summary with explicit citation warnings. Every accepted candidate is re-anchored to current repo or Linear state rather than to the source claim.
- Coverage limit: this batch reconciles 4 of the outstanding `cp-queue` intake. It does not claim queue exhaustion; remaining intake stays recorded as continuing work in `planning/harvest-reconciliation-index.md`.
- **No reproduced source content:** no proper nouns, institutional or personal names, dialogue, titles, or source URLs appear in this doc, the Linear ledger, the owner comments, or any repo file.

## Phase summary

| Phase                              | Result                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 — assessment/decomposition | 8 candidates normalized to atomic CP concepts; `C534` merges locator-availability and revision-drift because both are one provenance-state boundary. `C532` and `C538` stay separate: record coexistence versus cohesion mechanics                                            |
| Phase 2 — parent reconciliation    | No new parent. Owner routing corrected: `SPE-3379` and `SPE-3518` restored as primary; `SPE-174` and `SPE-1201` demoted to supporting. `SPE-3019` supplies lineage topology only; `SPE-589` is the parent for corpus completeness. All owner states re-verified at write time |
| Phase 3 — child/supporting work    | No new child; each accepted candidate is a field, guardrail, or acceptance case inside an existing boundary. Contradiction check **PASS** (all findings `RESOLVED_NO_SCOPE_CHANGE`)                                                                                           |
| Phase 4 — writeback                | Ledger document created; 11 first-pass fold-in/traceability comments plus 6 correction comments across 13 distinct owners; no issue created, retitled, reprioritized, reparented, relabeled, reassigned, or transitioned; no relationship or dependency mutation              |

## Disposition counts (mirror vocabulary)

`fold_in=7; no_op=1; contradiction_check=0; documentation_only=0; missing_boundary_candidate=0`

`contradiction_check=0` counts candidate dispositions only. Eight contradiction findings were reviewed in Phase 3 and all resolved without a scope change; none required the candidate's disposition to become `contradiction_check`. The single `no_op` is `C532`, already shipped by its owner, and must not be read as accepted new scope.

## Candidate outcomes

| ID   | CP concept                                                                                                                                              | Verdict | Disposition | Matched owner(s)                      | Mirrored change                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| C531 | Contested successor continuity after institutional rupture; formal successor, self-claimed continuity, externally accepted continuity, disputed lineage | accept  | `fold_in`   | SPE-3379; SPE-174, SPE-1378, SPE-3019 | Organization-identity allocation plus taxonomy/contest support; lineage topology only      |
| C532 | Participant retrospective and later institutional summary as coexisting records; the later summary is not automatically a correction                    | accept  | `no_op`     | SPE-2099, SPE-1069                    | Already shipped; traceability-only note, no lifecycle change                               |
| C533 | Public retelling stabilizes or alters the thing retold; competing story versions create drift; belief is never proof                                    | accept  | `fold_in`   | SPE-946, SPE-1551, SPE-854            | Belief-feedback field plus guardrail; investigation/action is not verification             |
| C534 | Unavailable primary text is availability, not content; a revision-pinned secondary summary can change meaning and carries its own reliability warning   | accept  | `fold_in`   | SPE-1910, SPE-854, SPE-1201           | Source-state values plus re-verification trigger and acceptance case                       |
| C535 | An archive completeness claim is a scoped, dated, versioned assertion; later in-scope recovery revokes it and forces dependent histories to re-verify   | accept  | `fold_in`   | SPE-3518, SPE-1201, SPE-2099          | Corpus-completeness field plus revocation event; document/record owners stay supporting    |
| C536 | Spurious causal reading of repeated numbers, dates, or intervals; a cluster is a provisional claim until corroborated                                   | accept  | `fold_in`   | SPE-3030, SPE-854                     | Causal-status value plus guardrail; provisional/conflicting claims preserved               |
| C537 | Ex-affiliates operating under the parent institution's name, symbols, or authority signals after a rupture; records lag the disavowal                   | accept  | `fold_in`   | SPE-3379, SPE-174, SPE-1378           | Authorized-affiliate, self-claimed-successor, and impersonation states plus a contest path |
| C538 | Formalization pressure (credentialing, hierarchy, publication control) as a driver of member exit and institutional dissolution                         | accept  | `fold_in`   | SPE-1068, SPE-3379, SPE-174           | Cohesion-pressure field plus acceptance case; dissolution outcome stays with its owner     |

## Candidate provenance and evidence

| ID   | Stash source(s)          | Source location context                                                                                                           | Evidence class                                                            |
| ---- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| C531 | `6EB6-9S35`; `CEZX-PGD4` | Participant retrospective on the ending and later activity; later history and members/affiliates sections beyond the retained cut | Source-stated dispute + CP inference for identity-allocation states       |
| C532 | `6EB6-9S35`; `CEZX-PGD4` | Participant account of dissolution and exit; summary framing a single coherent school                                             | Source-stated accounts + CP inference for record coexistence              |
| C533 | `JPGA-P5NK`; `CEZX-PGD4` | Interview on belief-driven feedback; intake-note framing of socially transmitted belief                                           | Unverified conceptual claim + CP inference for verification guardrail     |
| C534 | `R24T-R35B`; `CEZX-PGD4` | Locator intake note only (no page text); revision-pinned summary header and citation warnings                                     | Source-stated provenance fact + CP inference for source states            |
| C535 | `R24T-R35B`; `CEZX-PGD4` | Locator note on later-recovered material; later history and legacy sections from the separate full-page review                    | Source-stated event (full-page review) + CP inference for revocation      |
| C536 | `JPGA-P5NK`; `CEZX-PGD4` | Interview on coincidence and numerical patterns; intake-note false-causal question                                                | Unverified conceptual claim + CP inference for provisional causality      |
| C537 | `CEZX-PGD4`; `6EB6-9S35` | Members/affiliates section and affiliation denial beyond the retained cut; participant account of later activity                  | Source-stated event (full-page review) + CP inference for identity states |
| C538 | `6EB6-9S35`              | Participant account of formalization pressure, credentialing conflict, and member exit                                            | Source-stated experience + CP inference for cohesion-pressure state       |

## Contradiction findings (Phase 3)

| #   | Conflict                                                                                                                                 | Resolution                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Layered history already shipped (`C532`): a second testimony store would duplicate existing state                                        | No new testimony layer; later institutional-memory work must consume the shipped record shape                                  |
| 2   | Belief feedback versus verification (`C533`): a retelling-driven entity must not become a verification shortcut                          | Feedback is a generation input only; investigating, acting, or logging is not verifying; only corroboration moves verification |
| 3   | Provenance versus content (`C534`): a source-relationship state says nothing about the claim's truth                                     | One provenance vocabulary; no parallel confidence scale                                                                        |
| 4   | Completeness versus inventory (`C535`): a completeness claim is scoped and dated, not an archive-wide invariant                          | `SPE-3518` owns completeness; revocation updates document state and re-verifies records; history is not rewritten              |
| 5   | Coincidence versus causation (`C536`): numeric or temporal clustering must not auto-create a settled causal relation                     | Clustering may be provisional, conflicting, or unresolved; promotion to a settled `causes` needs corroboration                 |
| 6   | Institutional identity claims (`C531`, `C537`): successor claim, authorized affiliate, and impersonation must not collapse into one flag | `SPE-3379` allocates identity; `SPE-174` holds taxonomy; `SPE-1378` holds contest procedure; `SPE-3019` topology only          |
| 7   | Done-owner comment (`SPE-2099`, and `SPE-854` after state re-verification): a traceability comment must not reopen scope                 | Comments state candidate-only clarification and no lifecycle or scope change                                                   |
| 8   | Cumulative ledger: no prior batch reconciled this source family; `C510–C530` contain no conflicting disposition                          | `PASS`                                                                                                                         |

Contradiction routing authorities inspected: SPE-1085, SPE-151, SPE-2927, SPE-2928, SPE-2929.

## Owner map

| Owner                                                     | State at reconciliation       | Fold-in scope                                                                                             |
| --------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| [SPE-3379](https://linear.app/spectranoir/issue/SPE-3379) | Backlog                       | C531, C537 — primary same-identity/distinct-successor allocation; C538 dissolution-outcome co-owner       |
| [SPE-3518](https://linear.app/spectranoir/issue/SPE-3518) | Backlog                       | C535 — primary corpus/fragment completeness contract                                                      |
| [SPE-3019](https://linear.app/spectranoir/issue/SPE-3019) | Backlog (blocked by SPE-2993) | C531, C537 — lineage topology only, after `SPE-3379` allocates a distinct identity                        |
| [SPE-589](https://linear.app/spectranoir/issue/SPE-589)   | Backlog                       | Parent of `SPE-3518`; freshness/decay/reacquisition authority, no fold-in comment                         |
| [SPE-174](https://linear.app/spectranoir/issue/SPE-174)   | Backlog                       | C531, C537 — supporting institution/affiliate taxonomy; C538 institution profile; not identity allocation |
| [SPE-1378](https://linear.app/spectranoir/issue/SPE-1378) | Backlog                       | C531, C537 — contest and authority-reassignment procedure                                                 |
| [SPE-946](https://linear.app/spectranoir/issue/SPE-946)   | Backlog                       | C533 — generation and mutation of believed properties                                                     |
| [SPE-1551](https://linear.app/spectranoir/issue/SPE-1551) | Backlog                       | C533 — rumor lifecycle and promotion; investigation/action is not verification                            |
| [SPE-1910](https://linear.app/spectranoir/issue/SPE-1910) | Backlog                       | C534 — assessment and provenance states                                                                   |
| [SPE-854](https://linear.app/spectranoir/issue/SPE-854)   | Done                          | C534, C536 — intake verification and corroboration; traceability only, no reopen                          |
| [SPE-1201](https://linear.app/spectranoir/issue/SPE-1201) | Backlog                       | C534, C535 — supporting document, version, and custodial state; not corpus completeness                   |
| [SPE-3030](https://linear.app/spectranoir/issue/SPE-3030) | Backlog                       | C536 — dependency, ordering, provisional/conflicting claims, impossible-claim rejection                   |
| [SPE-2099](https://linear.app/spectranoir/issue/SPE-2099) | Done                          | C532 no-op; C535 secondary record re-verification; traceability only                                      |
| [SPE-1069](https://linear.app/spectranoir/issue/SPE-1069) | Backlog                       | C532 — institutional-memory guardrail                                                                     |
| [SPE-1068](https://linear.app/spectranoir/issue/SPE-1068) | Backlog                       | C538 — departure, retention failure, and exit pressure                                                    |
| [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | Backlog                       | Parent umbrella — integration and boundary authority only, no fold-in comment                             |

**State note:** `SPE-854` was recorded as Backlog in the initial ledger draft; re-verification on 2026-11-14 shows it completed 2026-06-17. The ledger was corrected before the first mirror commit. Its candidate note is therefore traceability-only and does not reopen the bounded intake/verification foundation.

## Boundary notes

- No candidate required a new parent, child, relationship, field mutation, or lifecycle transition.
- `C537` is not a counterintelligence leak model and does not extend the espionage/counterintelligence owner.
- `C534` creates no citation-laundering path from a locator to an accepted claim.
- `C535` is not a second completeness model; it extends the existing corpus-completeness contract.
- `C536` does not ban provisional or conflicting `causes` claims; it prevents silent promotion to a settled relation.
- `C538` adds cohesion pressure as a contributing state; it does not introduce a morale system.
- Every proposed mechanic is labeled a CP inference; only source-described events are treated as source-stated.
