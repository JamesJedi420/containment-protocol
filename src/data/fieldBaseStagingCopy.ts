import type { FieldBaseStagingPacket, FieldBaseStagingQuality } from '../domain/models'

export const FIELD_BASE_SUPPLY_TIER_MATERIAL_REASON =
  'Supply staging tier increased recoverable material quantities versus an unsecured baseline.'

export function formatFieldBaseStagingLegibilityLine(packet: FieldBaseStagingPacket): string {
  const q = packet.quality
  return formatFieldBaseStagingQualityLine(packet.label, q)
}

export function formatFieldBaseStagingQualityLine(
  label: string,
  quality: FieldBaseStagingQuality
): string {
  return (
    `Field staging (${label}): safety ${quality.safety}, medical ${quality.medical}, ` +
    `supply ${quality.supply}, extraction ${quality.extractionAccess}.`
  )
}
