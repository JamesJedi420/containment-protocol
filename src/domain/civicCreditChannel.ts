// SPE-1266: Civic credit pressure channel — slice 1 (types, create)

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
