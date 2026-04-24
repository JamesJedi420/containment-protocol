// SPE-53: Surface hub simulation opportunities and rumors in report notes
import type { HubState } from './hubState'
import type { ReportNote } from '../models'

export function buildHubReportNotes(hub: HubState, week: number): ReportNote[] {
  const notes: ReportNote[] = []
  for (const opp of hub.opportunities) {
    let explanation = ''
    if (opp.accessExplanation) {
      explanation = ` [${opp.accessExplanation}]`
    }
    notes.push({
      id: `note-hub-opportunity-${opp.id}-${week}`,
      content: `Hub Opportunity — ${opp.label}: ${opp.detail} (Confidence: ${(opp.confidence * 100).toFixed(0)}%)${explanation}`,
      timestamp: Date.now(),
      type: 'hub.opportunity',
      metadata: {
        factionId: opp.factionId,
        confidence: opp.confidence,
        misleading: !!opp.misleading,
        ...(opp.accessState ? { accessState: opp.accessState } : {}),
        ...(opp.requiredSanctionLevel ? { requiredSanctionLevel: opp.requiredSanctionLevel } : {}),
        week,
      },
    })
  }
  for (const rumor of hub.rumors) {
    notes.push({
      id: `note-hub-rumor-${rumor.id}-${week}`,
      content: `Hub Rumor — ${rumor.label}: ${rumor.detail} (Confidence: ${(rumor.confidence * 100).toFixed(0)}%)${rumor.misleading ? ' [Misleading]' : ''}${rumor.filtered ? ' [Filtered]' : ''}`,
      timestamp: Date.now(),
      type: 'hub.rumor',
      metadata: {
        confidence: rumor.confidence,
        misleading: !!rumor.misleading,
        filtered: !!rumor.filtered,
        week,
      },
    })
  }
  return notes
}
