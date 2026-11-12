import { useState, type FormEvent } from 'react'
import { resolveGameStorage, restoreCompatibleRun } from './store/gameStore'

export function CampaignRecovery({ message }: { message: string }) {
  const [run, setRun] = useState('')
  const [feedback, setFeedback] = useState('')
  const [restoring, setRestoring] = useState(false)
  const stored = resolveGameStorage().getItem('containment-protocol-game-state')

  async function restore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRestoring(true)
    try {
      await restoreCompatibleRun(run)
      window.location.reload()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The backup could not be restored.')
      setRestoring(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Saved campaign unavailable</h1>
      <p role="alert">{message}</p>
      <p>
        Your saved campaign has not been replaced. You can copy the original data for safekeeping,
        or restore a compatible run export. Restoring keeps a separate copy of the original in this
        browser.
      </p>
      {typeof stored === 'string' && (
        <details>
          <summary>Show original saved data</summary>
          <label htmlFor="preserved-campaign-data">Original saved campaign data</label>
          <textarea
            id="preserved-campaign-data"
            className="w-full rounded border border-white/30 bg-white/5 px-3 py-2 font-mono text-sm focus-ring"
            readOnly
            rows={8}
            value={stored}
          />
        </details>
      )}
      <form className="space-y-2" onSubmit={restore}>
        <label htmlFor="recovery-run" className="block">
          Compatible run export
        </label>
        <textarea
          id="recovery-run"
          className="w-full rounded border border-white/30 bg-white/5 px-3 py-2 font-mono text-sm focus-ring"
          rows={8}
          value={run}
          onChange={(event) => setRun(event.target.value)}
        />
        <button type="submit" className="btn btn-sm" disabled={restoring}>
          Restore compatible run
        </button>
        <p role="status" aria-live="polite">
          {feedback}
        </p>
      </form>
    </main>
  )
}
