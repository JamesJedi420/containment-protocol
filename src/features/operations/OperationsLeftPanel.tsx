import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { OPERATIONS_DESK_TEXT } from '../../data/copy'
import { getOperationsLeftPanelView } from './operationsLeftView'

const DIRECTOR_TRAITS = ['Risk-Aware', 'Logistics Hawk', 'Signal-Focused']

export function OperationsLeftPanel() {
  const { game } = useGameStore()
  const view = useMemo(() => getOperationsLeftPanelView(game), [game])

  return (
    <section className="panel space-y-3" aria-label="Operations left panel">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{OPERATIONS_DESK_TEXT.directorSectionLabel}</h2>
        <p className="text-sm opacity-60">{OPERATIONS_DESK_TEXT.directorName}</p>
      </div>

      <div className="rounded border border-white/10 px-3 py-2 text-sm">
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">
          {OPERATIONS_DESK_TEXT.traitsLabel}
        </p>
        <p className="mt-1 opacity-80">{DIRECTOR_TRAITS.join(' • ')}</p>
      </div>

      <div className="grid gap-2 text-sm">
        <p className="opacity-70">
          {OPERATIONS_DESK_TEXT.fieldIntelLabel}: {view.intelligenceSummary}
        </p>
        <p className="opacity-70">
          {OPERATIONS_DESK_TEXT.fabricationOrdersLabel}: {view.logisticsSummary}
        </p>
        <p className="opacity-70">
          {OPERATIONS_DESK_TEXT.reserveStaffLabel}: {view.reserveStaffCount}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to={APP_ROUTES.intel} className="btn btn-sm btn-ghost">
          {OPERATIONS_DESK_TEXT.fieldIntelLabel}
        </Link>
        <Link to={APP_ROUTES.fabrication} className="btn btn-sm btn-ghost">
          {OPERATIONS_DESK_TEXT.fabricationOrdersLabel}
        </Link>
      </div>
    </section>
  )
}
