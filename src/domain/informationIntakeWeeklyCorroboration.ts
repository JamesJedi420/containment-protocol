/**
 * SPE-854 slice 4: weekly corroboration/contradiction tick for persisted intake reports.
 *
 * Deterministic authored fixture events per report id (plus a bounded fallback for
 * unknown reports). Not a full narrative generator — slice boundary stub only.
 */

import {
  applyContradictionEvent,
  applyCorroborationEvent,
  type ContradictionEvent,
  type CorroborationEvent,
  type InformationIntakeReportRecord,
  type InformationIntakeReportsMap,
  type IntakeSourceClass,
} from './informationIntakeReport'
import type { CaseInstance } from './models'

type WeeklyIntakeSyntheticEvent =
  | { readonly kind: 'corroboration'; readonly event: CorroborationEvent }
  | { readonly kind: 'contradiction'; readonly event: ContradictionEvent }

type WeeklyCorroborationCaseContext = Pick<
  CaseInstance,
  'id' | 'templateId' | 'title' | 'status' | 'tags' | 'requiredTags' | 'preferredTags'
>

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

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
}

function splitTopicTokens(topicRef: string): string[] {
  return topicRef
    .split(/[^a-z0-9]+/i)
    .map((token) => token.toLowerCase().trim())
    .filter((token) => token.length >= 4)
}

function collectCaseTopicTokens(currentCase: WeeklyCorroborationCaseContext): Set<string> {
  const tokens = new Set<string>()
  const addTokens = (value: string) => {
    for (const token of splitTopicTokens(value)) {
      tokens.add(token)
    }
  }

  addTokens(currentCase.id)
  addTokens(currentCase.templateId)
  addTokens(currentCase.title)
  for (const tag of currentCase.tags) addTokens(tag)
  for (const tag of currentCase.requiredTags) addTokens(tag)
  for (const tag of currentCase.preferredTags) addTokens(tag)

  return tokens
}

function getMatchingCaseIds(
  report: InformationIntakeReportRecord,
  cases: readonly WeeklyCorroborationCaseContext[]
): readonly string[] {
  const normalizedTopicRef = report.topicRef.trim().toLowerCase()
  const exactMatches = cases
    .filter((currentCase) => {
      if (currentCase.status === 'resolved') {
        return false
      }

      return (
        currentCase.id.trim().toLowerCase() === normalizedTopicRef ||
        currentCase.templateId.trim().toLowerCase() === normalizedTopicRef
      )
    })
    .map((currentCase) => currentCase.id)
    .sort((left, right) => left.localeCompare(right))

  if (exactMatches.length > 0) {
    return exactMatches
  }

  const topicTokens = splitTopicTokens(report.topicRef)
  if (topicTokens.length === 0) {
    return []
  }

  const matches: string[] = []
  for (const currentCase of cases) {
    if (currentCase.status === 'resolved') {
      continue
    }

    const caseTokens = collectCaseTopicTokens(currentCase)
    const hasMatch = topicTokens.some((token) => caseTokens.has(token))
    if (hasMatch) {
      matches.push(currentCase.id)
    }
  }

  return matches.sort((left, right) => left.localeCompare(right))
}

function resolveCorroborationSourceClass(
  sourceClass: IntakeSourceClass,
  hasLinkedCases: boolean
): IntakeSourceClass {
  if (!hasLinkedCases) {
    return sourceClass === 'rumor_chain' ? 'public_signal' : 'partner_channel'
  }

  switch (sourceClass) {
    case 'formal_alert':
    case 'technical_trace':
      return 'technical_trace'
    case 'rumor_chain':
    case 'public_signal':
      return 'field_witness'
    case 'archive_signature':
      return 'archive_signature'
    default:
      return 'partner_channel'
  }
}

function pickNarrativeToken(tokens: readonly string[], reportId: string, week: number, offset: number): string {
  if (tokens.length === 0) {
    return 'baseline'
  }

  const index = (stableOrdinalFromId(reportId) + normalizeWeek(week) + offset) % tokens.length
  return tokens[index] ?? 'baseline'
}

function buildWeeklyContradictionSourceRef(
  normalizedTopic: string,
  caseSegment: string,
  report: InformationIntakeReportRecord,
  week: number,
  hasLinkedCases: boolean
): string {
  const disputeTokens = hasLinkedCases
    ? ['conflict-window', 'witness-mismatch', 'timeline-drift']
    : ['confidence-drop', 'signal-gap', 'unsupported-claim']
  const dispute = pickNarrativeToken(disputeTokens, report.id, week, 0)
  const sourceCue = pickNarrativeToken(
    ['audit-trace', 'triage-review', 'cross-check'],
    report.id,
    week,
    report.topicRef.length
  )
  return `audit:weekly-intake:${normalizedTopic}:${caseSegment}:dispute-${dispute}:cue-${sourceCue}`
}

function buildWeeklyCorroborationSourceRef(
  normalizedTopic: string,
  caseSegment: string,
  report: InformationIntakeReportRecord,
  week: number,
  hasLinkedCases: boolean
): string {
  const traceTokens = hasLinkedCases
    ? ['linked-case', 'coincident-signal', 'field-alignment']
    : ['ambient-signal', 'community-thread', 'partner-check']
  const channelTokens = ['routing-sync', 'watchlist-match', 'pattern-stability']
  const trace = pickNarrativeToken(traceTokens, report.id, week, 1)
  const channel = pickNarrativeToken(channelTokens, report.id, week, report.topicRef.length + 1)
  return `source:weekly-intake:${normalizedTopic}:${caseSegment}:trace-${trace}:channel-${channel}`
}

function resolveCaseTopicLinkedWeeklySyntheticEvent(
  report: InformationIntakeReportRecord,
  week: number,
  cases: readonly WeeklyCorroborationCaseContext[]
): WeeklyIntakeSyntheticEvent | null {
  const normalizedWeek = normalizeWeek(week)
  const linkedCaseIds = getMatchingCaseIds(report, cases)
  const hasLinkedCases = linkedCaseIds.length > 0
  const phase = (normalizedWeek + stableOrdinalFromId(report.id) + linkedCaseIds.length) % 6
  const normalizedTopic = normalizeToken(report.topicRef)
  const caseSegment = hasLinkedCases ? linkedCaseIds.join('+') : 'no-case-link'

  if (phase === 0) {
    return {
      kind: 'contradiction',
      event: {
        eventId: buildWeeklyIntakeSyntheticEventId(report.id, normalizedWeek, 'contradiction'),
        week: normalizedWeek,
        sourceRef: buildWeeklyContradictionSourceRef(
          normalizedTopic,
          caseSegment,
          report,
          normalizedWeek,
          hasLinkedCases
        ),
        severity: hasLinkedCases ? 'minor' : 'major',
      },
    }
  }

  if (phase === 2 && report.initialSourceClass === 'archive_signature') {
    return null
  }

  if (phase === 1 || phase === 3) {
    const sourceClass = resolveCorroborationSourceClass(report.initialSourceClass, hasLinkedCases)
    const baseWeight =
      report.initialSourceClass === 'formal_alert' || report.initialSourceClass === 'technical_trace'
        ? 0.22
        : hasLinkedCases
          ? phase === 3
            ? 0.22
            : 0.18
          : phase === 3
            ? 0.2
            : 0.15
    return {
      kind: 'corroboration',
      event: {
        eventId: buildWeeklyIntakeSyntheticEventId(report.id, normalizedWeek, 'corroboration'),
        week: normalizedWeek,
        sourceRef: buildWeeklyCorroborationSourceRef(
          normalizedTopic,
          caseSegment,
          report,
          normalizedWeek,
          hasLinkedCases
        ),
        sourceClass,
        weight: baseWeight,
      },
    }
  }

  if (report.initialSourceClass === 'formal_alert' || report.initialSourceClass === 'technical_trace') {
    return {
      kind: 'corroboration',
      event: {
        eventId: buildWeeklyIntakeSyntheticEventId(report.id, normalizedWeek, 'corroboration'),
        week: normalizedWeek,
        sourceRef: buildWeeklyCorroborationSourceRef(
          normalizedTopic,
          caseSegment,
          report,
          normalizedWeek,
          hasLinkedCases
        ),
        sourceClass: 'technical_trace',
        weight: 0.22,
      },
    }
  }

  return {
    kind: 'corroboration',
    event: {
      eventId: buildWeeklyIntakeSyntheticEventId(report.id, normalizedWeek, 'corroboration'),
      week: normalizedWeek,
      sourceRef: buildWeeklyCorroborationSourceRef(
        normalizedTopic,
        caseSegment,
        report,
        normalizedWeek,
        hasLinkedCases
      ),
      sourceClass: resolveCorroborationSourceClass(report.initialSourceClass, hasLinkedCases),
      weight: hasLinkedCases ? 0.16 : 0.12,
    },
  }
}

/**
 * Applies one weekly corroboration/contradiction pass over persisted intake reports.
 * Empty map is a no-op. Re-applying for the same week is idempotent (stable event ids).
 */
export function applyWeeklyIntakeCorroborationTick(
  reports: InformationIntakeReportsMap | null | undefined,
  week: number,
  casesById?: Record<string, WeeklyCorroborationCaseContext> | null
): InformationIntakeReportsMap {
  const safeReports = reports ?? {}
  const cases = Object.values(casesById ?? {})
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

    const synthetic = resolveCaseTopicLinkedWeeklySyntheticEvent(report, week, cases)
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
