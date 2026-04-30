import { describe, expect, it } from 'vitest'
import {
  createCompactRegionPacket,
  hasInternalConflictAndExternalPressure,
  linkRegionFactions,
  surfaceRegionObjectives,
  type RegionPacketInput,
} from '../domain/regionPackets'

function makeRegionInput(): RegionPacketInput {
  return {
    regionId: 'region:chalk-estuary',
    label: 'Chalk Estuary Corridor',
    factions: [
      {
        factionId: 'faction:harbor-council',
        label: 'Harbor Council',
        alignment: 'cooperative',
        rivalFactionIds: ['faction:riverside-compact'],
      },
      {
        factionId: 'faction:riverside-compact',
        label: 'Riverside Compact',
        alignment: 'competitive',
        rivalFactionIds: ['faction:harbor-council'],
      },
      {
        factionId: 'faction:quarry-syndicate',
        label: 'Quarry Syndicate',
        alignment: 'hostile',
      },
    ],
    externalPressure: {
      actorId: 'pressure:ashen-fleet',
      label: 'Ashen Fleet Infiltration',
      pressureType: 'subversion',
      severity: 'high',
      targetFactionIds: ['faction:harbor-council', 'faction:riverside-compact'],
    },
    supraFactionOrder: {
      orderId: 'order:lantern-response',
      label: 'Lantern Response Accord',
      doctrine: 'civil_protection',
      memberFactionIds: ['faction:harbor-council', 'faction:riverside-compact'],
    },
    keyNpcs: [
      {
        npcId: 'npc:warden-lyra',
        name: 'Warden Lyra Kest',
        role: 'leader',
        affiliatedFactionId: 'faction:harbor-council',
      },
      {
        npcId: 'npc:scribe-marrow',
        name: 'Scribe Marrow',
        role: 'liaison',
        affiliatedOrderId: 'order:lantern-response',
      },
      {
        npcId: 'npc:dock-doctor-rin',
        name: 'Doctor Rin Vale',
        role: 'specialist',
        affiliatedFactionId: 'faction:riverside-compact',
      },
    ],
    threatPool: [
      {
        threatId: 'threat:brackish-chorus',
        label: 'Brackish Chorus',
        category: 'cult',
        districtTokens: ['district:floodplain', 'district:old-docks'],
      },
      {
        threatId: 'threat:quarry-ghast',
        label: 'Quarry Ghast',
        category: 'cryptid',
        districtTokens: ['district:quarry-belt'],
      },
      {
        threatId: 'threat:salt-ash-fallout',
        label: 'Salt-Ash Fallout',
        category: 'anomalous_hazard',
      },
    ],
    objectives: [
      {
        artifactId: 'artifact:keel-seal',
        label: 'Keel Seal Reliquary',
        objectiveHook: 'Recover before fleet couriers break estuary wards.',
        linkedThreatIds: ['threat:brackish-chorus', 'threat:salt-ash-fallout', 'threat:brackish-chorus'],
      },
      {
        artifactId: 'artifact:quarry-bell',
        label: 'Quarry Bell of Saint Brine',
        objectiveHook: 'Secure to suppress quarry resonance windows.',
        linkedThreatIds: ['threat:quarry-ghast'],
      },
    ],
    districtEcologyTokens: ['district:floodplain', 'district:old-docks', 'district:quarry-belt'],
  }
}

describe('regionPackets', () => {
  it('loads a compact region packet with factions, pressure actor, order, npcs, threats, and objectives', () => {
    const packet = createCompactRegionPacket(makeRegionInput())

    expect(packet.regionId).toBe('region:chalk-estuary')
    expect(packet.factions).toHaveLength(3)
    expect(packet.externalPressure.actorId).toBe('pressure:ashen-fleet')
    expect(packet.supraFactionOrder.orderId).toBe('order:lantern-response')
    expect(packet.keyNpcs).toHaveLength(3)
    expect(packet.threatPool).toHaveLength(3)
    expect(packet.objectives).toHaveLength(2)
  })

  it('links internal faction conflict and external pressure targets deterministically', () => {
    const packet = createCompactRegionPacket(makeRegionInput())
    const links = linkRegionFactions(packet)

    expect(links).toEqual([
      {
        factionId: 'faction:harbor-council',
        rivalFactionIds: ['faction:riverside-compact'],
        externalPressureTargeted: true,
        memberOfSupraOrder: true,
      },
      {
        factionId: 'faction:quarry-syndicate',
        rivalFactionIds: [],
        externalPressureTargeted: false,
        memberOfSupraOrder: false,
      },
      {
        factionId: 'faction:riverside-compact',
        rivalFactionIds: ['faction:harbor-council'],
        externalPressureTargeted: true,
        memberOfSupraOrder: true,
      },
    ])
    expect(hasInternalConflictAndExternalPressure(packet)).toBe(true)
  })

  it('surfaces objective artifacts with linked threat labels', () => {
    const packet = createCompactRegionPacket(makeRegionInput())
    const objectives = surfaceRegionObjectives(packet)

    expect(objectives).toEqual([
      {
        artifactId: 'artifact:keel-seal',
        label: 'Keel Seal Reliquary',
        objectiveHook: 'Recover before fleet couriers break estuary wards.',
        linkedThreatLabels: ['Brackish Chorus', 'Salt-Ash Fallout'],
      },
      {
        artifactId: 'artifact:quarry-bell',
        label: 'Quarry Bell of Saint Brine',
        objectiveHook: 'Secure to suppress quarry resonance windows.',
        linkedThreatLabels: ['Quarry Ghast'],
      },
    ])
  })

  it('is repeatable for identical packet input', () => {
    const first = createCompactRegionPacket(makeRegionInput())
    const second = createCompactRegionPacket(makeRegionInput())

    expect(second).toEqual(first)
    expect(linkRegionFactions(second)).toEqual(linkRegionFactions(first))
    expect(surfaceRegionObjectives(second)).toEqual(surfaceRegionObjectives(first))
  })
})
