import {
  getFieldIntelligenceSummary,
  getNonFieldStaff,
  getTimeQueueSummary,
} from '../../app/services/divisionMetrics'
import { OPERATIONS_DESK_TEXT } from '../../data/copy'
import { type GameState } from '../../domain/models'

export interface OperationsLeftPanelView {
  reserveStaffCount: number
  intelligenceSummary: string
  logisticsSummary: string
}

export function getOperationsLeftPanelView(game: GameState): OperationsLeftPanelView {
  const reserveStaff = getNonFieldStaff(game)
  const intel = getFieldIntelligenceSummary(game)
  const queue = getTimeQueueSummary(game)

  return {
    reserveStaffCount: reserveStaff.length,
    intelligenceSummary: intel.latestReportWeek
      ? `${OPERATIONS_DESK_TEXT.fieldIntelActivePrefix ?? 'Latest intel report week'} ${intel.latestReportWeek}`
      : (OPERATIONS_DESK_TEXT.fieldIntelNone ?? 'No intel report generated yet.'),
    logisticsSummary:
      queue.queued === 0
        ? (OPERATIONS_DESK_TEXT.queueIdleLabel ?? 'Queue capacity available.')
        : `${OPERATIONS_DESK_TEXT.queuePressurePrefix ?? 'Queue pressure'}: ${queue.queued}`,
  }
}
