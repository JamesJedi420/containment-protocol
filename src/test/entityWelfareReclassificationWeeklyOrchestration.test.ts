import { describe, expect, it } from 'vitest'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
  type EntityWelfareReclassificationRecord,
} from '../domain/entityWelfareReclassificationRegistry'
import {
  advanceEntityWelfareReclassificationRecordForWeek,
  applyWeeklyEntityWelfareReclassificationTick,
  resolveEntityWelfareReclassificationScheduledTransitionDueWeek,
} from '../domain/entityWelfareReclassificationWeeklyOrchestration'

function scheduledRecord(
  overrides: Partial<EntityWelfareReclassificationRecord> = {}
): EntityWelfareReclassificationRecord {
  return {
    id: 'reclass:scheduled-transition-test',
    label: 'Scheduled transition test record',
    priorThreatLabel: 'hostile-predator',
    proposedDisposition: 'cooperative',
    reclassificationState: 'pending',
    reviewGate: 'ethics',
    evidenceBundleRefs: ['evidence:behavior-week-8'],
    containmentRevisionRefs: ['revision:soft-custody-tier-1'],
    transitionHistory: [
      {
        fromState: 'pending',
        toState: 'approved',
        week: 12,
        reviewGate: 'ethics',
        reviewArtifactRef: 'review:ethics-board-packet-12',
        note: 'Ethics board approves cooperative custody.',
      },
    ],
    ...overrides,
  }
}

describe('entityWelfareReclassificationWeeklyOrchestration (SPE-2114 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyEntityWelfareReclassificationTick({}, 12)).toEqual({})
    expect(applyWeeklyEntityWelfareReclassificationTick(undefined, 12)).toEqual({})
  })

  it('resolves scheduled transition due week from pending history entry', () => {
    expect(resolveEntityWelfareReclassificationScheduledTransitionDueWeek(scheduledRecord())).toBe(12)
    expect(
      resolveEntityWelfareReclassificationScheduledTransitionDueWeek(PENDING_TO_APPROVED_FIXTURE)
    ).toBeUndefined()
  })

  it('leaves pending record unchanged while week is before the due week', () => {
    const record = scheduledRecord()
    const advanced = advanceEntityWelfareReclassificationRecordForWeek(record, 11)

    expect(advanced).toBe(record)
    expect(advanced.reclassificationState).toBe('pending')
  })

  it('applies scheduled reclassification state and review refs when week reaches due week', () => {
    const record = scheduledRecord()
    const advanced = advanceEntityWelfareReclassificationRecordForWeek(record, 12)

    expect(advanced).not.toBe(record)
    expect(advanced.reclassificationState).toBe('approved')
    expect(advanced.reviewGate).toBe('ethics')
    expect(advanced.reviewArtifactRef).toBe('review:ethics-board-packet-12')
    expect(advanced.transitionHistory).toEqual(record.transitionHistory)
    expect(advanced.evidenceBundleRefs).toEqual(record.evidenceBundleRefs)
  })

  it('is idempotent when re-applied after scheduled transition for the same week', () => {
    const record = scheduledRecord()
    const once = advanceEntityWelfareReclassificationRecordForWeek(record, 12)
    const twice = advanceEntityWelfareReclassificationRecordForWeek(once, 12)

    expect(twice).toBe(once)
    expect(twice.reclassificationState).toBe('approved')
  })

  it('preserves synced terminal fixtures without mutation', () => {
    expect(advanceEntityWelfareReclassificationRecordForWeek(PENDING_TO_APPROVED_FIXTURE, 30)).toBe(
      PENDING_TO_APPROVED_FIXTURE
    )
    expect(advanceEntityWelfareReclassificationRecordForWeek(HOSTILE_TO_COOPERATIVE_FIXTURE, 30)).toBe(
      HOSTILE_TO_COOPERATIVE_FIXTURE
    )
  })

  it('leaves pending records without authored week gates unchanged', () => {
    const record = scheduledRecord({
      transitionHistory: [],
    })

    const advanced = advanceEntityWelfareReclassificationRecordForWeek(record, 20)

    expect(advanced).toBe(record)
  })

  it('does not mutate invalid post-tick records', () => {
    const record = scheduledRecord({
      evidenceBundleRefs: undefined,
      transitionHistory: [
        {
          fromState: 'pending',
          toState: 'approved',
          week: 10,
          reviewGate: 'ethics',
          reviewArtifactRef: 'review:ethics-packet-1',
        },
      ],
    })

    const advanced = advanceEntityWelfareReclassificationRecordForWeek(record, 12)

    expect(advanced).toBe(record)
  })

  it('does not mutate records when last history state mismatches current state', () => {
    const record = scheduledRecord({
      reclassificationState: 'denied',
    })

    const advanced = advanceEntityWelfareReclassificationRecordForWeek(record, 20)

    expect(advanced).toBe(record)
  })

  it('preserves warning-only validation records after tick', () => {
    const record = scheduledRecord({
      reclassificationState: 'approved',
      reviewGate: 'ethics',
      reviewArtifactRef: 'review:ethics-board-packet-12',
      evidenceBundleRefs: ['evidence:behavior-week-8'],
      transitionHistory: [
        {
          fromState: 'pending',
          toState: 'approved',
          week: 12,
          reviewGate: 'ethics',
          reviewArtifactRef: 'review:ethics-board-packet-12',
        },
      ],
    })

    const warningOnly = {
      ...record,
      priorThreatLabel: 'hostile-predator',
      proposedDisposition: 'cooperative' as const,
      containmentRevisionRefs: undefined,
    }

    const advanced = advanceEntityWelfareReclassificationRecordForWeek(warningOnly, 20)

    expect(advanced).toBe(warningOnly)
  })

  it('applies tick in stable id order without mutating unchanged records', () => {
    const scheduled = scheduledRecord()
    const terminal = PENDING_TO_APPROVED_FIXTURE
    const map = {
      [terminal.id]: terminal,
      [scheduled.id]: scheduled,
    }

    const next = applyWeeklyEntityWelfareReclassificationTick(map, 12)

    expect(next[scheduled.id]?.reclassificationState).toBe('approved')
    expect(next[terminal.id]).toBe(terminal)
  })
})
