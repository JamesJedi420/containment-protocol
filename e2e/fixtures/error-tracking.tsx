import React from 'react'
import { createRoot } from 'react-dom/client'
import { initializeErrorTracking } from '../../src/app/errorTracking'
import { VERIFICATION_ERROR } from '../../src/app/errorTrackingPolicy'

const options = initializeErrorTracking()
document.documentElement.dataset.errorTrackingConfigured = String(Boolean(options.onUncaughtError))
export function BrokenComponent(): React.ReactNode {
  throw new Error(VERIFICATION_ERROR)
}
createRoot(document.getElementById('root')!, options).render(
  <button
    type="button"
    onClick={() => {
      createRoot(document.createElement('div'), options).render(<BrokenComponent />)
    }}
  >
    Verify React exception
  </button>
)

document.addEventListener('verify-global-error', () => {
  window.setTimeout(() => {
    throw new Error(VERIFICATION_ERROR)
  }, 0)
})
