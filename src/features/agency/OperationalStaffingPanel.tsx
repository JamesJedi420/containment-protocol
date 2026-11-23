import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useFocusedControls, useInputConsumer } from '../../app/inputRuntime'
import {
  OPERATIONAL_STAFF_POST_REASON_COPY,
  OPERATIONAL_STAFF_POSTS_ANCHOR,
  OPERATIONAL_STAFFING_COPY as copy,
} from './operationalStaffingView'
import type {
  OperationalStaffPostId,
  OperationalStaffPostRequest,
  OperationalStaffPostResult,
  projectOperationalStaffingView,
} from './operationalStaffingView'

export function OperationalStaffingPanel({
  staffing,
  onChangePost,
}: {
  staffing: ReturnType<typeof projectOperationalStaffingView>
  onChangePost: (
    request: OperationalStaffPostRequest,
    destination: OperationalStaffPostId | null
  ) => OperationalStaffPostResult
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const panel = useRef<HTMLElement>(null)
  const { hash, key } = useLocation()
  const navigate = useNavigate()
  const managementHash = `#${OPERATIONAL_STAFF_POSTS_ANCHOR}`
  const [feedback, setFeedback] = useState({ attempt: 0, message: '' })
  useInputConsumer({
    id: 'staffing.manage',
    context: 'route',
    available: () => staffing.personnel.length > 0,
    execute: () => void navigate(managementHash),
  })
  useFocusedControls(
    () => panel.current?.querySelectorAll<HTMLElement>('a[href], h4, button') ?? []
  )

  useEffect(() => {
    if (hash === managementHash) heading.current?.focus()
  }, [hash, key, managementHash])

  function changePost(
    person: (typeof staffing.personnel)[number],
    target: (typeof person.targets)[number] | null
  ) {
    const result = onChangePost(
      { staffId: person.id, expectedPreviousPostId: person.postId },
      target?.id ?? null
    )
    setFeedback(({ attempt }) => ({
      attempt: attempt + 1,
      message: copy.commandFeedback(
        person.name,
        OPERATIONAL_STAFF_POST_REASON_COPY[result.reason],
        target?.label
      ),
    }))
  }

  return (
    <article ref={panel} className="panel space-y-3" aria-labelledby="operational-staffing-heading">
      <h3 id="operational-staffing-heading" className="text-base font-semibold">
        {copy.heading}
      </h3>
      <p className="text-sm opacity-80">{copy.explanation}</p>
      <div aria-live="polite" aria-atomic="true" className="space-y-3">
        {staffing.unavailable ? (
          <p className="text-sm">{copy.rosterUnavailable}</p>
        ) : (
          <>
            <dl className="grid min-w-0 gap-3 sm:grid-cols-3">
              {[
                [copy.headcount, staffing.capacity.headcount],
                [copy.assigned, staffing.capacity.assigned],
                [copy.capacity, staffing.capacity.effectiveCapacity],
              ].map(([label, count]) => (
                <div key={label} className="min-w-0 break-words">
                  <dt className="text-sm opacity-80">{label}</dt>
                  <dd className="text-lg font-semibold">{count}</dd>
                </div>
              ))}
            </dl>
            {staffing.unassignedCount > 0 && (
              <p className="text-sm">
                {copy.unassigned} ({staffing.unassignedCount})
              </p>
            )}
            {staffing.invalidAssignmentCount > 0 && (
              <p className="text-sm">
                {copy.invalidAssignment} ({staffing.invalidAssignmentCount})
              </p>
            )}
          </>
        )}
      </div>
      {staffing.unassignedCount > 0 && (
        <Link to={managementHash} className="btn min-h-11 max-w-full">
          {copy.managePosts}
        </Link>
      )}
      <section className="min-w-0 space-y-3" aria-labelledby={OPERATIONAL_STAFF_POSTS_ANCHOR}>
        <h4
          ref={heading}
          id={OPERATIONAL_STAFF_POSTS_ANCHOR}
          tabIndex={-1}
          className="focus-ring scroll-mt-24 font-semibold"
        >
          {copy.postHeading}
        </h4>
        <p className="wrap-anywhere text-sm" role="status" aria-atomic="true">
          {feedback.message && <span key={feedback.attempt}>{feedback.message}</span>}
        </p>
        {!staffing.unavailable && staffing.personnel.length === 0 && (
          <p className="text-sm">{copy.emptyRoster}</p>
        )}
        {staffing.personnel.map((person) => (
          <fieldset
            key={person.id}
            className="min-w-0 space-y-2 rounded border border-white/10 p-3"
          >
            <legend className="max-w-full wrap-anywhere px-1 font-medium">{person.name}</legend>
            <p className="text-sm" aria-live="polite">
              {person.assignmentIssue ??
                (person.postLabel ? copy.currentPost(person.postLabel) : copy.unassignedPost)}
              {person.facilityHold && <> {person.facilityHold}</>}
            </p>
            {!person.assignmentIssue && (
              <div className="flex flex-wrap gap-2">
                {person.targets.map((target) => {
                  const isCurrent = target.id === person.postId
                  const action = copy.choosePost(target.label, person.postId !== null)
                  return (
                    <button
                      key={target.id}
                      type="button"
                      className="btn min-h-11 max-w-full whitespace-normal"
                      aria-disabled={isCurrent}
                      onClick={() => {
                        if (!isCurrent) changePost(person, target)
                      }}
                    >
                      {isCurrent
                        ? copy.currentPost(target.label)
                        : target.occupied
                          ? copy.occupiedPost(action)
                          : action}
                    </button>
                  )
                })}
                <button
                  type="button"
                  className="btn min-h-11 max-w-full whitespace-normal"
                  aria-disabled={person.postId === null}
                  onClick={() => {
                    if (person.postId !== null) changePost(person, null)
                  }}
                >
                  {copy.unassignPost}
                </button>
              </div>
            )}
          </fieldset>
        ))}
      </section>
    </article>
  )
}
