/** SPE-2272: caller-owned deployment cost profiles and accumulated burden. */
export type DeploymentTempo = 'routine' | 'high'

export interface DeploymentBurden {
  readonly payrollLoad: number
  readonly gearConsumption: number
  readonly moraleHit: number
  readonly recoveryTicks: number
  readonly inspectionDebt: number
}

export interface DeploymentCostRecord {
  readonly id: string
  readonly routine: DeploymentBurden
  readonly high: DeploymentBurden
}

export interface DeploymentCapacityLimits {
  readonly payrollAvailable: number
  readonly gearAvailable: number
  readonly moraleAllowance: number
  readonly recoveryCapacity: number
  readonly inspectionCapacity: number
}

export type DeploymentShortage = 'payroll' | 'gear' | 'morale' | 'recovery' | 'inspection'

export interface DeploymentCapacityAssessment {
  readonly allowed: boolean
  readonly shortages: readonly DeploymentShortage[]
  readonly lowerTempoAvailable: boolean
}

const FIELDS = [
  'payrollLoad',
  'gearConsumption',
  'moraleHit',
  'recoveryTicks',
  'inspectionDebt',
] as const
const MAX_AMOUNT = 1_000_000

function validateBurden(input: DeploymentBurden, label: string): DeploymentBurden {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new Error(`${label} is required`)
  const output = {} as Record<(typeof FIELDS)[number], number>
  for (const field of FIELDS) {
    const value = input[field]
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AMOUNT)
      throw new Error(`${label}.${field} must be a bounded nonnegative integer`)
    output[field] = value
  }
  return Object.freeze(output)
}

export function createDeploymentCostRecord(input: DeploymentCostRecord): DeploymentCostRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new Error('deployment cost record is required')
  if (typeof input.id !== 'string' || !input.id.trim())
    throw new Error('deployment cost id is required')
  const routine = validateBurden(input.routine, 'routine')
  const high = validateBurden(input.high, 'high')
  if (FIELDS.filter((field) => routine[field] > 0).length < 2)
    throw new Error('routine deployment must increase at least two cost dimensions')
  if (
    FIELDS.some((field) => high[field] < routine[field]) ||
    high.gearConsumption <= routine.gearConsumption ||
    high.recoveryTicks <= routine.recoveryTicks
  ) {
    throw new Error(
      'high tempo must increase gear and recovery burden without reducing other costs'
    )
  }
  return Object.freeze({ id: input.id.trim(), routine, high })
}

export function createDeploymentCostRegistry(
  records: readonly DeploymentCostRecord[]
): readonly DeploymentCostRecord[] {
  if (!Array.isArray(records)) throw new Error('deployment cost registry must be an array')
  const entries = records
    .map(createDeploymentCostRecord)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  if (entries.some((entry, index) => index > 0 && entry.id === entries[index - 1]?.id))
    throw new Error('duplicate deployment cost id')
  return Object.freeze(entries)
}

/** Computes a proposal only: the caller owns any actual resources and recovery. */
export function accumulateDeploymentCost(
  record: DeploymentCostRecord,
  tempo: DeploymentTempo,
  previous: DeploymentBurden
): DeploymentBurden {
  const validated = createDeploymentCostRecord(record)
  if (tempo !== 'routine' && tempo !== 'high') throw new Error('invalid deployment tempo')
  const prior = validateBurden(previous, 'previous')
  const cost = validated[tempo]
  const next = {} as Record<(typeof FIELDS)[number], number>
  for (const field of FIELDS) {
    const value = prior[field] + cost[field]
    if (value > MAX_AMOUNT) throw new Error(`accumulated ${field} exceeds limit`)
    next[field] = value
  }
  return Object.freeze(next)
}

/** Assess a proposed next deployment against caller-owned limits; never spend or restore them. */
export function assessNextDeployment(
  record: DeploymentCostRecord,
  tempo: DeploymentTempo,
  previous: DeploymentBurden,
  limits: DeploymentCapacityLimits
): DeploymentCapacityAssessment {
  if (typeof limits !== 'object' || limits === null || Array.isArray(limits))
    throw new Error('deployment limits are required')
  for (const value of [
    limits.payrollAvailable,
    limits.gearAvailable,
    limits.moraleAllowance,
    limits.recoveryCapacity,
    limits.inspectionCapacity,
  ]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AMOUNT)
      throw new Error('deployment limits must be bounded nonnegative integers')
  }
  const shortagesFor = (burden: DeploymentBurden): DeploymentShortage[] => {
    const shortages: DeploymentShortage[] = []
    if (burden.payrollLoad > limits.payrollAvailable) shortages.push('payroll')
    if (burden.gearConsumption > limits.gearAvailable) shortages.push('gear')
    if (burden.moraleHit > limits.moraleAllowance) shortages.push('morale')
    if (burden.recoveryTicks > limits.recoveryCapacity) shortages.push('recovery')
    if (burden.inspectionDebt > limits.inspectionCapacity) shortages.push('inspection')
    return shortages
  }
  const shortages = shortagesFor(accumulateDeploymentCost(record, tempo, previous))
  const lowerTempoAvailable =
    tempo === 'high' &&
    shortages.length > 0 &&
    shortagesFor(accumulateDeploymentCost(record, 'routine', previous)).length === 0
  return Object.freeze({
    allowed: shortages.length === 0,
    shortages: Object.freeze(shortages),
    lowerTempoAvailable,
  })
}
