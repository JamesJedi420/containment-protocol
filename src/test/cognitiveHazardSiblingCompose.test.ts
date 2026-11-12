import { describe, expect, it } from 'vitest'

import type { CognitiveHazardExposureRecord } from '../domain/cognitiveHazardEngine'
import {
  composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords,
  derivePropagationResistanceTagsForExposureRecord,
  listCognitiveHazardSiblingLinks,
  listSelfCensoringInformationRecordsForExposureRecord,
  refsLinkCognitiveHazardExposureToSelfCensoringInformation,
  resolveCognitiveHazardSiblingRefKeys,
} from '../domain/cognitiveHazardSiblingCompose'
import {
  REDISCOVERY_LOOP_RECORD_FIXTURE,
  STUDY_BLOCKED_ARCHIVE_FIXTURE,
  type SelfCensoringInformationRecord,
} from '../domain/selfCensoringInformationRegistry'

function exposureRecord(
  overrides: Partial<CognitiveHazardExposureRecord> = {}
): CognitiveHazardExposureRecord {
  return Object.freeze({
    id: 'cognitive-hazard:sibling-compose-test',
    label: 'Sibling compose test exposure profile',
    subjectRef: 'case:facility-roster-audit-12',
    activeTriggerChannels: Object.freeze(['reference_description'] as const),
    fearPressure: 0.2,
    memeticExposure: 0.15,
    memoryImpairmentBand: 'intact',
    countermeasurePosture: 'none',
    ...overrides,
  })
}

describe('cognitiveHazardSiblingCompose (SPE-1309 slice 4)', () => {
  it('is a no-op for empty maps without throwing', () => {
    expect(
      composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords({}, {})
    ).toEqual({})
    expect(
      composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(undefined, undefined)
    ).toEqual({})
    expect(
      composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
        { [exposureRecord().id]: exposureRecord() },
        {}
      )
    ).toEqual({
      [exposureRecord().id]: exposureRecord(),
    })
    expect(
      composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
        {},
        { [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE }
      )
    ).toEqual({})
  })

  it('links exposure subjectRef to sibling parentCaseRef via parent_case_ref match kind', () => {
    const record = exposureRecord()
    const links = listCognitiveHazardSiblingLinks(
      { [record.id]: record },
      { [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE }
    )

    expect(links).toEqual([
      {
        exposureRecordId: record.id,
        selfCensoringInformationId: REDISCOVERY_LOOP_RECORD_FIXTURE.id,
        matchKind: 'parent_case_ref',
        linkedRef: 'case:facility-roster-audit-12',
      },
    ])
    expect(
      refsLinkCognitiveHazardExposureToSelfCensoringInformation(
        record,
        REDISCOVERY_LOOP_RECORD_FIXTURE
      )
    ).toBe(true)
  })

  it('links exposure subjectRef to sibling info record id via info_record_id match kind', () => {
    const record = exposureRecord({
      id: 'cognitive-hazard:info-id-link',
      subjectRef: REDISCOVERY_LOOP_RECORD_FIXTURE.id,
    })

    const links = listCognitiveHazardSiblingLinks(
      { [record.id]: record },
      { [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE }
    )

    expect(links).toEqual([
      {
        exposureRecordId: record.id,
        selfCensoringInformationId: REDISCOVERY_LOOP_RECORD_FIXTURE.id,
        matchKind: 'info_record_id',
        linkedRef: REDISCOVERY_LOOP_RECORD_FIXTURE.id,
      },
    ])
  })

  it('merges sibling propagation-resistance tags into active trigger channels with deterministic sort', () => {
    const record = exposureRecord()
    const composed = composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
      { [record.id]: record },
      { [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE }
    )

    expect(composed[record.id]).not.toBe(record)
    expect(composed[record.id]?.activeTriggerChannels).toEqual([
      'memory_interaction',
      'recording_mediated',
      'reference_description',
    ])
    expect(derivePropagationResistanceTagsForExposureRecord(record, {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
    })).toEqual(['cognition_fail', 'forgetting', 'record_decay'])
  })

  it('leaves unlinked exposure records unchanged when sibling map is populated', () => {
    const record = exposureRecord({
      subjectRef: 'case:unrelated-audit-99',
    })

    const composed = composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
      { [record.id]: record },
      {
        [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
        [STUDY_BLOCKED_ARCHIVE_FIXTURE.id]: STUDY_BLOCKED_ARCHIVE_FIXTURE,
      }
    )

    expect(composed[record.id]).toBe(record)
    expect(listSelfCensoringInformationRecordsForExposureRecord(record, {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
    })).toEqual([])
  })

  it('preserves records when compose adds no new channels', () => {
    const record = exposureRecord({
      activeTriggerChannels: Object.freeze([
        'direct_perception',
        'memory_interaction',
        'recording_mediated',
        'reference_description',
      ] as const),
    })

    const composed = composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
      { [record.id]: record },
      { [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE }
    )

    expect(composed[record.id]).toBe(record)
  })

  it('merges tags from multiple linked sibling records in sorted order', () => {
    const siblingA: SelfCensoringInformationRecord = Object.freeze({
      ...REDISCOVERY_LOOP_RECORD_FIXTURE,
      id: 'info:linked-a',
      propagationResistance: Object.freeze(['forgetting'] as const),
    })
    const siblingB: SelfCensoringInformationRecord = Object.freeze({
      ...STUDY_BLOCKED_ARCHIVE_FIXTURE,
      id: 'info:linked-b',
      parentCaseRef: 'case:facility-roster-audit-12',
    })
    const record = exposureRecord()

    const composed = composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
      { [record.id]: record },
      {
        [siblingA.id]: siblingA,
        [siblingB.id]: siblingB,
      }
    )

    expect(composed[record.id]?.activeTriggerChannels).toEqual([
      'memory_interaction',
      'recording_mediated',
      'reference_description',
    ])
  })

  it('preserves source record when post-compose candidate fails validation', () => {
    const record = exposureRecord({
      id: '',
      subjectRef: 'case:facility-roster-audit-12',
    })

    const composed = composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
      { [record.id]: record },
      { [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE }
    )

    expect(composed[record.id]).toBe(record)
  })

  it('is byte-stable when compose is repeated', () => {
    const record = exposureRecord()
    const siblings = { [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE }
    const first = composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
      { [record.id]: record },
      siblings
    )
    const second = composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(first, siblings)

    expect(second).toEqual(first)
  })

  it('expands sibling ref keys for namespace prefix variants', () => {
    expect(resolveCognitiveHazardSiblingRefKeys('case:facility-roster-audit-12')).toEqual([
      'case:facility-roster-audit-12',
      'facility-roster-audit-12',
    ])
  })
})
