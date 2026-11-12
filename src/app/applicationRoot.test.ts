import '../test/setup'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RootOptions } from 'react-dom/client'
import { mountApplication } from './applicationRoot'
import { renderRecoveryScreen } from './renderRecovery'

const root = vi.hoisted(() => ({ render: vi.fn(), unmount: vi.fn(), options: {} as RootOptions }))
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn((_container, options) => {
    root.options = options
    return root
  }),
}))
vi.mock('./renderRecovery', () => ({ renderRecoveryScreen: vi.fn() }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
const info = { componentStack: 'test component' }

describe('application root terminal recovery', () => {
  it('preserves existing diagnostics and makes one recovery transition after failed commits', async () => {
    const container = document.createElement('div')
    const report = vi.fn()
    const caught = vi.fn()
    const cleanup = vi.fn()
    vi.mocked(renderRecoveryScreen).mockReturnValue(cleanup)
    const handle = mountApplication(container, 'normal content', {
      onUncaughtError: report,
      onCaughtError: caught,
    })
    expect(root.render).toHaveBeenCalledWith('normal content')
    expect(root.options.onCaughtError).toBe(caught)
    expect(renderRecoveryScreen).not.toHaveBeenCalled()
    const failure = new Error('render failed')
    root.options.onUncaughtError!(failure, info)
    root.options.onUncaughtError!(failure, info)
    expect(renderRecoveryScreen).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(report).toHaveBeenCalledWith(failure, info)
    expect(root.unmount).toHaveBeenCalledTimes(1)
    expect(renderRecoveryScreen).toHaveBeenCalledExactlyOnceWith(container)
    handle.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
  it('retains a static instruction without recursively retrying a failed recovery renderer', async () => {
    const container = document.createElement('div')
    vi.mocked(renderRecoveryScreen).mockImplementationOnce(() => {
      throw new Error('fallback failed')
    })
    const handle = mountApplication(container, null, {
      onUncaughtError: () => {
        throw new Error('diagnostics failed')
      },
    })
    root.options.onUncaughtError!(new Error('render failed'), info)
    await Promise.resolve()
    expect(container.textContent).toContain('Use your browser’s Reload command')
    root.options.onUncaughtError!(new Error('another failure'), info)
    await Promise.resolve()
    expect(renderRecoveryScreen).toHaveBeenCalledTimes(1)
    expect(root.render).toHaveBeenCalledTimes(1)
    handle.unmount()
  })
  it('does not mount recovery after the application has been explicitly disposed', async () => {
    const handle = mountApplication(document.createElement('div'), null)
    root.options.onUncaughtError!(new Error('render failed'), info)
    handle.unmount()
    await Promise.resolve()
    expect(renderRecoveryScreen).not.toHaveBeenCalled()
  })
})
