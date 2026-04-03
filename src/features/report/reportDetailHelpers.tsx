import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import {
  type CaseInstance,
  type Id,
  type WeeklyReportCaseSnapshot,
  type WeeklyReportTeamStatus,
} from '../../domain/models'
import { MODE_LABELS, REPORT_UI_TEXT, SHELL_UI_TEXT, STATUS_LABELS } from '../../data/copy'

type CaseSnapshotMap = Record<Id, WeeklyReportCaseSnapshot> | undefined
type CaseMap = Record<Id, CaseInstance>

function formatWeeks(value: number) {
  return `${value} week${value === 1 ? '' : 's'}`
}

function formatCaseMeta(caseLike?: {
  kind: WeeklyReportCaseSnapshot['kind']
  mode: WeeklyReportCaseSnapshot['mode']
  status: WeeklyReportCaseSnapshot['status']
  stage: number
  deadlineRemaining: number
  durationWeeks: number
  weeksRemaining?: number
}) {
  if (!caseLike) {
    return ''
  }

  const parts = [
    caseLike.kind === 'raid' ? 'Raid' : 'Case',
    MODE_LABELS[caseLike.mode],
    STATUS_LABELS[caseLike.status],
    `Stage ${caseLike.stage}`,
    `Deadline ${formatWeeks(caseLike.deadlineRemaining)}`,
  ]

  if (caseLike.weeksRemaining !== undefined) {
    parts.push(`Remaining ${formatWeeks(caseLike.weeksRemaining)}`)
  } else {
    parts.push(`Duration ${formatWeeks(caseLike.durationWeeks)}`)
  }

  return parts.join(' - ')
}

function getCaseTitle(caseId: string, currentCases: CaseMap, snapshots?: CaseSnapshotMap) {
  return snapshots?.[caseId]?.title ?? currentCases[caseId]?.title ?? caseId
}

function getCaseMeta(caseId: string, currentCases: CaseMap, snapshots?: CaseSnapshotMap) {
  const snapshot = snapshots?.[caseId]
  const currentCase = currentCases[caseId]

  return formatCaseMeta(snapshot ?? currentCase)
}

function ReportCaseEntry({
  caseId,
  existingCaseIds,
  currentCases,
  snapshots,
}: {
  caseId: string
  existingCaseIds: Set<string>
  currentCases: CaseMap
  snapshots?: CaseSnapshotMap
}) {
  const snapshot = snapshots?.[caseId]
  const currentCase = currentCases[caseId]
  const isLive = existingCaseIds.has(caseId) && currentCase !== undefined
  const title = getCaseTitle(caseId, currentCases, snapshots)
  const meta = getCaseMeta(caseId, currentCases, snapshots)

  return (
    <li className="rounded border border-white/10 px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">
            {isLive ? (
              <Link to={APP_ROUTES.caseDetail(caseId)} className="hover:underline">
                {title}
              </Link>
            ) : (
              <span>{title}</span>
            )}
          </p>
          <p className="text-xs opacity-50">{caseId}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {isLive && currentCase ? (
            <Link
              to={APP_ROUTES.intelDetail(currentCase.templateId)}
              className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-100 hover:underline"
            >
              intel {currentCase.templateId}
            </Link>
          ) : null}

          {snapshot && !isLive ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-70">
              {REPORT_UI_TEXT.staleSnapshotSuffix}
            </span>
          ) : null}
        </div>
      </div>

      {meta ? <p className="mt-2 text-xs opacity-60">{meta}</p> : null}
    </li>
  )
}

export function CaseIdList({
  caseIds,
  existingCaseIds,
  emptyLabel,
}: {
  caseIds: string[]
  existingCaseIds: Set<string>
  emptyLabel: string
}) {
  if (caseIds.length === 0) {
    return <p className="text-sm opacity-50">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {caseIds.map((caseId) => {
        if (existingCaseIds.has(caseId)) {
          return (
            <li key={caseId}>
              <Link to={APP_ROUTES.caseDetail(caseId)} className="btn btn-xs btn-ghost">
                {caseId}
              </Link>
            </li>
          )
        }

        return (
          <li key={caseId}>
            <span className="btn btn-xs btn-ghost cursor-default opacity-60">{caseId}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function ReportCaseGroup({
  title,
  emptyLabel,
  caseIds,
  existingCaseIds,
  currentCases,
  snapshots,
}: {
  title: string
  emptyLabel: string
  caseIds: string[]
  existingCaseIds: Set<string>
  currentCases: CaseMap
  snapshots?: CaseSnapshotMap
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs uppercase tracking-wide opacity-50">{title}</p>
      {caseIds.length > 0 ? (
        <ul className="space-y-2">
          {caseIds.map((caseId) => (
            <ReportCaseEntry
              key={caseId}
              caseId={caseId}
              existingCaseIds={existingCaseIds}
              currentCases={currentCases}
              snapshots={snapshots}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm opacity-50">{emptyLabel}</p>
      )}
    </section>
  )
}

function formatFatigueBand(value?: WeeklyReportTeamStatus['fatigueBand']) {
  if (!value) {
    return SHELL_UI_TEXT.none
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

export function ReportTeamStatusList({
  teamStatus,
  emptyLabel,
  existingCaseIds,
  currentCases,
  snapshots,
}: {
  teamStatus: WeeklyReportTeamStatus[]
  emptyLabel: string
  existingCaseIds: Set<string>
  currentCases: CaseMap
  snapshots?: CaseSnapshotMap
}) {
  if (teamStatus.length === 0) {
    return <p className="text-sm opacity-50">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-2">
      {teamStatus.map((entry) => {
        const assignedSnapshot = entry.assignedCaseId
          ? snapshots?.[entry.assignedCaseId]
          : undefined
        const assignedCase = entry.assignedCaseId ? currentCases[entry.assignedCaseId] : undefined
        const isLive = Boolean(entry.assignedCaseId && existingCaseIds.has(entry.assignedCaseId))
        const assignedTitle =
          assignedSnapshot?.title ??
          entry.assignedCaseTitle ??
          assignedCase?.title ??
          SHELL_UI_TEXT.none
        const assignedMeta = formatCaseMeta(assignedSnapshot ?? assignedCase)

        return (
          <li key={entry.teamId} className="rounded border border-white/10 px-3 py-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">{entry.teamName ?? entry.teamId}</p>
                <p className="text-xs opacity-50">{entry.teamId}</p>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-70">
                {formatFatigueBand(entry.fatigueBand)}
              </span>
            </div>

            <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <span>
                Avg fatigue: <span className="font-medium">{entry.avgFatigue}</span>
              </span>
              <span>
                Band: <span className="font-medium">{formatFatigueBand(entry.fatigueBand)}</span>
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <p className="text-xs uppercase tracking-wide opacity-50">Assigned case</p>
              {entry.assignedCaseId ? (
                <>
                  <p className="text-sm">
                    {isLive ? (
                      <Link
                        to={APP_ROUTES.caseDetail(entry.assignedCaseId)}
                        className="hover:underline"
                      >
                        {assignedTitle}
                      </Link>
                    ) : (
                      <span>{assignedTitle}</span>
                    )}
                  </p>
                  {isLive && assignedCase ? (
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <Link
                        to={APP_ROUTES.intelDetail(assignedCase.templateId)}
                        className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-100 hover:underline"
                      >
                        intel {assignedCase.templateId}
                      </Link>
                    </div>
                  ) : null}
                  <p className="text-xs opacity-50">
                    {entry.assignedCaseId}
                    {!isLive ? ` - ${REPORT_UI_TEXT.staleSnapshotSuffix}` : ''}
                  </p>
                  {assignedMeta ? <p className="text-xs opacity-60">{assignedMeta}</p> : null}
                </>
              ) : (
                <p className="text-sm opacity-50">{SHELL_UI_TEXT.none}</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
