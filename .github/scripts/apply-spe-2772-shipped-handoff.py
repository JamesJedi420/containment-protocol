import json
from pathlib import Path

backlog_path = Path('planning/backlog.md')
backlog = backlog_path.read_text()

old_handoff = """**Current handoff (primary):** [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/canonical-live-facility-workshop-safety-integration) — authored production facility mapping plus canonical week-close safety projection; branch `jamesdyedbq/spe-2772-canonical-live-facility-workshop-safety-integration`. Parent [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) remains open.

**In progress:** SPE-2772 / GitHub #3419.

**Recently shipped:** [SPE-2788](https://linear.app/spectranoir/issue/SPE-2788/deterministic-department-workshop-activation-from-completed)"""
new_handoff = """**Current handoff (primary):** (none) — SPE-2772 is shipped; select the next evidence-backed unblocked child. Parent [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) remains open.

**In progress:** (none)

**Recently shipped:** [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/canonical-live-facility-workshop-safety-integration) — authored `facility:biohazard-response-lab` mapping projects live isolation, ventilation, and PPE conditions to exact completed biohazard-response work orders at canonical week-close through the existing sole safety grader; unmapped siblings retain fallback and stored receipts remain replay-stable; PR #3462; parent SPE-1028 remains open.

**Recently shipped:** [SPE-2788](https://linear.app/spectranoir/issue/SPE-2788/deterministic-department-workshop-activation-from-completed)"""
if backlog.count(old_handoff) != 1:
    raise SystemExit(f'Expected one active SPE-2772 handoff, found {backlog.count(old_handoff)}')
backlog = backlog.replace(old_handoff, new_handoff)

old_row = "| `spe-1028-workshop-live-safety-inputs-slice.md`                           | **In review**   | [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/canonical-live-facility-workshop-safety-integration) / [#3419](https://github.com/JamesJedi420/containment-protocol/issues/3419) — authored facility mapping, exact-work-order projection, and canonical week-close registration through the existing grader; no schema or second hook; parent SPE-1028 remains open. |"
new_row = "| `spe-1028-workshop-live-safety-inputs-slice.md`                           | **Shipped**     | [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/canonical-live-facility-workshop-safety-integration) / [#3419](https://github.com/JamesJedi420/containment-protocol/issues/3419) / PR #3462 — authored facility mapping, exact-work-order projection, and canonical week-close registration through the existing grader; no schema or second hook; parent SPE-1028 remains open. |"
if backlog.count(old_row) != 1:
    raise SystemExit(f'Expected one in-review SPE-2772 index row, found {backlog.count(old_row)}')
backlog_path.write_text(backlog.replace(old_row, new_row))

manifest_path = Path('planning/backlog-handoff-manifest.json')
manifest = json.loads(manifest_path.read_text())
manifest['primary'] = None
manifest['inProgress'] = []
recent = [item for item in manifest.get('recentlyShipped', []) if item != 'SPE-2772']
manifest['recentlyShipped'] = ['SPE-2772', *recent]
manifest['sliceDocStatus']['planning/spe-1028-workshop-live-safety-inputs-slice.md'] = 'Shipped'
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
