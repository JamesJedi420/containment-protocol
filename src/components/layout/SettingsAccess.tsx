import { useId, useRef } from 'react'
import { IconSettings } from '../shellIcons'
import { ControlsSettings } from './ControlsSettings'
import { dispatchInputAction, startInputCapture, useInputConsumer } from '../../app/inputRuntime'

/** Shell-only access: opening settings neither navigates nor changes campaign state. */
export function SettingsAccess() {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useInputConsumer({
    id: 'settings.open',
    context: 'global',
    available: () => !!dialog.current && !dialog.current.open,
    execute: () => dialog.current?.showModal(),
  })
  useInputConsumer({
    id: 'modal.dismiss',
    context: 'modal',
    available: () => !!dialog.current?.open && dialog.current.contains(document.activeElement),
    execute: () => dialog.current?.close(),
  })

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost settings-control"
        data-topbar-action="settings"
        aria-haspopup="dialog"
        onClick={() => dispatchInputAction('settings.open')}
      >
        <IconSettings size={20} aria-hidden="true" />
        Settings
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="settings-dialog"
        onClose={() => startInputCapture(null)}
      >
        <h2 id={titleId} className="text-xl font-semibold">
          Settings
        </h2>
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault()
            startInputCapture(null)
            dispatchInputAction('modal.dismiss')
          }}
        >
          <button type="submit" className="btn settings-control" autoFocus>
            Close settings
          </button>
        </form>
        <ControlsSettings />
      </dialog>
    </>
  )
}
