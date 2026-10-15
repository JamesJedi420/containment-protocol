# SPE-1667 — Site-native object removal escalation

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                      |
| **Issue**         | [SPE-1667](https://linear.app/spectranoir/issue/SPE-1667)                 |
| **GitHub**        | [#1698](https://github.com/JamesJedi420/containment-protocol/issues/1698) |
| **Parent**        | none                                                                      |
| **Branch**        | `jamesdyedbq/spe-1667-site-native-object-removal-escalation`              |
| **Base main SHA** | `ec8aae958b36b45a84dccc1fcd78c634101d3bb4`                                |

Status and backlog classification describe the merge handoff and take effect on merge. Keep Linear In Progress until review, CI, and merge are verified.

## Approved boundary

Pure caller-owned removal packets. Origin category, provenance code, removal phase, and optional containment role determine a deterministic escalation. An authorized external tool does not take the native-site path. Extraction carry-out of a native object adds return-traversal route risk and pursuit pressure. Malformed packets fail closed.

No GameState field, schema change, week-close hook, exploration-action catalog change, historical-route replay start, or UI.

SPE-1669 stays Duplicate. Its extraction carry-out acceptance is satisfied here.

## API

`src/domain/siteNativeObjectRemoval.ts`

| Function   | Behavior                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------- |
| `validate` | Accept one packet or return stable error findings. Does not rewrite a bad packet into a tool. |
| `project`  | Escalation for an accepted packet. Returns `undefined` when `validate` reports any finding.   |

Origins: `site_native_artifact`, `local_evidence`, `gifted_object`, `transformed_personal_item`, `protected_relic`, `authorized_external_tool`.

Provenance codes: `contained_record`, `unrecorded_origin`. Phases: `ingress`, `extraction`. Optional containment roles: `secured`, `exposed`.

Ingress base, before provenance or role: `gifted_object` attention 1; `local_evidence` attention 1 and instability 1; `transformed_personal_item` attention 1 and instability 2; `site_native_artifact` attention 2, instability 2, faction response 1, environmental shift 1; `protected_relic` attention 3, instability 2, faction response 2, environmental shift 2. `authorized_external_tool` stays at zero on every axis.

On a native origin, `unrecorded_origin` adds 1 attention and 1 instability. `secured` adds 1 instability. `exposed` adds 1 attention. `extraction` adds route risk 1 and pursuit pressure 1. Those modifiers do not apply to `authorized_external_tool`. An inherited `containmentRole` is not an own role and does not change escalation. `escalates` is true when any axis is above zero.

## Validation

| Condition                                                                                                                                                                           | Result                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Input is not a plain object (including a custom prototype), id is blank, id contains NUL, a key is non-enumerable or a symbol, a field is an accessor, or an unknown key is present | `malformed` error. No escalation. A token `id` stays on the finding. |
| Origin is missing or not in the closed set                                                                                                                                          | `unknown_origin` error. No escalation.                               |
| Provenance is absent, `undefined`, or `''`                                                                                                                                          | `missing_provenance` error. No escalation.                           |
| Provenance is any other string                                                                                                                                                      | `unknown_provenance` error. No escalation.                           |
| Phase is missing or not `ingress` / `extraction`                                                                                                                                    | `unknown_phase` error. No escalation.                                |
| `containmentRole` is present and not `secured` / `exposed`                                                                                                                          | `unknown_containment_role` error. No escalation.                     |

Required fields are enumerable own data properties. `validate` compares `Reflect.ownKeys` with one descriptor snapshot and copies those values onto a null prototype, so an inherited `origin` does not satisfy validation and a later key trap cannot add a field the snapshot missed. Repeated `validate` and `project` calls on the same packet are byte-stable. The input packet is not mutated.

## Deferred

| Item                                       | Owner                                                                | Why deferred                                                     |
| ------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Historical-route `remove_asset` store wire | Later SPE-1605 child after this seam; SPE-3043 ownership stop stands | This child does not start a replay or add an exploration action. |
| GameState persistence and removal UI       | none in this child                                                   | No persisted field and no presentation surface.                  |
