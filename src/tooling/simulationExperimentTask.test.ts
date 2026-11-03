// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const captured = vi.hoisted(() => ({ options: undefined as unknown }))
vi.mock('@trigger.dev/sdk', () => ({
  task: (options: unknown) => {
    captured.options = options
    return options
  },
  AbortTaskRunError: class AbortTaskRunError extends Error {},
}))

import '../trigger/simulationExperiment'

describe('SPE-3521 exported task', () => {
  it('registers bounded queue, duration and no computational retries; rejected input fails visibly', async () => {
    const options = captured.options as {
      id: string
      queue: { name: string; concurrencyLimit: number }
      maxDuration: number
      retry: { maxAttempts: number }
      run: (
        payload: unknown,
        options: {
          ctx: { run: { id: string }; environment: { type: string } }
          signal: AbortSignal
        }
      ) => Promise<unknown>
    }
    expect(options.id).toBe('cp-simulation-experiment')
    expect(options.queue.concurrencyLimit).toBe(1)
    expect(options.maxDuration).toBe(60)
    expect(options.retry.maxAttempts).toBe(1)
    await expect(
      options.run(null, {
        ctx: { run: { id: 'invalid-task-run' }, environment: { type: 'DEVELOPMENT' } },
        signal: new AbortController().signal,
      })
    ).rejects.toThrow('"status":"invalid_input"')
  })
})
