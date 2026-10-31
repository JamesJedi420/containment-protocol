import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  ACTOR_TAXONOMY_OWNER,
  DEFAULT_ENTITY_ENCOUNTER_PACKET_REGISTRY,
  ENTITY_ENCOUNTER_PACKET_OWNER,
  ENTITY_ENCOUNTER_PACKET_OWNER_REFERENCES,
  LIVING_PROCESS_SUBSTRATE_OWNER,
  OPERATIONAL_STATUS_REGISTRY_OWNER,
  projectEntityEncounterPacketRecord,
  projectEntityEncounterPacketRegistry,
  validateEntityEncounterPacketRecord,
  validateEntityEncounterPacketRegistry,
  type EntityEncounterPacketRecord,
  type EntityEncounterPacketRegistry,
} from '../domain/entityEncounterStatblockPacket'

function baseRecord(
  overrides: Partial<EntityEncounterPacketRecord> = {}
): EntityEncounterPacketRecord {
  const fixture = DEFAULT_ENTITY_ENCOUNTER_PACKET_REGISTRY.entries[0]
  if (!fixture) throw new Error('baseRecord: default entity encounter fixture is missing')
  return {
    ...fixture,
    id: 'entity-encounter-packet:test-record',
    senseChannels: [...fixture.senseChannels],
    protectionProfile: fixture.protectionProfile.map((entry) => ({ ...entry })),
    immunityProfile: [...fixture.immunityProfile],
    weaknessProfile: [...fixture.weaknessProfile],
    actions: fixture.actions.map((action) => ({
      ...action,
      outcomeRefs: [...action.outcomeRefs],
    })),
    rechargeActions: fixture.rechargeActions.map((action) => ({
      ...action,
      recharge: { ...action.recharge },
    })),
    passiveTraits: fixture.passiveTraits.map((trait) => ({ ...trait })),
    provenance: {
      ...fixture.provenance,
      operationalStatusRefs: [...fixture.provenance.operationalStatusRefs],
      owners: { ...fixture.provenance.owners },
    },
    ...overrides,
  }
}

function issueCodes(record: EntityEncounterPacketRecord) {
  return validateEntityEncounterPacketRecord(record).issues.map((issue) => issue.code)
}

describe('entityEncounterStatblockPacket (SPE-2197 slice 1)', () => {
  it('defines a valid packet with every approved encounter summary field', () => {
    const registry = DEFAULT_ENTITY_ENCOUNTER_PACKET_REGISTRY
    expect(validateEntityEncounterPacketRegistry(registry)).toEqual({ valid: true, issues: [] })

    const packet = registry.entries[0]!
    expect(packet.mobilityBand).toBe('rapid')
    expect(packet.moraleThreshold).toBe(35)
    expect(packet.senseChannels).toEqual(['auditory', 'extrasensory'])
    expect(packet.protectionProfile).toHaveLength(2)
    expect(packet.immunityProfile).toEqual(['chemical'])
    expect(packet.weaknessProfile).toEqual(['informational'])
    expect(packet.actions).toHaveLength(2)
    expect(packet.rechargeActions).toHaveLength(1)
    expect(packet.passiveTraits).toHaveLength(1)
  })

  it('preserves explicit adjacent-owner references without owning their runtime behavior', () => {
    expect(ENTITY_ENCOUNTER_PACKET_OWNER).toBe('SPE-2197')
    expect(ENTITY_ENCOUNTER_PACKET_OWNER_REFERENCES).toEqual({
      actorTaxonomyOwner: ACTOR_TAXONOMY_OWNER,
      substrateSchemaOwner: LIVING_PROCESS_SUBSTRATE_OWNER,
      operationalStatusOwner: OPERATIONAL_STATUS_REGISTRY_OWNER,
    })
    expect(ACTOR_TAXONOMY_OWNER).toBe('SPE-1064')
    expect(LIVING_PROCESS_SUBSTRATE_OWNER).toBe('SPE-1112')
    expect(OPERATIONAL_STATUS_REGISTRY_OWNER).toBe('SPE-2166')
  })

  it('rejects unknown mobility bands, sense channels, and duplicate senses', () => {
    const result = issueCodes(
      baseRecord({
        mobilityBand: 'teleporting' as EntityEncounterPacketRecord['mobilityBand'],
        senseChannels: [
          'visual',
          'visual',
          'clairvoyance',
        ] as EntityEncounterPacketRecord['senseChannels'],
      })
    )
    expect(result).toEqual(
      expect.arrayContaining([
        'invalid_mobility_band',
        'invalid_sense_channel',
        'duplicate_sense_channel',
      ])
    )
  })

  it('rejects morale thresholds outside the authored percentage range', () => {
    expect(issueCodes(baseRecord({ moraleThreshold: -1 }))).toContain('invalid_morale_threshold')
    expect(issueCodes(baseRecord({ moraleThreshold: 101 }))).toContain('invalid_morale_threshold')
    expect(issueCodes(baseRecord({ moraleThreshold: 25.5 }))).toContain('invalid_morale_threshold')
  })

  it('rejects malformed protection profiles and repeated protection channels', () => {
    const result = issueCodes(
      baseRecord({
        protectionProfile: [
          { channel: 'physical', rating: 'limited' },
          { channel: 'physical', rating: 'invulnerable' },
        ] as EntityEncounterPacketRecord['protectionProfile'],
      })
    )
    expect(result).toEqual(
      expect.arrayContaining(['invalid_protection_profile', 'duplicate_protection_channel'])
    )
  })

  it('rejects unknown resistance channels and immunity/weakness contradictions', () => {
    const result = issueCodes(
      baseRecord({
        immunityProfile: ['ritual', 'unknown'] as EntityEncounterPacketRecord['immunityProfile'],
        weaknessProfile: ['ritual'],
      })
    )
    expect(result).toEqual(
      expect.arrayContaining(['invalid_immunity_profile', 'contradictory_resistance_profile'])
    )
  })

  it('rejects malformed and duplicate action definitions', () => {
    const action = baseRecord().actions[0]!
    const result = issueCodes(
      baseRecord({
        actions: [
          action,
          {
            ...action,
            label: ' ',
            outcomeRefs: ['not-namespaced'],
          },
        ],
      })
    )
    expect(result).toEqual(expect.arrayContaining(['invalid_action', 'duplicate_action_id']))
  })

  it('rejects unknown recharge actions and malformed recharge definitions', () => {
    expect(
      validateEntityEncounterPacketRecord(
        baseRecord({
          rechargeActions: [
            {
              actionRef: 'encounter-action:memory-echo',
              recharge: { mode: 'state_reset', resetStateRef: 'state:signal-cleared' },
            },
          ],
        })
      )
    ).toEqual({ valid: true, issues: [] })

    const missingAction = issueCodes(
      baseRecord({
        rechargeActions: [
          {
            actionRef: 'encounter-action:not-present',
            recharge: { mode: 'recovery_interval', recoverySteps: 3 },
          },
        ],
      })
    )
    expect(missingAction).toContain('missing_recharge_action')

    const malformed = issueCodes(
      baseRecord({
        rechargeActions: [
          {
            actionRef: 'encounter-action:memory-echo',
            recharge: {
              mode: 'recovery_interval',
              recoverySteps: 0,
              resetStateRef: 'state:also-present',
            } as unknown as EntityEncounterPacketRecord['rechargeActions'][number]['recharge'],
          },
        ],
      })
    )
    expect(malformed).toContain('invalid_recharge_definition')
  })

  it('rejects malformed and duplicate passive traits', () => {
    const trait = baseRecord().passiveTraits[0]!
    const result = issueCodes(
      baseRecord({
        passiveTraits: [trait, { ...trait, effectRef: 'not-an-effect' }],
      })
    )
    expect(result).toEqual(
      expect.arrayContaining(['invalid_passive_trait', 'duplicate_passive_trait_id'])
    )
  })

  it('allows empty tactical collections when none apply', () => {
    expect(
      validateEntityEncounterPacketRecord(
        baseRecord({
          senseChannels: [],
          protectionProfile: [],
          immunityProfile: [],
          weaknessProfile: [],
          actions: [],
          rechargeActions: [],
          passiveTraits: [],
        })
      )
    ).toEqual({ valid: true, issues: [] })
  })

  it('rejects malformed provenance and displaced owner references', () => {
    const record = baseRecord()
    const result = issueCodes(
      baseRecord({
        provenance: {
          ...record.provenance,
          actorRef: 'missing-namespace',
          operationalStatusRefs: ['operational-status:'],
          owners: {
            ...record.provenance.owners,
            actorTaxonomyOwner: 'SPE-2197',
          } as unknown as EntityEncounterPacketRecord['provenance']['owners'],
        },
      })
    )
    expect(result).toEqual(
      expect.arrayContaining(['invalid_provenance', 'invalid_owner_references'])
    )
  })

  it('rejects duplicate canonical packet ids', () => {
    const duplicate = baseRecord()
    const exact = validateEntityEncounterPacketRegistry({ entries: [duplicate, { ...duplicate }] })
    expect(exact.issues.map((issue) => issue.code)).toContain('duplicate_id')

    const canonical = validateEntityEncounterPacketRegistry({
      entries: [
        baseRecord({ id: ' entity-encounter-packet:canonical-collision ' }),
        baseRecord({ id: 'entity-encounter-packet:canonical-collision' }),
      ],
    })
    expect(canonical.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['untrimmed_reference', 'duplicate_id'])
    )
  })

  it('projects stable deeply frozen fields without mutating the source', () => {
    const source = baseRecord()
    const before = JSON.stringify(source)
    const first = projectEntityEncounterPacketRecord(source)
    const second = projectEntityEncounterPacketRecord(source)

    expect(first).toEqual(second)
    expect(JSON.stringify(source)).toBe(before)
    expect(first.authoredSourceRef).toBe(source.provenance.authoredSourceRef)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.actions)).toBe(true)
    expect(Object.isFrozen(first.actions[0])).toBe(true)
    expect(Object.isFrozen(first.actions[0]?.outcomeRefs)).toBe(true)
    expect(Object.keys(first)).toEqual([
      'id',
      'label',
      'mobilityBand',
      'moraleThreshold',
      'senseChannels',
      'protectionProfile',
      'immunityProfile',
      'weaknessProfile',
      'actions',
      'rechargeActions',
      'passiveTraits',
      'authoredSourceRef',
      'actorRef',
      'substrateProfileRef',
      'operationalStatusRefs',
      'owner',
      'actorTaxonomyOwner',
      'substrateSchemaOwner',
      'operationalStatusOwner',
    ])
  })

  it('fails closed for invalid records and registries', () => {
    expect(
      validateEntityEncounterPacketRecord(
        null as unknown as EntityEncounterPacketRecord
      ).issues.map((issue) => issue.code)
    ).toEqual(['invalid_record'])
    expect(
      validateEntityEncounterPacketRegistry(
        null as unknown as EntityEncounterPacketRegistry
      ).issues.map((issue) => issue.code)
    ).toEqual(['invalid_registry'])
    expect(() =>
      projectEntityEncounterPacketRecord(
        baseRecord({
          mobilityBand: 'invalid' as EntityEncounterPacketRecord['mobilityBand'],
        })
      )
    ).toThrow('invalid entity encounter packet: invalid_mobility_band')
    expect(() =>
      projectEntityEncounterPacketRegistry({ entries: [baseRecord(), baseRecord()] })
    ).toThrow('invalid entity encounter packet registry: duplicate_id')
  })

  it('stays a pure packet without store, UI, persistence, runner, or randomness imports', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/entityEncounterStatblockPacket.ts'),
      'utf8'
    )
    expect(source).not.toMatch(/from ['"].*app\//)
    expect(source).not.toMatch(/from ['"].*components\//)
    expect(source).not.toMatch(/from ['"].*features/)
    expect(source).not.toMatch(/from ['"]react/)
    expect(source).not.toContain('GameState')
    expect(source).not.toContain('advanceWeek')
    expect(source).not.toContain('Math.random')
    expect(source).not.toContain('Date.now')
    expect(source).not.toContain('resolveCombat')
    expect(source).not.toContain('encounterAi')
  })
})
