# SPE-3387 — Facility operational post validity

| Field             | Value                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                       |
| **Issue**         | [SPE-3387](https://linear.app/spectranoir/issue/SPE-3387)                  |
| **GitHub**        | [#4281](https://github.com/JamesJedi420/containment-protocol/issues/4281)  |
| **Parent**        | [SPE-792](https://linear.app/spectranoir/issue/SPE-792) — Backlog          |
| **Staffing**      | [SPE-3134](https://linear.app/spectranoir/issue/SPE-3134) — Backlog        |
| **Branch**        | `jamesdyedbq/spe-3387-project-facility-dependency-validity-into-canonical` |
| **Base main SHA** | `5d6c7c11e28733d9715e668c85f4759bee0a564d`                                 |

Status and backlog classification describe the merge handoff and take effect on merge. Keep Linear In Progress until review, CI, and merge are verified. Closing this child does not close SPE-792 or SPE-3134.

## Approved boundary

Project one canonical operational post's effective-capacity eligibility from the SPE-3386 resolution. `capability:logistics_freshness` supports `staff-post:logistics:1`. Ready support permits that occupied post to contribute one capacity unit. Degraded support, unavailable support, a missing mapped node, or a rejected resolution withholds the unit and leaves `operationalPostId` in place. SPE-3147 still owns assignment, specialty, conflicts, and occupancy reasons. SPE-3135 still owns headcount, availability, and assigned counts. SPE-3369 stays the presentation owner.

SPE-3382 is Done. Its staffing disposition says this slice may provide post validity and must not add a facility-local staff ledger or automatic assignment. Installed effects and lifecycle status are not availability.

## API

`src/domain/facilityOperationalPostValidity.ts`

| Function                                 | Behavior                                                                                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectFacilityOperationalPostValidity` | Read one SPE-3386 resolution and return the authored post record. Order is post id. A bad resolution returns `rejected_support` and does not invent availability. |
| `indexFacilityOperationalPostValidity`   | Keep one usable record per authored post. A missing, duplicate, or contradictory record becomes `missing_support`.                                                |

Reasons are `supported`, `degraded`, `unavailable`, `missing_support`, and `rejected_support`. `supported` is the only eligible reason. `rejected_support` carries the upstream rejection when it is a known SPE-3386 or SPE-3383 code.

Cross-owner arguments, both optional:

- `queryOperationalStaffPosts(game, facilityValidity?)` attaches `facilityEligible` and `facilityReason` only for an authored occupied post. Assignment, reassignment, and unassignment commands are unchanged.
- `deriveOperationalStaffCapacity(game, facilityValidity?)` passes that argument through. For the authored occupied post, effective capacity is 1 only when staffing says assigned and the post is eligible. Assigned, headcount, and available stay on the staffing result. Omitting the argument preserves occupancy capacity and the previous result shape.

No GameState field stores this eligibility.

## Upstream contracts

SPE-3386 remains the live projection. SPE-3383 remains the pure kernel. SPE-3147 remains occupancy. SPE-3135 remains capacity counts. Callers that do not have an authoritative packet, including operational staffing presentation, staff-time allocation, and specialist labor, keep the occupancy-only call.

## Validation

Focused regression passed **37 tests across five files**: the new post-validity contract, canonical post commands, capacity derivation, the SPE-3386 input contract, and operational-post persistence. ESLint passed on the new domain module, the two staffing owners, and the new contract test. `npm run verify:backlog-handoff` passed.

## Deferred

| Item                                              | Owner                                                     | Why deferred                                                                        |
| ------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Assignment presentation of facility ineligibility | [SPE-3369](https://linear.app/spectranoir/issue/SPE-3369) | Presentation stays with the staffing surface. This slice does not change the panel. |
| Staff-time and specialist-labor callers           | Existing owners of those calls                            | They keep occupancy capacity until a caller supplies this projection.               |
| Further post mappings                             | [SPE-792](https://linear.app/spectranoir/issue/SPE-792)   | This child enables one post.                                                        |
| Supported unlock versus usable support            | [SPE-3388](https://linear.app/spectranoir/issue/SPE-3388) | Separate approved boundary.                                                         |
| Persistence, hydration, week-close, UI            | none in this child                                        | Eligibility is derived. No schema change.                                           |
