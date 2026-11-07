import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router'
import { useGameStore } from './store/gameStore'
import { dispatchInputAction, useInputConsumer } from './inputRuntime'
import {
  findNavigationDelta,
  isNavigationDestinationAvailable,
  observeNavigation,
  startNavigationHistory,
} from './navigationHistory'

export function NavigationHistoryControls() {
  const location = useLocation()
  const action = useNavigationType()
  const navigate = useNavigate()
  const game = useGameStore((state) => state.game)
  const descriptionId = useId()
  const [history, setHistory] = useState(() => startNavigationHistory(location))
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const previousKey = useRef(location.key)
  const observed = observeNavigation(history, location, action)
  if (observed !== history) setHistory(observed)

  useLayoutEffect(() => {
    if (previousKey.current === location.key) return
    previousKey.current = location.key
    const wasRequested = pendingRef.current
    pendingRef.current = false
    setPending(false)
    if (wasRequested || action === 'POP') {
      document.getElementById('main-content')?.focus()
    }
  }, [action, location.key])

  const available = (entry: { pathname: string }) =>
    isNavigationDestinationAvailable(entry.pathname, game)
  const back = findNavigationDelta(observed, -1, available)
  const forward = findNavigationDelta(observed, 1, available)

  function travel(delta: number | null) {
    if (delta === null || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    void navigate(delta)
  }

  useInputConsumer({
    id: 'navigation.back',
    context: 'route',
    available: () => !pendingRef.current && back !== null,
    execute: () => travel(back),
  })
  useInputConsumer({
    id: 'navigation.forward',
    context: 'route',
    available: () => !pendingRef.current && forward !== null,
    execute: () => travel(forward),
  })

  return (
    <nav aria-label="Navigation history" className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn min-h-11 min-w-11"
        disabled={pending || back === null}
        aria-describedby={descriptionId}
        onClick={() => dispatchInputAction('navigation.back')}
      >
        Back
      </button>
      <button
        type="button"
        className="btn min-h-11 min-w-11"
        disabled={pending || forward === null}
        aria-describedby={descriptionId}
        onClick={() => dispatchInputAction('navigation.forward')}
      >
        Forward
      </button>
      <p id={descriptionId} className="text-sm text-text-soft">
        {pending
          ? 'Returning to a visited screen.'
          : 'Only visited screens available in this campaign can be revisited. Unavailable destinations are skipped.'}
      </p>
    </nav>
  )
}
