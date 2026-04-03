/**
 * Isolated tests for the production and market simulation subsystem.
 * Covers queueFabrication, advanceProductionQueues, and advanceMarketState
 * without going through the advanceWeek orchestration layer.
 */
import { describe, expect, it } from 'vitest'
import { getProductionRecipe, getRecipeFundingCost, getRecipeInputMaterials } from '../data/production'
import { createSeededRng } from '../domain/math'
import {
  queueFabrication,
  advanceProductionQueues,
  advanceMarketState,
} from '../domain/sim/production'
import { createFixtureState } from './storeFixtures'

// ─── queueFabrication ─────────────────────────────────────────────────────────

describe('queueFabrication', () => {
  it('returns unchanged state for an unknown recipe', () => {
    const state = createFixtureState()
    const result = queueFabrication(state, 'does-not-exist')
    expect(result).toBe(state)
  })

  it('returns unchanged state when funding is insufficient', () => {
    const state = { ...createFixtureState(), funding: 1 }
    const result = queueFabrication(state, 'signal-jammers') // base cost 20
    expect(result).toBe(state)
  })

  it('returns unchanged state when required materials are missing', () => {
    const state = createFixtureState()
    state.inventory.medical_supplies = 0

    const result = queueFabrication(state, 'med-kits')

    expect(result).toBe(state)
  })

  it('deducts funding and appends a queue entry on success', () => {
    const state = createFixtureState()
    const recipe = getProductionRecipe('med-kits')!
    const expectedCost = getRecipeFundingCost(recipe, state.market)

    const result = queueFabrication(state, 'med-kits')

    expect(result.funding).toBe(state.funding - expectedCost)
    expect(result.productionQueue).toHaveLength(1)
  })

  it('deducts recipe materials when a job is queued', () => {
    const state = createFixtureState()
    const result = queueFabrication(state, 'med-kits')

    expect(result.inventory.medical_supplies).toBe(state.inventory.medical_supplies - 2)
  })

  it('queue entry reflects recipe metadata and current week', () => {
    const state = createFixtureState()
    const recipe = getProductionRecipe('silver-rounds')!
    const result = queueFabrication(state, 'silver-rounds')
    const entry = result.productionQueue[0]!

    expect(entry.recipeId).toBe(recipe.recipeId)
    expect(entry.recipeName).toBe(recipe.name)
    expect(entry.outputItemId).toBe(recipe.outputItemId)
    expect(entry.outputItemName).toBe(recipe.outputItemName)
    expect(entry.outputQuantity).toBe(recipe.outputQuantity)
    expect(entry.recipeDescription).toBe(recipe.description)
    expect(entry.inputMaterials).toEqual(getRecipeInputMaterials(recipe))
    expect(entry.durationWeeks).toBe(recipe.durationWeeks)
    expect(entry.remainingWeeks).toBe(recipe.durationWeeks)
    expect(entry.startedWeek).toBe(state.week)
  })

  it('applies featured-recipe discount when recipe matches market featured', () => {
    // Starting market features 'ward-seals' at stable pressure (costMultiplier 1)
    const state = createFixtureState()
    expect(state.market.featuredRecipeId).toBe('ward-seals')

    const recipe = getProductionRecipe('ward-seals')!
    const discountedCost = getRecipeFundingCost(recipe, state.market)

    // Base cost is 18; discounted cost (12% off) should be 16
    expect(discountedCost).toBeLessThan(recipe.baseFundingCost)

    const result = queueFabrication(state, 'ward-seals')
    expect(result.funding).toBe(state.funding - discountedCost)
  })

  it('does not mutate the original state', () => {
    const state = createFixtureState()
    const before = structuredClone(state)
    queueFabrication(state, 'med-kits')
    expect(state).toEqual(before)
  })

  it('generates sequential IDs for back-to-back queue entries', () => {
    const state = createFixtureState()
    const after1 = queueFabrication(state, 'med-kits')
    const after2 = queueFabrication(after1, 'med-kits')

    const id1 = after1.productionQueue[0]!.id
    const id2 = after2.productionQueue[1]!.id
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })
})

// ─── advanceProductionQueues ──────────────────────────────────────────────────

describe('advanceProductionQueues', () => {
  it('returns empty results when the production queue is empty', () => {
    const state = createFixtureState()
    const result = advanceProductionQueues(state)

    expect(result.completed).toHaveLength(0)
    expect(result.notes).toHaveLength(0)
    expect(result.eventDrafts).toHaveLength(0)
    expect(result.state.productionQueue).toHaveLength(0)
  })

  it('decrements remainingWeeks for an in-progress item', () => {
    const state = createFixtureState()
    const queued = queueFabrication(state, 'ward-seals') // durationWeeks: 2
    // Patch to a known starting remainder to avoid dependency on initial value
    const staged = {
      ...queued,
      productionQueue: queued.productionQueue.map((e) => ({ ...e, remainingWeeks: 2 })),
    }

    const result = advanceProductionQueues(staged)

    expect(result.state.productionQueue).toHaveLength(1)
    expect(result.state.productionQueue[0]!.remainingWeeks).toBe(1)
    expect(result.completed).toHaveLength(0)
  })

  it('completes a 1-week item and credits inventory', () => {
    const state = createFixtureState()
    const recipe = getProductionRecipe('med-kits')!
    const queued = queueFabrication(state, 'med-kits')
    const staged = {
      ...queued,
      productionQueue: queued.productionQueue.map((e) => ({ ...e, remainingWeeks: 1 })),
    }

    const result = advanceProductionQueues(staged)

    expect(result.completed).toHaveLength(1)
    expect(result.state.productionQueue).toHaveLength(0)
    expect(result.state.inventory[recipe.outputItemId]).toBe(
      (staged.inventory[recipe.outputItemId] ?? 0) + recipe.outputQuantity
    )
  })

  it('does not refund input materials when fabrication completes', () => {
    const state = createFixtureState()
    const queued = queueFabrication(state, 'med-kits')
    const staged = {
      ...queued,
      productionQueue: queued.productionQueue.map((e) => ({ ...e, remainingWeeks: 1 })),
    }

    const result = advanceProductionQueues(staged)

    expect(result.state.inventory.medical_supplies).toBe(queued.inventory.medical_supplies)
  })

  it('completes deterministic recipe outputs for craftable gear items', () => {
    const state = createFixtureState()
    const recipe = getProductionRecipe('emf-sensors')!
    const queued = queueFabrication(state, 'emf-sensors')
    const staged = {
      ...queued,
      productionQueue: queued.productionQueue.map((e) => ({ ...e, remainingWeeks: 1 })),
    }

    const result = advanceProductionQueues(staged)

    expect(result.completed).toHaveLength(1)
    expect(result.completed[0]?.recipeId).toBe('emf-sensors')
    expect(result.state.inventory[recipe.outputItemId]).toBe(recipe.outputQuantity)
  })

  it('generates a completion note with the recipe name', () => {
    const state = createFixtureState()
    const recipe = getProductionRecipe('med-kits')!
    const inputSummary = getRecipeInputMaterials(recipe)
      .map((material) => `${material.materialName} x${material.quantity}`)
      .join(', ')
    const queued = queueFabrication(state, 'med-kits')
    const staged = {
      ...queued,
      productionQueue: queued.productionQueue.map((e) => ({ ...e, remainingWeeks: 1 })),
    }

    const result = advanceProductionQueues(staged)

    expect(result.notes).toHaveLength(1)
    expect(result.notes[0]).toBe(
      `${recipe.name}: fabrication completed. Produced ${recipe.outputQuantity}x ${recipe.outputItemName} from ${inputSummary}.`
    )
  })

  it('generates a production.queue_completed event draft with correct payload', () => {
    const state = createFixtureState()
    const recipe = getProductionRecipe('signal-jammers')!
    const queued = queueFabrication(state, 'signal-jammers')
    const entry = queued.productionQueue[0]!
    const staged = {
      ...queued,
      productionQueue: queued.productionQueue.map((e) => ({ ...e, remainingWeeks: 1 })),
    }

    const result = advanceProductionQueues(staged)

    expect(result.eventDrafts).toHaveLength(1)
    expect(result.eventDrafts[0]).toMatchObject({
      type: 'production.queue_completed',
      sourceSystem: 'production',
      payload: {
        week: state.week,
        queueId: entry.id,
        queueName: recipe.name,
        recipeId: recipe.recipeId,
        outputId: recipe.outputItemId,
        outputName: recipe.outputItemName,
        outputQuantity: recipe.outputQuantity,
        fundingCost: entry.fundingCost,
        inputMaterials: getRecipeInputMaterials(recipe),
      },
    })
  })

  it('handles mixed queue: completes the ready item, keeps the in-progress one', () => {
    const state = createFixtureState()
    const s1 = queueFabrication(state, 'med-kits')     // 1-week
    const s2 = queueFabrication(s1, 'ward-seals')       // 2-week
    const staged = {
      ...s2,
      productionQueue: [
        { ...s2.productionQueue[0]!, remainingWeeks: 1 }, // ready
        { ...s2.productionQueue[1]!, remainingWeeks: 2 }, // in-progress
      ],
    }

    const result = advanceProductionQueues(staged)

    expect(result.completed).toHaveLength(1)
    expect(result.completed[0]!.recipeId).toBe('med-kits')
    expect(result.state.productionQueue).toHaveLength(1)
    expect(result.state.productionQueue[0]!.remainingWeeks).toBe(1)
  })

  it('stacks multiple completions in the same tick', () => {
    const state = createFixtureState()
    const s1 = queueFabrication(state, 'med-kits')
    const s2 = queueFabrication(s1, 'med-kits')
    const staged = {
      ...s2,
      productionQueue: s2.productionQueue.map((e) => ({ ...e, remainingWeeks: 1 })),
    }

    const result = advanceProductionQueues(staged)

    expect(result.completed).toHaveLength(2)
    expect(result.state.productionQueue).toHaveLength(0)
    const recipe = getProductionRecipe('med-kits')!
    expect(result.state.inventory[recipe.outputItemId]).toBe(recipe.outputQuantity * 2)
  })

  it('does not mutate the original state', () => {
    const state = createFixtureState()
    const queued = queueFabrication(state, 'med-kits')
    const staged = {
      ...queued,
      productionQueue: queued.productionQueue.map((e) => ({ ...e, remainingWeeks: 1 })),
    }
    const before = structuredClone(staged)

    advanceProductionQueues(staged)

    expect(staged).toEqual(before)
  })
})

// ─── advanceMarketState ───────────────────────────────────────────────────────

describe('advanceMarketState', () => {
  it('produces identical market state from the same RNG seed', () => {
    const state = createFixtureState()
    const rng1 = createSeededRng(99999)
    const rng2 = createSeededRng(99999)

    const r1 = advanceMarketState(state, rng1.next)
    const r2 = advanceMarketState(state, rng2.next)

    expect(r1.state.market).toEqual(r2.state.market)
  })

  it('costMultiplier is consistent with the rolled pressure', () => {
    const state = createFixtureState()
    const rng = createSeededRng(12345)

    const { state: next } = advanceMarketState(state, rng.next)
    const { pressure, costMultiplier } = next.market

    if (pressure === 'discounted') expect(costMultiplier).toBe(0.9)
    else if (pressure === 'tight') expect(costMultiplier).toBe(1.15)
    else expect(costMultiplier).toBe(1)
  })

  it('featured recipe is always a valid catalog entry', () => {
    const state = createFixtureState()
    const rng = createSeededRng(77777)

    const { state: next } = advanceMarketState(state, rng.next)

    expect(getProductionRecipe(next.market.featuredRecipeId)).toBeDefined()
  })

  it('emits a market.shifted event draft with correct shape', () => {
    const state = createFixtureState()
    const rng = createSeededRng(54321)

    const result = advanceMarketState(state, rng.next)

    expect(result.eventDrafts).toHaveLength(1)
    expect(result.eventDrafts[0]).toMatchObject({
      type: 'market.shifted',
      sourceSystem: 'production',
      payload: {
        week: state.week,
        pressure: result.state.market.pressure,
        costMultiplier: result.state.market.costMultiplier,
        featuredRecipeId: result.state.market.featuredRecipeId,
      },
    })
  })

  it('generates a human-readable pressure note', () => {
    const state = createFixtureState()
    const rng = createSeededRng(11111)

    const result = advanceMarketState(state, rng.next)

    expect(result.notes).toHaveLength(1)
    expect(result.notes[0]).toMatch(/Market shift:/)
    expect(result.notes[0]).toMatch(/conditions\. Featured fabrication/)
  })

  it('produces different markets from different seeds', () => {
    const state = createFixtureState()
    const rngA = createSeededRng(1)
    const rngB = createSeededRng(1000000)

    const results = new Set<string>()
    for (let i = 0; i < 10; i++) {
      const { state: s } = advanceMarketState(state, rngA.next)
      results.add(`${s.market.pressure}-${s.market.featuredRecipeId}`)
    }
    for (let i = 0; i < 10; i++) {
      const { state: s } = advanceMarketState(state, rngB.next)
      results.add(`${s.market.pressure}-${s.market.featuredRecipeId}`)
    }

    // At least 2 distinct outcomes across 20 rolls with different seeds
    expect(results.size).toBeGreaterThanOrEqual(2)
  })
})
