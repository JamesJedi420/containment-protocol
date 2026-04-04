import { useState } from 'react'
import { useGameStore } from '../../app/store/gameStore'
import { DASHBOARD_SECTIONS, FEEDBACK_MESSAGES, RUN_TRANSFER_TEXT } from '../../data/copy'

type TransferStatus = {
  kind: 'idle' | 'success' | 'error'
  message: string
}

export function RunTransferPanel() {
  const { exportRun, importRun, newRunFromCurrentConfig } = useGameStore()
  const [payloadText, setPayloadText] = useState('')
  const [status, setStatus] = useState<TransferStatus>({
    kind: 'idle',
    message: RUN_TRANSFER_TEXT.panelSubtitle,
  })

  function handleExport() {
    setPayloadText(exportRun())
    setStatus({
      kind: 'success',
      message: FEEDBACK_MESSAGES.runExportReady,
    })
  }

  function handleImport() {
    try {
      importRun(payloadText)
      setPayloadText(exportRun())
      setStatus({
        kind: 'success',
        message: FEEDBACK_MESSAGES.runImported,
      })
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : RUN_TRANSFER_TEXT.invalidPayload,
      })
    }
  }

  function handleNewRun() {
    newRunFromCurrentConfig()
    setPayloadText(exportRun())
    setStatus({
      kind: 'success',
      message: FEEDBACK_MESSAGES.runStartedFromCurrentConfig,
    })
  }

  return (
    <section className="panel space-y-4" aria-labelledby="run-transfer-heading">
      <div className="space-y-1">
        <h2 id="run-transfer-heading" className="text-lg font-semibold">
          {DASHBOARD_SECTIONS.runTransfer}
        </h2>
        <p className="text-sm opacity-60">{RUN_TRANSFER_TEXT.panelSubtitle}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm opacity-70">
          Paste a run payload, then import it. Export and new-run actions are available below.
        </p>
        <label htmlFor="run-transfer-payload" className="text-sm">
          <span className="block text-xs uppercase tracking-wide opacity-60">
            {RUN_TRANSFER_TEXT.payloadLabel}
          </span>
          <textarea
            id="run-transfer-payload"
            value={payloadText}
            onChange={(event) => {
              setPayloadText(event.target.value)
              setStatus({
                kind: 'idle',
                message: RUN_TRANSFER_TEXT.panelSubtitle,
              })
            }}
            placeholder={RUN_TRANSFER_TEXT.payloadPlaceholder}
            rows={10}
            className="w-full rounded border border-white/10 bg-transparent px-3 py-2 font-mono text-xs leading-5"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleImport} className="btn btn-sm">
            {RUN_TRANSFER_TEXT.importRun}
          </button>
          <button type="button" onClick={handleExport} className="btn btn-sm btn-ghost">
            {RUN_TRANSFER_TEXT.exportRun}
          </button>
          <button type="button" onClick={handleNewRun} className="btn btn-sm btn-ghost">
            {RUN_TRANSFER_TEXT.newRunFromCurrentConfig}
          </button>
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`text-sm ${
          status.kind === 'error'
            ? 'text-red-300'
            : status.kind === 'success'
              ? 'text-green-300'
              : 'opacity-60'
        }`}
      >
        {status.message}
      </p>
    </section>
  )
}
