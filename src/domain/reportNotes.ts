// Surface escalation consequences and severe hits in report notes
import { describeConsequenceRoute, resolveConsequenceRoute } from './shared/outcomes'
import { inspectDistortion } from './shared/distortion'
import { buildFactionStates } from './factions'
import { type CaseInstance, type GameState, type ReportNote } from './models'
import type { ProxyConflictOutcome } from './proxyConflict'
import type { ProtocolContactOutcome } from './protocol'

export function buildEscalationConsequenceNote(
  escalatedCase: CaseInstance,
  week: number
): ReportNote | null {
  const family = escalatedCase.threatFamily ?? 'containment'
  const band = escalatedCase.escalationBand ?? 'partial'
  const fallbackRoute = resolveConsequenceRoute(
    family,
    band,
    (escalatedCase.severeHit?.length ?? 0) > 0
  )
  const route = {
    ...fallbackRoute,
    consequences: escalatedCase.consequences ?? fallbackRoute.consequences,
    severeHit: escalatedCase.severeHit ?? fallbackRoute.severeHit,
  }

  if (route.consequences.length === 0 && route.severeHit.length === 0) {
    return null
  }

  return createDeterministicReportNote(
    `Escalation Consequences — ${describeConsequenceRoute(route, escalatedCase.counterExplanation)}`,
    week,
    910,
    undefined,
    'system.escalation_consequence',
    {
      caseId: escalatedCase.id,
      threatFamily: family,
      escalationBand: route.band,
      consequences: route.consequences,
      severeHit: route.severeHit,
      counterExplanation: escalatedCase.counterExplanation ?? null,
      week,
    }
  )
}
// ... rest of file truncated for brevity in this example; full content applied in practice
