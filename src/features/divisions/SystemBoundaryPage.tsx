import { Link } from 'react-router'
import { useGameStore } from '../../app/store/gameStore'
import { SHELL_UI_TEXT } from '../../data/copy'
import {
  getAssignmentSummary,
  getFieldIntelligenceSummary,
  getNonFieldStaff,
  getTimeQueueSummary,
} from '../../app/services/divisionMetrics'
import { APP_ROUTES } from '../../app/routes'

type BoundaryKey =
  | 'recruitment'
  | 'trainingDivision'
  | 'equipment'
  | 'containmentSite'
  | 'marketsSuppliers'
  | 'factions'
  | 'rankings'
  | 'agency'
  | 'notFound'

const BOUNDARY_CONFIG: Record<
  Exclude<BoundaryKey, 'notFound'>,
  { title: string; focus: string }
> = {
  recruitment: {
    title: 'Recruitment',
    focus: 'Non-field staffing pipeline and reserve capacity for future assignments.',
  },
  trainingDivision: {
    title: 'Training Division',
    focus: 'Training throughput planning linked to assignment pressure and fatigue recovery.',
  },
  equipment: {
    title: 'Equipment',
    focus: 'Equipment readiness from inventory and active fabrication outputs.',
  },
  containmentSite: {
    title: 'Containment Site',
    focus: 'Site posture driven by active pressure, unresolved incidents, and escalation risk.',
  },
  marketsSuppliers: {
    title: 'Markets / Suppliers',
    focus: 'Procurement pressure and pricing signals affecting fabrication throughput.',
  },
  factions: {
    title: 'Factions',
    focus: 'External activity surface sourced from operational event outputs.',
  },
  rankings: {
    title: 'Rankings',
    focus: 'Campaign performance benchmarks from reports and score outcomes.',
  },
  agency: {
    title: 'Agency',
    focus: 'Cross-division command snapshot for strategic planning.',
  },
}

export function SystemBoundaryPage({
  boundary,
  returnTo,
}: {
  boundary: BoundaryKey
  returnTo?: string
}) {
  const { game } = useGameStore()

  if (boundary === 'notFound') {
    return (
      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">Route not found</h2>
        <p className="text-sm opacity-60">This system boundary is not defined.</p>
        <Link className="btn btn-sm" to={returnTo ?? APP_ROUTES.operationsDesk}>
          Return to Operations Desk
        </Link>
      </section>
    )
  }

  const config = BOUNDARY_CONFIG[boundary]
  const assignment = getAssignmentSummary(game)
  const queue = getTimeQueueSummary(game)
  const intel = getFieldIntelligenceSummary(game)
  const reserve = getNonFieldStaff(game)

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
          {SHELL_UI_TEXT.futureBoundaryBadge}
        </p>
        <p className="text-sm opacity-75">{SHELL_UI_TEXT.futureBoundaryNote}</p>
      </article>

      <article className="panel space-y-3">
        <h2 className="text-lg font-semibold">{config.title}</h2>
        <p className="text-sm opacity-60">{config.focus}</p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active cases" value={String(assignment.activeCases)} />
          <Metric label="Open assignments" value={String(assignment.openCases)} />
          <Metric label="Reserve staff" value={String(reserve.length)} />
          <Metric label="Queue depth" value={String(queue.queued)} />
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Shared-state integration</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm opacity-80">
          <li>
            Assignment system: {assignment.assignedTeams} teams deployed /{' '}
            {assignment.availableTeams} available.
          </li>
          <li>Non-field staff system: {reserve.length} agents available for staffing workflows.</li>
          <li>
            Time-based queue system: {queue.queued} active orders, {queue.completedEvents} completed
            outputs.
          </li>
          <li>
            Field intelligence: {intel.reports} reports generated, unresolved pressure{' '}
            {intel.unresolvedPressure}.
          </li>
        </ul>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Recent cross-system events</h3>
        {intel.recentEvents.length === 0 ? (
          <p className="text-sm opacity-60">No events recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {intel.recentEvents.map((event) => (
              <li key={event.id} className="rounded border border-white/10 px-3 py-2">
                <p className="text-sm font-medium">{event.type}</p>
                <p className="text-xs opacity-60">
                  {event.sourceSystem} • {event.timestamp}
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
