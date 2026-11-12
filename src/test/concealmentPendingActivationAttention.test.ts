import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildConcealCaseFlagId } from '../domain/concealmentCasePrep'
import { projectConcealmentPendingActivationAttention } from '../domain/concealmentPendingActivationAttention'
import { setPersistentFlag } from '../domain/flagSystem'
import { createStarterCase } from '../domain/templates/startingCases'
import { getFrontDeskHubView } from '../features/operations/frontDeskView'
import { APP_ROUTES } from '../app/routes'

function createOpenCase(overrides: Record<string, unknown> = {}) {
  return {
    ...createStarterCase({ id: 'case-conceal-desk', templateId: 'ops-003' }),
    status: 'in_progress' as const,
    tags: ['infiltration'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('projectConcealmentPendingActivationAttention', () => {
  it('returns empty projection when no cases qualify', () => {
    const projection = projectConcealmentPendingActivationAttention(createStartingState())

    expect(projection.isEmpty).toBe(true)
    expect(projection.pendingCount).toBe(0)
    expect(projection.frontDeskAttentionCaseId).toBeNull()
  })

  it('projects pending hidden activation for concealment-tagged open cases', () => {
    const state = createStartingState()
    state.cases['case-conceal-desk'] = createOpenCase()

    const projection = projectConcealmentPendingActivationAttention(state)

    expect(projection.isEmpty).toBe(false)
    expect(projection.pendingCount).toBe(1)
    expect(projection.hiddenCount).toBe(1)
    expect(projection.frontDeskAttentionTone).toBe('info')
    expect(projection.frontDeskAttentionSummary).toContain('Next weekly tick will apply hidden presence')
    expect(projection.frontDeskAttentionCaseId).toBe('case-conceal-desk')
  })

  it('projects warning tone for displaced activation', () => {
    let state = createStartingState()
    state.cases['case-conceal-desk'] = createOpenCase()
    state = setPersistentFlag(state, 'conceal.displace.case-conceal-desk', 'site-b')

    const projection = projectConcealmentPendingActivationAttention(state)

    expect(projection.displacedCount).toBe(1)
    expect(projection.frontDeskAttentionTone).toBe('warning')
    expect(projection.frontDeskAttentionSummary).toContain('displaced cover')
  })

  it('aggregates multiple pending cases in the summary', () => {
    let state = createStartingState()
    state.cases['case-conceal-desk'] = createOpenCase({ id: 'case-conceal-desk' })
    state.cases['case-conceal-desk-2'] = createOpenCase({
      id: 'case-conceal-desk-2',
      title: 'Second covert op',
    })
    state = setPersistentFlag(state, buildConcealCaseFlagId('case-conceal-desk-2'), true)

    const projection = projectConcealmentPendingActivationAttention(state)

    expect(projection.pendingCount).toBe(2)
    expect(projection.frontDeskAttentionCaseId).toBeNull()
    expect(projection.frontDeskAttentionSummary).toContain('2 in-progress operations')
    expect(projection.frontDeskAttentionSummary).toContain('Second covert op')
  })

  it('ignores cases that already entered hidden posture', () => {
    const state = createStartingState()
    state.cases['case-conceal-desk'] = createOpenCase({ hiddenState: 'hidden' })

    const projection = projectConcealmentPendingActivationAttention(state)

    expect(projection.isEmpty).toBe(true)
  })
})

describe('getFrontDeskHubView concealment pending activation', () => {
  it('surfaces attention item for a single pending activation case', () => {
    const state = createStartingState()
    state.cases['case-conceal-desk'] = createOpenCase()

    const hub = getFrontDeskHubView(state)
    const item = hub.attentionItems.find((entry) => entry.id === 'concealment:pending-activation')

    expect(item).toBeDefined()
    expect(item?.title).toContain('Covert activation pending')
    expect(item?.summary).toContain('Next weekly tick will apply hidden presence')
    expect(item?.href).toBe(APP_ROUTES.caseDetail('case-conceal-desk'))
    expect(item?.tone).toBe('info')
  })

  it('links to cases list when multiple pending activations exist', () => {
    const state = createStartingState()
    state.cases['case-conceal-desk'] = createOpenCase({ id: 'case-conceal-desk' })
    state.cases['case-conceal-desk-2'] = createOpenCase({ id: 'case-conceal-desk-2' })

    const hub = getFrontDeskHubView(state)
    const item = hub.attentionItems.find((entry) => entry.id === 'concealment:pending-activation')

    expect(item?.href).toBe(APP_ROUTES.cases)
  })

  it('omits attention item when no pending activations exist', () => {
    const hub = getFrontDeskHubView(createStartingState())
    const item = hub.attentionItems.find((entry) => entry.id === 'concealment:pending-activation')

    expect(item).toBeUndefined()
  })
})
