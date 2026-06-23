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

function stateRecord(
  reclassificationState: EntityWelfareReclassificationRecord['reclassificationState'],
  proposedDisposition: EntityWelfareReclassificationRecord['proposedDisposition'] = 'cooperative'
): EntityWelfareReclassificationRecord {
  return {
    id: `reclass:${reclassificationState}-access-outcome-view`,
    label: `${formatEntityWelfareReclassificationEnumLabel(reclassificationState)} access outcome`,
    priorThreatLabel: 'provisional-threat',
    proposedDisposition,
    reclassificationState,
    reviewGate: reclassificationState === 'pending' ? 'ethics' : undefined,
    reviewArtifactRef: `review:${reclassificationState}-access-outcome-view`,
    evidenceBundleRefs: [`evidence:${reclassificationState}-access-outcome-view`],
  }
}

function siteClearanceRecord(
  reclassificationState: EntityWelfareReclassificationRecord['reclassificationState'],
  proposedDisposition: EntityWelfareReclassificationRecord['proposedDisposition'] = 'cooperative',
  scoped = true
): EntityWelfareReclassificationRecord {
  return {
    id: `reclass:${reclassificationState}-${proposedDisposition}-${scoped ? 'scoped' : 'unscoped'}-site-clearance-view`,
    label: `${formatEntityWelfareReclassificationEnumLabel(reclassificationState)} site clearance`,
    priorThreatLabel: 'provisional-threat',
    proposedDisposition,
    reclassificationState,
    reviewGate: 'ethics',
    reviewArtifactRef: `review:${reclassificationState}-site-clearance-view`,
    evidenceBundleRefs: scoped ? [`site:${reclassificationState}-evidence`] : [],
    containmentRevisionRefs: scoped ? [`facility:${reclassificationState}-revision`] : [],
  }
}

function dualLoyaltyRecord(
  id: string,
  overrides: Partial<EntityWelfareReclassificationRecord> = {}
): EntityWelfareReclassificationRecord {
  return {
    id,
    label: `${id} dual loyalty`,
    priorThreatLabel: 'routine-contact',
    proposedDisposition: 'cooperative',
    reclassificationState: 'approved',
    reviewGate: 'ethics',
    reviewArtifactRef: `review:${id}`,
    evidenceBundleRefs: [`site:${id}`],
    containmentRevisionRefs: [`facility:${id}`],
    ...overrides,
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

  it('surfaces revocation access outcomes for pending, denied, reverted, and approved records', () => {
    const deniedRecord = stateRecord('denied', 'hostile')
    const revertedRecord = stateRecord('reverted')
    const pendingRecord = stateRecord('pending', 'unknown')
    const approvedRecord = stateRecord('approved')
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [deniedRecord.id]: deniedRecord,
      [revertedRecord.id]: revertedRecord,
      [pendingRecord.id]: pendingRecord,
      [approvedRecord.id]: approvedRecord,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const denied = view.records.find((record) => record.id === deniedRecord.id)
    const reverted = view.records.find((record) => record.id === revertedRecord.id)
    const pending = view.records.find((record) => record.id === pendingRecord.id)
    const approved = view.records.find((record) => record.id === approvedRecord.id)

    expect(denied?.accessOutcomeLabels).toEqual([
      'Outcome: Blocked',
      'Trust: Blocked',
      'Blocked: File, Gear, Mission',
    ])
    expect(reverted?.accessOutcomeLabels).toEqual([
      'Outcome: Downgraded',
      'Trust: Restricted',
      'Blocked: File, Gear',
    ])
    expect(pending?.accessOutcomeLabels).toEqual(['Outcome: Restricted', 'Trust: Probation'])
    expect(approved?.accessOutcomeLabels).toEqual(['Outcome: Unchanged', 'Trust: Trusted'])
  })

  it('surfaces read-only site-clearance labels for scoped and unscoped records', () => {
    const approvedRecord = siteClearanceRecord('approved')
    const pendingRecord = siteClearanceRecord('pending', 'unknown')
    const deniedRecord = siteClearanceRecord('denied', 'hostile')
    const unscopedRecord = siteClearanceRecord('approved', 'cooperative', false)
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [approvedRecord.id]: approvedRecord,
      [pendingRecord.id]: pendingRecord,
      [deniedRecord.id]: deniedRecord,
      [unscopedRecord.id]: unscopedRecord,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const approved = view.records.find((record) => record.id === approvedRecord.id)
    const pending = view.records.find((record) => record.id === pendingRecord.id)
    const denied = view.records.find((record) => record.id === deniedRecord.id)
    const unscoped = view.records.find((record) => record.id === unscopedRecord.id)

    expect(approved?.siteClearanceLabels).toEqual([
      'Mission: Allowed',
      'Facility: Scoped',
      'Site: site:approved-evidence',
      'Facility: facility:approved-revision',
      'Reasons: base_permission_restricted_observed, facility_clearance_granted, subject_clearance_resolved',
    ])
    expect(pending?.siteClearanceLabels).toEqual([
      'Mission: Restricted',
      'Facility: Scoped',
      'Site: site:pending-evidence',
      'Facility: facility:pending-revision',
      'Reasons: facility_clearance_restricted, site_clearance_restricted',
    ])
    expect(denied?.siteClearanceLabels).toEqual([
      'Mission: Blocked',
      'Facility: Scoped',
      'Site: site:denied-evidence',
      'Facility: facility:denied-revision',
      'Reasons: facility_clearance_blocked, site_clearance_blocked',
    ])
    expect(unscoped?.siteClearanceLabels).toEqual([
      'Mission: Restricted',
      'Site: Unscoped',
      'Site: Unscoped site',
      'Reasons: missing_site_or_facility_scope',
    ])
  })

  it('surfaces read-only dual-loyalty risk labels for agency-only and medical overlaps', () => {
    const cooperativeRecord = dualLoyaltyRecord('reclass:agency-only')
    const medicalRecord = dualLoyaltyRecord('reclass:medical-overlap', {
      proposedDisposition: 'medical',
    })
    const psychReviewRecord = dualLoyaltyRecord('reclass:psych-review-overlap', {
      reviewGate: 'psych',
    })
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [cooperativeRecord.id]: cooperativeRecord,
      [medicalRecord.id]: medicalRecord,
      [psychReviewRecord.id]: psychReviewRecord,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const cooperative = view.records.find((record) => record.id === cooperativeRecord.id)
    const medical = view.records.find((record) => record.id === medicalRecord.id)
    const psychReview = view.records.find((record) => record.id === psychReviewRecord.id)

    expect(cooperative?.dualLoyaltyRiskLabels).toEqual([
      'Risk: None',
      'Primary: Agency',
      'Anchors: Agency only',
      'Reasons: no_dual_loyalty_risk, single_loyalty_anchor',
    ])
    expect(medical?.dualLoyaltyRiskLabels).toEqual([
      'Risk: Blocked',
      'Primary: Agency',
      'Anchors: Medical',
      'Restricted: Room, File, Gear, Housing, Mission',
      'Reasons: benign_medical_overlap_watch, blocked_site_clearance',
    ])
    expect(psychReview?.dualLoyaltyRiskLabels).toEqual([
      'Risk: Watch',
      'Primary: Agency',
      'Anchors: Medical',
      'Reasons: benign_medical_overlap_watch',
    ])
  })

  it('surfaces hostile and terminal-state overlays in dual-loyalty risk labels', () => {
    const rivalPriorRecord = dualLoyaltyRecord('reclass:rival-prior-overlap', {
      priorThreatLabel: 'apex contact',
    })
    const hostileRecord = dualLoyaltyRecord('reclass:hostile-overlap', {
      proposedDisposition: 'hostile',
    })
    const deniedRecord = dualLoyaltyRecord('reclass:denied-hostile-overlap', {
      proposedDisposition: 'hostile',
      reclassificationState: 'denied',
    })
    const revertedRecord = dualLoyaltyRecord('reclass:reverted-overlap', {
      reclassificationState: 'reverted',
    })
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [rivalPriorRecord.id]: rivalPriorRecord,
      [hostileRecord.id]: hostileRecord,
      [deniedRecord.id]: deniedRecord,
      [revertedRecord.id]: revertedRecord,
    }

    const view = getEntityWelfareReclassificationMirrorView(game)
    const rivalPrior = view.records.find((record) => record.id === rivalPriorRecord.id)
    const hostile = view.records.find((record) => record.id === hostileRecord.id)
    const denied = view.records.find((record) => record.id === deniedRecord.id)
    const reverted = view.records.find((record) => record.id === revertedRecord.id)

    expect(rivalPrior?.dualLoyaltyRiskLabels).toEqual([
      'Risk: Restricted',
      'Primary: Agency',
      'Anchors: Rival Containment',
      'Restricted: File, Gear, Mission',
      'Reasons: restricted_rival_containment_overlap',
    ])
    expect(hostile?.dualLoyaltyRiskLabels).toEqual([
      'Risk: Blocked',
      'Primary: Agency',
      'Anchors: Rival Containment',
      'Restricted: Room, File, Gear, Housing, Mission',
      'Reasons: blocked_site_clearance, restricted_rival_containment_overlap',
    ])
    expect(denied?.dualLoyaltyRiskLabels).toEqual([
      'Risk: Blocked',
      'Primary: Agency',
      'Anchors: Rival Containment',
      'Restricted: Room, File, Gear, Housing, Mission',
      'Reasons: blocked_site_clearance, lost_onboarding_blocked, restricted_rival_containment_overlap',
    ])
    expect(reverted?.dualLoyaltyRiskLabels).toEqual([
      'Risk: Blocked',
      'Primary: Agency',
      'Anchors: Agency only',
      'Restricted: Room, File, Gear, Housing, Mission',
      'Reasons: blocked_site_clearance, lost_onboarding_blocked, single_loyalty_anchor',
    ])
  })
})
