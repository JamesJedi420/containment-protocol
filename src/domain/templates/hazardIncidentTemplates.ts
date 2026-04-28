// Hazard/Incident Templates (SPE-48)
import type { ContentTemplateKernel } from './contentTemplateKernel'
import type { IncidentImpact } from './incidentImpact'

export type HazardIncidentTemplate = ContentTemplateKernel & {
  hazardType: 'containment-breach' | 'exposure' | 'environmental' | 'rival-action'
  triggers: string[]
  escalation: {
    steps: string[]
    riskThresholds: number[]
  }
  resolution: {
    requiredActions: string[]
    fallback: string
  }
  /** SPE-820: Canonical typed incident-impact vocabulary. */
  impact?: IncidentImpact
  rewards?: RewardEntry[]
  backlash?: BacklashEntry[]
}

export type RewardEntry = {
  rewardType: string
  value: number
}
export type BacklashEntry = {
  description: string
  severity: 'minor' | 'major'
  trigger: string
}

// Example hazard/incident template
export const hazardIncidentTemplates: HazardIncidentTemplate[] = [
  {
    id: 'hz-001',
    family: 'hazard-incident',
    type: 'containment-breach',
    hazardType: 'containment-breach',
    triggers: ['protocolFailure', 'siteBreach'],
    escalation: {
      steps: ['lockdown', 'deploy containment team', 'escalate to incident'],
      riskThresholds: [2, 4],
    },
    resolution: {
      requiredActions: ['seal breach', 'stabilize anomaly'],
      fallback: 'Evacuate site',
    },
    impact: {
      schemaVersion: 'spe-820.v1',
      affectedPopulation: {
        value: 480,
        denominator: { kind: 'people', total: 1200, label: 'Sector Delta residents' },
        uncertainty: { level: 'medium', basis: 'partial evac telemetry' },
      },
      fatalities: {
        value: 3,
        denominator: { kind: 'people', total: 1200 },
        uncertainty: { level: 'high', basis: 'unverified field reports' },
      },
      rescueDemand: {
        value: 44,
        denominator: { kind: 'people' },
      },
      shelterDemand: {
        value: 62,
        denominator: { kind: 'households', total: 410 },
      },
      outages: {
        value: 310,
        denominator: { kind: 'customers', total: 910 },
      },
      facilityImpact: {
        value: 4,
        denominator: { kind: 'facilities', total: 11 },
      },
      serviceDisruption: {
        value: 2,
        denominator: { kind: 'services', total: 6 },
      },
      hazmatExposure: {
        value: 1.8,
        denominator: { kind: 'distance_km', label: 'plume radius' },
      },
      organizationImpact: {
        value: 2,
        denominator: { kind: 'organizations', total: 5 },
      },
      jurisdictionImpact: {
        value: 1,
        denominator: { kind: 'jurisdictions', total: 3 },
      },
      extensions: {
        transit_evacuations: {
          label: 'Transit evacuation burden',
          category: 'coordination',
          metric: {
            value: 12,
            denominator: { kind: 'services', total: 20, label: 'transit lines' },
            uncertainty: { level: 'medium' },
          },
        },
      },
    },
    rewards: [{ rewardType: 'intel', value: 2 }],
    backlash: [
      { description: 'Hazard escalates', severity: 'major', trigger: 'failed containment' },
    ],
    presentation: { summary: 'Containment breach scenario.' },
  },
]
