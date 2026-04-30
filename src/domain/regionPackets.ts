export type RegionFactionAlignment = 'cooperative' | 'competitive' | 'hostile'
export type RegionPressureSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface RegionFactionInput {
  factionId: string
  label: string
  alignment: RegionFactionAlignment
  rivalFactionIds?: readonly string[]
}

export interface RegionExternalPressureInput {
  actorId: string
  label: string
  pressureType: 'invasion' | 'subversion' | 'resource_siege' | 'influence_warfare'
  severity: RegionPressureSeverity
  targetFactionIds: readonly string[]
}

export interface RegionSupraFactionOrderInput {
  orderId: string
  label: string
  doctrine: 'containment' | 'civil_protection' | 'expedition' | 'counter_occult'
  memberFactionIds: readonly string[]
}

export interface RegionNpcInput {
  npcId: string
  name: string
  role: 'leader' | 'liaison' | 'specialist' | 'witness'
  affiliatedFactionId?: string
  affiliatedOrderId?: string
}

export interface RegionThreatEntryInput {
  threatId: string
  label: string
  category: 'cryptid' | 'cult' | 'anomalous_hazard' | 'hostile_cell'
  districtTokens?: readonly string[]
}

export interface RegionObjectiveArtifactInput {
  artifactId: string
  label: string
  objectiveHook: string
  linkedThreatIds: readonly string[]
}

export interface RegionEcologyZoneInput {
  zoneId: string
  label: string
  ecologyTokens: readonly string[]
}

export interface RegionPacketInput {
  regionId: string
  label: string
  factions: readonly RegionFactionInput[]
  externalPressure: RegionExternalPressureInput
  supraFactionOrder: RegionSupraFactionOrderInput
  keyNpcs: readonly RegionNpcInput[]
  threatPool: readonly RegionThreatEntryInput[]
  objectives: readonly RegionObjectiveArtifactInput[]
  districtEcologyTokens?: readonly string[]
  ecologyZones?: readonly RegionEcologyZoneInput[]
}

export interface RegionFaction {
  factionId: string
  label: string
  alignment: RegionFactionAlignment
  rivalFactionIds: string[]
}

export interface RegionExternalPressure {
  actorId: string
  label: string
  pressureType: RegionExternalPressureInput['pressureType']
  severity: RegionPressureSeverity
  targetFactionIds: string[]
}

export interface RegionSupraFactionOrder {
  orderId: string
  label: string
  doctrine: RegionSupraFactionOrderInput['doctrine']
  memberFactionIds: string[]
}

export interface RegionNpc {
  npcId: string
  name: string
  role: RegionNpcInput['role']
  affiliatedFactionId?: string
  affiliatedOrderId?: string
}

export interface RegionThreatEntry {
  threatId: string
  label: string
  category: RegionThreatEntryInput['category']
  districtTokens: string[]
}

export interface RegionObjectiveArtifact {
  artifactId: string
  label: string
  objectiveHook: string
  linkedThreatIds: string[]
}

export interface RegionEcologyZone {
  zoneId: string
  label: string
  ecologyTokens: string[]
}

export interface CompactRegionPacket {
  regionId: string
  label: string
  factions: RegionFaction[]
  externalPressure: RegionExternalPressure
  supraFactionOrder: RegionSupraFactionOrder
  keyNpcs: RegionNpc[]
  threatPool: RegionThreatEntry[]
  objectives: RegionObjectiveArtifact[]
  districtEcologyTokens: string[]
  ecologyZones: RegionEcologyZone[]
}

export interface RegionFactionLink {
  factionId: string
  rivalFactionIds: string[]
  externalPressureTargeted: boolean
  memberOfSupraOrder: boolean
}

export interface RegionObjectiveSurface {
  artifactId: string
  label: string
  objectiveHook: string
  linkedThreatLabels: string[]
}

export interface RegionEcologyProfile {
  zoneId: string
  label: string
  ecologyTokens: string[]
  operationalModifierHints: string[]
  threatHabitatHints: string[]
  localAssetHints: string[]
}

export interface RegionThreatHabitatSurface {
  threatId: string
  threatLabel: string
  preferredZoneIds: string[]
  habitatHints: string[]
}

export interface RegionLocalAssetSurface {
  zoneId: string
  label: string
  localAssetHints: string[]
}

const ECOLOGY_OPERATIONAL_HINTS: Readonly<Record<string, readonly string[]>> = {
  'district:floodplain': ['ops:flood-risk', 'ops:waterlogged-access'],
  'district:old-docks': ['ops:poor-visibility', 'ops:signal-dropout'],
  'district:quarry-belt': ['ops:unstable-ground', 'ops:echo-comms'],
  'district:dead-mall': ['ops:collapsed-interior-lines', 'ops:blind-corners'],
  'district:cemetery-belt': ['ops:night-witness-variance', 'ops:ritual-residue'],
}

const ECOLOGY_THREAT_HINTS: Readonly<Record<string, readonly string[]>> = {
  'district:floodplain': ['habitat:waterline-anomaly', 'habitat:drainage-threat'],
  'district:old-docks': ['habitat:smuggling-cult-activity', 'habitat:concealed-entry'],
  'district:quarry-belt': ['habitat:subsurface-cryptid', 'habitat:quarry-reverb-anomaly'],
  'district:dead-mall': ['habitat:abandoned-hostile-cell', 'habitat:containment-blind-spot'],
  'district:cemetery-belt': ['habitat:mortuary-cult-ritual', 'habitat:grief-echo-entity'],
}

const ECOLOGY_LOCAL_ASSET_HINTS: Readonly<Record<string, readonly string[]>> = {
  'district:floodplain': ['asset:boats', 'asset:water-sampling-kits'],
  'district:old-docks': ['asset:cold-storage', 'asset:harbor-archives'],
  'district:quarry-belt': ['asset:iron-stock', 'asset:heavy-lift-rigging'],
  'district:dead-mall': ['asset:maintenance-tunnels', 'asset:backup-generators'],
  'district:cemetery-belt': ['asset:mortuary-records', 'asset:chapel-access'],
}

function normalizeString(value: string) {
  return value.trim()
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => normalizeString(value)).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  )
}

function sortByKey<T>(values: readonly T[], getKey: (value: T) => string) {
  return [...values].sort((left, right) => getKey(left).localeCompare(getKey(right)))
}

export function createCompactRegionPacket(input: RegionPacketInput): CompactRegionPacket {
  const factions = sortByKey(
    input.factions.map((faction) => ({
      factionId: normalizeString(faction.factionId),
      label: normalizeString(faction.label),
      alignment: faction.alignment,
      rivalFactionIds: uniqueSorted(faction.rivalFactionIds ?? []),
    })),
    (faction) => faction.factionId
  )

  const externalPressure: RegionExternalPressure = {
    actorId: normalizeString(input.externalPressure.actorId),
    label: normalizeString(input.externalPressure.label),
    pressureType: input.externalPressure.pressureType,
    severity: input.externalPressure.severity,
    targetFactionIds: uniqueSorted(input.externalPressure.targetFactionIds),
  }

  const supraFactionOrder: RegionSupraFactionOrder = {
    orderId: normalizeString(input.supraFactionOrder.orderId),
    label: normalizeString(input.supraFactionOrder.label),
    doctrine: input.supraFactionOrder.doctrine,
    memberFactionIds: uniqueSorted(input.supraFactionOrder.memberFactionIds),
  }

  const keyNpcs = sortByKey(
    input.keyNpcs.map((npc) => ({
      npcId: normalizeString(npc.npcId),
      name: normalizeString(npc.name),
      role: npc.role,
      ...(npc.affiliatedFactionId
        ? { affiliatedFactionId: normalizeString(npc.affiliatedFactionId) }
        : {}),
      ...(npc.affiliatedOrderId ? { affiliatedOrderId: normalizeString(npc.affiliatedOrderId) } : {}),
    })),
    (npc) => npc.npcId
  )

  const threatPool = sortByKey(
    input.threatPool.map((threat) => ({
      threatId: normalizeString(threat.threatId),
      label: normalizeString(threat.label),
      category: threat.category,
      districtTokens: uniqueSorted(threat.districtTokens ?? []),
    })),
    (threat) => threat.threatId
  )

  const objectives = sortByKey(
    input.objectives.map((objective) => ({
      artifactId: normalizeString(objective.artifactId),
      label: normalizeString(objective.label),
      objectiveHook: normalizeString(objective.objectiveHook),
      linkedThreatIds: uniqueSorted(objective.linkedThreatIds),
    })),
    (objective) => objective.artifactId
  )

  const ecologyZones = sortByKey(
    (input.ecologyZones ?? []).map((zone) => ({
      zoneId: normalizeString(zone.zoneId),
      label: normalizeString(zone.label),
      ecologyTokens: uniqueSorted(zone.ecologyTokens),
    })),
    (zone) => zone.zoneId
  )

  const inferredDistrictTokensFromZones = uniqueSorted(
    ecologyZones.flatMap((zone) => zone.ecologyTokens)
  )

  return {
    regionId: normalizeString(input.regionId),
    label: normalizeString(input.label),
    factions,
    externalPressure,
    supraFactionOrder,
    keyNpcs,
    threatPool,
    objectives,
    districtEcologyTokens: uniqueSorted([
      ...(input.districtEcologyTokens ?? []),
      ...inferredDistrictTokensFromZones,
    ]),
    ecologyZones,
  }
}

export function linkRegionFactions(packet: CompactRegionPacket): RegionFactionLink[] {
  const pressureTargets = new Set(packet.externalPressure.targetFactionIds)
  const orderMembers = new Set(packet.supraFactionOrder.memberFactionIds)

  return packet.factions.map((faction) => ({
    factionId: faction.factionId,
    rivalFactionIds: [...faction.rivalFactionIds],
    externalPressureTargeted: pressureTargets.has(faction.factionId),
    memberOfSupraOrder: orderMembers.has(faction.factionId),
  }))
}

export function surfaceRegionObjectives(packet: CompactRegionPacket): RegionObjectiveSurface[] {
  const threatLabelById = new Map(packet.threatPool.map((threat) => [threat.threatId, threat.label]))

  return packet.objectives.map((objective) => ({
    artifactId: objective.artifactId,
    label: objective.label,
    objectiveHook: objective.objectiveHook,
    linkedThreatLabels: objective.linkedThreatIds
      .map((threatId) => threatLabelById.get(threatId))
      .filter((label): label is string => Boolean(label)),
  }))
}

export function hasInternalConflictAndExternalPressure(packet: CompactRegionPacket): boolean {
  const hasInternalConflict = packet.factions.some((faction) => faction.rivalFactionIds.length > 0)
  const hasExternalPressureTargets = packet.externalPressure.targetFactionIds.length > 0
  return hasInternalConflict && hasExternalPressureTargets
}

function deriveOperationalModifierHints(tokens: readonly string[]) {
  return uniqueSorted(tokens.flatMap((token) => ECOLOGY_OPERATIONAL_HINTS[token] ?? []))
}

function deriveThreatHabitatHints(tokens: readonly string[]) {
  return uniqueSorted(tokens.flatMap((token) => ECOLOGY_THREAT_HINTS[token] ?? []))
}

function deriveLocalAssetHints(tokens: readonly string[]) {
  return uniqueSorted(tokens.flatMap((token) => ECOLOGY_LOCAL_ASSET_HINTS[token] ?? []))
}

export function deriveRegionEcologyProfiles(packet: CompactRegionPacket): RegionEcologyProfile[] {
  return packet.ecologyZones.map((zone) => ({
    zoneId: zone.zoneId,
    label: zone.label,
    ecologyTokens: [...zone.ecologyTokens],
    operationalModifierHints: deriveOperationalModifierHints(zone.ecologyTokens),
    threatHabitatHints: deriveThreatHabitatHints(zone.ecologyTokens),
    localAssetHints: deriveLocalAssetHints(zone.ecologyTokens),
  }))
}

export function surfaceThreatHabitatHints(packet: CompactRegionPacket): RegionThreatHabitatSurface[] {
  const profileByZoneId = new Map(
    deriveRegionEcologyProfiles(packet).map((profile) => [profile.zoneId, profile])
  )

  return packet.threatPool.map((threat) => {
    const preferredZoneIds = packet.ecologyZones
      .filter((zone) => threat.districtTokens.some((token) => zone.ecologyTokens.includes(token)))
      .map((zone) => zone.zoneId)
    const habitatHints = uniqueSorted(
      preferredZoneIds.flatMap((zoneId) => profileByZoneId.get(zoneId)?.threatHabitatHints ?? [])
    )

    return {
      threatId: threat.threatId,
      threatLabel: threat.label,
      preferredZoneIds,
      habitatHints,
    }
  })
}

export function surfaceLocalAssetHints(packet: CompactRegionPacket): RegionLocalAssetSurface[] {
  return deriveRegionEcologyProfiles(packet).map((profile) => ({
    zoneId: profile.zoneId,
    label: profile.label,
    localAssetHints: [...profile.localAssetHints],
  }))
}
