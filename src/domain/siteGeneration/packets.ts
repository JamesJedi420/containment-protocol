export interface WeightedStageOption<T extends string> {
  id: T
  weight: number
}

export type SitePurposeId = 'ritual_complex' | 'predator_nest'
export type SiteBuilderId = 'cult_engineers' | 'feral_pack' | 'collapsed_infrastructure'
export type SiteLocationId = 'riverfront_substrate' | 'stockyard_labyrinth'
export type SiteIngressId = 'floodgate' | 'maintenance_shaft' | 'service_door' | 'storm_drain'
export type SiteTopologyId = 'concentric_sanctum' | 'lure_corridors' | 'collapsed_cells'
export type SiteHazardId =
  | 'ward_feedback'
  | 'ritual_backwash'
  | 'predator_ambush'
  | 'blood_traps'
  | 'structural_fall'
export type SiteTreasureId =
  | 'sealed_reliquary'
  | 'rite_ledger'
  | 'smuggled_cache'
  | 'feeding_cache'
export type SiteInhabitantId =
  | 'ritual_adepts'
  | 'bound_sentinels'
  | 'feral_packmates'
  | 'captured_witnesses'
  | 'harvested_minds'

export interface SpatialProfile {
  siteLayer: 'exterior' | 'transition' | 'interior'
  visibilityState: 'clear' | 'obstructed' | 'exposed'
  transitionType: 'open-approach' | 'threshold' | 'chokepoint'
  spatialFlags: string[]
}

export interface SiteGenerationStageSnapshot {
  purpose: SitePurposeId
  builder: SiteBuilderId
  location: SiteLocationId
  ingress: SiteIngressId
  topology: SiteTopologyId
  hazards: SiteHazardId[]
  treasure: SiteTreasureId[]
  inhabitants: SiteInhabitantId[]
}

export interface PilotSiteGenerationPacket {
  id: string
  templateIds: readonly string[]
  purposes: readonly WeightedStageOption<SitePurposeId>[]
  buildersByPurpose: Readonly<Record<SitePurposeId, readonly WeightedStageOption<SiteBuilderId>[]>>
  locationsByPurpose: Readonly<Record<SitePurposeId, readonly WeightedStageOption<SiteLocationId>[]>>
  ingressByPurposeAndLocation: Readonly<
    Record<`${SitePurposeId}|${SiteLocationId}`, readonly WeightedStageOption<SiteIngressId>[]>
  >
  topologyByIngressAndBuilder: Readonly<
    Record<`${SiteIngressId}|${SiteBuilderId}`, readonly WeightedStageOption<SiteTopologyId>[]>
  >
  hazardsByPurposeAndTopology: Readonly<
    Record<`${SitePurposeId}|${SiteTopologyId}`, readonly WeightedStageOption<SiteHazardId>[]>
  >
  treasureByPurposeAndLocation: Readonly<
    Record<`${SitePurposeId}|${SiteLocationId}`, readonly WeightedStageOption<SiteTreasureId>[]>
  >
  inhabitantsByPurposeAndBuilder: Readonly<
    Record<`${SitePurposeId}|${SiteBuilderId}`, readonly WeightedStageOption<SiteInhabitantId>[]>
  >
  topologySpatialProfiles: Readonly<Record<SiteTopologyId, SpatialProfile>>
}

const RITUAL_PACKET: PilotSiteGenerationPacket = {
  id: 'ritual-riverfront.v1',
  templateIds: ['mixed_eclipse_ritual'],
  purposes: [
    { id: 'ritual_complex', weight: 7 },
    { id: 'predator_nest', weight: 3 },
  ],
  buildersByPurpose: {
    ritual_complex: [
      { id: 'cult_engineers', weight: 7 },
      { id: 'collapsed_infrastructure', weight: 3 },
    ],
    predator_nest: [
      { id: 'feral_pack', weight: 8 },
      { id: 'collapsed_infrastructure', weight: 2 },
    ],
  },
  locationsByPurpose: {
    ritual_complex: [
      { id: 'riverfront_substrate', weight: 8 },
      { id: 'stockyard_labyrinth', weight: 2 },
    ],
    predator_nest: [
      { id: 'stockyard_labyrinth', weight: 7 },
      { id: 'riverfront_substrate', weight: 3 },
    ],
  },
  ingressByPurposeAndLocation: {
    'ritual_complex|riverfront_substrate': [
      { id: 'floodgate', weight: 6 },
      { id: 'maintenance_shaft', weight: 4 },
    ],
    'ritual_complex|stockyard_labyrinth': [
      { id: 'service_door', weight: 7 },
      { id: 'storm_drain', weight: 3 },
    ],
    'predator_nest|riverfront_substrate': [
      { id: 'storm_drain', weight: 7 },
      { id: 'service_door', weight: 3 },
    ],
    'predator_nest|stockyard_labyrinth': [
      { id: 'maintenance_shaft', weight: 6 },
      { id: 'storm_drain', weight: 4 },
    ],
  },
  topologyByIngressAndBuilder: {
    'floodgate|cult_engineers': [
      { id: 'concentric_sanctum', weight: 8 },
      { id: 'collapsed_cells', weight: 2 },
    ],
    'maintenance_shaft|cult_engineers': [
      { id: 'concentric_sanctum', weight: 5 },
      { id: 'lure_corridors', weight: 5 },
    ],
    'service_door|cult_engineers': [
      { id: 'lure_corridors', weight: 6 },
      { id: 'concentric_sanctum', weight: 4 },
    ],
    'storm_drain|cult_engineers': [
      { id: 'collapsed_cells', weight: 6 },
      { id: 'lure_corridors', weight: 4 },
    ],
    'floodgate|feral_pack': [
      { id: 'lure_corridors', weight: 6 },
      { id: 'collapsed_cells', weight: 4 },
    ],
    'maintenance_shaft|feral_pack': [
      { id: 'lure_corridors', weight: 8 },
      { id: 'collapsed_cells', weight: 2 },
    ],
    'service_door|feral_pack': [
      { id: 'lure_corridors', weight: 8 },
      { id: 'collapsed_cells', weight: 2 },
    ],
    'storm_drain|feral_pack': [
      { id: 'collapsed_cells', weight: 7 },
      { id: 'lure_corridors', weight: 3 },
    ],
    'floodgate|collapsed_infrastructure': [
      { id: 'collapsed_cells', weight: 8 },
      { id: 'concentric_sanctum', weight: 2 },
    ],
    'maintenance_shaft|collapsed_infrastructure': [
      { id: 'collapsed_cells', weight: 7 },
      { id: 'lure_corridors', weight: 3 },
    ],
    'service_door|collapsed_infrastructure': [
      { id: 'collapsed_cells', weight: 6 },
      { id: 'lure_corridors', weight: 4 },
    ],
    'storm_drain|collapsed_infrastructure': [
      { id: 'collapsed_cells', weight: 8 },
      { id: 'lure_corridors', weight: 2 },
    ],
  },
  hazardsByPurposeAndTopology: {
    'ritual_complex|concentric_sanctum': [
      { id: 'ward_feedback', weight: 7 },
      { id: 'ritual_backwash', weight: 6 },
      { id: 'structural_fall', weight: 2 },
    ],
    'ritual_complex|lure_corridors': [
      { id: 'ritual_backwash', weight: 6 },
      { id: 'ward_feedback', weight: 4 },
      { id: 'blood_traps', weight: 3 },
    ],
    'ritual_complex|collapsed_cells': [
      { id: 'structural_fall', weight: 6 },
      { id: 'ritual_backwash', weight: 4 },
      { id: 'ward_feedback', weight: 3 },
    ],
    'predator_nest|concentric_sanctum': [
      { id: 'predator_ambush', weight: 7 },
      { id: 'blood_traps', weight: 5 },
      { id: 'ward_feedback', weight: 1 },
    ],
    'predator_nest|lure_corridors': [
      { id: 'predator_ambush', weight: 8 },
      { id: 'blood_traps', weight: 6 },
      { id: 'structural_fall', weight: 2 },
    ],
    'predator_nest|collapsed_cells': [
      { id: 'structural_fall', weight: 6 },
      { id: 'predator_ambush', weight: 5 },
      { id: 'blood_traps', weight: 4 },
    ],
  },
  treasureByPurposeAndLocation: {
    'ritual_complex|riverfront_substrate': [
      { id: 'sealed_reliquary', weight: 8 },
      { id: 'rite_ledger', weight: 6 },
      { id: 'smuggled_cache', weight: 2 },
    ],
    'ritual_complex|stockyard_labyrinth': [
      { id: 'rite_ledger', weight: 7 },
      { id: 'sealed_reliquary', weight: 4 },
      { id: 'smuggled_cache', weight: 3 },
    ],
    'predator_nest|riverfront_substrate': [
      { id: 'feeding_cache', weight: 7 },
      { id: 'smuggled_cache', weight: 5 },
      { id: 'sealed_reliquary', weight: 2 },
    ],
    'predator_nest|stockyard_labyrinth': [
      { id: 'feeding_cache', weight: 8 },
      { id: 'smuggled_cache', weight: 6 },
      { id: 'rite_ledger', weight: 1 },
    ],
  },
  inhabitantsByPurposeAndBuilder: {
    'ritual_complex|cult_engineers': [
      { id: 'ritual_adepts', weight: 8 },
      { id: 'bound_sentinels', weight: 6 },
      { id: 'captured_witnesses', weight: 2 },
      { id: 'harvested_minds', weight: 3 },
    ],
    'ritual_complex|feral_pack': [
      { id: 'ritual_adepts', weight: 5 },
      { id: 'feral_packmates', weight: 5 },
      { id: 'captured_witnesses', weight: 3 },
    ],
    'ritual_complex|collapsed_infrastructure': [
      { id: 'bound_sentinels', weight: 6 },
      { id: 'captured_witnesses', weight: 5 },
      { id: 'ritual_adepts', weight: 4 },
    ],
    'predator_nest|cult_engineers': [
      { id: 'bound_sentinels', weight: 5 },
      { id: 'feral_packmates', weight: 5 },
      { id: 'captured_witnesses', weight: 4 },
    ],
    'predator_nest|feral_pack': [
      { id: 'feral_packmates', weight: 8 },
      { id: 'captured_witnesses', weight: 6 },
      { id: 'bound_sentinels', weight: 2 },
      { id: 'harvested_minds', weight: 4 },
    ],
    'predator_nest|collapsed_infrastructure': [
      { id: 'captured_witnesses', weight: 7 },
      { id: 'feral_packmates', weight: 6 },
      { id: 'bound_sentinels', weight: 2 },
    ],
  },
  topologySpatialProfiles: {
    concentric_sanctum: {
      siteLayer: 'interior',
      visibilityState: 'obstructed',
      transitionType: 'threshold',
      spatialFlags: ['warded-rings', 'ritual-anchors', 'institution_funnel'],
    },
    lure_corridors: {
      siteLayer: 'transition',
      visibilityState: 'obstructed',
      transitionType: 'chokepoint',
      spatialFlags: ['ambush-lanes', 'false-doors', 'institution_funnel'],
    },
    collapsed_cells: {
      siteLayer: 'interior',
      visibilityState: 'exposed',
      transitionType: 'open-approach',
      spatialFlags: ['fall-risk', 'broken-cover'],
    },
  },
}

const PREDATOR_PACKET: PilotSiteGenerationPacket = {
  ...RITUAL_PACKET,
  id: 'predator-stockyard.v1',
  templateIds: ['combat_vampire_nest'],
  purposes: [
    { id: 'predator_nest', weight: 7 },
    { id: 'ritual_complex', weight: 3 },
  ],
}

export const PILOT_SITE_PACKETS: readonly PilotSiteGenerationPacket[] = [
  RITUAL_PACKET,
  PREDATOR_PACKET,
]

const PACKET_BY_TEMPLATE_ID = new Map<string, PilotSiteGenerationPacket>(
  PILOT_SITE_PACKETS.flatMap((packet) => packet.templateIds.map((templateId) => [templateId, packet]))
)

export function getPilotSitePacketForTemplate(templateId: string) {
  return PACKET_BY_TEMPLATE_ID.get(templateId)
}

export function validatePilotSitePacket(packet: PilotSiteGenerationPacket): string[] {
  const errors: string[] = []

  if (packet.purposes.length === 0) {
    errors.push(`${packet.id}: purposes array is empty`)
    return errors
  }

  const purposes = packet.purposes.map((p) => p.id)

  for (const purpose of purposes) {
    if (!packet.buildersByPurpose[purpose]?.length) {
      errors.push(`${packet.id}: missing or empty buildersByPurpose["${purpose}"]`)
    }
    if (!packet.locationsByPurpose[purpose]?.length) {
      errors.push(`${packet.id}: missing or empty locationsByPurpose["${purpose}"]`)
    }
  }

  const allLocations = [
    ...new Set(purposes.flatMap((p) => packet.locationsByPurpose[p]?.map((l) => l.id) ?? [])),
  ]

  for (const purpose of purposes) {
    for (const location of allLocations) {
      const key = `${purpose}|${location}` as const
      if (!packet.ingressByPurposeAndLocation[key]?.length) {
        errors.push(`${packet.id}: missing or empty ingressByPurposeAndLocation["${key}"]`)
      }
    }
  }

  const allIngresses = [
    ...new Set(
      Object.values(packet.ingressByPurposeAndLocation)
        .flat()
        .map((i) => i.id)
    ),
  ]
  const allBuilders = [
    ...new Set(purposes.flatMap((p) => packet.buildersByPurpose[p]?.map((b) => b.id) ?? [])),
  ]

  for (const ingress of allIngresses) {
    for (const builder of allBuilders) {
      const key = `${ingress}|${builder}` as const
      if (!packet.topologyByIngressAndBuilder[key]?.length) {
        errors.push(`${packet.id}: missing or empty topologyByIngressAndBuilder["${key}"]`)
      }
    }
  }

  const allTopologies = [
    ...new Set(
      Object.values(packet.topologyByIngressAndBuilder)
        .flat()
        .map((t) => t.id)
    ),
  ]

  for (const purpose of purposes) {
    for (const topology of allTopologies) {
      const key = `${purpose}|${topology}` as const
      if (!packet.hazardsByPurposeAndTopology[key]?.length) {
        errors.push(`${packet.id}: missing or empty hazardsByPurposeAndTopology["${key}"]`)
      }
    }
  }

  for (const purpose of purposes) {
    for (const location of allLocations) {
      const key = `${purpose}|${location}` as const
      if (!packet.treasureByPurposeAndLocation[key]?.length) {
        errors.push(`${packet.id}: missing or empty treasureByPurposeAndLocation["${key}"]`)
      }
    }
  }

  for (const purpose of purposes) {
    for (const builder of allBuilders) {
      const key = `${purpose}|${builder}` as const
      if (!packet.inhabitantsByPurposeAndBuilder[key]?.length) {
        errors.push(`${packet.id}: missing or empty inhabitantsByPurposeAndBuilder["${key}"]`)
      }
    }
  }

  for (const topology of allTopologies) {
    if (!packet.topologySpatialProfiles[topology]) {
      errors.push(`${packet.id}: missing topologySpatialProfiles["${topology}"]`)
    }
  }

  return errors
}

export function validatePilotSitePacketCatalog(
  packets: readonly PilotSiteGenerationPacket[] = PILOT_SITE_PACKETS
): string[] {
  const errors: string[] = []
  const ownerByTemplateId = new Map<string, string>()

  for (const packet of packets) {
    errors.push(...validatePilotSitePacket(packet))

    if (packet.templateIds.length === 0) {
      errors.push(`${packet.id}: templateIds array is empty`)
    }

    for (const templateId of packet.templateIds) {
      const existingOwner = ownerByTemplateId.get(templateId)
      if (existingOwner && existingOwner !== packet.id) {
        errors.push(
          `duplicate template mapping: "${templateId}" is mapped by both ${existingOwner} and ${packet.id}`
        )
        continue
      }

      ownerByTemplateId.set(templateId, packet.id)
    }
  }

  return errors
}
