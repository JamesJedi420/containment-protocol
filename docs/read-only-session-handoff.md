# Read-only session handoff

**Owner:** [SPE-1705 — Design doc routing ledger](https://linear.app/spectranoir/issue/SPE-1705/design-doc-routing-ledger) (CP/Academy documentation routing).

**Purpose:** Make the findings and current authorization state of a read-only agent session portable without implying that evidence was approved, that a candidate was admitted, or that Linear was mutated.

Use this template for **review**, **docs analysis**, or **harvest-triage** sessions that inspected sources and produced no Linear or repository mutations. A read-only handoff is not the [approved implementation-session continuity contract](./agent-session-handoff.md), the [implementation closeout](./agent-session-closeout.md), or the [post-merge cloud-agent Linear handoff](./cloud-agent-linear-handoff.md). If a session actually modified files, Linear, or another authoritative record, report those writes through the owning workflow; do not label the complete session read-only.

## Canonical authority and boundaries

- The [candidate extraction and reconciliation ledger — canonical workflow](https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf) is the canonical candidate-identity, provenance, disposition and approval-state workflow. Link its _specific candidate/batch record_ when it exists; otherwise state `none / not yet recorded`. The link to the workflow itself is not proof that a candidate record exists.
- [SPE-1705](https://linear.app/spectranoir/issue/SPE-1705/design-doc-routing-ledger) routes documentation-only consequences. Neither this template nor its examples create independent planning authority.
- Linear owns approved issue scope, lifecycle and ownership; GitHub supplies implementation evidence. Repository harvest mirrors and `planning/harvest-reconciliation-index.md` are evidence/transport, not backlog authority.
- For **ChatGPT** actors, new or changed durable scope requires explicit Phase 1 design approval, Phase 2 parent approval, Phase 3 child/supporting-work approval, then authorized Phase 4 application. Do not infer approval or successful application from a summary, candidate disposition, or next-action label. Verified in-boundary lifecycle/evidence updates are a distinct class, but none is performed in a read-only session.
- **Cursor** uses its separately approved [autonomous-authority safeguards](./cursor-autonomous-authority.md). ChatGPT's Phase 1–4 gates are not Cursor's authorization system; a handoff must identify the receiving actor's actual authority without conferring new powers.
- CP core and Academy share this _documentation_ convention. Use `CP-core`, `Academy`, `shared-system` or `cross-project` when ownership is relevant, and identify one canonical implementation owner for a shared system. Do not open a second Academy ledger or handoff framework.

## Required handoff template

Copy the block below into the session's final handoff or an already-authorized documentation record. Replace placeholders with verified facts; write `none` or `unknown — verification required` rather than inventing IDs, approvals, versions or links.

```markdown
## Read-only session handoff

- Session mode: read-only
- Session type: review | docs | harvest-triage
- Workstream: CP-core | Academy | shared-system | cross-project
- Recorded at / evidence snapshot: <ISO date, source revision or "unknown">
- Linear writes: none
- Repository / external writes: none

### Issues inspected (read-only)

- <SPE-####, URL, observed status, inspection date, relationship to findings; or none>

### Evidence and uncertainty

- <finding with source URL/path, version/commit and what was actually observed>
- <uncertainty or missing evidence; or none>

### Candidate status (not automatic approval)

- <candidate/batch ID or none>
- <canonical disposition if established: fold_in | no_op | contradiction_check | documentation_only | missing_boundary_candidate; otherwise unassessed>
- <proposed or verified decision, and actual decision authority; never conflate these>
- <specific canonical ledger record URL/ID or "none / not yet recorded">
- <candidate persistence: preliminary / not recorded | durably staged / pending apply | canonically applied | none; evidence reference and next authorized actor>
- Canonical ledger workflow: https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf

### Governance / authorization state

- <actor governed: ChatGPT | Cursor | human | other named actor>
- <current phase: not started | Phase 1 | Phase 2 | Phase 3 | Phase 4 applied | not applicable>
- <explicitly approved phases, with evidence references; or none>
- <next requested mutation permitted now? yes/no, exact basis or "unknown — fail closed">

### Phase progression map (ChatGPT candidate governance)

| Phase                                                           | Status                                                                       | Evidence                                                                        | Blocker                                             | Next actor                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Phase 1 — design and decomposition                              | <not started; prepared — approval pending; human-approved; not applicable>   | <specific decision/approval link or none>                                       | <unresolved prerequisite or none>                   | <ChatGPT / human / other authorized actor> |
| Phase 2 — parent reconciliation                                 | <not started; prepared — approval pending; human-approved; not applicable>   | <specific parent disposition and approval link or none>                         | <unresolved prerequisite or none>                   | <ChatGPT / human / other authorized actor> |
| Phase 3 — child/support reconciliation and contradiction review | <not started; prepared — approval pending; human-approved; not applicable>   | <specific dispositions, contradiction-review result, and approval link or none> | <unresolved prerequisite or none>                   | <ChatGPT / human / other authorized actor> |
| Phase 4 — authorized Linear application                         | <not authorized; approved — pending apply; verified applied; not applicable> | <approval reference and verified Linear changes or none>                        | <unapproved scope, missing write evidence, or none> | <ChatGPT / human / other authorized actor> |

### Next authorized action

- Owner: ChatGPT | Cursor | human <role if relevant>
- Action: <specific read, decision, approval, or in-boundary execution; not an implied authorization>
- Prerequisites / blockers: <approval, evidence, credentials, dependencies, or none>
- Stop conditions: <unverified authority, changed issue boundary, stale or conflicting evidence, or none>
```

## Phase-map interpretation

The phase table is a **read-only, candidate-scoped snapshot**, not a replacement for canonical ledger approval evidence or the planned generated phase-state projection under [SPE-3492](https://linear.app/spectranoir/issue/SPE-3492). Populate each row from verified, current source records. Distinguish assessment/reconciliation **prepared** from **human-approved**, and Phase 4 **approved for application** from **verified applied**. If approval or application cannot be verified, state the uncertainty and block forward authorization; do not infer permissions from the table.

For ChatGPT's candidate scope-mutation flow, each required Phase 1–3 gate needs explicit human approval before moving on. A candidate disposition of `fold_in` is **not**, by itself, permission to skip parent/child reconciliation or to expand an existing issue. `not applicable` is appropriate for a verified `no_op`, a documentation-only/no-scope-change path, or a fold-in that truly creates no new durable obligation; supply the evidence and reason. Phase 4 requires the approved preceding gates and any separately required human authorization, and is `verified applied` only after inspecting actual authorized Linear results. When the next gate needs human approval, the next actor is human; once application is authorized, name the actual permitted executor.

Cursor's separately approved autonomous authority is not governed by ChatGPT's phase gates. For Cursor-only work, mark ChatGPT-specific phase rows `not applicable — Cursor authority` with an authority reference and applicable blockers, not as implicit approval. Shared CP/Academy documentation uses one canonical phase-state/approval source; do not establish a second ledger.

Hermes may carry or route an already authorized handoff, but it does not approve ChatGPT's phase gates or authorize Linear mutations. Codex and other implementation actors may execute only within an existing approved issue or slice boundary; their implementation role does not supply missing phase approval or expand scope.

## Preliminary discovery versus durable harvest completion

A **preliminary read-only** review or harvest finding may cite `none / not yet recorded` if the session only inspected sources and made no durable writes. Mark it **preliminary / not recorded**, name unsaved evidence, the next permissible reconciliation step, and the actor responsible for eventual authorized staging. This does not make intake a prerequisite for Phase 1 assessment. A handoff is not itself a persisted candidate or completed harvest batch. Existing [SPE-3495 intake](https://linear.app/spectranoir/issue/SPE-3495) owns staging.

A completed harvest triage batch must have a verified canonical candidate-ledger record or durable **pending-apply** transport linked from the existing batch/index under [SPE-3274](https://linear.app/spectranoir/issue/SPE-3274). Pending transport completes staging but **not** canonical application; only a verified ledger write may be called **canonically applied**. Ledger application is not candidate approval. [SPE-3492](https://linear.app/spectranoir/issue/SPE-3492) owns the read-only phase/status projection. Any subsequent Linear write requires the receiving actor's applicable authorization.

## Closeout and consistency checks

1. Choose **one** of `review`, `docs`, or `harvest-triage`; use `read-only` only if the session made **no** changes to Linear, files or external authoritative records. A proposed future change is not an executed change.
2. Record inspected Linear IDs with observed statuses and dates; distinguish **inspected** from **changed**. Do not imply that viewing an issue "touched" its lifecycle.
3. Cite actual evidence, revisions, and uncertainties. A reference without verified content is not a completed review.
4. Keep `proposed`, `approved`, and `applied` separate. Candidate labels are classifications, not Phase 1–4 approvals.
5. Use canonical disposition values only when grounded; `unassessed` is a handoff state, **not** a sixth canonical disposition.
6. Link the **specific** candidate ledger record if available; otherwise label **preliminary / not recorded** and identify authorized staging as outstanding. Actual pending-apply mirrors require durable batch/index references and do not prove canonical application.
7. Give exactly one next authorized action for this handoff. Name its actor and prerequisites, and fail closed if the action's authority cannot be established.
8. Do not change the triggers of implementation closeout or cloud-agent post-merge Linear handoff; this format does not replace either.

## Representative examples — illustrative only

The `EXAMPLE-*` identifiers below are **fictional fixtures**, not registered candidates, live Linear issues, approval records or instructions to mutate data.

### Review

- Session mode/type: `read-only / review`; workstream: `CP-core`; writes: `none`.
- Issues inspected: `SPE-####` (placeholder; status must be checked live).
- Evidence: review notes anchored to a specific repository commit; implementation result **unverified** until code/tests are inspected.
- Candidate: `none`; specific canonical ledger record: `none / not yet recorded`.
- Governance: no candidate approval requested; next owner **ChatGPT**; next action: inspect missing GitHub evidence. No Linear update authorized by this note.

### Docs analysis

- Session mode/type: `read-only / docs`; workstream: `shared-system`; writes: `none`.
- Issues inspected: `SPE-1705` (documentation-routing parent; status must be verified when used).
- Evidence: competing wording in two versioned docs; the proposed correction is **not yet applied**.
- Candidate: `documentation_only` **proposed**, not an approved edit; specific ledger record: `none / not yet recorded`.
- Governance: pending owner/authority check; next owner **human** if approval is required; next action: authorize the bounded documentation correction or direct the agent to the existing approved document boundary.

### Harvest triage

- Session mode/type: `read-only / harvest-triage`; workstream: `Academy`; writes: `none`.
- Issues inspected: `SPE-####` (placeholder; inspect both Academy and CP owners where relevant).
- Evidence: `EXAMPLE-C01` source packet with section/version reference; existing boundary fit not established.
- Candidate: `EXAMPLE-C01`; `missing_boundary_candidate` **proposed**; persistence: **preliminary / not recorded**; specific canonical record: `none / not yet recorded` (no durable transport exists in this read-only example).
- Governance: ChatGPT Phase 1 **not approved**; next owner **ChatGPT**; next action: return the preliminary evidence for Phase 1 assessment and identify authorized durable staging as outstanding. Neither a completed harvest nor any Phase 2/3/4 or Linear mutation is authorized.

These examples test all three session types, separation of inspected evidence from writes, ledger absence handling, actor-specific authorization, and fail-closed advancement. They do not establish a new validation service or registry.
