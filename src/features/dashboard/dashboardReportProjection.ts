import { getCaseTemplateFamily } from '../report/reportIntelProjection'

// Re-export the stable projection interface for dashboard use
export { getCaseTemplateFamily }

export function getDashboardRunTrendSummary() {
  // getRunTrendSummary is not implemented; fallback to empty summary
  return {
    recurringFamilies: [],
    raidConversions: [],
    unresolvedHotspots: [],
    dominantTags: [],
  }
}
