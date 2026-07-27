import { describe, expect, it } from 'vitest'
import {
  buildCrossJurisdictionCoordinationPacket,
  buildCrossJurisdictionCoordinationSummary,
  composeDistantReappearanceSignals,
  isDistantJurisdiction,
  projectCrossJurisdictionCoordinationPackets,
  resolveSignatureMatchBand,
} from '../domain/crossJurisdictionCoordinationPacket'
import { buildWeeklyCrossJurisdictionCoordinationReportNotes } from '../domain/crossJurisdictionCoordinationWeeklyReportNotes'
import {
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
  type InformationIntakeReportRecord,
} from '../domain/informationIntakeReport'
import { buildAgencySummary } from '../domain/agency'
import { createStartingState } from '../data/startingState'
import type { CaseInstance } from '../domain/models'

function makeCase(overrides: Partial<CaseInstance> & Pick<CaseInstance, 'id' | 'title'>): CaseInstance {
  return {
    templateId: 'tpl-test',
    description: 'test case',
    mode: 'standard',
    kind: 'standard',
    status: 'open',
    difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    tags: [],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 2,
    deadlineWeeks: 4,
    deadlineRemaining: 4,
    ...overrides,
  } as CaseInstance
}

function weakArchiveSignature(): InformationIntakeReportRecord {
  return {
    ...IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
    id: 'intake:weak-signature',
    confidenceScore: 0.1,
    verificationStatus: 'impossible',
    retainedDespiteContradiction: false,
  }
}

describe('crossJurisdictionCoordinationPacket (SPE-2702 / SPE-2716)', () => {
  it('resolves archive_signature match bands', () => {
    expect(resolveSignatureMatchBand(IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE)).toBe('tentative')
    expect(resolveSignatureMatchBand(weakArchiveSignature())).toBe('weak')
    expect(resolveSignatureMatchBand(PUBLIC_RUMOR_CONFLICT_FIXTURE)).toBe('none')
    expect(
      resolveSignatureMatchBand({
        ...IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
        verificationStatus: 'verified',
        confidenceScore: 0.9,
      })
    ).toBe('strong')
  })

  it('treats unequal jurisdiction refs as distant', () => {
    expect(isDistantJurisdiction('region:north', 'region:south')).toBe(true)
    expect(isDistantJurisdiction('region:north', 'region:north')).toBe(false)
    expect(isDistantJurisdiction('', 'region:south')).toBe(false)
  })

  it('builds identical packets for identical distant inputs', () => {
    const signal = {
      intakeReportId: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id,
      topicRef: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.topicRef,
      signatureMatchBand: 'tentative' as const,
      priorJurisdictionRef: 'region:canal-west',
      currentJurisdictionRef: 'region:harbor-east',
      priorSiteLabel: 'Closed canal site',
      currentSiteLabel: 'Harbor reappearance',
    }

    const left = buildCrossJurisdictionCoordinationPacket(signal)
    const right = buildCrossJurisdictionCoordinationPacket(signal)

    expect(left).toEqual(right)
    expect(left?.kind).toBe('shared_signature_alert')
    expect(left?.summary).toContain('region:canal-west')
    expect(left?.summary).toContain('region:harbor-east')
    expect(left?.summary).toMatch(/Shared signature alert/i)
  })

  it('returns null when jurisdictions are not distant', () => {
    expect(
      buildCrossJurisdictionCoordinationPacket({
        intakeReportId: 'intake:x',
        topicRef: 'topic:x',
        signatureMatchBand: 'strong',
        priorJurisdictionRef: 'region:same',
        currentJurisdictionRef: 'region:same',
      })
    ).toBeNull()
  })

  it('composes a packet from archive_signature + distant case regionTags', () => {
    const prior = makeCase({
      id: 'case-prior-canal',
      title: 'Canal archive case',
      status: 'resolved',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:canal-west',
    })
    const current = makeCase({
      id: 'case-current-harbor',
      title: 'Harbor reappearance',
      status: 'open',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:harbor-east',
    })

    const signals = composeDistantReappearanceSignals({
      reports: { [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE },
      cases: { [prior.id]: prior, [current.id]: current },
    })
    const packets = projectCrossJurisdictionCoordinationPackets({
      reports: { [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE },
      cases: { [prior.id]: prior, [current.id]: current },
    })

    expect(signals).toHaveLength(1)
    expect(packets).toHaveLength(1)
    expect(packets[0]?.priorJurisdictionRef).toBe('region:canal-west')
    expect(packets[0]?.currentJurisdictionRef).toBe('region:harbor-east')
  })

  it('still emits when a same-region open case sorts before a distant open case', () => {
    const prior = makeCase({
      id: 'case-a-prior',
      title: 'Canal archive case',
      status: 'resolved',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:canal-west',
    })
    const sameRegionOpen = makeCase({
      id: 'case-b-same',
      title: 'Canal follow-up',
      status: 'open',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:canal-west',
    })
    const distantOpen = makeCase({
      id: 'case-c-distant',
      title: 'Harbor reappearance',
      status: 'open',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:harbor-east',
    })

    const packets = projectCrossJurisdictionCoordinationPackets({
      reports: { [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE },
      cases: {
        [prior.id]: prior,
        [sameRegionOpen.id]: sameRegionOpen,
        [distantOpen.id]: distantOpen,
      },
    })

    expect(packets).toHaveLength(1)
    expect(packets[0]?.priorJurisdictionRef).toBe('region:canal-west')
    expect(packets[0]?.currentJurisdictionRef).toBe('region:harbor-east')
  })

  it('emits no packet when site is not distant', () => {
    const prior = makeCase({
      id: 'case-prior-same',
      title: 'Same region prior',
      status: 'resolved',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:canal-west',
    })
    const current = makeCase({
      id: 'case-current-same',
      title: 'Same region current',
      status: 'open',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:canal-west',
    })

    expect(
      projectCrossJurisdictionCoordinationPackets({
        reports: { [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE },
        cases: { [prior.id]: prior, [current.id]: current },
      })
    ).toEqual([])
  })

  it('emits no packet for open×open distant multi-region (no resolved prior)', () => {
    const openWest = makeCase({
      id: 'case-open-west',
      title: 'Open canal site',
      status: 'open',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:canal-west',
    })
    const openEast = makeCase({
      id: 'case-open-east',
      title: 'Open harbor site',
      status: 'open',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:harbor-east',
    })

    expect(
      projectCrossJurisdictionCoordinationPackets({
        reports: { [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE },
        cases: { [openWest.id]: openWest, [openEast.id]: openEast },
      })
    ).toEqual([])
  })

  it('emits no packet for resolved×resolved distant multi-region (no open current)', () => {
    const resolvedWest = makeCase({
      id: 'case-resolved-west',
      title: 'Closed canal site',
      status: 'resolved',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:canal-west',
    })
    const resolvedEast = makeCase({
      id: 'case-resolved-east',
      title: 'Closed harbor site',
      status: 'resolved',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:harbor-east',
    })

    expect(
      projectCrossJurisdictionCoordinationPackets({
        reports: { [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE },
        cases: { [resolvedWest.id]: resolvedWest, [resolvedEast.id]: resolvedEast },
      })
    ).toEqual([])
  })

  it('emits no packet for weak or non-signature intake', () => {
    const prior = makeCase({
      id: 'case-prior',
      title: 'Prior',
      status: 'resolved',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:a',
    })
    const current = makeCase({
      id: 'case-current',
      title: 'Current',
      status: 'open',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:b',
    })

    expect(
      projectCrossJurisdictionCoordinationPackets({
        reports: { [weakArchiveSignature().id]: weakArchiveSignature() },
        cases: { [prior.id]: prior, [current.id]: current },
      })
    ).toEqual([])

    expect(
      projectCrossJurisdictionCoordinationPackets({
        reports: { [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE },
        cases: { [prior.id]: prior, [current.id]: current },
      })
    ).toEqual([])
  })

  it('builds legible weekly report notes and agency summary', () => {
    const prior = makeCase({
      id: 'case-prior-canal',
      title: 'Canal archive case',
      status: 'resolved',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:canal-west',
    })
    const current = makeCase({
      id: 'case-current-harbor',
      title: 'Harbor reappearance',
      status: 'open',
      tags: ['topic:canal-bridge-incident'],
      regionTag: 'region:harbor-east',
    })
    const reports = { [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE }
    const cases = { [prior.id]: prior, [current.id]: current }

    const notes = buildWeeklyCrossJurisdictionCoordinationReportNotes({
      reports,
      cases,
      week: 14,
      sequenceStart: 1,
    })
    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('agency.cross_jurisdiction_coordination')
    expect(notes[0]?.content).toContain('Week 14')
    expect(notes[0]?.content).toMatch(/signature|liaison|coordination/i)

    const summary = buildCrossJurisdictionCoordinationSummary({ reports, cases })
    expect(summary.packetCount).toBe(1)
    expect(summary.summary).toContain('region:canal-west')

    const agency = buildAgencySummary({
      ...createStartingState(),
      informationIntakeReports: reports,
      cases: { ...createStartingState().cases, ...cases },
    })

    expect(agency.crossJurisdictionCoordination.packetCount).toBe(1)
    expect(agency.crossJurisdictionCoordination.summary).toContain('harbor-east')
  })
})
