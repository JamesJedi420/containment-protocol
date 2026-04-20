// SPE-38: Add support shortfall and restoration notes to report output
import type { CaseInstance, ReportNote } from './models'

/**
 * If a case suffered a support shortfall, surface a deterministic report note.
 */
export function buildSupportShortfallNote(caseInstance: CaseInstance, week: number): ReportNote | null {
  if (!caseInstance.supportShortfall) return null
  return {
    id: `note-support-shortfall-${caseInstance.id}-${week}`,
    content: `Support shortfall: Operation '${caseInstance.title}' suffered degraded outcome due to insufficient support staff.`,
    timestamp: Date.now(),
    type: 'support.shortfall',
    metadata: {
      caseId: caseInstance.id,
      week,
    },
  }
}

/**
 * If support was restored this week, surface a deterministic report note.
 * (This is handled by the hub/supportActions.ts note, but can be surfaced here if needed.)
 */
export function buildSupportRestoredNote(amount: number, prev: number, next: number, week: number): ReportNote {
  return {
    id: `note-support-restored-${week}`,
    content: `Support staff rallied: +${amount} support restored (now ${next}).`,
    timestamp: Date.now(),
    type: 'support.restored',
    metadata: { prev, next, amount, week },
  }
}
