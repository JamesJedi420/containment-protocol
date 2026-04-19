// Protocol Material Templates (SPE-48)
import type { ContentTemplateKernel } from './contentTemplateKernel'

export type ProtocolMaterialTemplate = ContentTemplateKernel & {
  sourceType: 'biological' | 'chemical' | 'artifact' | 'environmental'
  recognitionThreshold: number
  preparation: {
    method: string
    delivery: string
    steps: string[]
  }
  effect: EffectPayload
  sideEffects?: SideEffectEntry[]
  contamination?: ContaminationEntry[]
}

export type EffectPayload = {
  effectType: string
  magnitude: number
  duration?: number
  tags?: string[]
}
export type SideEffectEntry = {
  description: string
  severity: 'minor' | 'moderate' | 'severe'
  trigger: string
}
export type ContaminationEntry = {
  description: string
  failureType: string
  consequence: string
}

// Example protocol material templates
export const protocolMaterialTemplates: ProtocolMaterialTemplate[] = [
  {
    id: 'pm-001',
    family: 'protocol-material',
    type: 'stabilizer',
    sourceType: 'chemical',
    recognitionThreshold: 2,
    preparation: {
      method: 'distillation',
      delivery: 'injection',
      steps: ['extract sample', 'distill', 'inject'],
    },
    effect: { effectType: 'neutralize', magnitude: 3 },
    sideEffects: [
      { description: 'Mild nausea', severity: 'minor', trigger: 'overdose' },
    ],
    contamination: [
      { description: 'Sample destabilizes', failureType: 'instability', consequence: 'Escalates hazard' },
    ],
    requirements: [{ skill: 'chemistry', threshold: 2 }],
    presentation: { summary: 'Stabilizer compound for anomaly samples.' },
  },
  {
    id: 'pm-002',
    family: 'protocol-material',
    type: 'anomaly-reagent',
    sourceType: 'artifact',
    recognitionThreshold: 3,
    preparation: {
      method: 'extraction',
      delivery: 'containment',
      steps: ['locate artifact', 'extract residue', 'seal'],
    },
    effect: { effectType: 'analyze', magnitude: 2 },
    requirements: [{ skill: 'protocols', threshold: 3 }],
    presentation: { summary: 'Residue reagent for artifact analysis.' },
  },
]
