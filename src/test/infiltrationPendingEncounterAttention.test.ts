import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  INFILTRATION_PROBE_ENCOUNTER_DETAILS,
  buildInfiltrationEncounterReportContext,
} from '../domain/infiltrationEncounterReportNotes'
import { copyInfiltrationProbePlan } from '../domain/infiltrationProbe'
import { projectInfiltrationPendingEncounterAttention } from '../domain/infiltrationPendingEncounterAttention'
import { createStarterCase } from '../domain/templates/startingCases'
import { caseTemplateMap } from '../domain/templates/caseTemplates'
import { getFrontDeskHubView } from '../features/operations/frontDeskView'
import { APP_ROUTES } from '../app/routes'

function createEligibleCase(overrides: Record<string, unknown> = {}) {
  return {
    ...createStarterCase({ id: 'case-infiltration-desk', templateId: 'ops-004' }),
    status: 'in_progress' as const,
    hiddenState: 'hidden' as const,
    tags: ['infiltration', 'media', 'public'],
    requiredTags: [],
    preferredTags: [],
    infiltrationProbePlan: copyInfiltrationProbePlan(caseTemplateMap['ops-004'].infiltrationProbePlan),
    infiltrationCoverProfile: caseTemplateMap['ops-004'].infiltrationCoverProfile,
    infiltrationAwareness: 0.2,
    infiltrationProbeProgress: 0.1,
    infiltrationStage: 'probing' as const,
    ...overrides,
  }
}

describe('projectInfiltrationPendingEncounterAttention', () => {
  it('returns empty projection when no cases qualify', () => {
    const projection = projectInfiltrationPendingEncounterAttention(createStartingState())

    expect(projection.isEmpty).toBe(true)
    expect(projection.pendingCount).toBe(0)
    expect(projection.frontDeskAttentionCaseId).toBeNull()
  })

  it('projects pending encounter preview for eligible in-progress cases with probe plans', () => {
    const state = createStartingState()
    state.cases['case-infiltration-desk'] = createEligibleCase()

    const projection = projectInfiltrationPendingEncounterAttention(state)
    const context = buildInfiltrationEncounterReportContext(state.cases['case-infiltration-desk'])!

    expect(projection.isEmpty).toBe(false)
    expect(projection.pendingCount).toBe(1)
    expect(projection.elevatedCount).toBe(0)
    expect(projection.frontDeskAttentionTone).toBe('info')
    expect(projection.frontDeskAttentionSummary).toContain(
      INFILTRATION_PROBE_ENCOUNTER_DETAILS[context.probeAction]
    )
    expect(projection.frontDeskAttentionCaseId).toBe('case-infiltration-desk')
  })

  it('projects warning tone for exposed stage', () => {
    const state = createStartingState()
    state.cases['case-infiltration-desk'] = createEligibleCase({
      infiltrationStage: 'exposed',
    })

    const projection = projectInfiltrationPendingEncounterAttention(state)

    expect(projection.elevatedCount).toBe(1)
    expect(projection.frontDeskAttentionTone).toBe('warning')
  })

  it('projects warning tone when awareness reaches the complication threshold', () => {
    const state = createStartingState()
    state.cases['case-infiltration-desk'] = createEligibleCase({
      infiltrationAwareness: 0.55,
    })

    const projection = projectInfiltrationPendingEncounterAttention(state)

    expect(projection.elevatedCount).toBe(1)
    expect(projection.frontDeskAttentionTone).toBe('warning')
  })

  it('aggregates multiple pending cases in the summary', () => {
    const state = createStartingState()
    state.cases['case-infiltration-desk'] = createEligibleCase({ id: 'case-infiltration-desk' })
    state.cases['case-infiltration-desk-2'] = createEligibleCase({
      id: 'case-infiltration-desk-2',
      title: 'Second infiltration op',
    })

    const projection = projectInfiltrationPendingEncounterAttention(state)

    expect(projection.pendingCount).toBe(2)
    expect(projection.frontDeskAttentionCaseId).toBeNull()
    expect(projection.frontDeskAttentionSummary).toContain('2 in-progress operations')
    expect(projection.frontDeskAttentionSummary).toContain('Second infiltration op')
  })

  it('ignores cases without authored probe plans', () => {
    const state = createStartingState()
    state.cases['case-infiltration-desk'] = createEligibleCase({
      infiltrationProbePlan: undefined,
    })

    const projection = projectInfiltrationPendingEncounterAttention(state)

    expect(projection.isEmpty).toBe(true)
  })

  it('ignores resolved or ineligible cases', () => {
    const state = createStartingState()
    state.cases['case-infiltration-desk'] = createEligibleCase({ status: 'resolved' })
    state.cases['case-infiltration-open'] = createEligibleCase({
      id: 'case-infiltration-open',
      hiddenState: undefined,
    })

    const projection = projectInfiltrationPendingEncounterAttention(state)

    expect(projection.isEmpty).toBe(true)
  })
})

describe('getFrontDeskHubView infiltration pending encounter', () => {
  it('surfaces attention item for a single pending encounter case', () => {
    const state = createStartingState()
    state.cases['case-infiltration-desk'] = createEligibleCase()

    const hub = getFrontDeskHubView(state)
    const item = hub.attentionItems.find((entry) => entry.id === 'infiltration:pending-encounter')

    expect(item).toBeDefined()
    expect(item?.title).toContain('Infiltration encounter pending')
    expect(item?.summary).toContain('Operators exercised badge chains')
    expect(item?.href).toBe(APP_ROUTES.caseDetail('case-infiltration-desk'))
    expect(item?.tone).toBe('info')
  })

  it('links to cases list when multiple pending encounters exist', () => {
    const state = createStartingState()
    state.cases['case-infiltration-desk'] = createEligibleCase({ id: 'case-infiltration-desk' })
    state.cases['case-infiltration-desk-2'] = createEligibleCase({ id: 'case-infiltration-desk-2' })

    const hub = getFrontDeskHubView(state)
    const item = hub.attentionItems.find((entry) => entry.id === 'infiltration:pending-encounter')

    expect(item?.href).toBe(APP_ROUTES.cases)
  })

  it('omits attention item when no pending encounters exist', () => {
    const hub = getFrontDeskHubView(createStartingState())
    const item = hub.attentionItems.find((entry) => entry.id === 'infiltration:pending-encounter')

    expect(item).toBeUndefined()
  })
})
