// Hazard/Incident Templates (SPE-48)
import type { ContentTemplateKernel } from './contentTemplateKernel'

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
    rewards: [{ rewardType: 'intel', value: 2 }],
    backlash: [
      { description: 'Hazard escalates', severity: 'major', trigger: 'failed containment' },
    ],
    presentation: { summary: 'Containment breach scenario.' },
  },
]
