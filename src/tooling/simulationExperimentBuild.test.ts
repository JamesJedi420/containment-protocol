// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const git = vi.hoisted(() => ({ commit: 'a'.repeat(40), status: '', unavailable: false }))
vi.mock('node:child_process', () => ({
  spawnSync: (_command: string, args: string[]) => {
    if (git.unavailable) return { status: 1, stdout: '' }
    return { status: 0, stdout: args[0] === 'rev-parse' ? git.commit : git.status }
  },
}))
vi.mock('@trigger.dev/sdk', () => ({ defineConfig: <T>(config: T) => config }))
import config from '../../trigger.config'

describe('SPE-3521 worker build identity', () => {
  it('rejects hot rebuilds and mid-build edits that would carry stale clean provenance', async () => {
    git.status = ''
    git.unavailable = false
    const registerPlugin = vi.fn()
    await config.build?.extensions?.[0].onBuildStart?.({ workingDir: '.', registerPlugin } as never)
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const initialOptions: { define?: Record<string, string> } = {}
    registerPlugin.mock.calls[0][0].setup({ initialOptions, onStart, onEnd })
    expect(JSON.parse(initialOptions.define!.CP_EXPERIMENT_BUILD)).toEqual({
      commit: git.commit,
      dirty: false,
    })
    expect(onStart.mock.calls[0][0]()).toBeUndefined()
    git.status = ' M src/domain/math.ts'
    expect(onStart.mock.calls[0][0]().errors).toHaveLength(1)
    expect(onEnd.mock.calls[0][0]().errors).toHaveLength(1)
    git.status = ''
    git.commit = 'b'.repeat(40)
    expect(onStart.mock.calls[0][0]().errors).toHaveLength(1)
  })

  it('marks unavailable Git provenance as null so experiments fail closed', async () => {
    git.unavailable = true
    const registerPlugin = vi.fn()
    await config.build?.extensions?.[0].onBuildStart?.({ workingDir: '.', registerPlugin } as never)
    const initialOptions: { define?: Record<string, string> } = {}
    registerPlugin.mock.calls[0][0].setup({ initialOptions, onStart: vi.fn(), onEnd: vi.fn() })
    expect(initialOptions.define!.CP_EXPERIMENT_BUILD).toBe('null')
    git.unavailable = false
  })
})
