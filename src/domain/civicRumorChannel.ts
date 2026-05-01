// SPE-1265: Civic rumor pressure channel — slice 1 (types, create, extract)
import type { HubRumor } from './hub/hubState'

export interface CivicRumorPacket {
  packetId: string
  siteId: string
  week: number
  rumorSignal: number // 0–1
  misleading: boolean
  decayRate: number // 0–1 per week
}

export interface SiteRumorPressureModifier {
  siteId: string
  pressureBoost: number // clamped to [−0.2, +0.3]
  misleadingCount: number
  appliedPacketIds: string[]
  reasonFragment: string
}

export interface CivicRumorPacketInput {
  packetId: string
  siteId: string
  week: number
  rumorSignal: number
  misleading?: boolean
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

export function createCivicRumorPacket(input: CivicRumorPacketInput): CivicRumorPacket {
  return {
    packetId: normalizeToken(input.packetId),
    siteId: normalizeToken(input.siteId),
    week: normalizeWeek(input.week),
    rumorSignal: clamp(input.rumorSignal, 0, 1),
    misleading: input.misleading === true,
    decayRate: clamp(input.decayRate ?? 0.1, 0, 1),
  }
}

/**
 * Convert HubRumor[] to CivicRumorPacket[], dropping filtered rumors.
 * decayRate is derived from inverse confidence: low-confidence rumors decay faster.
 */
export function extractRumorPacketsFromHubState(
  hubRumors: readonly HubRumor[],
  siteId: string,
  week: number
): CivicRumorPacket[] {
  const normalizedSiteId = normalizeToken(siteId)
  const normalizedWeek = normalizeWeek(week)

  return hubRumors
    .filter((rumor) => rumor.filtered !== true)
    .map((rumor) =>
      createCivicRumorPacket({
        packetId: `rumor-${normalizeToken(rumor.id)}`,
        siteId: normalizedSiteId,
        week: normalizedWeek,
        rumorSignal: clamp(rumor.confidence, 0, 1),
        misleading: rumor.misleading === true,
        decayRate: clamp(1 - rumor.confidence, 0.05, 0.95),
      })
    )
    .sort((a, b) => a.packetId.localeCompare(b.packetId))
}

/**
 * SPE-1265 slice 2: Aggregate rumor pressure modifier for a target site.
 * Non-misleading packets contribute +rumorSignal * 0.15.
 * Misleading packets contribute −rumorSignal * 0.10.
 * Final boost is clamped to [−0.2, +0.3].
 */
export function aggregateSiteRumorPressureModifier(
  packets: readonly CivicRumorPacket[],
  targetSiteId: string
): SiteRumorPressureModifier {
  const normalizedTarget = normalizeToken(targetSiteId)
  const matching = packets.filter((p) => p.siteId === normalizedTarget)

  if (matching.length === 0) {
    return {
      siteId: normalizedTarget,
      pressureBoost: 0,
      misleadingCount: 0,
      appliedPacketIds: [],
      reasonFragment: 'no rumor pressure',
    }
  }

  let rawBoost = 0
  let misleadingCount = 0
  const appliedPacketIds: string[] = []

  for (const packet of matching) {
    appliedPacketIds.push(packet.packetId)
    if (packet.misleading) {
      rawBoost -= packet.rumorSignal * 0.1
      misleadingCount += 1
    } else {
      rawBoost += packet.rumorSignal * 0.15
    }
  }

  const pressureBoost = clamp(rawBoost, -0.2, 0.3)
  const parts: string[] = []
  if (pressureBoost > 0) {
    parts.push(`rumor pressure +${pressureBoost.toFixed(3)} (${appliedPacketIds.length - misleadingCount} confident, ${misleadingCount} misleading)`)
  } else if (pressureBoost < 0) {
    parts.push(`rumor pressure ${pressureBoost.toFixed(3)} (${misleadingCount} misleading dampened)`)
  } else {
    parts.push(`rumor pressure neutral`)
  }

  return {
    siteId: normalizedTarget,
    pressureBoost,
    misleadingCount,
    appliedPacketIds: appliedPacketIds.sort(),
    reasonFragment: parts.join('; '),
  }
}

/**
 * SPE-1265 slice 4: Decay all rumor packets by their decayRate.
 * Packets whose rumorSignal falls below 0.05 after decay are dropped.
 */
export function decayRumorPackets(
  packets: readonly CivicRumorPacket[],
  currentWeek: number
): CivicRumorPacket[] {
  const normalizedWeek = normalizeWeek(currentWeek)

  return packets
    .map((packet) => ({
      ...packet,
      rumorSignal: clamp(
        Math.round((packet.rumorSignal - packet.decayRate) * 1000) / 1000,
        0,
        1
      ),
      week: normalizedWeek,
    }))
    .filter((packet) => packet.rumorSignal >= 0.05)
}
