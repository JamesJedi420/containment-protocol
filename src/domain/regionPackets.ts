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

  return {
    regionId: normalizeString(input.regionId),
    label: normalizeString(input.label),
    factions,
    externalPressure,
    supraFactionOrder,
    keyNpcs,
    threatPool,
    objectives,
    districtEcologyTokens: uniqueSorted(input.districtEcologyTokens ?? []),
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
