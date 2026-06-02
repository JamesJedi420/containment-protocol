/**
 * SPE-854 slice 4: weekly corroboration/contradiction tick for persisted intake reports.
 *
 * Deterministic authored fixture events per report id (plus a bounded fallback for
 * unknown reports). Not a full narrative generator — slice boundary stub only.
 */

import {
  applyContradictionEvent,
  applyCorroborationEvent,
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
  type ContradictionEvent,
  type CorroborationEvent,
  type InformationIntakeReportRecord,
  type InformationIntakeReportsMap,
} from './informationIntakeReport'

type WeeklyIntakeSyntheticEvent =
  | { readonly kind: 'corroboration'; readonly event: CorroborationEvent }
  | { readonly kind: 'contradiction'; readonly event: ContradictionEvent }

export function buildWeeklyIntakeSyntheticEventId(
  reportId: string,
  week: number,
  kind: 'corroboration' | 'contradiction'
): string {
  return `weekly-intake:${kind}:${reportId}:w${normalizeWeek(week)}`
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function stableOrdinalFromId(id: string): number {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 1)) % 997
  }

  return hash
}

function resolveAuthoredWeeklySyntheticEvent(
  report: InformationIntakeReportRecord,
  week: number
): WeeklyIntakeSyntheticEvent | null {
  const normalizedWeek = normalizeWeek(week)

  switch (report.id) {
    case IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id:
      if (normalizedWeek % 2 === 0) {
        return null
      }

      return {
        kind: 'corroboration',
        event: {
          eventId: buildWeeklyIntakeSyntheticEventId(report.id, normalizedWeek, 'corroboration'),
          week: normalizedWeek,
          sourceRef: `witness:weekly-archive-review-${normalizedWeek}`,
          sourceClass: 'field_witness',
          weight: 0.2,
          note: 'Weekly field review cross-checks archive residue claim.',
        },
      }

    case PUBLIC_RUMOR_CONFLICT_FIXTURE.id:
      if (normalizedWeek % 4 === 0) {
        return {
          kind: 'contradiction',
          event: {
            eventId: buildWeeklyIntakeSyntheticEventId(report.id, normalizedWeek, 'contradiction'),
            week: normalizedWeek,
            sourceRef: `audit:weekly-rumor-baseline-${normalizedWeek}`,
            severity: 'minor',
            note: 'Weekly baseline audit flags rumor timing conflict.',
          },
        }
      }

      return {
        kind: 'corroboration',
        event: {
          eventId: buildWeeklyIntakeSyntheticEventId(report.id, normalizedWeek, 'corroboration'),
          week: normalizedWeek,
          sourceRef: `witness:weekly-rumor-corroboration-${normalizedWeek}`,
          sourceClass: 'field_witness',
          weight: 0.18,
        },
      }

    case FORMAL_ALERT_PARTIAL_FIXTURE.id:
      return {
        kind: 'corroboration',
        event: {
          eventId: buildWeeklyIntakeSyntheticEventId(report.id, normalizedWeek, 'corroboration'),
          week: normalizedWeek,
          sourceRef: `sensor:weekly-thermal-grid-${normalizedWeek}`,
          sourceClass: 'technical_trace',
          weight: 0.22,
          note: 'Weekly grid thermal corroboration tick.',
        },
      }

    default:
      return resolveFallbackWeeklySyntheticEvent(report, normalizedWeek)
  }
}

function resolveFallbackWeeklySyntheticEvent(
  report: InformationIntakeReportRecord,
  week: number
): WeeklyIntakeSyntheticEvent | null {
  const phase = (week + stableOrdinalFromId(report.id)) % 6

  if (phase === 0) {
    return {
      kind: 'contradiction',
      event: {
        eventId: buildWeeklyIntakeSyntheticEventId(report.id, week, 'contradiction'),
        week,
        sourceRef: `audit:weekly-intake-${report.topicRef}`,
        severity: 'minor',
      },
    }
  }

  if (phase === 1 || phase === 3) {
    const sourceClass =
      report.initialSourceClass === 'rumor_chain' || report.initialSourceClass === 'public_signal'
        ? 'public_signal'
        : 'partner_channel'

    return {
      kind: 'corroboration',
      event: {
        eventId: buildWeeklyIntakeSyntheticEventId(report.id, week, 'corroboration'),
        week,
        sourceRef: `source:weekly-intake-${report.topicRef}`,
        sourceClass,
        weight: phase === 3 ? 0.2 : 0.15,
      },
    }
  }

  return null
}

/**
 * Applies one weekly corroboration/contradiction pass over persisted intake reports.
 * Empty map is a no-op. Re-applying for the same week is idempotent (stable event ids).
 */
export function applyWeeklyIntakeCorroborationTick(
  reports: InformationIntakeReportsMap | null | undefined,
  week: number
): InformationIntakeReportsMap {
  const safeReports = reports ?? {}
  const reportIds = Object.keys(safeReports)
  if (reportIds.length === 0) {
    return safeReports
  }

  const next: InformationIntakeReportsMap = { ...safeReports }

  for (const reportId of reportIds.sort((left, right) => left.localeCompare(right))) {
    const report = safeReports[reportId]
    if (!report) {
      continue
    }

    const synthetic = resolveAuthoredWeeklySyntheticEvent(report, week)
    if (!synthetic) {
      continue
    }

    const transition =
      synthetic.kind === 'corroboration'
        ? applyCorroborationEvent(report, synthetic.event)
        : applyContradictionEvent(report, synthetic.event)

    next[reportId] = transition.report
  }

  return next
}
