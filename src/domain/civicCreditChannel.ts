// SPE-1266: Civic credit pressure channel — slices 1–2 (types, create, aggregate)

export interface CivicCreditPacket {
  packetId: string
  siteId: string
  week: number
  creditSignal: number // 0–1
  delinquent: boolean
  decayRate: number // 0–1 per week; default 0.05
}

export interface CivicCreditPacketInput {
  packetId: string
  siteId: string
  week: number
  creditSignal: number
  delinquent?: boolean
  decayRate?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'unknown'
}

function normalizeWeek(value: number): number {
  return Math.max(1, Math.trunc(value))
}

export function createCivicCreditPacket(input: CivicCreditPacketInput): CivicCreditPacket {
  return {
    packetId: normalizeToken(input.packetId),
    siteId: normalizeToken(input.siteId),
    week: normalizeWeek(input.week),
    creditSignal: clamp(input.creditSignal, 0, 1),
    delinquent: input.delinquent === true,
    decayRate: clamp(input.decayRate ?? 0.05, 0, 1),
  }
}

// SPE-1266 slice 2
export interface SiteCreditPressureModifier {
  siteId: string
  pressureBoost: number // clamped to [−0.2, +0.3]
  delinquentCount: number
  appliedPacketIds: string[]
  reasonFragment: string
}

/**
 * Aggregate credit pressure modifier for a single target site.
 * Non-delinquent packets contribute −creditSignal × 0.15 (healthy credit suppresses pressure).
 * Delinquent packets contribute +creditSignal × 0.12 (delinquency increases pressure).
 * Final pressureBoost is clamped to [−0.2, +0.3].
 */
export function aggregateSiteCreditPressureModifier(
  packets: readonly CivicCreditPacket[],
  targetSiteId: string
): SiteCreditPressureModifier {
  const normalizedTarget = normalizeToken(targetSiteId)
  const matching = packets
    .filter((p) => p.siteId === normalizedTarget)
    .sort((a, b) => a.packetId.localeCompare(b.packetId))

  if (matching.length === 0) {
    return {
      siteId: normalizedTarget,
      pressureBoost: 0,
      delinquentCount: 0,
      appliedPacketIds: [],
      reasonFragment: 'no credit pressure',
    }
  }

  let rawBoost = 0
  let delinquentCount = 0
  const appliedPacketIds: string[] = []

  for (const packet of matching) {
    appliedPacketIds.push(packet.packetId)
    if (packet.delinquent) {
      rawBoost += packet.creditSignal * 0.12
      delinquentCount += 1
    } else {
      rawBoost -= packet.creditSignal * 0.15
    }
  }

  const pressureBoost = clamp(rawBoost, -0.2, 0.3)
  const healthyCount = matching.length - delinquentCount
  const parts: string[] = []
  if (pressureBoost < 0) {
    parts.push(`credit suppression ${pressureBoost.toFixed(3)} (${healthyCount} healthy)`)
  } else if (pressureBoost > 0) {
    parts.push(`credit pressure +${pressureBoost.toFixed(3)} (${delinquentCount} delinquent)`)
  } else {
    parts.push('credit balanced')
  }

  return {
    siteId: normalizedTarget,
    pressureBoost,
    delinquentCount,
    appliedPacketIds,
    reasonFragment: parts.join('; '),
  }
}
