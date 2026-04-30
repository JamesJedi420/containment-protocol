export type NeighborhoodIncidentSourceKind =
  | 'business_tool_misuse'
  | 'operator_tool_misuse'
  | 'decorative_biohazard'

export type NeighborhoodMitigationKind =
  | 'cleanup'
  | 'confiscation'
  | 'smoke'
  | 'operator_education'

export interface NeighborhoodIncidentPacketInput {
  incidentId: string
  districtId: string
  blockId: string
  seedKey: string
  sourceKind: NeighborhoodIncidentSourceKind
  sourceLabel: string
  baseCadenceWeeks?: number
  baseSeverity?: number
  spilloverRadiusBlocks?: number
}

export interface NeighborhoodIncidentPacket {
  incidentId: string
  districtId: string
  blockId: string
  seedKey: string
  scope: 'neighborhood'
  source: {
    kind: NeighborhoodIncidentSourceKind
    label: string
    intent: 'nonvillain'
  }
  hazard: {
    category: 'accidental_anomaly'
    baseCadenceWeeks: number
    baseSeverity: number
    spilloverRadiusBlocks: number
  }
  mitigation: {
    cadenceMultiplier: number
    severityMultiplier: number
    actions: NeighborhoodMitigationKind[]
  }
}

export interface NeighborhoodIncidentRecurrence {
  incidentId: string
  week: number
  occurred: boolean
  cadenceWeeks: number
  severity: number
  scope: 'neighborhood'
  sourceKind: NeighborhoodIncidentSourceKind
  tags: string[]
}

export interface NeighborhoodSpilloverResult {
  incidentId: string
  week: number
  scope: 'neighborhood'
  radiusBlocks: number
  crossesPropertyLine: boolean
  publicSpaceImpacted: boolean
  affectedSpaces: string[]
  citywidePropagation: false
  crossSitePropagation: false
}

export interface NeighborhoodMitigationAction {
  kind: NeighborhoodMitigationKind
  intensity?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))))
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right))
}

function hashSeed(seedKey: string) {
  let hash = 2166136261

  for (let index = 0; index < seedKey.length; index += 1) {
    hash ^= seedKey.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function normalizeCadenceWeeks(value: number | undefined) {
  return Math.max(1, Math.round(value ?? 2))
}

export function createNeighborhoodIncidentPacket(
  input: NeighborhoodIncidentPacketInput
): NeighborhoodIncidentPacket {
  return {
    incidentId: input.incidentId,
    districtId: input.districtId,
    blockId: input.blockId,
    seedKey: input.seedKey,
    scope: 'neighborhood',
    source: {
      kind: input.sourceKind,
      label: input.sourceLabel,
      intent: 'nonvillain',
    },
    hazard: {
      category: 'accidental_anomaly',
      baseCadenceWeeks: normalizeCadenceWeeks(input.baseCadenceWeeks),
      baseSeverity: clamp(input.baseSeverity ?? 0.6, 0.1, 1),
      // Bounded: this substrate intentionally never expands beyond adjacent local space.
      spilloverRadiusBlocks: Math.min(1, Math.max(0, Math.round(input.spilloverRadiusBlocks ?? 1))),
    },
    mitigation: {
      cadenceMultiplier: 1,
      severityMultiplier: 1,
      actions: [],
    },
  }
}

export function resolveNeighborhoodIncidentRecurrence(
  packet: NeighborhoodIncidentPacket,
  week: number
): NeighborhoodIncidentRecurrence {
  const normalizedWeek = Math.max(1, Math.trunc(week))
  const cadenceWeeks = Math.max(
    1,
    Math.round(packet.hazard.baseCadenceWeeks * packet.mitigation.cadenceMultiplier)
  )
  const occurred = normalizedWeek % cadenceWeeks === 0
  const deterministicSeed = hashSeed(`${packet.seedKey}:${normalizedWeek}:${packet.source.kind}`)
  const deterministicJitter = (deterministicSeed % 9) / 100
  const baseSeverity = clamp(
    packet.hazard.baseSeverity * packet.mitigation.severityMultiplier,
    0,
    1
  )
  const severity = occurred ? clamp(baseSeverity + deterministicJitter, 0, 1) : 0

  return {
    incidentId: packet.incidentId,
    week: normalizedWeek,
    occurred,
    cadenceWeeks,
    severity,
    scope: 'neighborhood',
    sourceKind: packet.source.kind,
    tags: uniqueSorted([
      `district:${packet.districtId}`,
      `block:${packet.blockId}`,
      `source:${packet.source.kind}`,
      `intent:${packet.source.intent}`,
      `cadence:${cadenceWeeks}`,
      `occurred:${occurred ? 'yes' : 'no'}`,
    ]),
  }
}

export function resolveNeighborhoodSpillover(
  packet: NeighborhoodIncidentPacket,
  recurrence: NeighborhoodIncidentRecurrence
): NeighborhoodSpilloverResult {
  if (!recurrence.occurred) {
    return {
      incidentId: packet.incidentId,
      week: recurrence.week,
      scope: 'neighborhood',
      radiusBlocks: 0,
      crossesPropertyLine: false,
      publicSpaceImpacted: false,
      affectedSpaces: [],
      citywidePropagation: false,
      crossSitePropagation: false,
    }
  }

  const isDecorativeBiohazard = packet.source.kind === 'decorative_biohazard'
  const radiusBlocks = isDecorativeBiohazard ? packet.hazard.spilloverRadiusBlocks : 0
  const crossesPropertyLine = isDecorativeBiohazard && radiusBlocks > 0
  const publicSpaceImpacted = isDecorativeBiohazard && recurrence.severity > 0
  const affectedSpaces = uniqueSorted(
    [
      'origin_property_interior',
      crossesPropertyLine ? 'property_threshold' : '',
      publicSpaceImpacted ? 'adjacent_public_sidewalk' : '',
      publicSpaceImpacted ? 'nearby_alley' : '',
    ].filter(Boolean)
  )

  return {
    incidentId: packet.incidentId,
    week: recurrence.week,
    scope: 'neighborhood',
    radiusBlocks,
    crossesPropertyLine,
    publicSpaceImpacted,
    affectedSpaces,
    citywidePropagation: false,
    crossSitePropagation: false,
  }
}

export function applyNeighborhoodMitigation(
  packet: NeighborhoodIncidentPacket,
  mitigationAction: NeighborhoodMitigationAction
): NeighborhoodIncidentPacket {
  const intensity = clamp(mitigationAction.intensity ?? 1, 0.5, 2)

  let cadenceMultiplier = packet.mitigation.cadenceMultiplier
  let severityMultiplier = packet.mitigation.severityMultiplier

  if (mitigationAction.kind === 'cleanup') {
    severityMultiplier *= 1 - 0.2 * intensity
  } else if (mitigationAction.kind === 'smoke') {
    cadenceMultiplier *= 1 + 0.1 * intensity
    severityMultiplier *= 1 - 0.15 * intensity
  } else if (mitigationAction.kind === 'confiscation') {
    cadenceMultiplier *= 1 + 0.5 * intensity
    severityMultiplier *= 1 - 0.25 * intensity
  } else if (mitigationAction.kind === 'operator_education') {
    cadenceMultiplier *= 1 + 0.35 * intensity
    severityMultiplier *= 1 - 0.1 * intensity
  }

  return {
    ...packet,
    mitigation: {
      cadenceMultiplier: clamp(cadenceMultiplier, 1, 3),
      severityMultiplier: clamp(severityMultiplier, 0.25, 1),
      actions: uniqueSorted([...packet.mitigation.actions, mitigationAction.kind]) as NeighborhoodMitigationKind[],
    },
  }
}