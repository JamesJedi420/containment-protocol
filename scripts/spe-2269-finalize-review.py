import json
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if text.count(old) != 1:
        raise SystemExit(f'Expected exactly one {label} anchor.')
    return text.replace(old, new)


domain = Path('src/domain/deployableReadiness.ts')
domain_text = domain.read_text()
domain.write_text(
    replace_once(
        domain_text,
        '.sort((left, right) => left.localeCompare(right))',
        '.sort()',
        'localeCompare sort',
    )
)

tests = Path('src/test/deployableReadiness.test.ts')
test_text = tests.read_text()
test_anchor = """    expect(validateReadinessCompositionRecord(tampered)).toEqual({
      valid: false,
      issues: ['field-reliability-score-mismatch', 'readiness-band-mismatch'],
    })

    expect(
      validateReadinessCompositionRegistry({
"""
test_replacement = """    expect(validateReadinessCompositionRecord(tampered)).toEqual({
      valid: false,
      issues: ['field-reliability-score-mismatch', 'readiness-band-mismatch'],
    })

    expect(
      validateReadinessCompositionRecord({
        ...valid,
        missingInputs: ['gear'],
      })
    ).toEqual({
      valid: false,
      issues: ['missing-inputs-mismatch'],
    })

    expect(
      validateReadinessCompositionRegistry({
"""
tests.write_text(replace_once(test_text, test_anchor, test_replacement, 'tamper-test'))

slice_doc = Path('planning/spe-2269-deployable-readiness-composition-slice.md')
slice_text = slice_doc.read_text()
slice_doc.write_text(
    replace_once(
        slice_text,
        '| **Status** | **In progress** |',
        '| **Status** | **Shipped** |',
        'active slice status',
    )
)

manifest_path = Path('planning/backlog-handoff-manifest.json')
manifest = json.loads(manifest_path.read_text())
manifest['primary'] = None
manifest['inProgress'] = []
manifest['recentlyShipped'] = (
    ['SPE-2269']
    + [issue_id for issue_id in manifest.get('recentlyShipped', []) if issue_id != 'SPE-2269']
)[:12]
manifest.setdefault('sliceDocStatus', {})[
    'planning/spe-2269-deployable-readiness-composition-slice.md'
] = 'Shipped'
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')

backlog = Path('planning/backlog.md')
backlog_text = backlog.read_text()
old_primary = '**Current handoff (primary):** [SPE-2269](https://linear.app/spectranoir/issue/SPE-2269/deployable-readiness-composition-registry-slice-1) — implement the bounded deterministic certification + equipment-tier + operative-condition readiness composition registry on PR #3469. Parent [SPE-1023](https://linear.app/spectranoir/issue/SPE-1023/response-team-readiness-patrol-and-alert-doctrine-layer) remains open for the broader response-doctrine boundary.'
new_primary = '**Current handoff (primary):** (none) — SPE-2269 is merge-ready and recorded as shipped on PR #3469; select the next evidence-backed bounded child after merge. Parent [SPE-1023](https://linear.app/spectranoir/issue/SPE-1023/response-team-readiness-patrol-and-alert-doctrine-layer) remains open for patrol, alerts, deployment cost, specialist-unit fit, provisional regional coverage, and mission-specific assessment.'
old_progress = '**In progress:** [SPE-2269](https://linear.app/spectranoir/issue/SPE-2269/deployable-readiness-composition-registry-slice-1) — pure registry, validation, targeted tests, and bounded planning handoff; no mission ranking, persistence, routing, or UI integration.'
new_progress = '**In progress:** (none)'
shipped_anchor = '**Recently shipped:** [SPE-2792](https://linear.app/spectranoir/issue/SPE-2792/canonical-live-facility-workshop-room-condition-quality-integration)'
shipped_line = '**Recently shipped:** [SPE-2269](https://linear.app/spectranoir/issue/SPE-2269/deployable-readiness-composition-registry-slice-1) — pure deterministic certification, equipment-tier, and operative-condition composition registry with fail-closed missing inputs, bounded readiness bands, recomputed validation, stable code-unit ordering, and targeted tests; PR #3469; parent SPE-1023 remains open.'
old_row = '| `spe-2269-deployable-readiness-composition-slice.md`                    | **In progress** | [SPE-2269](https://linear.app/spectranoir/issue/SPE-2269/deployable-readiness-composition-registry-slice-1) / [#2376](https://github.com/JamesJedi420/containment-protocol/issues/2376) / PR #3469 — pure certification, equipment-tier, and condition composition registry with recomputed validation; parent SPE-1023 remains open. |'
new_row = '| `spe-2269-deployable-readiness-composition-slice.md`                    | **Shipped** | [SPE-2269](https://linear.app/spectranoir/issue/SPE-2269/deployable-readiness-composition-registry-slice-1) / [#2376](https://github.com/JamesJedi420/containment-protocol/issues/2376) / PR #3469 — pure certification, equipment-tier, and condition composition registry with recomputed validation; parent SPE-1023 remains open. |'

backlog_text = replace_once(backlog_text, old_primary, new_primary, 'primary handoff')
backlog_text = replace_once(backlog_text, old_progress, new_progress, 'in-progress handoff')
backlog_text = replace_once(backlog_text, old_row, new_row, 'planning row')
if backlog_text.count(shipped_anchor) != 1:
    raise SystemExit('Expected exactly one recently-shipped insertion anchor.')
if shipped_line in backlog_text:
    raise SystemExit('SPE-2269 shipped handoff already exists.')
backlog_text = backlog_text.replace(shipped_anchor, shipped_line + '\n\n' + shipped_anchor)
backlog.write_text(backlog_text)
