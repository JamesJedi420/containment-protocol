# SPE-2102 — Containment disposition registry

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                      |
| **Issue**         | [SPE-2102](https://linear.app/spectranoir/issue/SPE-2102)                 |
| **GitHub**        | [#2159](https://github.com/JamesJedi420/containment-protocol/issues/2159) |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog       |
| **Branch**        | `jamesdyedbq/spe-2102-containment-disposition-registry-partial-tolerated` |
| **Base main SHA** | `c3b2b531b4a8d34c41ba4a17b712427f3e60d1b3`                                |

Status and backlog classification describe the merge handoff and take effect on merge. Keep Linear In Progress until review, CI, and merge are verified. Closing this child does not close SPE-1052.

## Approved boundary

Pure caller-owned containment disposition records. Validate kinds beyond a secured/breached boolean, keep two dispositions on one subject, and project a redacted operator summary. No GameState field, schema change, week-close hook, facility UI, zone lockdown, automation trigger, or case-lifecycle link.

## API

`src/domain/containmentDispositionRegistry.ts`

| Function                              | Behavior                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `validateContainmentDispositionGraph` | Normalize caller records, emit stable findings, and name one precedence winner per subject. |
| `projectDispositionForOperator`       | Redacted summary. Omits rationale and authorization unless the policy reveals that field.   |

Kinds, highest precedence first: `authorized_disruption`, `dependency_linked`, `partial`, `redirected`, `tolerated`, `socially_managed`, `incorporated_operations`, `secured`. The same kind ties to the smaller record id. Coexisting record ids stay on the subject and are sorted by code unit. Input order does not change records, findings, or precedence.

A record carries `id`, `subjectId`, `kind`, `confidence` in `0..1`, `rationaleCodes`, `dependencyNodeIds`, `failureWarnings`, and integer `reviewWeek` `>= 0`. Optional fields are `dependencyLinked`, `authorizationRef`, `alternatives`, `emergentDefensiveSideEffect`, and `highRisk`.

## Validation

| Condition                                                       | Result                                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Input is not an array, unknown kind, or a malformed record      | `malformed` error. The record is omitted and is not rewritten `secured`.         |
| Duplicate record id                                             | `duplicate_record` error. Every copy of that id is omitted.                      |
| `tolerated` without rationale                                   | `tolerated_without_rationale` error. Record omitted.                             |
| `tolerated` without alternatives                                | `tolerated_without_alternatives` error. Record omitted.                          |
| `authorized_disruption` without `authorizationRef`              | `authorized_disruption_without_authorization` error. Record omitted.             |
| `partial` with `dependencyLinked: true` and no dependency nodes | `missing_dependency_nodes` error. Record omitted.                                |
| Kind `dependency_linked` with no dependency nodes               | `missing_dependency_nodes` error. Record omitted.                                |
| Subject ids and dependency node ids form a directed cycle       | `dependency_cycle` error. Accepted records stay. Cycle members are sorted.       |
| `partial` or `tolerated` with `highRisk: true` and no warning   | `missing_failure_warning` warning. Record stays.                                 |
| `contained: boolean` used instead of a disposition kind         | `disposition_collapse` warning. Record omitted.                                  |
| `contained: boolean` beside a valid kind                        | `disposition_collapse` warning. The kind stays. The boolean does not replace it. |

`emergentDefensiveSideEffect` is metadata. It does not change `kind` to `secured`. Cycle detection walks those dependency node ids only. It does not call the SPE-3383 facility graph. There is no `breached` kind and no accidental-breach boolean.

Repeated validation of the same caller packet is byte-stable. String lists are sorted by code unit. Findings sort by severity, code, record id, subject id, then cycle members.

## Operator projection

`projectDispositionForOperator` accepts one record and `{ revealRationale, revealAuthorization }`. A record that validation would omit returns `undefined`. The summary copies `recordId`, `subjectId`, `kind`, `confidence`, `reviewWeek`, `failureWarnings`, and `alternatives`. It copies `emergentDefensiveSideEffect` when present. It copies `rationaleCodes` only when `revealRationale` is true. It copies `authorizationRef` only when `revealAuthorization` is true. It does not copy dependency node ids.

## Deferred

| Item                                  | Owner                                                     | Why deferred                                       |
| ------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Zone lockdown wire-up                 | [SPE-292](https://linear.app/spectranoir/issue/SPE-292)   | This child does not change circulation or access.  |
| Automation trigger integration        | [SPE-1021](https://linear.app/spectranoir/issue/SPE-1021) | No countermeasure reset from a disposition record. |
| Case lifecycle phase linkage          | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) | No case-phase owner call.                          |
| GameState persistence and facility UI | none in this child                                        | No persisted field and no presentation surface.    |
