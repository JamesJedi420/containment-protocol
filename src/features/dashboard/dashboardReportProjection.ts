import type { GameState } from '../../domain/models'
import { getCaseTemplateFamily } from '../report/reportIntelProjection'

// Re-export the stable projection interface for dashboard use
export { getCaseTemplateFamily }

export function getDashboardRunTrendSummary(_game: GameState) {
  // getRunTrendSummary is not implemented; fallback to empty summary
  return {
    recurringFamilies: [],
    raidConversions: [],
    unresolvedHotspots: [],
    dominantTags: [],
  }
}
