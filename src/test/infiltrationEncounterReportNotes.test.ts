import { describe, expect, it } from 'vitest'
import {
  buildInfiltrationEncounterReportContext,
  buildInfiltrationEncounterReportContextAfterProbe,
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
    expect(enriched).toContain('uniform guard cover')
    expect(enriched).toContain('Burn field tool')
    expect(enriched).toContain('Observers intensified scrutiny')
    expect(enriched).toContain('10% probe / 20% awareness')
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
})
