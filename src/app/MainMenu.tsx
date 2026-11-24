import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Logo from '../components/Logo'
import { SettingsAccess } from '../components/layout/SettingsAccess'
import { APP_ROUTES } from './routes'
import { useGameStore } from './store/gameStore'

function matchesSnapshot(current: unknown, saved: unknown): boolean {
  if (current === saved) return true
  if (Array.isArray(current)) {
    return (
      Array.isArray(saved) &&
      current.length === saved.length &&
      current.every((entry, index) => matchesSnapshot(entry, saved[index]))
    )
  }
  if (
    current === null ||
    saved === null ||
    typeof current !== 'object' ||
    typeof saved !== 'object' ||
    Array.isArray(saved)
  ) {
    return false
  }

  const entries = Object.entries(current)
  const stored = saved as Record<string, unknown>
  return (
    entries.length === Object.keys(stored).length &&
    entries.every(
      ([key, value]) => Object.hasOwn(stored, key) && matchesSnapshot(value, stored[key])
    )
  )
}

function canContinueCampaign(): boolean {
  const { persist } = useGameStore
  if (!persist.hasHydrated()) return false

  const { name, storage, partialize, version } = persist.getOptions()
  if (!name || !storage || !partialize || version === undefined) return false

  try {
    const saved = storage.getItem(name)
    // Resume the already-loaded campaign only when the existing persistence projection
    // confirms it. Rehydration can also return a fresh fallback and can write migrations.
    return (
      !!saved &&
      'state' in saved &&
      saved.version === version &&
      matchesSnapshot(partialize(useGameStore.getState()), saved.state)
    )
  } catch {
    return false
  }
}

export function MainMenu() {
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)
  const [canContinue, setCanContinue] = useState(canContinueCampaign)

  useLayoutEffect(() => {
    heading.current?.focus()
  }, [])

  function continueCampaign() {
    if (!canContinueCampaign()) {
      setCanContinue(false)
      return
    }

    void navigate(APP_ROUTES.operationsDesk)
  }

  return (
    <section className="panel panel-primary mx-auto mt-12 max-w-xl space-y-6 p-8">
      <header className="flex items-center gap-4">
        <Logo size={48} className="shrink-0" />
        <div>
          <p className="text-sm text-text-soft">Containment Protocol</p>
          <h1 ref={heading} tabIndex={-1} className="text-3xl font-semibold">
            Main Menu
          </h1>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary min-h-11"
          disabled={!canContinue}
          onClick={continueCampaign}
        >
          Continue
        </button>
        <SettingsAccess />
      </div>
      {!canContinue && (
        <p role="status" className="text-sm text-text-soft">
          A saved campaign could not be confirmed.
        </p>
      )}
    </section>
  )
}
