import { deriveMissionIntakeInformationSignals } from '../../domain/missionIntakeInformationRouting'
import type { CaseInstance, GameState } from '../../domain/models'

const MAX_INTAKE_MARKERS = 2

const MARKER_STYLES = {
  conflict: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  blindSpot: 'border-orange-500/40 bg-orange-500/10 text-orange-100',
  incomplete: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  linked: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100',
  default: 'border-teal-500/40 bg-teal-500/10 text-teal-100',
} as const

/** Higher priority codes surface first when the row chip cap binds. */
const INTAKE_REASON_PRIORITY: readonly string[] = [
  'intake-verification-conflict',
  'intake-coverage-blind-spot',
  'intake-incomplete',
  'intake-coverage-public-led',
  'intake-nonstandard-hook',
  'intake-rumor-separated',
  'intake-verification-corroborated',
  'intake-linked-reports',
]

const INTAKE_REASON_PRIORITY_INDEX = new Map(
  INTAKE_REASON_PRIORITY.map((code, index) => [code, index])
)

export interface MissionTriageIntakeSignalMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageIntakeSignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageIntakeSignalMarker[]
}

function pushMarker(
  markers: MissionTriageIntakeSignalMarker[],
  marker: MissionTriageIntakeSignalMarker
) {
  if (markers.length >= MAX_INTAKE_MARKERS) {
    return
  }

  markers.push(marker)
}

function intakeChipLabel(reasonCode: string): string {
  switch (reasonCode) {
    case 'intake-verification-conflict':
      return 'Intake: conflict'
    case 'intake-coverage-blind-spot':
      return 'Intake: blind spot'
    case 'intake-incomplete':
      return 'Intake: incomplete'
    case 'intake-coverage-public-led':
      return 'Intake: public-led'
    case 'intake-nonstandard-hook':
      return 'Intake: pressure hook'
    case 'intake-rumor-separated':
      return 'Intake: rumor split'
    case 'intake-verification-corroborated':
      return 'Intake: corroborated'
    case 'intake-linked-reports':
      return 'Intake: linked'
    default:
      if (reasonCode.startsWith('intake-coverage-')) {
        return 'Intake: coverage gap'
      }

      return 'Intake: signal'
  }
}

function intakeChipTitle(reasonCode: string, linkedReportCount: number): string | undefined {
  switch (reasonCode) {
    case 'intake-verification-conflict':
      return 'Linked intake reports disagree on verification status.'
    case 'intake-coverage-blind-spot':
      return 'Linked intake coverage leaves a blind spot on this topic.'
    case 'intake-incomplete':
      return 'Linked intake reports remain partially verified or incomplete.'
    case 'intake-coverage-public-led':
      return 'Public-led intake coverage is shaping triage priority.'
    case 'intake-nonstandard-hook':
      return 'Mixed-source intake maps this mission to a pressure intake hook.'
    case 'intake-rumor-separated':
      return 'Rumor-class intake was separated from formal verification lanes.'
    case 'intake-verification-corroborated':
      return 'Dominant linked intake verification is corroborated or escalated.'
    case 'intake-linked-reports':
      return `${linkedReportCount} information intake report${linkedReportCount === 1 ? '' : 's'} linked to this mission.`
    default:
      if (reasonCode.startsWith('intake-coverage-')) {
        return 'Linked intake coverage band adjusts triage priority.'
      }

      return undefined
  }
}

function intakeChipClassName(reasonCode: string): string {
  switch (reasonCode) {
    case 'intake-verification-conflict':
      return MARKER_STYLES.conflict
    case 'intake-coverage-blind-spot':
      return MARKER_STYLES.blindSpot
    case 'intake-incomplete':
      return MARKER_STYLES.incomplete
    case 'intake-linked-reports':
      return MARKER_STYLES.linked
    default:
      return MARKER_STYLES.default
  }
}

function sortedIntakeReasonCodes(reasonCodes: readonly string[]): string[] {
  const intakeCodes = reasonCodes.filter((code) => code.startsWith('intake-'))

  return [...intakeCodes].sort((left, right) => {
    const leftPriority = INTAKE_REASON_PRIORITY_INDEX.get(left) ?? Number.MAX_SAFE_INTEGER
    const rightPriority = INTAKE_REASON_PRIORITY_INDEX.get(right) ?? Number.MAX_SAFE_INTEGER

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return left.localeCompare(right)
  })
}

export function buildMissionTriageIntakeSignals(
  caseData: CaseInstance,
  game: GameState
): MissionTriageIntakeSignals {
  const resolvedCase = game.cases[caseData.id] ?? caseData

  if (resolvedCase.status === 'resolved') {
    return { visible: false, markers: [] }
  }

  const signals = deriveMissionIntakeInformationSignals(game, resolvedCase)
  if (signals.reasonCodes.length === 0) {
    return { visible: false, markers: [] }
  }

  const markers: MissionTriageIntakeSignalMarker[] = []

  for (const reasonCode of sortedIntakeReasonCodes(signals.reasonCodes)) {
    if (markers.length >= MAX_INTAKE_MARKERS) {
      break
    }

    pushMarker(markers, {
      id: reasonCode,
      label: intakeChipLabel(reasonCode),
      className: intakeChipClassName(reasonCode),
      title: intakeChipTitle(reasonCode, signals.linkedReportCount),
    })
  }

  return {
    visible: markers.length > 0,
    markers,
  }
}
