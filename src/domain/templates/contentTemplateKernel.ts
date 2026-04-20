// Shared template kernel for modular content authoring (SPE-48)
// This kernel is pure data, validated, and family-agnostic

export type ContentTemplateKernel = {
  id: string
  family: 'protocol-material' | 'hazard-incident' | 'doctrine-playbook'
  type: string // sub-type within family
  requirements?: RequirementEntry[]
  conditions?: ConditionEntry[]
  modifiers?: ModifierEntry[]
  riskHooks?: RiskHookEntry[]
  investigation?: {
    visibility: 'public' | 'gated' | 'hidden'
    cues?: string[]
    misinfo?: string[]
  }
  rewardFamily?: string
  presentation?: {
    summary: string
    notes?: string
    tags?: string[]
  }
}

// Minimal stubs for kernel fields (expand as needed)
export type RequirementEntry = {
  skill?: string
  threshold?: number
  context?: string
}
export type ConditionEntry = {
  context: string
  value: string | number | boolean
}
export type ModifierEntry = {
  effect: string
  magnitude?: number
  tags?: string[]
}
export type RiskHookEntry = {
  trigger: string
  consequence: string
}
