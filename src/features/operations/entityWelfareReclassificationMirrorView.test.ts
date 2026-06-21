import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
  projectReclassificationPressure,
  validateEntityWelfareReclassificationRecord,
  type EntityWelfareReclassificationRecord,
} from '../../domain/entityWelfareReclassificationRegistry'
import {
  formatEntityWelfareReclassificationEnumLabel,
  getEntityWelfareReclassificationMirrorView,
} from './entityWelfareReclassificationMirrorView'

function warningOnlyRecord(): EntityWelfareReclassificationRecord {
  return {
    id: 'reclass:hostile-softening-warning-only',
    label: 'Hostile posture softening review',
    priorThreatLabel: 'hostile-predator',
    proposedDisposition: 'cooperative',
    reclassificationState: 'approved',
    reviewGate: 'ethics',
    reviewArtifactRef: 'review:ethics-packet-warning',
    evidenceBundleRefs: ['evidence:behavior-week-4'],
  }
}

function permissionRecord(
  proposedDisposition: EntityWelfareReclassificationRecord['proposedDisposition']
): EntityWelfareReclassificationRecord {
  return {
    id: `reclass:${proposedDisposition}-permission-view`,
    label: `${formatEntityWelfareReclassificationEnumLabel(proposedDisposition)} permission view`,
    priorThreatLabel: 'provisional-threat',
    proposedDisposition,
    reclassificationState: 'approved',
    reviewGate: 'ethics',
    reviewArtifactRef: `review:${proposedDisposition}-permission-view`,
    evidenceBundleRefs: [`evidence:${proposedDisposition}-permission-view`],
    containmentRevisionRefs: [`revision:${proposedDisposition}-permission-view`],
  }
}

describe('entityWelfareReclassificationMirrorView (SPE-2114 slice 4)', () => {
  it('returns empty mirror when entityWelfareReclassificationRecords map is empty', () => {
    const game = createStartingState()

    expect(game.entityWelfareReclassificationRecords).toEqual({})

    const view = getEntityWelfareReclassificationMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors disposition, state, and reclassification pressure from hydrated records', () => {
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [HOSTILE_TO_COOPERATIVE_FIXTURE.id]: HOSTILE_TO_COOPERATIVE_FIXTURE,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const record = view.records[0]
    const projection = projectReclassificationPressure(HOSTILE_TO_COOPERATIVE_FIXTURE)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.terminalCount).toBe(1)
    expect(view.summary.welfareDebtLinkedCount).toBe(1)
    expect(record?.proposedDispositionLabel).toBe('Cooperative')
    expect(record?.reclassificationStateLabel).toBe('Approved')
    expect(record?.welfareDebtLinkedLabel).toBe('Yes')
    expect(record?.staffMoraleForecastLabel).toBe(projection.staffMoraleForecast?.toFixed(2))
    expect(record?.liabilityForecastLabel).toBe(projection.liabilityForecast?.toFixed(2))
    expect(record?.publicRiskForecastLabel).toBe(projection.publicRiskForecast?.toFixed(2))
  })

  it('shows pending vs terminal display from reclassificationState', () => {
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      'reclass:pending-review': {
        id: 'reclass:pending-review',
        label: 'Pending custody review',
        priorThreatLabel: 'provisional-threat',
        proposedDisposition: 'unknown',
        reclassificationState: 'pending',
      },
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const pendingRecord = view.records.find((record) => record.id === 'reclass:pending-review')
    const terminalRecord = view.records.find(
      (record) => record.id === PENDING_TO_APPROVED_FIXTURE.id
    )

    expect(view.summary.pendingCount).toBe(1)
    expect(view.summary.terminalCount).toBe(1)
    expect(pendingRecord?.reclassificationStateLabel).toBe('Pending')
    expect(terminalRecord?.reclassificationStateLabel).toBe('Approved')
  })

  it('still mirrors warning-only records with validation warning labels', () => {
    const warningRecord = warningOnlyRecord()
    expect(validateEntityWelfareReclassificationRecord(warningRecord).valid).toBe(true)

    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [warningRecord.id]: warningRecord,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const record = view.records[0]

    expect(view.summary.totalRecords).toBe(1)
    expect(record?.validationWarningLabels.length).toBe(1)
    expect(record?.reclassificationStateLabel).toBe('Approved')
  })

  it('orders records by id and is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [HOSTILE_TO_COOPERATIVE_FIXTURE.id]: HOSTILE_TO_COOPERATIVE_FIXTURE,
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      HOSTILE_TO_COOPERATIVE_FIXTURE.id,
      PENDING_TO_APPROVED_FIXTURE.id,
    ])

    const first = JSON.stringify(getEntityWelfareReclassificationMirrorView(game))
    const second = JSON.stringify(getEntityWelfareReclassificationMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatEntityWelfareReclassificationEnumLabel('sapient_remains')).toBe('Sapient Remains')
    expect(formatEntityWelfareReclassificationEnumLabel('pending')).toBe('Pending')
  })

  it('formats transition history labels from stored entries', () => {
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const record = view.records[0]

    expect(record?.transitionHistoryLabels[0]).toMatch(/^W11: Pending → Approved \(Ethics\)$/)
  })
  it('surfaces stable status-class permission labels for hydrated records', () => {
    const cooperativeRecord = permissionRecord('cooperative')
    const medicalRecord = permissionRecord('medical')
    const sapientRemainsRecord = permissionRecord('sapient_remains')
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [cooperativeRecord.id]: cooperativeRecord,
      [medicalRecord.id]: medicalRecord,
      [sapientRemainsRecord.id]: sapientRemainsRecord,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const cooperative = view.records.find((record) => record.id === cooperativeRecord.id)
    const medical = view.records.find((record) => record.id === medicalRecord.id)
    const sapientRemains = view.records.find((record) => record.id === sapientRemainsRecord.id)

    expect(cooperative?.permissionDecisionLabels).toEqual([
      'Room: Blocked',
      'File: Restricted',
      'Gear: Restricted',
      'Housing: Allowed',
      'Mission: Restricted',
    ])
    expect(medical?.permissionDecisionLabels).toEqual([
      'Room: Restricted',
      'File: Restricted',
      'Gear: Blocked',
      'Housing: Allowed',
      'Mission: Blocked',
    ])
    expect(sapientRemains?.permissionDecisionLabels).toEqual([
      'Room: Restricted',
      'File: Restricted',
      'Gear: Blocked',
      'Housing: Restricted',
      'Mission: Blocked',
    ])
  })
})
