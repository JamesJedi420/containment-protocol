import { OPERATIONAL_STAFFING_COPY } from './operationalStaffingView'
import type { projectOperationalStaffingView } from './operationalStaffingView'

export function OperationalStaffingPanel({
  staffing,
}: {
  staffing: ReturnType<typeof projectOperationalStaffingView>
}) {
  return (
    <article className="panel space-y-3" aria-labelledby="operational-staffing-heading">
      <h3 id="operational-staffing-heading" className="text-base font-semibold">
        {OPERATIONAL_STAFFING_COPY.heading}
      </h3>
      <p className="text-sm opacity-80">{OPERATIONAL_STAFFING_COPY.explanation}</p>
      <div aria-live="polite" aria-atomic="true" className="space-y-3">
        {staffing.unavailable ? (
          <p className="text-sm">{OPERATIONAL_STAFFING_COPY.rosterUnavailable}</p>
        ) : (
          <>
            <dl className="grid min-w-0 gap-3 sm:grid-cols-3">
              {[
                [OPERATIONAL_STAFFING_COPY.headcount, staffing.capacity.headcount],
                [OPERATIONAL_STAFFING_COPY.assigned, staffing.capacity.assigned],
                [OPERATIONAL_STAFFING_COPY.capacity, staffing.capacity.effectiveCapacity],
              ].map(([label, count]) => (
                <div key={label} className="min-w-0 break-words">
                  <dt className="text-sm opacity-80">{label}</dt>
                  <dd className="text-lg font-semibold">{count}</dd>
                </div>
              ))}
            </dl>
            {staffing.unassignedCount > 0 && (
              <p className="text-sm">
                {OPERATIONAL_STAFFING_COPY.unassigned} ({staffing.unassignedCount}){' '}
                {OPERATIONAL_STAFFING_COPY.navigationUnavailable}
              </p>
            )}
            {staffing.invalidAssignmentCount > 0 && (
              <p className="text-sm">
                {OPERATIONAL_STAFFING_COPY.invalidAssignment} ({staffing.invalidAssignmentCount})
              </p>
            )}
          </>
        )}
      </div>
    </article>
  )
}
