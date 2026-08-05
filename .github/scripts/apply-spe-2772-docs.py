from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one {label}, found {count}")
    return text.replace(old, new)


audit_path = Path("docs/department-workshop-queue-audit.md")
audit = audit_path.read_text()

owner = "| Completion unsafe-processing safety           | `resolveDepartmentWorkshopCompletionSafety` (#3411)             |"
audit = replace_once(
    audit,
    owner,
    owner
    + "\n| Live facility safety projection               | `departmentWorkshopFacilityMapping.ts` + `departmentWorkshopLiveFacilitySafety.ts` (SPE-2772) |",
    "safety owner row",
)

stale = """Live facility/staff projection into quality or safety conditions remains a
later SPE-1028 child (`planning/spe-1028-workshop-live-safety-inputs-slice.md`
for safety) and is **blocked on an explicit mapping seam**. SPE-2781, SPE-2782,
and SPE-2783 provide explicit dependency, equipment, and reagent adapters, not
live projection. Until those seams
exist: do not invent `FacilityEffect` safety keys, `departmentId → facilityId`
lookups, status/level heuristics, or staff-to-workshop assignment; week-close
must continue to omit `safetyConditionsByWorkOrderId` (and quality maps) so
register stays all-good; `resolveDepartmentWorkshopCompletionSafety` remains
the sole grading authority for caller-owned stubs.
"""
current = """SPE-2772 now supplies one authored live-facility safety path without changing
the receipt or grading authority. `department:biohazard-response` maps the
canonical `research_lab` facility to isolation, ventilation, and PPE. A pure
exact-work-order projector reads current `facilityState`, and the bounded
registration wrapper passes those transient conditions to the existing
registrar. Only `active` is good; absent or non-active mapped facilities are
poor. Unmapped departments keep the all-good fallback. Existing receipts win,
so save/load replay never regrades historical safety. No facility-effect keys,
persisted input state, staff assignment, authorization projection, quality
wiring, or additional week-close hook were added.
"""
audit = replace_once(audit, stale, current, "stale live-safety paragraph")

stale_boundary = """- Do not add UI, adjacency, research, or crafting behavior under this kernel.
  SPE-2768 may grade quality and #3411 may grade safety on completion receipts
  from caller-owned conditions only; neither invents live facility/staff wiring
  or inventory mutation. Live safety projection is tracked as Backlog under
  `planning/spe-1028-workshop-live-safety-inputs-slice.md` and must not ship
  without an explicit mapping seam. Secondary-incident spawn from durable
  `unsafe` receipts is owned by the week-close consumer (#3414 /
  `planning/spe-1028-workshop-unsafe-secondary-incident-slice.md`).
"""
current_boundary = """- Do not add UI, adjacency, research, or crafting behavior under this kernel.
  SPE-2768 grades quality and #3411 grades safety on completion receipts. SPE-2772
  may supply only authored transient facility conditions through the existing
  registrar; broader staff, equipment, clearance, authorization, and quality
  projection remain separate owners. Secondary-incident spawn from durable
  `unsafe` receipts is owned by the week-close consumer (#3414 /
  `planning/spe-1028-workshop-unsafe-secondary-incident-slice.md`).
"""
audit = replace_once(audit, stale_boundary, current_boundary, "stale isolation boundary")

test_anchor = "- `src/test/departmentWorkshopQueue.test.ts`"
audit = replace_once(
    audit,
    test_anchor,
    "- `src/domain/departmentWorkshopFacilityMapping.test.ts`\n"
    "- `src/test/departmentWorkshopLiveFacilitySafety.integration.test.ts`\n"
    + test_anchor,
    "test-list anchor",
)
audit_path.write_text(audit)

backlog_path = Path("planning/backlog.md")
backlog = backlog_path.read_text()
old_handoff = """**Current handoff (primary):** (none) — select another unblocked SPE-1028 parent acceptance row after SPE-2788. [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772) stays **Backlog** (mapping seam blocked). Parent [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) returns to **Backlog** after the child merges.

**In progress:** (none)
"""
new_handoff = """**Current handoff (primary):** [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/canonical-live-facility-workshop-safety-integration) — authored production facility mapping plus canonical week-close safety projection; branch `jamesdyedbq/spe-2772-canonical-live-facility-workshop-safety-integration`. Parent [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) remains open.

**In progress:** SPE-2772 / GitHub #3419.
"""
backlog = replace_once(backlog, old_handoff, new_handoff, "stale handoff block")

old_row = "| `spe-1028-workshop-live-safety-inputs-slice.md`                           | **Backlog**     | [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/live-facilitystaff-workshop-safety-inputs-mapping-seam-required) / [#3419](https://github.com/JamesJedi420/containment-protocol/issues/3419) — live facility/staff → workshop safety inputs blocked on an explicit mapping seam; current contract remains caller-owned stubs + week-close omit → all-good; parent SPE-1028 remains In Progress. |"
new_row = "| `spe-1028-workshop-live-safety-inputs-slice.md`                           | **In review**   | [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/canonical-live-facility-workshop-safety-integration) / [#3419](https://github.com/JamesJedi420/containment-protocol/issues/3419) — authored facility mapping, exact-work-order projection, and canonical week-close registration through the existing grader; no schema or second hook; parent SPE-1028 remains open. |"
backlog = replace_once(backlog, old_row, new_row, "stale index row")
backlog_path.write_text(backlog)
