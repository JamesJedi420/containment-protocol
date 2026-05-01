// SPE-1267: Civic access pressure channel — slices 1–3 (types, create, aggregate, decay)

export interface CivicAccessPacket {
  packetId: string
  siteId: string
  week: number
  accessSignal: number // 0–1
  blocked: boolean
  decayRate: number // 0–1 per week; default 0.05
}

export interface CivicAccessPacketInput {
  packetId: string
  siteId: string
  week: number
  accessSignal: number
  blocked?: boolean
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

export function createCivicAccessPacket(input: CivicAccessPacketInput): CivicAccessPacket {
  return {
    packetId: normalizeToken(input.packetId),
    siteId: normalizeToken(input.siteId),
    week: normalizeWeek(input.week),
    accessSignal: clamp(input.accessSignal, 0, 1),
    blocked: input.blocked === true,
    decayRate: clamp(input.decayRate ?? 0.05, 0, 1),
  }
}

// SPE-1267 slice 2
export interface SiteAccessPressureModifier {
  siteId: string
  pressureBoost: number // clamped to [−0.2, +0.3]
  blockedCount: number
  appliedPacketIds: string[]
  reasonFragment: string
}

/**
 * Aggregate access pressure modifier for a single target site.
 * Non-blocked packets contribute −accessSignal × 0.15 (open access suppresses pressure).
 * Blocked packets contribute +accessSignal × 0.12 (blocked access increases pressure).
 * Final pressureBoost is clamped to [−0.2, +0.3].
 */
export function aggregateSiteAccessPressureModifier(
  packets: readonly CivicAccessPacket[],
  targetSiteId: string
): SiteAccessPressureModifier {
  const normalizedTarget = normalizeToken(targetSiteId)
  const matching = packets
    .filter((p) => p.siteId === normalizedTarget)
    .sort((a, b) => a.packetId.localeCompare(b.packetId))

  if (matching.length === 0) {
    return {
      siteId: normalizedTarget,
      pressureBoost: 0,
      blockedCount: 0,
      appliedPacketIds: [],
      reasonFragment: 'no access pressure',
    }
  }

  let rawBoost = 0
  let blockedCount = 0
  const appliedPacketIds: string[] = []

  for (const packet of matching) {
    appliedPacketIds.push(packet.packetId)
    if (packet.blocked) {
      rawBoost += packet.accessSignal * 0.12
      blockedCount += 1
    } else {
      rawBoost -= packet.accessSignal * 0.15
    }
  }

  const pressureBoost = clamp(rawBoost, -0.2, 0.3)
  const openCount = matching.length - blockedCount
  const parts: string[] = []
  if (pressureBoost < 0) {
    parts.push(`access suppression ${pressureBoost.toFixed(3)} (${openCount} open)`)
  } else if (pressureBoost > 0) {
    parts.push(`access pressure +${pressureBoost.toFixed(3)} (${blockedCount} blocked)`)
  } else {
    parts.push('access balanced')
  }

  return {
    siteId: normalizedTarget,
    pressureBoost,
    blockedCount,
    appliedPacketIds,
    reasonFragment: parts.join('; '),
  }
}

  const ACCESS_DECAY_THRESHOLD = 0.05

  /**
   * SPE-1267 slice 3: Decay access packets by one week.
   * Each packet's accessSignal is reduced by its decayRate (rounded to 3dp).
   * Packets whose resulting signal falls below 0.05 are dropped.
   * Survivors have their week updated to currentWeek.
   * Input is not mutated — returns a new array.
   */
  export function decayAccessPackets(
    packets: readonly CivicAccessPacket[],
    currentWeek: number
  ): CivicAccessPacket[] {
    const results: CivicAccessPacket[] = []

    for (const packet of packets) {
      const decayed = Math.round((packet.accessSignal - packet.decayRate) * 1000) / 1000
      if (decayed < ACCESS_DECAY_THRESHOLD) continue
      results.push({ ...packet, accessSignal: decayed, week: currentWeek })
    }

    return results
  }
