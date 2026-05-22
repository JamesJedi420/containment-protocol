import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildOperationalCertaintyView } from '../domain/operationalCertainty'

describe('buildOperationalCertaintyView', () => {
  it('is deterministic for the same game state input', () => {
    const game = createStartingState()

    const first = buildOperationalCertaintyView(game)
    const second = buildOperationalCertaintyView(game)

    expect(first).toEqual(second)
  })

  it('surfaces contradicted map facts when relationship signals conflict', () => {
    const game = createStartingState()
    const [leftId, rightId] = Object.keys(game.agents)
    const left = game.agents[leftId]!
    const right = game.agents[rightId]!

    game.agents[leftId] = {
      ...left,
      relationships: {
        ...left.relationships,
        [rightId]: 2,
      },
    }
    game.agents[rightId] = {
      ...right,
      relationships: {
        ...right.relationships,
        [leftId]: -2,
      },
    }

    const view = buildOperationalCertaintyView(game)
    const contradicted = view.mapBuckets.find((bucket) => bucket.id === 'map-contradicted')

    expect(contradicted?.count).toBeGreaterThan(0)
    expect(view.summary).toContain('Certainty warning')
  })

  it('moves registry certainty from inferred to confirmed as case visibility improves', () => {
    const game = createStartingState()
    const caseId = Object.keys(game.cases)[0]!
    const currentCase = game.cases[caseId]!

    game.cases[caseId] = {
      ...currentCase,
      hiddenState: 'hidden',
      intelConfidence: 0.35,
      status: 'in_progress',
    }

    const inferredView = buildOperationalCertaintyView(game)
    const inferredCount =
      inferredView.registryBuckets.find((bucket) => bucket.id === 'registry-inferred')?.count ?? 0

    game.cases[caseId] = {
      ...game.cases[caseId]!,
      hiddenState: 'revealed',
      intelConfidence: 0.96,
    }

    const confirmedView = buildOperationalCertaintyView(game)
    const confirmedCount =
      confirmedView.registryBuckets.find((bucket) => bucket.id === 'registry-confirmed')?.count ?? 0

    expect(inferredCount).toBeGreaterThan(0)
    expect(confirmedCount).toBeGreaterThan(0)
  })
})
