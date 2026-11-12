import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from '../../app/routes'
import { createStartingState } from '../../data/startingState'
import { SPE_947_EXAMPLE_PERSISTENCE_FIXTURE } from '../../domain/spe947EvaluatorPersistence'
import { getFrontDeskHubView } from './frontDeskView'
import {
  formatSpe947EnumLabel,
  getSpe947EvaluatorMirrorView,
} from './spe947EvaluatorMirrorView'

describe('spe947EvaluatorMirrorView (SPE-2578 slice 1)', () => {
  it('returns empty mirror when spe947* maps are empty without false AC', () => {
    const game = createStartingState()

    expect(game.spe947PlatformRecords).toEqual({})
    expect(game.spe947CounterMemeticPlans).toEqual({})
    expect(game.spe947ContentOwners).toEqual({})
    expect(game.spe947PostCaseMediaCases).toEqual({})

    const view = getSpe947EvaluatorMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.platformCount).toBe(0)
    expect(view.summary.planCount).toBe(0)
    expect(view.summary.ownerCount).toBe(0)
    expect(view.summary.mediaCaseCount).toBe(0)
    expect(view.platforms).toEqual([])
    expect(view.plans).toEqual([])
    expect(view.owners).toEqual([])
    expect(view.mediaCases).toEqual([])
  })

  it('mirrors authored platform and plan rows from persisted maps without calling evaluators', () => {
    const game = createStartingState()
    game.week = 14
    game.spe947PlatformRecords = {
      ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE.spe947PlatformRecords,
    }
    game.spe947CounterMemeticPlans = {
      ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE.spe947CounterMemeticPlans,
    }

    const view = getSpe947EvaluatorMirrorView(game)
    const platform = view.platforms[0]
    const plan = view.plans[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.platformCount).toBe(1)
    expect(view.summary.planCount).toBe(1)
    expect(view.summary.week).toBe(14)

    expect(platform?.id).toBe('platform:rumor-forum')
    expect(platform?.label).toBe('Local rumor forum')
    expect(platform?.viewCountLabel).toBe('1000')
    expect(platform?.uptimeStateLabel).not.toBe('—')
    expect(platform?.reachFactorLabel).toBe('1.5')

    expect(plan?.id).toBe('plan:corrective-lore-wave')
    expect(plan?.label).toBe('Corrective lore wave')
    expect(plan?.loreStateLabel).toBe('Crafted')
    expect(plan?.distributorLabel).toBe('distributor:civic-bulletin')
    expect(plan?.uptakeStateLabel).toBe('Sufficient')
    expect(plan?.elapsedPropagationWeeksLabel).toBe('2')
    expect(plan?.requiredPropagationWeeksLabel).toBe('2')
  })

  it('mirrors owners and media cases from the EXAMPLE persistence fixture', () => {
    const game = createStartingState()
    Object.assign(game, SPE_947_EXAMPLE_PERSISTENCE_FIXTURE)

    const view = getSpe947EvaluatorMirrorView(game)

    expect(view.summary.ownerCount).toBe(1)
    expect(view.summary.mediaCaseCount).toBe(1)
    expect(view.owners[0]?.label).toBe('Viral anomaly streamer')
    expect(view.owners[0]?.incentivesLabel).toContain('audience 4')
    expect(view.mediaCases[0]?.id).toBe('case:site-echo-7')
    expect(view.mediaCases[0]?.localContainmentSucceededLabel).toBe('Yes')
    expect(view.mediaCases[0]?.mediaArtifactCountLabel).toBe('3')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    Object.assign(game, SPE_947_EXAMPLE_PERSISTENCE_FIXTURE)

    const first = JSON.stringify(getSpe947EvaluatorMirrorView(game))
    const second = JSON.stringify(getSpe947EvaluatorMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatSpe947EnumLabel('degraded')).toBe('Degraded')
    expect(formatSpe947EnumLabel('crafted')).toBe('Crafted')
  })

  it('exposes Front Desk quick link to the hazardous content propagation mirror', () => {
    const hub = getFrontDeskHubView(createStartingState())

    expect(
      hub.quickLinks.some((link) => link.href === APP_ROUTES.hazardousContentPropagation)
    ).toBe(true)
  })
})
