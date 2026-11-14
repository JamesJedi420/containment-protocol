// Shared template kernel for modular content authoring (SPE-48)
// This kernel is pure data, validated, and family-agnostic

export type ContentTemplateKernel = {
  id: string
  family: 'protocol-material' | 'hazard-incident' | 'doctrine-playbook'
  type: string // sub-type within family
  runtime?: TemplateRuntimeDeclaration
  brief?: TemplateAuthoringBrief
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

export type TemplateAuthoringBrief = {
  implementationSurface: string
  runtimeBehavior: string
  playerResult: string
}

export type TemplateRuntimeHook = 'prepare-material' | 'resolve-incident' | 'apply-doctrine'

/** Caller-owned authoring ratings, not gameplay effect units or universal balance values. */
export type TemplateBandPolicy = {
  id: string
  actionBands: Record<string, { minCost: number; maxScope: number; maxExceptions: number }>
  powerBands: Record<string, { maxPower: number }>
}

export type TemplateRuntimeParameters = {
  recognitionThreshold?: number
  riskThresholds?: number[]
  reliability?: number
}

export type TemplateRuntimeDeclaration = {
  hook: TemplateRuntimeHook
  policyRef: string
  actionBand: string
  powerBand: string
  cost: number
  scope: number
  exceptions: number
  power: number
  alternatives?: {
    id: string
    when: ConditionEntry[]
    parameters: TemplateRuntimeParameters
  }[]
}

export type TemplateRuntimeOptions = {
  policy: TemplateBandPolicy
  context?: Readonly<Record<string, string | number | boolean>>
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
