import { useId, useRef } from 'react'
import { IconSettings } from '../shellIcons'

/** Shell-only access: opening settings neither navigates nor changes campaign state. */
export function SettingsAccess() {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost settings-control"
        data-topbar-action="settings"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <IconSettings size={20} aria-hidden="true" />
        Settings
      </button>
      <dialog ref={dialog} aria-labelledby={titleId} className="settings-dialog">
        <h2 id={titleId} className="text-xl font-semibold">
          Settings
        </h2>
        <p className="my-4">There are no adjustable settings available yet.</p>
        <form method="dialog">
          <button type="submit" className="btn settings-control" autoFocus>
            Close settings
          </button>
        </form>
      </dialog>
    </>
  )
}
