// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import { executeExperimentSeed } from './simulationExperiment'
import { runExperimentBatch, type ExperimentContext } from './simulationExperimentBatch'
import {
  ExperimentError,
  experimentIdempotencyKey,
  parseExperimentRequest,
} from './simulationExperimentRequest'

const commit = 'a'.repeat(40)
const raw = {
  fixture: 'starter-no-commands',
  version: 'spe-3521.v1',
  commit,
  seeds: [11, 22],
  weeks: 2,
  budgetMs: 30_000,
  concurrency: 1,
  maxAttempts: 1,
  replay: 'same-commit',
}
const context: ExperimentContext = {
  runId: 'test-run',
  environment: 'DEVELOPMENT',
  build: { commit, dirty: false },
}

describe('SPE-3521 request and dispatch boundary', () => {
  it.each([
    null,
    [],
    {},
    { ...raw, campaign: {} },
    { ...raw, seeds: [] },
    { ...raw, seeds: [1, 1] },
    { ...raw, seeds: Array.from({ length: 9 }, (_, i) => i + 1) },
    { ...raw, seeds: [0] },
    { ...raw, seeds: [-1] },
    { ...raw, seeds: [1.5] },
    { ...raw, seeds: [NaN] },
    { ...raw, seeds: [0x100000000] },
    { ...raw, seeds: ['11'] },
    { ...raw, weeks: 0 },
    { ...raw, weeks: 5 },
    { ...raw, budgetMs: 0 },
    { ...raw, budgetMs: 30_001 },
    { ...raw, concurrency: 2 },
    { ...raw, maxAttempts: 2 },
    { ...raw, commit: 'main' },
    { ...raw, replay: 'guaranteed' },
  ])('rejects malformed or excessive input without importing simulation (%#)', async (input) => {
    const load = vi.fn()
    const report = await runExperimentBatch(input, context, load)
    expect(report.status).toBe('invalid_input')
    expect(report.executedSeeds).toEqual([])
    expect(load).not.toHaveBeenCalled()
  })

  it.each([
    [{ ...raw, fixture: 'custom' }, context, 'missing_capability'],
    [{ ...raw, version: 'v2' }, context, 'missing_capability'],
    [{ ...raw, replay: 'scoped' }, context, 'replay_unavailable'],
    [raw, { ...context, environment: 'PRODUCTION' }, 'missing_capability'],
    [raw, { ...context, build: null }, 'missing_capability'],
    [raw, { ...context, build: { commit, dirty: true } }, 'missing_capability'],
    [raw, { ...context, build: { commit: 'b'.repeat(40), dirty: false } }, 'missing_capability'],
  ])('fails closed on unavailable prerequisites (%#)', async (input, ctx, status) => {
    const load = vi.fn()
    expect((await runExperimentBatch(input, ctx, load)).status).toBe(status)
    expect(load).not.toHaveBeenCalled()
  })

  it('canonicalizes seed/key ordering without mutating the caller and scopes deduplication to all inputs', () => {
    const input = { ...raw, seeds: [22, 11] }
    expect(experimentIdempotencyKey(input)).toBe(experimentIdempotencyKey(raw))
    expect(input.seeds).toEqual([22, 11])
    for (const change of [
      { seeds: [11] },
      { weeks: 3 },
      { budgetMs: 29_000 },
      { commit: 'b'.repeat(40) },
      { replay: 'scoped' },
    ]) {
      expect(experimentIdempotencyKey({ ...raw, ...change })).not.toBe(
        experimentIdempotencyKey(raw)
      )
    }
  })

  it('classifies module infrastructure failures without exposing private exception text', async () => {
    const report = await runExperimentBatch(raw, context, async () => {
      throw new Error('private-path/secret')
    })
    expect(report.status).toBe('infrastructure_failure')
    expect(JSON.stringify(report)).not.toContain('private-path')
  })

  it('dispatches sequentially and stops without retry after a deterministic failure', async () => {
    let active = 0
    let peak = 0
    const execute = vi.fn(async () => {
      active += 1
      peak = Math.max(peak, active)
      await Promise.resolve()
      active -= 1
      throw new ExperimentError('invariant_failure', 'Test invariant failed.')
    })
    const report = await runExperimentBatch(raw, context, async () => execute)
    expect(report.status).toBe('invariant_failure')
    expect(execute).toHaveBeenCalledTimes(1)
    expect(peak).toBe(1)
  })

  it('counts an initialized seed honestly when its execution exhausts the budget', async () => {
    const execute: typeof executeExperimentSeed = async (_request, seed, controls) => {
      controls.onInitialized?.(seed)
      throw new ExperimentError('budget_exhausted', 'Test budget exhausted.')
    }
    const report = await runExperimentBatch(raw, context, async () => execute)
    expect(report.status).toBe('budget_exhausted')
    expect(report.executedSeeds).toEqual([11])
    expect(report.results).toEqual([])
  })

  it('checks the shared batch deadline before dispatch and honors cancellation before import', async () => {
    let time = 0
    const execute = vi.fn()
    const report = await runExperimentBatch(
      raw,
      context,
      async () => execute,
      () => {
        time += 30_000
        return time
      }
    )
    expect(report.status).toBe('budget_exhausted')
    expect(execute).not.toHaveBeenCalled()
    const controller = new AbortController()
    controller.abort()
    const load = vi.fn()
    expect(
      (await runExperimentBatch(raw, { ...context, signal: controller.signal }, load)).status
    ).toBe('cancelled')
    expect(load).not.toHaveBeenCalled()
  })
})

describe('SPE-3521 real canonical Node execution', () => {
  it('applies multiple seeds, matches full-state replays and releases state without reading browser globals', async () => {
    const baseline = createStartingState()
    const before = JSON.stringify(baseline)
    const descriptors = new Map<string, PropertyDescriptor | undefined>()
    for (const key of ['window', 'document', 'localStorage']) {
      descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
      Object.defineProperty(globalThis, key, {
        configurable: true,
        get: () => {
          throw new Error('Browser access forbidden')
        },
      })
    }
    try {
      const report = await runExperimentBatch(raw, context)
      expect(report.status).toBe('success')
      expect(report.executedSeeds).toEqual([11, 22])
      expect(report.results.map((result) => result.replay)).toEqual(['matched', 'matched'])
      expect(report.results[0].stateFingerprint).not.toBe(report.results[1].stateFingerprint)
      expect(report.results[0].pressure).not.toEqual(report.results[1].pressure)
      expect(
        report.results.every((result) => result.weeksExecuted === 2 && result.finalWeek === 3)
      ).toBe(true)
      expect(JSON.stringify(baseline)).toBe(before)
      expect(JSON.stringify(createStartingState())).toBe(before)
      expect(JSON.stringify(report)).not.toMatch(/"agents"|"cases"|"inventory"|"events"|"reports"/)
      const repeated = await runExperimentBatch(raw, { ...context, runId: 'repeat' })
      expect(repeated.results).toEqual(report.results)
    } finally {
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
    }
  }, 30_000)

  it('checks budgets during canonical execution and starts the next run fresh after failure', async () => {
    const request = parseExperimentRequest(raw)
    let ticks = 0
    await expect(
      executeExperimentSeed(request, 11, { startedAt: 0, now: () => ++ticks * 10_000 })
    ).rejects.toMatchObject({ status: 'budget_exhausted' })
    const result = await executeExperimentSeed(request, 11, { startedAt: performance.now() })
    expect(result.replay).toBe('matched')
    expect(result.finalWeek).toBe(3)
  })

  it('exposes replay mismatch as unavailable rather than successful determinism', async () => {
    const request = parseExperimentRequest(raw)
    const result = await executeExperimentSeed(request, 11, { startedAt: performance.now() })
    const report = await runExperimentBatch(raw, context, async () => async () => ({
      ...result,
      replay: 'unavailable',
      replayFingerprint: 'different',
    }))
    expect(report.status).toBe('replay_unavailable')
    expect(report.results).toHaveLength(1)
  })
})
