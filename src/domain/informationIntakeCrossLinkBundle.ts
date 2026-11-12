import type { ExtranormalEventRecordsMap } from './extranormalEventRegistry'
import {
  composeAllIntakeExtranormalCrossLinks,
  type IntakeExtranormalCrossLinkSummary,
} from './informationIntakeExtranormalCrossLink'
import {
  composeAllIntakeMinorAnomalyCrossLinks,
  type IntakeMinorAnomalyCrossLinkSummary,
} from './informationIntakeMinorAnomalyCrossLink'
import {
  composeAllIntakeNamingHazardCrossLinks,
  type IntakeNamingHazardCrossLinkSummary,
} from './informationIntakeNamingHazardCrossLink'
import type { InformationIntakeReportsMap } from './informationIntakeReport'
import {
  composeAllIntakeUnexplainedLocationCrossLinks,
  type IntakeUnexplainedLocationCrossLinkSummary,
} from './informationIntakeUnexplainedLocationCrossLink'
import type { MinorAnomalyItemRecordsMap } from './minorAnomalyItemRegistry'
import type { NamingHazardDescriptorRecordsMap } from './namingHazardDescriptorRegistry'
import type { UnexplainedLocationRecordsMap } from './unexplainedLocationRegistry'

export interface ComposeInformationIntakeCrossLinkBundleInput {
  readonly reports?: InformationIntakeReportsMap | null | undefined
  readonly namingHazardDescriptors?: NamingHazardDescriptorRecordsMap | null | undefined
  readonly extranormalEvents?: ExtranormalEventRecordsMap | null | undefined
  readonly minorAnomalyItems?: MinorAnomalyItemRecordsMap | null | undefined
  readonly unexplainedLocations?: UnexplainedLocationRecordsMap | null | undefined
}

export interface InformationIntakeCrossLinkBundleSummary {
  readonly namingHazard: readonly IntakeNamingHazardCrossLinkSummary[]
  readonly extranormal: readonly IntakeExtranormalCrossLinkSummary[]
  readonly minorAnomaly: readonly IntakeMinorAnomalyCrossLinkSummary[]
  readonly unexplainedLocation: readonly IntakeUnexplainedLocationCrossLinkSummary[]
}

const EMPTY_BUNDLE_SUMMARY: InformationIntakeCrossLinkBundleSummary = Object.freeze({
  namingHazard: Object.freeze([]),
  extranormal: Object.freeze([]),
  minorAnomaly: Object.freeze([]),
  unexplainedLocation: Object.freeze([]),
})

/**
 * SPE-854 follow-up: deterministic bundle compose chain that reuses existing
 * per-registry composeAll helpers without mutating persisted state.
 */
export function composeInformationIntakeCrossLinkBundle(
  input: ComposeInformationIntakeCrossLinkBundleInput
): InformationIntakeCrossLinkBundleSummary {
  const reports = input.reports ?? undefined
  const namingHazardDescriptors = input.namingHazardDescriptors ?? undefined
  const extranormalEvents = input.extranormalEvents ?? undefined
  const minorAnomalyItems = input.minorAnomalyItems ?? undefined
  const unexplainedLocations = input.unexplainedLocations ?? undefined

  if (
    Object.keys(reports ?? {}).length === 0 &&
    Object.keys(namingHazardDescriptors ?? {}).length === 0 &&
    Object.keys(extranormalEvents ?? {}).length === 0 &&
    Object.keys(minorAnomalyItems ?? {}).length === 0 &&
    Object.keys(unexplainedLocations ?? {}).length === 0
  ) {
    return EMPTY_BUNDLE_SUMMARY
  }

  return Object.freeze({
    namingHazard: Object.freeze(
      composeAllIntakeNamingHazardCrossLinks(reports, namingHazardDescriptors)
    ),
    extranormal: Object.freeze(composeAllIntakeExtranormalCrossLinks(reports, extranormalEvents)),
    minorAnomaly: Object.freeze(
      composeAllIntakeMinorAnomalyCrossLinks(reports, minorAnomalyItems)
    ),
    unexplainedLocation: Object.freeze(
      composeAllIntakeUnexplainedLocationCrossLinks(reports, unexplainedLocations)
    ),
  })
}
