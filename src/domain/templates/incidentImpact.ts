// Canonical incident-impact vocabulary (SPE-820)

export type IncidentImpactDenominatorKind =
  | 'people'
  | 'households'
  | 'customers'
  | 'facilities'
  | 'organizations'
  | 'jurisdictions'
  | 'services'
  | 'distance_km'

export type IncidentImpactUncertaintyLevel = 'low' | 'medium' | 'high'

export interface IncidentImpactUncertainty {
  level: IncidentImpactUncertaintyLevel
  basis?: string
}

export interface IncidentImpactDenominator<K extends IncidentImpactDenominatorKind = IncidentImpactDenominatorKind> {
  kind: K
  total?: number
  label?: string
}

export interface IncidentImpactMetric<
  K extends IncidentImpactDenominatorKind = IncidentImpactDenominatorKind,
> {
  value: number
  denominator?: IncidentImpactDenominator<K>
  uncertainty?: IncidentImpactUncertainty
  note?: string
}

export interface IncidentImpactExtensionField {
  metric: IncidentImpactMetric
  category?:
    | 'people'
    | 'facilities'
    | 'services'
    | 'infrastructure'
    | 'environment'
    | 'coordination'
  label?: string
}

/**
 * Canonical typed impact object for incident consequence comparison.
 *
 * - Explicit denominator semantics via IncidentImpactMetric.denominator.kind
 * - Uncertainty remains visible per field
 * - Extensions are isolated under `extensions` and do not break standard fields
 */
export interface IncidentImpact {
  schemaVersion: 'spe-820.v1'
  affectedPopulation?: IncidentImpactMetric<'people'>
  fatalities?: IncidentImpactMetric<'people'>
  rescueDemand?: IncidentImpactMetric<'people'>
  shelterDemand?: IncidentImpactMetric<'people' | 'households'>
  outages?: IncidentImpactMetric<'customers' | 'households' | 'services'>
  facilityImpact?: IncidentImpactMetric<'facilities'>
  serviceDisruption?: IncidentImpactMetric<'customers' | 'services' | 'organizations'>
  hazmatExposure?: IncidentImpactMetric<'people' | 'distance_km'>
  organizationImpact?: IncidentImpactMetric<'organizations'>
  jurisdictionImpact?: IncidentImpactMetric<'jurisdictions'>
  extensions?: Record<string, IncidentImpactExtensionField>
}

function cloneMetric<K extends IncidentImpactDenominatorKind>(
  metric: IncidentImpactMetric<K> | undefined
): IncidentImpactMetric<K> | undefined {
  if (!metric) return undefined
  return {
    ...metric,
    ...(metric.denominator ? { denominator: { ...metric.denominator } } : {}),
    ...(metric.uncertainty ? { uncertainty: { ...metric.uncertainty } } : {}),
  }
}

/**
 * Deterministic clone/normalization helper for runtime safety.
 */
export function cloneIncidentImpact(impact: IncidentImpact): IncidentImpact {
  return {
    schemaVersion: impact.schemaVersion,
    ...(impact.affectedPopulation ? { affectedPopulation: cloneMetric(impact.affectedPopulation) } : {}),
    ...(impact.fatalities ? { fatalities: cloneMetric(impact.fatalities) } : {}),
    ...(impact.rescueDemand ? { rescueDemand: cloneMetric(impact.rescueDemand) } : {}),
    ...(impact.shelterDemand ? { shelterDemand: cloneMetric(impact.shelterDemand) } : {}),
    ...(impact.outages ? { outages: cloneMetric(impact.outages) } : {}),
    ...(impact.facilityImpact ? { facilityImpact: cloneMetric(impact.facilityImpact) } : {}),
    ...(impact.serviceDisruption ? { serviceDisruption: cloneMetric(impact.serviceDisruption) } : {}),
    ...(impact.hazmatExposure ? { hazmatExposure: cloneMetric(impact.hazmatExposure) } : {}),
    ...(impact.organizationImpact ? { organizationImpact: cloneMetric(impact.organizationImpact) } : {}),
    ...(impact.jurisdictionImpact ? { jurisdictionImpact: cloneMetric(impact.jurisdictionImpact) } : {}),
    ...(impact.extensions
      ? {
          extensions: Object.fromEntries(
            Object.entries(impact.extensions).map(([key, value]) => [
              key,
              {
                ...value,
                metric: cloneMetric(value.metric)!,
              },
            ])
          ),
        }
      : {}),
  }
}