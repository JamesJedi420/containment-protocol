/**
 * SPE-3360 — facility production-chain model.
 *
 * Pure domain chain variants, stage resolution, recirculation guards, SPE-1058
 * labor consumption, and SPE-1027 material handoff envelopes. Does not own
 * storage mutation (SPE-1027), specialist registry semantics (SPE-1058),
 * temporary site crafting (SPE-1657), permanent gear mutation (SPE-113),
 * dependency-graph authority (SPE-3383), or facility-register UI (SPE-3359).
 */

import {
  projectSpecialistLaborGate,
  type SpecialistLaborGateProjection,
  type SpecialistOperatorSlot,
  type SpecialistTaskId,
} from './specialistLaborRegistry'

export const FACILITY_PRODUCTION_CHAIN_OWNER = 'SPE-3360' as const

export const PRODUCTION_CHAIN_STAGES = [
  'extraction',
  'storage',
  'processing',
  'research',
  'fabrication',
  'deployment',
] as const
export type ProductionChainStage = (typeof PRODUCTION_CHAIN_STAGES)[number]

export const PRODUCTION_FACILITY_ROLES = [
  'source',
  'stockpile',
  'workshop',
  'lab',
  'processor',
  'deployment',
] as const
export type ProductionFacilityRole = (typeof PRODUCTION_FACILITY_ROLES)[number]

export const PRODUCTION_OUTPUT_KINDS = [
  'facility_durable',
  'site_temporary',
] as const
export type ProductionOutputKind = (typeof PRODUCTION_OUTPUT_KINDS)[number]

export const PRODUCTION_RUN_STATES = [
  'idle',
  'ready',
  'blocked',
  'degraded',
  'producing',
  'completed',
] as const
export type ProductionRunState = (typeof PRODUCTION_RUN_STATES)[number]

export const PRODUCTION_REASON_CODES = [
  'missing_input',
  'missing_facility_role',
  'staffing_shortage',
  'labor_degraded',
  'storage_gap',
  'damaged_facility',
  'unsafe_material',
  'dependency_interrupted',
  'missing_auxiliary',
  'self_generation_blocked',
  'recirculation_loss',
  'stage_ready',
  'stage_completed',
  'facility_produced',
] as const
export type ProductionReasonCode = (typeof PRODUCTION_REASON_CODES)[number]

export interface ProductionMaterialRef {
  readonly materialId: string
  readonly quantity: number
}

export interface ProductionStageSpec {
  readonly stageId: string
  readonly stage: ProductionChainStage
  readonly requiredRole: ProductionFacilityRole
  readonly input: ProductionMaterialRef | null
  readonly output: ProductionMaterialRef
  readonly laborTaskId?: SpecialistTaskId
  readonly auxiliaryMaterialId?: string
  readonly dependencyNodeId?: string
  /** When true, output may feed a later stage; still requires external catalyst. */
  readonly recirculates?: boolean
}

export interface ProductionChainVariant {
  readonly chainId: string
  readonly displayLabel: string
  readonly outputClassId: string
  readonly outputKind: ProductionOutputKind
  readonly throughputPerCycle: number
  readonly logisticsBurden: number
  readonly utilityExposure: number
  readonly stages: readonly ProductionStageSpec[]
  /** External catalyst required each recirculation cycle (anti-self-generation). */
  readonly externalCatalyst?: ProductionMaterialRef
  readonly recirculationLossPerCycle?: number
}

export interface ProductionFacilitySnapshot {
  readonly rolesPresent: readonly ProductionFacilityRole[]
  readonly damagedRoles?: readonly ProductionFacilityRole[]
  readonly stockByMaterialId: Readonly<Record<string, number>>
  readonly dependencyAvailabilityByNodeId?: Readonly<
    Record<string, 'ready' | 'degraded' | 'unavailable'>
  >
}

export interface ProductionChainRun {
  readonly runId: string
  readonly chainId: string
  readonly state: ProductionRunState
  readonly currentStageIndex: number
  readonly reasonCodes: readonly ProductionReasonCode[]
  readonly producedOutput: ProductionMaterialRef | null
  readonly cyclesCompleted: number
  readonly recirculationBuffer: number
}

export interface FacilityProductionChainRegistry {
  readonly version: 1
  readonly runs: readonly ProductionChainRun[]
}

export interface ProductionChainStatusProjection {
  readonly ownerIssueId: typeof FACILITY_PRODUCTION_CHAIN_OWNER
  readonly runId: string
  readonly chainId: string
  readonly state: ProductionRunState
  readonly currentStageId: string | null
  readonly reasonCodes: readonly ProductionReasonCode[]
  readonly outputKind: ProductionOutputKind | null
  readonly producedMaterialId: string | null
  readonly producedQuantity: number
}

export interface ProductionMaterialHandoff {
  readonly ownerIssueId: typeof FACILITY_PRODUCTION_CHAIN_OWNER
  readonly runId: string
  readonly materialId: string
  readonly quantity: number
  readonly outputKind: ProductionOutputKind
  readonly facilityProduced: true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function freezeRun(run: ProductionChainRun): ProductionChainRun {
  return Object.freeze({
    ...run,
    reasonCodes: Object.freeze([...run.reasonCodes]),
    producedOutput: run.producedOutput ? Object.freeze({ ...run.producedOutput }) : null,
  })
}

/**
 * Two authored variants share output class `output:refined_alloy` with different
 * staffing/logistics/utility profiles. A third recirculating catalyst chain proves
 * anti-self-generation.
 */
export const REPRESENTATIVE_PRODUCTION_CHAINS: readonly ProductionChainVariant[] =
  Object.freeze([
    Object.freeze({
      chainId: 'chain:compact-smelter',
      displayLabel: 'Compact smelter line',
      outputClassId: 'output:refined_alloy',
      outputKind: 'facility_durable' as const,
      throughputPerCycle: 2,
      logisticsBurden: 1,
      utilityExposure: 1,
      stages: Object.freeze([
        Object.freeze({
          stageId: 'compact:store',
          stage: 'storage' as const,
          requiredRole: 'stockpile' as const,
          input: Object.freeze({ materialId: 'material:ore_chunk', quantity: 2 }),
          output: Object.freeze({ materialId: 'material:ore_lot', quantity: 2 }),
        }),
        Object.freeze({
          stageId: 'compact:process',
          stage: 'processing' as const,
          requiredRole: 'processor' as const,
          input: Object.freeze({ materialId: 'material:ore_lot', quantity: 2 }),
          output: Object.freeze({ materialId: 'material:refined_alloy', quantity: 2 }),
          laborTaskId: 'material_refinement' as const,
          auxiliaryMaterialId: 'material:smelter_crucible',
          dependencyNodeId: 'dep:process_power',
        }),
      ]),
    }),
    Object.freeze({
      chainId: 'chain:research-forge',
      displayLabel: 'Research forge line',
      outputClassId: 'output:refined_alloy',
      outputKind: 'facility_durable' as const,
      throughputPerCycle: 1,
      logisticsBurden: 3,
      utilityExposure: 4,
      stages: Object.freeze([
        Object.freeze({
          stageId: 'forge:extract',
          stage: 'extraction' as const,
          requiredRole: 'source' as const,
          input: null,
          output: Object.freeze({ materialId: 'material:ore_chunk', quantity: 1 }),
        }),
        Object.freeze({
          stageId: 'forge:lab',
          stage: 'research' as const,
          requiredRole: 'lab' as const,
          input: Object.freeze({ materialId: 'material:ore_chunk', quantity: 1 }),
          output: Object.freeze({ materialId: 'material:alloy_sample', quantity: 1 }),
          laborTaskId: 'archive_classification' as const,
          dependencyNodeId: 'dep:lab_power',
        }),
        Object.freeze({
          stageId: 'forge:fab',
          stage: 'fabrication' as const,
          requiredRole: 'workshop' as const,
          input: Object.freeze({ materialId: 'material:alloy_sample', quantity: 1 }),
          output: Object.freeze({ materialId: 'material:refined_alloy', quantity: 1 }),
          laborTaskId: 'material_refinement' as const,
          dependencyNodeId: 'dep:workshop_power',
        }),
      ]),
    }),
    Object.freeze({
      chainId: 'chain:catalyst-recirculation',
      displayLabel: 'Catalyst recirculation loop',
      outputClassId: 'output:process_solvent',
      outputKind: 'facility_durable' as const,
      throughputPerCycle: 1,
      logisticsBurden: 2,
      utilityExposure: 2,
      externalCatalyst: Object.freeze({
        materialId: 'material:catalyst_charge',
        quantity: 1,
      }),
      recirculationLossPerCycle: 1,
      stages: Object.freeze([
        Object.freeze({
          stageId: 'loop:store',
          stage: 'storage' as const,
          requiredRole: 'stockpile' as const,
          input: Object.freeze({ materialId: 'material:process_solvent', quantity: 1 }),
          output: Object.freeze({ materialId: 'material:process_solvent', quantity: 1 }),
        }),
        Object.freeze({
          stageId: 'loop:process',
          stage: 'processing' as const,
          requiredRole: 'processor' as const,
          input: Object.freeze({ materialId: 'material:process_solvent', quantity: 1 }),
          output: Object.freeze({ materialId: 'material:process_solvent', quantity: 2 }),
          laborTaskId: 'material_refinement' as const,
          recirculates: true,
          dependencyNodeId: 'dep:process_power',
        }),
      ]),
    }),
  ])

const CHAIN_BY_ID: ReadonlyMap<string, ProductionChainVariant> = new Map(
  REPRESENTATIVE_PRODUCTION_CHAINS.map((chain) => [chain.chainId, chain]),
)

export function getProductionChainVariant(
  chainId: string,
): ProductionChainVariant | undefined {
  return CHAIN_BY_ID.get(chainId)
}

export function listProductionChainVariantsForOutputClass(
  outputClassId: string,
): readonly ProductionChainVariant[] {
  return Object.freeze(
    REPRESENTATIVE_PRODUCTION_CHAINS.filter((chain) => chain.outputClassId === outputClassId),
  )
}

function stockOf(
  snapshot: ProductionFacilitySnapshot,
  materialId: string,
): number {
  const raw = snapshot.stockByMaterialId[materialId]
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : 0
}

function rolePresent(
  snapshot: ProductionFacilitySnapshot,
  role: ProductionFacilityRole,
): boolean {
  return snapshot.rolesPresent.includes(role)
}

function roleDamaged(
  snapshot: ProductionFacilitySnapshot,
  role: ProductionFacilityRole,
): boolean {
  return (snapshot.damagedRoles ?? []).includes(role)
}

function projectLabor(
  taskId: SpecialistTaskId | undefined,
  operators: readonly SpecialistOperatorSlot[],
): SpecialistLaborGateProjection | undefined {
  if (!taskId) return undefined
  return projectSpecialistLaborGate({
    taskId,
    operators,
    infrastructurePresent: true,
  })
}

export function createProductionChainRun(input: {
  readonly runId: string
  readonly chainId: string
}): ProductionChainRun | undefined {
  if (typeof input.runId !== 'string' || input.runId.trim().length === 0) return undefined
  if (!CHAIN_BY_ID.has(input.chainId)) return undefined
  return freezeRun({
    runId: input.runId.trim(),
    chainId: input.chainId,
    state: 'idle',
    currentStageIndex: 0,
    reasonCodes: Object.freeze([]),
    producedOutput: null,
    cyclesCompleted: 0,
    recirculationBuffer: 0,
  })
}

/**
 * Resolve the current stage against caller-owned facility/labor/stock facts.
 * Does not mutate stock; returns inspectable readiness and blockers.
 */
export function resolveProductionChainStage(input: {
  readonly run: ProductionChainRun
  readonly facility: ProductionFacilitySnapshot
  readonly operators?: readonly SpecialistOperatorSlot[]
}):
  | {
      readonly ok: true
      readonly stage: ProductionStageSpec
      readonly state: 'ready' | 'degraded'
      readonly reasonCodes: readonly ProductionReasonCode[]
    }
  | {
      readonly ok: false
      readonly stage: ProductionStageSpec | null
      readonly state: 'blocked' | 'completed'
      readonly reasonCodes: readonly ProductionReasonCode[]
    } {
  const chain = getProductionChainVariant(input.run.chainId)
  if (!chain) {
    return {
      ok: false,
      stage: null,
      state: 'blocked',
      reasonCodes: Object.freeze(['missing_facility_role']),
    }
  }
  if (input.run.state === 'completed' || input.run.currentStageIndex >= chain.stages.length) {
    return {
      ok: false,
      stage: null,
      state: 'completed',
      reasonCodes: Object.freeze(['stage_completed', 'facility_produced']),
    }
  }

  const stage = chain.stages[input.run.currentStageIndex]!
  const reasons: ProductionReasonCode[] = []

  if (!rolePresent(input.facility, stage.requiredRole)) {
    reasons.push('missing_facility_role')
  }
  if (roleDamaged(input.facility, stage.requiredRole)) {
    reasons.push('damaged_facility')
  }
  if (stage.input && stockOf(input.facility, stage.input.materialId) < stage.input.quantity) {
    reasons.push('missing_input')
    if (stage.stage === 'storage') reasons.push('storage_gap')
  }
  if (
    stage.auxiliaryMaterialId &&
    stockOf(input.facility, stage.auxiliaryMaterialId) < 1
  ) {
    reasons.push('missing_auxiliary')
  }
  if (stage.recirculates === true && chain.externalCatalyst) {
    const catalystStock = stockOf(input.facility, chain.externalCatalyst.materialId)
    if (catalystStock < chain.externalCatalyst.quantity) {
      reasons.push('self_generation_blocked')
    }
  }
  if (stage.dependencyNodeId) {
    const availability =
      input.facility.dependencyAvailabilityByNodeId?.[stage.dependencyNodeId] ?? 'unavailable'
    if (availability === 'unavailable') {
      reasons.push('dependency_interrupted')
    } else if (availability === 'degraded') {
      reasons.push('dependency_interrupted')
    }
  }

  if (stage.laborTaskId) {
    const labor = projectLabor(stage.laborTaskId, input.operators ?? [])
    if (!labor || labor.gateOutcome === 'stalled') {
      reasons.push('staffing_shortage')
    } else if (labor.gateOutcome === 'degraded') {
      reasons.push('labor_degraded')
    }
  }

  if (reasons.includes('missing_facility_role') ||
      reasons.includes('damaged_facility') ||
      reasons.includes('missing_input') ||
      reasons.includes('storage_gap') ||
      reasons.includes('missing_auxiliary') ||
      reasons.includes('self_generation_blocked') ||
      reasons.includes('staffing_shortage') ||
      (reasons.includes('dependency_interrupted') &&
        (input.facility.dependencyAvailabilityByNodeId?.[stage.dependencyNodeId ?? ''] ??
          'unavailable') === 'unavailable')) {
    return {
      ok: false,
      stage,
      state: 'blocked',
      reasonCodes: Object.freeze(reasons),
    }
  }

  if (
    reasons.includes('labor_degraded') ||
    reasons.includes('dependency_interrupted')
  ) {
    return {
      ok: true,
      stage,
      state: 'degraded',
      reasonCodes: Object.freeze([...reasons, 'stage_ready']),
    }
  }

  return {
    ok: true,
    stage,
    state: 'ready',
    reasonCodes: Object.freeze(['stage_ready']),
  }
}

/**
 * Advance one stage when ready. Emits handoff envelopes; does not debit stock.
 * Recirculating stages require external catalyst each cycle and apply authored loss.
 */
export function advanceProductionChain(input: {
  readonly run: ProductionChainRun
  readonly facility: ProductionFacilitySnapshot
  readonly operators?: readonly SpecialistOperatorSlot[]
}):
  | {
      readonly run: ProductionChainRun
      readonly handoff: ProductionMaterialHandoff | null
      readonly consumedPreview: readonly ProductionMaterialRef[]
    }
  | undefined {
  const chain = getProductionChainVariant(input.run.chainId)
  if (!chain) return undefined
  if (input.run.state === 'completed') {
    return {
      run: freezeRun(input.run),
      handoff: null,
      consumedPreview: Object.freeze([]),
    }
  }

  const resolved = resolveProductionChainStage(input)
  if (!resolved.ok || !resolved.stage) {
    return {
      run: freezeRun({
        ...input.run,
        state: resolved.state === 'completed' ? 'completed' : 'blocked',
        reasonCodes: resolved.reasonCodes,
      }),
      handoff: null,
      consumedPreview: Object.freeze([]),
    }
  }

  const stage = resolved.stage
  const consumed: ProductionMaterialRef[] = []
  if (stage.input) consumed.push({ ...stage.input })
  if (stage.recirculates === true && chain.externalCatalyst) {
    consumed.push({ ...chain.externalCatalyst })
  }

  const isLast = input.run.currentStageIndex >= chain.stages.length - 1
  const reasons: ProductionReasonCode[] = [...resolved.reasonCodes, 'stage_completed']

  let recirculationBuffer = input.run.recirculationBuffer
  let cyclesCompleted = input.run.cyclesCompleted
  let producedOutput: ProductionMaterialRef
  let handoff: ProductionMaterialHandoff
  let state: ProductionRunState
  let currentStageIndex: number

  if (stage.recirculates) {
    const loss = chain.recirculationLossPerCycle ?? 0
    const net = Math.max(0, stage.output.quantity - loss)
    recirculationBuffer += net
    cyclesCompleted += 1
    reasons.push('recirculation_loss')
    // Recirculation never closes without catalyst; stay on same stage index.
    currentStageIndex = input.run.currentStageIndex
    state = resolved.state === 'degraded' ? 'degraded' : 'producing'
    producedOutput = Object.freeze({
      materialId: stage.output.materialId,
      quantity: net,
    })
    handoff = Object.freeze({
      ownerIssueId: FACILITY_PRODUCTION_CHAIN_OWNER,
      runId: input.run.runId,
      materialId: stage.output.materialId,
      quantity: net,
      outputKind: chain.outputKind,
      facilityProduced: true as const,
    })
    reasons.push('facility_produced')
  } else if (isLast) {
    cyclesCompleted += 1
    currentStageIndex = chain.stages.length
    state = 'completed'
    producedOutput = Object.freeze({ ...stage.output })
    handoff = Object.freeze({
      ownerIssueId: FACILITY_PRODUCTION_CHAIN_OWNER,
      runId: input.run.runId,
      materialId: stage.output.materialId,
      quantity: stage.output.quantity,
      outputKind: chain.outputKind,
      facilityProduced: true as const,
    })
    reasons.push('facility_produced')
  } else {
    currentStageIndex = input.run.currentStageIndex + 1
    state = resolved.state === 'degraded' ? 'degraded' : 'producing'
    producedOutput = Object.freeze({ ...stage.output })
    handoff = Object.freeze({
      ownerIssueId: FACILITY_PRODUCTION_CHAIN_OWNER,
      runId: input.run.runId,
      materialId: stage.output.materialId,
      quantity: stage.output.quantity,
      outputKind: chain.outputKind,
      facilityProduced: true as const,
    })
  }

  return {
    run: freezeRun({
      ...input.run,
      state,
      currentStageIndex,
      reasonCodes: Object.freeze(reasons),
      producedOutput,
      cyclesCompleted,
      recirculationBuffer,
    }),
    handoff,
    consumedPreview: Object.freeze(consumed),
  }
}

export function projectProductionChainStatus(
  run: ProductionChainRun,
): ProductionChainStatusProjection | undefined {
  const chain = getProductionChainVariant(run.chainId)
  if (!chain) return undefined
  const stage =
    run.currentStageIndex >= 0 && run.currentStageIndex < chain.stages.length
      ? chain.stages[run.currentStageIndex]!
      : null
  return Object.freeze({
    ownerIssueId: FACILITY_PRODUCTION_CHAIN_OWNER,
    runId: run.runId,
    chainId: run.chainId,
    state: run.state,
    currentStageId: stage?.stageId ?? null,
    reasonCodes: Object.freeze([...run.reasonCodes]),
    outputKind: chain.outputKind,
    producedMaterialId: run.producedOutput?.materialId ?? null,
    producedQuantity: run.producedOutput?.quantity ?? 0,
  })
}

function sanitizeMaterialRef(value: unknown): ProductionMaterialRef | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  if (typeof value.materialId !== 'string' || value.materialId.trim().length === 0) {
    return undefined
  }
  if (
    typeof value.quantity !== 'number' ||
    !Number.isInteger(value.quantity) ||
    value.quantity < 0
  ) {
    return undefined
  }
  return Object.freeze({
    materialId: value.materialId.trim(),
    quantity: value.quantity,
  })
}

function sanitizeRun(value: unknown): ProductionChainRun | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.runId !== 'string' || value.runId.trim().length === 0) return undefined
  if (typeof value.chainId !== 'string' || !CHAIN_BY_ID.has(value.chainId)) return undefined
  if (!isMember(value.state, PRODUCTION_RUN_STATES)) return undefined
  const chain = CHAIN_BY_ID.get(value.chainId as string)
  if (!chain) return undefined
  if (
    typeof value.currentStageIndex !== 'number' ||
    !Number.isInteger(value.currentStageIndex) ||
    value.currentStageIndex < 0 ||
    value.currentStageIndex > chain.stages.length
  ) {
    return undefined
  }
  if (
    typeof value.cyclesCompleted !== 'number' ||
    !Number.isInteger(value.cyclesCompleted) ||
    value.cyclesCompleted < 0
  ) {
    return undefined
  }
  if (
    typeof value.recirculationBuffer !== 'number' ||
    !Number.isInteger(value.recirculationBuffer) ||
    value.recirculationBuffer < 0
  ) {
    return undefined
  }
  if (!Array.isArray(value.reasonCodes)) return undefined
  const reasons: ProductionReasonCode[] = []
  for (const code of value.reasonCodes) {
    if (!isMember(code, PRODUCTION_REASON_CODES)) return undefined
    reasons.push(code)
  }
  const produced = sanitizeMaterialRef(value.producedOutput)
  if (produced === undefined) return undefined
  return freezeRun({
    runId: value.runId.trim(),
    chainId: value.chainId,
    state: value.state,
    currentStageIndex: value.currentStageIndex,
    reasonCodes: Object.freeze(reasons),
    producedOutput: produced,
    cyclesCompleted: value.cyclesCompleted,
    recirculationBuffer: value.recirculationBuffer,
  })
}

export function sanitizeFacilityProductionChainRegistry(
  value: unknown,
): FacilityProductionChainRegistry | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  if (value.version !== 1) return undefined
  if (!Array.isArray(value.runs)) return undefined
  if (value.runs.length > 32) return undefined
  const runs: ProductionChainRun[] = []
  const seen = new Set<string>()
  for (const raw of value.runs) {
    const run = sanitizeRun(raw)
    if (!run) return undefined
    if (seen.has(run.runId)) return undefined
    seen.add(run.runId)
    runs.push(run)
  }
  runs.sort((a, b) => (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0))
  return Object.freeze({
    version: 1 as const,
    runs: Object.freeze(runs),
  })
}

export function createEmptyProductionChainRegistry(): FacilityProductionChainRegistry {
  return Object.freeze({ version: 1 as const, runs: Object.freeze([]) })
}
