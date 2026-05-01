// SPE-1266: Civic credit pressure channel — slices 1–3 (types, create, aggregate, decay)

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

const CREDIT_DECAY_THRESHOLD = 0.05

/**
 * SPE-1266 slice 3: Decay credit packets by one week.
 * Each packet's creditSignal is reduced by its decayRate (rounded to 3dp).
 * Packets whose resulting signal falls below 0.05 are dropped.
 * Survivors have their week updated to currentWeek.
 * Input is not mutated — returns a new array.
 */
export function decayCreditPackets(
  packets: readonly CivicCreditPacket[],
  currentWeek: number
): CivicCreditPacket[] {
  const results: CivicCreditPacket[] = []

  for (const packet of packets) {
    const decayed = Math.round((packet.creditSignal - packet.decayRate) * 1000) / 1000
    if (decayed < CREDIT_DECAY_THRESHOLD) continue
    results.push({ ...packet, creditSignal: decayed, week: currentWeek })
  }

  return results
}
