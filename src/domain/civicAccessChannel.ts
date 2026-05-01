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
