import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildContractPreviewCase,
  evaluateContractForTeam,
  getBestContractTeamSuggestion,
  getContractCatalogEntries,
  getContractOffers,
  launchContract,
  recordContractOutcome,
  refreshContractBoard,
} from '../domain/contracts'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { syncTeamSimulationState } from '../domain/teamSimulation'
import type { AgentRole, ContractOffer } from '../domain/models'

const RECON_FAVORABLE_ROLES = ['hunter', 'tech', 'investigator'] satisfies AgentRole[]
const RECON_UNFAVORABLE_ROLES = ['medium', 'negotiator', 'medic'] satisfies AgentRole[]

function scaleOffer(offer: ContractOffer, scalar: number, socialScalar = scalar): ContractOffer {
  return {
    ...offer,
    difficulty: Math.round(offer.difficulty * scalar),
    caseDifficulty: {
      combat: Math.round(offer.caseDifficulty.combat * scalar),
      investigation: Math.round(offer.caseDifficulty.investigation * scalar),
      utility: Math.round(offer.caseDifficulty.utility * scalar),
      social: Math.round(offer.caseDifficulty.social * socialScalar),
    },
  }
}

describe('contract system', () => {
  it('generates a diverse weekly strategy mix', () => {
    const state = createStartingState()
    const offers = getContractOffers(state)

    expect(offers).toHaveLength(4)
    expect(new Set(offers.map((offer) => offer.strategyTag))).toEqual(
      new Set(['income', 'materials', 'research', 'progression'])
    )
  })

  it('surfaces a canonical contract catalog with live offers and blocker reasons', () => {
    const state = createStartingState()
    const offers = getContractOffers(state)
    const catalog = getContractCatalogEntries(state)

    expect(
      catalog
        .filter((entry) => entry.availabilityState === 'available')
        .map((entry) => entry.templateId)
        .sort()
    ).toEqual(offers.map((offer) => offer.templateId).sort())

    const locked = catalog.find((entry) => entry.templateId === 'oversight-clean-room-audit')
    expect(locked?.availabilityState).toBe('locked')
    expect(locked?.blockerDetails.some((detail) => /requires oversight lockdown retainer/i.test(detail))).toBe(true)
  })

  it('success evaluation responds to contract difficulty for the same team', () => {
    const state = createStartingState()
    const baseOffer =
      getContractOffers(state).find((offer) => offer.templateId === 'oversight-lockdown-retainer') ??
      getContractOffers(state)[0]!
    const easyOffer = scaleOffer(baseOffer, 2.6)
    const hardOffer = scaleOffer(baseOffer, 3)
    const easy = evaluateContractForTeam(state, easyOffer, 't_nightwatch')
    const hard = evaluateContractForTeam(state, hardOffer, 't_nightwatch')

    expect(easy).not.toBeNull()
    expect(hard).not.toBeNull()
    expect(easy!.preview.odds.success).toBeGreaterThan(hard!.preview.odds.success)
  })

  it('suitability modifiers improve outcomes for aligned teams', () => {
    const state = createStartingState()
    const baseOffer =
      getContractOffers(state).find((offer) => offer.templateId === 'oversight-lockdown-retainer') ??
      getContractOffers(state)[0]!
    const tailoredOffer = {
      ...scaleOffer(baseOffer, 2.8, 2.5),
      requirements: {
        recommendedClasses: [...RECON_FAVORABLE_ROLES],
        discouragedClasses: [...RECON_UNFAVORABLE_ROLES],
      },
    } satisfies ContractOffer

    const nightWatch = evaluateContractForTeam(state, tailoredOffer, 't_nightwatch')
    const greenTape = evaluateContractForTeam(state, tailoredOffer, 't_greentape')

    expect(nightWatch).not.toBeNull()
    expect(greenTape).not.toBeNull()
    expect(nightWatch!.roleFit.scoreAdjustment).toBeGreaterThan(greenTape!.roleFit.scoreAdjustment)
    expect(nightWatch!.preview.odds.success).toBeGreaterThan(greenTape!.preview.odds.success)
  })

  it('launching a contract locks the assigned team for its duration', () => {
    const state = createStartingState()
    const offer = getContractOffers(state).find((entry) => entry.durationWeeks > 1)!

    const launched = launchContract(state, offer.id, 't_nightwatch')
    const activeCase = Object.values(launched.cases).find(
      (currentCase) => currentCase.contract?.offerId === offer.id
    )

    expect(activeCase).toBeDefined()
    expect(activeCase?.status).toBe('in_progress')
    expect(activeCase?.weeksRemaining).toBe(offer.durationWeeks)
    expect(launched.teams['t_nightwatch'].assignedCaseId).toBe(activeCase?.id)

    const afterOneWeek = advanceWeek(launched)

    expect(afterOneWeek.cases[activeCase!.id]?.status).toBe('in_progress')
    expect(afterOneWeek.cases[activeCase!.id]?.weeksRemaining).toBe(offer.durationWeeks - 1)
    expect(afterOneWeek.teams['t_nightwatch'].assignedCaseId).toBe(activeCase!.id)
  })

  it('multi-stage contract chains unlock after successful completion', () => {
    const base = createStartingState()
    const state = refreshContractBoard({
      ...base,
      factions: {
        ...base.factions!,
        oversight: {
          ...base.factions!.oversight,
          reputation: 40,
          reputationTier: 'friendly',
        },
      },
      contracts: undefined,
    })
    const prerequisite = getContractOffers(state).find(
      (offer) => offer.templateId === 'oversight-lockdown-retainer'
    )!
    const previewCase = buildContractPreviewCase(state, prerequisite)!

    const nextContracts = recordContractOutcome(
      state.contracts,
      previewCase.contract,
      'success',
      state.week
    )
    const nextState = refreshContractBoard({
      ...state,
      week: state.week + 1,
      contracts: nextContracts,
    })

    expect(
      getContractOffers(nextState).some((offer) => offer.templateId === 'oversight-clean-room-audit')
    ).toBe(true)
  })

  it('surfaces progression-unlocked contracts once the agency has the matching unlock', () => {
    const base = createStartingState()
    const lockedState = refreshContractBoard({
      ...base,
      factions: {
        ...base.factions!,
        institutions: {
          ...base.factions!.institutions,
          reputation: 52,
          reputationTier: 'friendly',
        },
      },
      contracts: undefined,
    })
    const unlockedState = refreshContractBoard({
      ...base,
      factions: {
        ...base.factions!,
        institutions: {
          ...base.factions!.institutions,
          reputation: 52,
          reputationTier: 'friendly',
        },
      },
      agency: {
        ...base.agency!,
        progressionUnlockIds: ['containment-liturgy'],
      },
      contracts: undefined,
    })

    expect(
      getContractOffers(lockedState).some(
        (offer) => offer.templateId === 'institutions-liturgy-expedition'
      )
    ).toBe(false)
    expect(
      getContractOffers(unlockedState).some(
        (offer) => offer.templateId === 'institutions-liturgy-expedition'
      )
    ).toBe(true)
  })

  it('best-team suggestion selects the strongest valid team', () => {
    const state = createStartingState()
    const baseOffer =
      getContractOffers(state).find((offer) => offer.templateId === 'oversight-lockdown-retainer') ??
      getContractOffers(state)[0]!
    const tailoredOffer = {
      ...scaleOffer(baseOffer, 2.8, 2.5),
      requirements: {
        recommendedClasses: [...RECON_FAVORABLE_ROLES],
        discouragedClasses: [...RECON_UNFAVORABLE_ROLES],
      },
    } satisfies ContractOffer

    const best = getBestContractTeamSuggestion(state, tailoredOffer)
    const manual = ['t_nightwatch', 't_greentape']
      .map((teamId) => evaluateContractForTeam(state, tailoredOffer, teamId))
      .filter((evaluation): evaluation is NonNullable<typeof evaluation> => Boolean(evaluation))
      .sort(
        (left, right) =>
          right.preview.odds.success - left.preview.odds.success ||
          right.partyOvr - left.partyOvr ||
          left.team.name.localeCompare(right.team.name)
      )[0]

    expect(best).not.toBeNull()
    expect(best?.team.id).toBe(manual?.team.id)
  })

  it('breaks capped success ties with role fit and chemistry instead of raw overall only', () => {
    const base = createStartingState()
    const state = syncTeamSimulationState({
      ...base,
      agents: {
        fit_hunter: {
          ...base.agents.a_ava,
          id: 'fit_hunter',
          name: 'Fit Hunter',
          role: 'hunter',
          baseStats: { combat: 34, investigation: 18, utility: 14, social: 12 },
          fatigue: 0,
          status: 'active',
          tags: ['hunter'],
        },
        fit_tech: {
          ...base.agents.a_rook,
          id: 'fit_tech',
          name: 'Fit Tech',
          role: 'tech',
          baseStats: { combat: 18, investigation: 24, utility: 34, social: 12 },
          fatigue: 0,
          status: 'active',
          tags: ['tech'],
          relationships: { fit_hunter: 2 },
        },
        raw_medium: {
          ...base.agents.a_juno,
          id: 'raw_medium',
          name: 'Raw Medium',
          role: 'medium',
          baseStats: { combat: 56, investigation: 56, utility: 56, social: 56 },
          fatigue: 0,
          status: 'active',
          tags: ['medium'],
        },
        raw_medic: {
          ...base.agents.a_casey,
          id: 'raw_medic',
          name: 'Raw Medic',
          role: 'medic',
          baseStats: { combat: 58, investigation: 58, utility: 58, social: 58 },
          fatigue: 0,
          status: 'active',
          tags: ['medic'],
          relationships: { raw_medium: 0 },
        },
      },
      teams: {
        team_fit: {
          id: 'team_fit',
          name: 'Fit Team',
          agentIds: ['fit_hunter', 'fit_tech'],
          memberIds: ['fit_hunter', 'fit_tech'],
          leaderId: 'fit_hunter',
          tags: ['van'],
        },
        team_raw: {
          id: 'team_raw',
          name: 'Raw Team',
          agentIds: ['raw_medium', 'raw_medic'],
          memberIds: ['raw_medium', 'raw_medic'],
          leaderId: 'raw_medium',
          tags: ['lab-kit'],
        },
      },
    })
    state.agents.fit_hunter.relationships = { fit_tech: 2 }
    state.agents.fit_tech.relationships = { fit_hunter: 2 }
    state.agents.raw_medium.relationships = { raw_medic: 0 }
    state.agents.raw_medic.relationships = { raw_medium: 0 }

    const baseOffer =
      getContractOffers(state).find((offer) => offer.templateId === 'oversight-lockdown-retainer') ??
      getContractOffers(state)[0]!
    const easyOffer = {
      ...baseOffer,
      difficulty: 8,
      caseDifficulty: { combat: 8, investigation: 8, utility: 8, social: 8 },
      requirements: {
        recommendedClasses: ['hunter', 'tech'],
        discouragedClasses: ['medium', 'medic'],
      },
    } satisfies ContractOffer

    const fitEvaluation = evaluateContractForTeam(state, easyOffer, 'team_fit')
    const rawEvaluation = evaluateContractForTeam(state, easyOffer, 'team_raw')
    const best = getBestContractTeamSuggestion(state, easyOffer)

    expect(fitEvaluation).not.toBeNull()
    expect(rawEvaluation).not.toBeNull()
    expect(fitEvaluation!.preview.odds.success).toBeCloseTo(rawEvaluation!.preview.odds.success, 6)
    expect(fitEvaluation!.roleFit.scoreAdjustment).toBeGreaterThan(rawEvaluation!.roleFit.scoreAdjustment)
    expect(rawEvaluation!.partyOvr).toBeGreaterThan(fitEvaluation!.partyOvr)
    expect(best?.team.id).toBe('team_fit')
  })
})
