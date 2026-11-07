import { useId, useRef, useState } from 'react'
import { dispatchInputAction, useInputConsumer } from '../../app/inputRuntime'
import { ReferenceLibrary } from './ReferenceLibrary'

export function ReferenceAccess() {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [active, setActive] = useState(false)
  const [request, setRequest] = useState({
    entryId: undefined as string | undefined,
    serial: 0,
    opened: false,
  })
  useInputConsumer({
    id: 'reference.open',
    context: 'global',
    available: () => !!dialog.current && !dialog.current.open,
    execute: (entryId) => {
      setRequest((current) =>
        entryId === undefined
          ? { ...current, opened: true }
          : { entryId, serial: current.serial + 1, opened: true }
      )
      dialog.current?.showModal()
      setActive(true)
    },
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
        aria-label="Help"
        aria-haspopup="dialog"
        data-topbar-action="help"
        onClick={(event) => {
          event.currentTarget.focus()
          dispatchInputAction('reference.open')
        }}
      >
        Help
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="settings-dialog reference-dialog"
        onClose={() => setActive(false)}
      >
        <h2 id={titleId}>Reference library</h2>
        <form method="dialog">
          <button type="submit" className="btn settings-control" autoFocus>
            Close reference
          </button>
        </form>
        {request.opened && (
          <ReferenceLibrary
            key={request.serial}
            initialEntryId={request.entryId}
            modal
            active={active}
          />
        )}
      </dialog>
    </>
  )
}
