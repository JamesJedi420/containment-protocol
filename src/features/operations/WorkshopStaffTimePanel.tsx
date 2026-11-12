import { useState } from 'react'
import { useGameStore } from '../../app/store/gameStore'
import { getWorkshopStaffTimeView } from './workshopStaffTimeView'
import { WORKSHOP_STAFF_TIME_COPY as copy } from './workshopStaffTimeCopy'

export function WorkshopStaffTimePanel() {
  const { game, reserveWorkshopStaffTime, releaseWorkshopStaffTime } = useGameStore()
  const view = getWorkshopStaffTimeView(game)
  const [orderId, setOrderId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [alternative, setAlternative] = useState('')
  const [message, setMessage] = useState('')
  return (
    <article className="panel panel-support space-y-3" aria-label={copy.title}>
      <h3>{copy.title}</h3>
      <p>{copy.description}</p>
      <p>
        {copy.available}: {view.staff.length}
      </p>
      {view.unavailable && <p>{copy.unavailable}</p>}
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          const order = view.orders.find((item) => item.id === orderId)
          if (!order) {
            setMessage(copy.reasons.invalid_request)
            return
          }
          const result = reserveWorkshopStaffTime({
            id: order.commitmentId,
            week: view.week,
            destination: order.destination,
            staffIds: [staffId],
            displacedAlternative: alternative
              ? (view.orders.find((item) => item.id === alternative)?.destination ?? alternative)
              : null,
            revision: view.revision,
          })
          setMessage(copy.reasons[result.reason])
        }}
      >
        <label className="flex min-w-0 flex-col gap-1">
          {copy.order}
          <select
            className="select select-sm w-full min-w-0"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          >
            <option value="">{copy.choose}</option>
            {view.orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          {copy.staff}
          <select
            className="select select-sm w-full min-w-0"
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">{copy.choose}</option>
            {view.staff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          {copy.alternative}
          <select
            className="select select-sm w-full min-w-0"
            value={alternative}
            onChange={(event) => setAlternative(event.target.value)}
          >
            <option value="">{copy.none}</option>
            {view.orders
              .filter((order) => order.id !== orderId)
              .map((order) => (
                <option key={order.id} value={order.id}>
                  {order.id}
                </option>
              ))}
          </select>
        </label>
        <button
          className="btn btn-sm"
          type="submit"
          disabled={view.unavailable || !orderId || !staffId}
        >
          {copy.reserve}
        </button>
      </form>
      <p role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>
      <h4>{copy.receipts}</h4>
      <ul className="space-y-2 break-words">
        {view.receipts.map((receipt) => (
          <li key={receipt.id}>
            {receipt.destination} · W{receipt.week} · {receipt.staffIds.join(', ')} ·{' '}
            {copy.statuses[receipt.status]}
            {receipt.unusable && <span> · {copy.unusable}</span>}
            {receipt.displacedAlternative && (
              <>
                {' '}
                · {copy.alternative}: {receipt.displacedAlternative}
              </>
            )}
            {receipt.status === 'active' && (
              <button
                className="btn btn-sm"
                onClick={() =>
                  setMessage(
                    copy.reasons[releaseWorkshopStaffTime(receipt.id, view.revision).reason]
                  )
                }
              >
                {copy.release} {receipt.destination}
              </button>
            )}
          </li>
        ))}
      </ul>
    </article>
  )
}
