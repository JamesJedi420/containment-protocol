import { createRoot } from 'react-dom/client'
import type { RootOptions } from 'react-dom/client'
import type { ReactNode } from 'react'
import { renderRecoveryScreen } from './renderRecovery'

/** Terminal render failure is handled outside the failed React tree, once per startup. */
export function mountApplication(
  container: HTMLElement,
  content: ReactNode,
  diagnostics: RootOptions = {}
) {
  let recovering = false
  let disposed = false
  let disposeRecovery: (() => void) | undefined
  const root = createRoot(container, {
    ...diagnostics,
    onUncaughtError(error, info) {
      try {
        if (diagnostics.onUncaughtError) diagnostics.onUncaughtError(error, info)
        else console.error(error)
      } catch {
        console.error(error)
      }
      if (recovering) return
      recovering = true
      // React must finish its failed commit before the independent DOM replaces the root.
      queueMicrotask(() => {
        if (disposed) return
        try {
          root.unmount()
        } catch (unmountError) {
          console.error(unmountError)
        }
        try {
          disposeRecovery = renderRecoveryScreen(container)
        } catch (recoveryError) {
          // Never recursively render React or automatically reload a persistently broken startup.
          console.error(recoveryError)
          container.textContent =
            'Containment Protocol could not display its recovery screen. Use your browser’s Reload command to restart. Unsaved changes may be lost.'
        }
      })
    },
  })
  root.render(content)
  return {
    unmount() {
      disposed = true
      disposeRecovery?.()
      root.unmount()
    },
  }
}
