import { describe, expect, it } from 'vitest'
import { FIXTURE_CANON_RULE, FIXTURE_ESTABLISHED_FACT } from './crossPropertyCanonHandoff'
import {
  validateAuthoredReferenceIntegrity,
  type AuthoredContentIntegrityRecord,
} from './authoredIncidentReferenceIntegrity'
import {
  createEmptySharedUniverseCanonReleaseCatalog,
  materializeSharedUniverseRelease,
} from './sharedUniverseCanonReleaseCatalog'

function freezeRecords(
  records: AuthoredContentIntegrityRecord[],
): readonly AuthoredContentIntegrityRecord[] {
  return Object.freeze(
    records.map((r) =>
      Object.freeze({
        ...r,
        references: Object.freeze([...r.references]),
      }),
    ),
  )
}

describe('SPE-3139 authored incident reference integrity', () => {
  it('accepts a valid governed reference from an explicit root', () => {
    const records = freezeRecords([
      {
        recordId: 'incident:root',
        kind: 'incident',
        references: [
          {
            fieldPath: 'hazardId',
            targetId: 'hazard:bleed',
            expectedKind: 'hazard',
          },
        ],
      },
      {
        recordId: 'hazard:bleed',
        kind: 'hazard',
        references: [],
      },
    ])
    const result = validateAuthoredReferenceIntegrity({
      records,
      rootIds: ['incident:root'],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects a missing referenced id as dangling_reference', () => {
    const result = validateAuthoredReferenceIntegrity({
      records: freezeRecords([
        {
          recordId: 'incident:root',
          kind: 'incident',
          references: [
            {
              fieldPath: 'hazardId',
              targetId: 'hazard:missing',
              expectedKind: 'hazard',
            },
          ],
        },
      ]),
      rootIds: ['incident:root'],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const dangling = result.diagnostics.find((d) => d.code === 'dangling_reference')
    expect(dangling?.sourceRecordId).toBe('incident:root')
    expect(dangling?.fieldPath).toBe('hazardId')
    expect(dangling?.referencedId).toBe('hazard:missing')
  })

  it('rejects a wrong-kind reference', () => {
    const result = validateAuthoredReferenceIntegrity({
      records: freezeRecords([
        {
          recordId: 'incident:root',
          kind: 'incident',
          references: [
            {
              fieldPath: 'hazardId',
              targetId: 'case:alpha',
              expectedKind: 'hazard',
            },
          ],
        },
        {
          recordId: 'case:alpha',
          kind: 'case',
          references: [],
        },
      ]),
      rootIds: ['incident:root'],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const wrong = result.diagnostics.find((d) => d.code === 'wrong_kind')
    expect(wrong?.expectedKind).toBe('hazard')
    expect(wrong?.resolvedKind).toBe('case')
  })

  it('reports unreachable eligible records without misclassifying a root with zero inbound', () => {
    const result = validateAuthoredReferenceIntegrity({
      records: freezeRecords([
        {
          recordId: 'incident:root',
          kind: 'incident',
          references: [],
        },
        {
          recordId: 'hazard:orphan',
          kind: 'hazard',
          references: [],
        },
      ]),
      rootIds: ['incident:root'],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(
      result.diagnostics.some(
        (d) =>
          d.code === 'unreachable_record' && d.sourceRecordId === 'hazard:orphan',
      ),
    ).toBe(true)
    expect(
      result.diagnostics.some((d) => d.sourceRecordId === 'incident:root'),
    ).toBe(false)
  })

  it('accepts a reachable cycle from an explicit root', () => {
    const result = validateAuthoredReferenceIntegrity({
      records: freezeRecords([
        {
          recordId: 'incident:a',
          kind: 'incident',
          references: [
            {
              fieldPath: 'relatedCaseId',
              targetId: 'case:b',
              expectedKind: 'case',
            },
          ],
        },
        {
          recordId: 'case:b',
          kind: 'case',
          references: [
            {
              fieldPath: 'relatedIncidentId',
              targetId: 'incident:a',
              expectedKind: 'incident',
            },
          ],
        },
      ]),
      rootIds: ['incident:a'],
    })
    expect(result.ok).toBe(true)
  })

  it('supports multiple roots with deterministic diagnostic ordering', () => {
    const records = freezeRecords([
      {
        recordId: 'incident:r1',
        kind: 'incident',
        references: [],
      },
      {
        recordId: 'incident:r2',
        kind: 'incident',
        references: [],
      },
      {
        recordId: 'hazard:z',
        kind: 'hazard',
        references: [],
      },
      {
        recordId: 'hazard:a',
        kind: 'hazard',
        references: [],
      },
    ])
    const first = validateAuthoredReferenceIntegrity({
      records,
      rootIds: ['incident:r2', 'incident:r1'],
    })
    const second = validateAuthoredReferenceIntegrity({
      records,
      rootIds: ['incident:r1', 'incident:r2'],
    })
    expect(first).toEqual(second)
    expect(first.ok).toBe(false)
    if (first.ok) return
    expect(first.diagnostics.map((d) => d.sourceRecordId)).toEqual([
      'hazard:a',
      'hazard:z',
    ])
  })

  it('skips explicitly exempt and lifecycle-exempt records for unreachable reporting', () => {
    const result = validateAuthoredReferenceIntegrity({
      records: freezeRecords([
        {
          recordId: 'incident:root',
          kind: 'incident',
          references: [],
        },
        {
          recordId: 'hazard:exempt',
          kind: 'hazard',
          references: [],
        },
        {
          recordId: 'hazard:lifecycle',
          kind: 'hazard',
          references: [],
          lifecycleExempt: true,
        },
        {
          recordId: 'hazard:ineligible',
          kind: 'hazard',
          references: [],
          validationEligible: false,
        },
      ]),
      rootIds: ['incident:root'],
      exemptRecordIds: ['hazard:exempt'],
    })
    expect(result.ok).toBe(true)
  })

  it('does not mutate the supplied record batch', () => {
    const records = freezeRecords([
      {
        recordId: 'incident:root',
        kind: 'incident',
        references: [
          {
            fieldPath: 'hazardId',
            targetId: 'hazard:bleed',
            expectedKind: 'hazard',
          },
        ],
      },
      {
        recordId: 'hazard:bleed',
        kind: 'hazard',
        references: [],
      },
    ])
    const snapshot = JSON.stringify(records)
    validateAuthoredReferenceIntegrity({ records, rootIds: ['incident:root'] })
    expect(JSON.stringify(records)).toBe(snapshot)
  })

  it('flags release-unavailable shared-universe references under a bound release', () => {
    const earlier = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_ESTABLISHED_FACT,
      { releaseLabel: 'earlier-only' },
    )
    expect(earlier.ok).toBe(true)
    if (!earlier.ok || !earlier.release) return
    const later = materializeSharedUniverseRelease(
      earlier.catalog,
      FIXTURE_CANON_RULE,
      {
        releaseLabel: 'later-rule',
        predecessorReleaseId: earlier.release.releaseId,
      },
    )
    expect(later.ok).toBe(true)
    if (!later.ok) return

    const result = validateAuthoredReferenceIntegrity({
      records: freezeRecords([
        {
          recordId: 'incident:root',
          kind: 'incident',
          references: [
            {
              fieldPath: 'promotedHazardId',
              targetId: 'hazard:bleed',
              expectedKind: 'hazard',
              sharedUniversePromotedRecordId: 'rec.rule.1',
            },
          ],
        },
        {
          recordId: 'hazard:bleed',
          kind: 'hazard',
          references: [],
        },
      ]),
      rootIds: ['incident:root'],
      boundReleaseId: earlier.release.releaseId,
      releaseCatalog: later.catalog,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'release_unavailable')).toBe(
      true,
    )
  })
})
