import { Link } from 'react-router'
import type { MissionTriageCompactRowView } from './missionTriageLayoutView'

const PRIORITY_STYLES: Record<MissionTriageCompactRowView['priority'], string> = {
  critical: 'border-red-500/40 bg-red-500/10 text-red-200',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  normal: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  low: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
}

function buildTriageSignalsDescription(row: MissionTriageCompactRowView) {
  if (row.chips.length === 0) {
    return ''
  }

  return `Triage signals: ${row.chips.map((chip) => chip.label).join(', ')}`
}

export function MissionTriageListRow({
  row,
  detailHref,
  onSelect,
}: {
  row: MissionTriageCompactRowView
  detailHref: string
  onSelect: () => void
}) {
  const titleId = `mission-triage-row-${row.caseId}-title`
  const typeId = `mission-triage-row-${row.caseId}-type`
  const signalsId = `mission-triage-row-${row.caseId}-signals`
  const labelledBy =
    row.chips.length > 0 ? `${titleId} ${typeId} ${signalsId}` : `${titleId} ${typeId}`

  return (
    <li
      className={`rounded border px-3 py-2 transition ${
        row.isSelected
          ? 'border-sky-400/50 bg-sky-500/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
      aria-labelledby={labelledBy}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            id={titleId}
            to={detailHref}
            className="truncate font-medium hover:underline focus-ring"
            data-testid={`case-title-link-${row.caseId}`}
          >
            {row.title}
          </Link>
          <p id={typeId} className="text-xs opacity-60">
            {row.typeLabel}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${PRIORITY_STYLES[row.priority]}`}
        >
          {row.priority}
        </span>
      </div>
      {row.chips.length > 0 ? (
        <>
          <p id={signalsId} className="sr-only">
            {buildTriageSignalsDescription(row)}
          </p>
          <div
            className="mt-2 flex flex-wrap gap-1"
            aria-hidden="true"
            data-testid={`case-triage-chips-${row.caseId}`}
          >
            {row.chips.map((chip) => (
              <span
                key={chip.id}
                className={`rounded-full border px-2 py-0.5 text-[10px] ${chip.className}`}
                title={chip.title}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] opacity-50">Triage score {row.priorityScore}</p>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={row.isSelected}
          aria-label={`Select ${row.title} for triage detail`}
          className="btn btn-xs btn-ghost"
        >
          {row.isSelected ? 'Selected' : 'Inspect'}
        </button>
      </div>
    </li>
  )
}
