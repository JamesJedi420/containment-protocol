import { describe, expect, it } from 'vitest'
import {
  buildInfiltrationEncounterReportContext,
  buildInfiltrationEncounterReportContextAfterProbe,
  buildInfiltrationPrepEncounterNotes,
  INFILTRATION_COVER_ROLE_OBSERVER_FRICTION,
  INFILTRATION_PROBE_ENCOUNTER_DETAILS,
  enrichInfiltrationThresholdSummary,
  formatInfiltrationLeaveBehindTradeoffSummary,
  formatInfiltrationWeeklyEncounterSummary,
  readInfiltrationLeaveBehindLabel,
  resolveInfiltrationProbeActionSource,
  shouldEmitInfiltrationWeeklyEncounterNote,
} from '../domain/infiltrationEncounterReportNotes'
import { createStarterCase } from '../domain/templates/startingCases'

function createCovertCase() {
  const caseData = createStarterCase({
    id: 'case-unit',
    templateId: 'ops-004',
    status: 'in_progress',
  })
  caseData.hiddenState = 'hidden'
  caseData.tags = ['infiltration', 'media', 'public']
  caseData.infiltrationProbePlan = { defaultAction: 'probe_access' }
  caseData.infiltrationCoverProfile = {
    claimedRole: 'uniform_guard',
    documentTier: 1,
  }
  caseData.stealthLeaveBehindId = 'leave-behind:burn-tool'
  caseData.infiltrationAwareness = 0.2
  caseData.infiltrationProbeProgress = 0.1
  caseData.infiltrationStage = 'probing'
  return caseData
}

describe('infiltrationEncounterReportNotes', () => {
  it('reads leave-behind labels from the registry and ignores unknown ids', () => {
    const caseData = createCovertCase()
    expect(readInfiltrationLeaveBehindLabel(caseData)).toBe('Burn field tool')
    expect(readInfiltrationLeaveBehindLabel({ ...caseData, stealthLeaveBehindId: 'missing' })).toBe(
      undefined
    )
  })

  it('builds post-tick context with updated tracks but pre-tick probe action source', () => {
    const before = createCovertCase()
    before.infiltrationWeeklyProbeActionOverride = 'probe_route'

    const after = {
      ...before,
      infiltrationAwareness: 0.62,
      infiltrationProbeProgress: 0.35,
      infiltrationStage: 'exposed' as const,
    }

    const context = buildInfiltrationEncounterReportContextAfterProbe(before, after)
    expect(context?.probeAction).toBe('probe_route')
    expect(context?.probeActionSource).toBe('override')
    expect(context?.awareness).toBe(0.62)
    expect(context?.stage).toBe('exposed')

    const preOnly = buildInfiltrationEncounterReportContext(before)
    expect(preOnly?.awareness).toBe(0.2)
  })

  it('enriches threshold summaries with prep, cover, leave-behind, and post-tick tracks', () => {
    const context = buildInfiltrationEncounterReportContext(createCovertCase())!
    const enriched = enrichInfiltrationThresholdSummary('Observers intensified scrutiny.', context)

    expect(enriched).toContain('Authored probe plan')
    expect(enriched).toContain('badge chains and restricted corridors')
    expect(enriched).toContain('uniform guard cover')
    expect(enriched).toContain('Checkpoint staff compare badge sequences')
    expect(enriched).toContain('Burn field tool')
    expect(enriched).toContain('Observers intensified scrutiny')
    expect(enriched).toContain('10% probe / 20% awareness')
    expect(enriched).not.toContain('.;')
  })

  it('adds probe-action encounter detail and cover-role friction to weekly summaries', () => {
    const context = buildInfiltrationEncounterReportContext(createCovertCase())!
    const summary = formatInfiltrationWeeklyEncounterSummary(context)

    expect(summary).toContain('badge chains and restricted corridors')
    expect(summary).toContain('Checkpoint staff compare badge sequences')
  })

  it('adds stage observer pressure for exposed and violent tracks', () => {
    const exposed = buildInfiltrationEncounterReportContext({
      ...createCovertCase(),
      infiltrationStage: 'exposed',
    })!
    expect(formatInfiltrationWeeklyEncounterSummary(exposed)).toContain(
      'Local observers treat the claimed role as doubtful'
    )

    const violent = buildInfiltrationEncounterReportContext({
      ...createCovertCase(),
      infiltrationStage: 'violent',
    })!
    expect(formatInfiltrationWeeklyEncounterSummary(violent)).toContain(
      'Site security posture shifted toward force response'
    )
  })

  it('selects distinct encounter detail per probe action', () => {
    const access = buildInfiltrationEncounterReportContext({
      ...createCovertCase(),
      infiltrationProbePlan: { defaultAction: 'probe_access' },
    })!
    const route = buildInfiltrationEncounterReportContext({
      ...createCovertCase(),
      infiltrationProbePlan: { defaultAction: 'probe_route' },
    })!
    const cleanup = buildInfiltrationEncounterReportContext({
      ...createCovertCase(),
      infiltrationWeeklyProbeActionOverride: 'cleanup',
    })!

    expect(formatInfiltrationWeeklyEncounterSummary(access)).toContain('restricted corridors')
    expect(formatInfiltrationWeeklyEncounterSummary(route)).toContain('patrol gaps and service routes')
    expect(formatInfiltrationWeeklyEncounterSummary(cleanup)).toContain('back-channel contacts')
  })

  it('formats leave-behind tradeoff with score pressure and optional custody strain', () => {
    expect(
      formatInfiltrationLeaveBehindTradeoffSummary('Burn field tool', {
        scoreAdjustmentReason: 'Stealth leave-behind: +1.8 (Burn field tool)',
      })
    ).toContain('Stealth leave-behind: +1.8')

    expect(
      formatInfiltrationLeaveBehindTradeoffSummary('Burn field tool', {
        custodyLossSummary: 'lost custody:field-packet',
      })
    ).toContain('Investigation strain')
  })

  it('gates weekly encounter notes on infiltration probe eligibility only', () => {
    const eligible = createCovertCase()
    expect(shouldEmitInfiltrationWeeklyEncounterNote(eligible)).toBe(true)

    expect(shouldEmitInfiltrationWeeklyEncounterNote({ ...eligible, hiddenState: 'revealed' })).toBe(
      false
    )
    expect(
      shouldEmitInfiltrationWeeklyEncounterNote({
        ...eligible,
        tags: ['media'],
        requiredTags: [],
        preferredTags: [],
      })
    ).toBe(false)
  })

  it('builds prep encounter preview bullets without weekly report framing', () => {
    const caseData = createCovertCase()
    const context = buildInfiltrationEncounterReportContext(caseData)!
    const notes = buildInfiltrationPrepEncounterNotes(caseData)

    expect(notes[0]).toBe(INFILTRATION_PROBE_ENCOUNTER_DETAILS[context.probeAction])
    if (context.coverRole !== undefined) {
      expect(notes).toContain(INFILTRATION_COVER_ROLE_OBSERVER_FRICTION[context.coverRole])
    }
    expect(notes).toContain('Staged leave-behind: Burn field tool.')
    expect(notes.join(' ')).not.toContain('Authored probe plan')
    expect(notes.join(' ')).not.toContain('Tracks at')
  })

  it('omits cover and leave-behind clauses when absent', () => {
    const sparse = createCovertCase()
    sparse.infiltrationCoverProfile = undefined
    sparse.stealthLeaveBehindId = undefined

    const summary = formatInfiltrationWeeklyEncounterSummary(
      buildInfiltrationEncounterReportContext(sparse)!
    )
    expect(summary).not.toContain('Cover posture')
    expect(summary).not.toContain('Leave-behind')
    expect(resolveInfiltrationProbeActionSource(sparse)).toBe('authored')
  })

  it('adds civilian long-horizon embed summary to prep encounter notes when eligible', () => {
    const caseData = createStarterCase({
      id: 'case-civilian-report',
      templateId: 'ops-002',
      status: 'in_progress',
    })
    caseData.hiddenState = 'hidden'
    caseData.tags = ['infiltration', 'covert', 'civilian', 'interview', 'memory']
    caseData.infiltrationCoverProfile = {
      claimedRole: 'civilian_staff',
      documentTier: 1,
      doctrineBand: 0.35,
    }
    caseData.infiltrationProbePlan = { defaultAction: 'probe_access' }

    const notes = buildInfiltrationPrepEncounterNotes(caseData)

    expect(notes.some((note) => note.includes('Interview-cycle embed'))).toBe(true)
    expect(notes.some((note) => note.includes('civilian_staff routine'))).toBe(true)
  })

  it('adds non-uniform identity summary to prep encounter notes when eligible', () => {
    const caseData = createStarterCase({
      id: 'case-courier-report',
      templateId: 'ops-001',
      status: 'in_progress',
    })
    caseData.hiddenState = 'hidden'
    caseData.tags = ['infiltration', 'covert', 'relay', 'cyber']
    caseData.infiltrationCoverProfile = {
      claimedRole: 'courier',
      documentTier: 2,
      doctrineBand: 0.65,
    }
    caseData.infiltrationProbePlan = { defaultAction: 'probe_route' }

    const notes = buildInfiltrationPrepEncounterNotes(caseData)

    expect(notes.some((note) => note.includes('Relay-chain courier identity'))).toBe(true)
    expect(notes.some((note) => note.includes('non-institutional identity'))).toBe(true)
  })
})
