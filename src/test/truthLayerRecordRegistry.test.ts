import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import type { AuthoritySourceConfidence } from '../domain/authorityGraph'
import type { KnowledgeTier } from '../domain/knowledge'
import {
  ACTOR_TRUTH_LAYER_FIXTURE,
  COMPETING_LAYER_ROLES,
  COMPETING_TRUTH_LAYERS_FIXTURE,
  INSTITUTIONAL_ATTRIBUTIONS,
  TRUTH_LAYER_SUBJECT_KINDS,
  isInstitutionalAttribution,
  isTruthLayerKnowledgeTier,
  isTruthLayerSourceConfidence,
  listInstitutionAttributedModelsForSubject,
  projectTruthLayerOpsView,
  projectTruthLayerReviewView,
  resolveSimulationAuthorityForSubject,
  sanitizeTruthLayerRecords,
  validateTruthLayerRecord,
  type TruthLayerRecord,
} from '../domain/truthLayerRecordRegistry'

function baseRecord(overrides: Partial<TruthLayerRecord> = {}): TruthLayerRecord {
  return {
    id: 'truth:test-base',
    label: 'Test base record',
    subjectRef: 'event:test-incident',
    subjectKind: 'event',
    claim: { narrative: 'Public claim narrative.' },
    doctrine: { narrative: 'Institutional doctrine narrative.' },
    verification: { narrative: 'Field verification narrative.' },
    ...overrides,
  }
}

describe('truthLayerRecordRegistry (SPE-1343 slice 1)', () => {
  it('validates fixture with competing truth layers on one site event', () => {
    const result = validateTruthLayerRecord(COMPETING_TRUTH_LAYERS_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(COMPETING_TRUTH_LAYERS_FIXTURE.competingLayers).toHaveLength(2)
    expect(COMPETING_TRUTH_LAYERS_FIXTURE.subjectKind).toBe('site')
    expect(COMPETING_TRUTH_LAYERS_FIXTURE.claim.narrative).not.toBe(
      COMPETING_TRUTH_LAYERS_FIXTURE.verification.narrative
    )
  })

  it('round-trips claim, doctrine, and verification slots separately', () => {
    const result = validateTruthLayerRecord(ACTOR_TRUTH_LAYER_FIXTURE)

    expect(result.valid).toBe(true)
    expect(ACTOR_TRUTH_LAYER_FIXTURE.claim.narrative).toMatch(/asserts routine industrial oversight/)
    expect(ACTOR_TRUTH_LAYER_FIXTURE.doctrine.narrative).toMatch(/liaison requests/)
    expect(ACTOR_TRUTH_LAYER_FIXTURE.verification.narrative).toMatch(/sealed briefing materials/)
    expect(ACTOR_TRUTH_LAYER_FIXTURE.claim.sourceConfidence).toBe('public_cover')
    expect(ACTOR_TRUTH_LAYER_FIXTURE.doctrine.knowledgeTier).toBe('observed')
    expect(ACTOR_TRUTH_LAYER_FIXTURE.verification.evidenceRef).toMatch(/^log:/)
  })

  it('projects separate review surfaces without collapsing layers', () => {
    const projection = projectTruthLayerReviewView(COMPETING_TRUTH_LAYERS_FIXTURE)

    expect(projection.layerDivergence).toBe(true)
    expect(projection.claim.narrative).toMatch(/solvent leak/)
    expect(projection.doctrine.narrative).toMatch(/sub-basement wing/)
    expect(projection.verification.narrative).toMatch(/secondary seal/)
    expect(projection.competingLayerCount).toBe(2)
    expect(projection.mythInfrastructureActive).toBe(true)
    expect(projection.correctionPressure).toBe(0.62)
  })

  it('errors on franchise token in record label', () => {
    const result = validateTruthLayerRecord(
      baseRecord({
        label: 'Foundation cover narrative review',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('errors on franchise token in claim narrative', () => {
    const result = validateTruthLayerRecord(
      baseRecord({
        claim: { narrative: 'SCP containment breach reported in local press.' },
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_field')).toBe(true)
  })

  it('warns when claim and verification narratives collapse to the same text', () => {
    const result = validateTruthLayerRecord(
      baseRecord({
        claim: { narrative: 'Identical narrative text.' },
        doctrine: { narrative: 'Different doctrine narrative.' },
        verification: { narrative: 'Identical narrative text.' },
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'collapsed_claim_and_verification',
        severity: 'warning',
      }),
    ])
  })

  it('warns when verification is marked verified without evidenceRef', () => {
    const result = validateTruthLayerRecord(
      baseRecord({
        verification: {
          narrative: 'Verified field narrative without evidence ref.',
          sourceConfidence: 'verified',
        },
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'verified_without_evidence_ref',
        severity: 'warning',
      }),
    ])
  })

  it('round-trips subject kind and competing layer role unions on validation', () => {
    const record = baseRecord({
      subjectKind: 'actor',
      competingLayers: COMPETING_LAYER_ROLES.map((layerRole, index) => ({
        recordRef: `truth:competing-${index}`,
        layerRole,
      })),
    })

    const result = validateTruthLayerRecord(record)

    expect(result.valid).toBe(true)
    expect(TRUTH_LAYER_SUBJECT_KINDS).toContain(record.subjectKind)
    expect(record.competingLayers).toHaveLength(COMPETING_LAYER_ROLES.length)
  })

  it('validates untrusted payloads without throwing when fields are missing or nullish', () => {
    const result = validateTruthLayerRecord({} as TruthLayerRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'empty_claim_narrative',
        'empty_doctrine_narrative',
        'empty_verification_narrative',
        'invalid_subject_kind',
        'missing_id',
        'missing_label',
        'missing_subject_ref',
      ].sort()
    )
  })

  it('projects review view with policy redaction on individual layer slots', () => {
    const record = baseRecord({
      redactedFields: ['claim.narrative', 'verification.sourceConfidence'],
      unknownFields: ['doctrine.summary'],
      doctrine: {
        narrative: 'Doctrine narrative with hidden summary.',
        summary: 'Hidden doctrine summary.',
      },
      verification: {
        narrative: 'Verification narrative.',
        sourceConfidence: 'verified',
        evidenceRef: 'report:test',
      },
    })

    const projection = projectTruthLayerReviewView(record, { redactUnknown: true })

    expect(projection.claim.narrative).toBeNull()
    expect(projection.claim.redacted).toBe(true)
    expect(projection.doctrine.summary).toBeNull()
    expect(projection.verification.sourceConfidence).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('produces byte-stable validation output on repeated runs', () => {
    const record = baseRecord({
      correctionPressure: 0.44,
      mythInfrastructureWeight: 0.51,
      competingLayers: [
        { recordRef: 'truth:parallel-cover', layerRole: 'cover_narrative' },
      ],
    })

    const first = JSON.stringify(validateTruthLayerRecord(record))
    const second = JSON.stringify(validateTruthLayerRecord(record))

    expect(first).toBe(second)
  })
})

describe('truthLayerRecordRegistry persistence (SPE-1343 slice 2)', () => {
  it('defaults starting state to an empty truth-layer map', () => {
    expect(createStartingState().truthLayerRecords).toEqual({})
  })

  it('reuses AuthoritySourceConfidence and KnowledgeTier at runtime on hydrated slots', () => {
    const claimConfidence = COMPETING_TRUTH_LAYERS_FIXTURE.claim.sourceConfidence
    const doctrineTier = COMPETING_TRUTH_LAYERS_FIXTURE.doctrine.knowledgeTier

    expect(claimConfidence).toBeDefined()
    expect(doctrineTier).toBeDefined()
    expect(isTruthLayerSourceConfidence(claimConfidence as string)).toBe(true)
    expect(isTruthLayerKnowledgeTier(doctrineTier as string)).toBe(true)

    const confidence: AuthoritySourceConfidence = claimConfidence as AuthoritySourceConfidence
    const tier: KnowledgeTier = doctrineTier as KnowledgeTier

    expect(confidence).toBe('public_cover')
    expect(tier).toBe('observed')
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeTruthLayerRecords(
      {
        valid: COMPETING_TRUTH_LAYERS_FIXTURE,
        actor: ACTOR_TRUTH_LAYER_FIXTURE,
        'wrong-key': {
          ...COMPETING_TRUTH_LAYERS_FIXTURE,
          id: 'truth:regional-oversight-commissioner',
        },
        duplicate: {
          ...COMPETING_TRUTH_LAYERS_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          subjectRef: 'event:test',
          subjectKind: 'event',
          claim: { narrative: 'claim' },
          doctrine: { narrative: 'doctrine' },
          verification: { narrative: 'verification' },
        },
        franchiseLabel: {
          id: 'truth:franchise',
          label: 'Foundation cover narrative review',
          subjectRef: 'event:test',
          subjectKind: 'event',
          claim: { narrative: 'Public claim narrative.' },
          doctrine: { narrative: 'Institutional doctrine narrative.' },
          verification: { narrative: 'Field verification narrative.' },
        },
        invalidConfidence: {
          id: 'truth:invalid-confidence',
          label: 'Invalid source confidence',
          subjectRef: 'event:test',
          subjectKind: 'event',
          claim: { narrative: 'Public claim narrative.', sourceConfidence: 'not_a_level' },
          doctrine: { narrative: 'Institutional doctrine narrative.' },
          verification: { narrative: 'Field verification narrative.' },
        },
        invalidTier: {
          id: 'truth:invalid-tier',
          label: 'Invalid knowledge tier',
          subjectRef: 'event:test',
          subjectKind: 'event',
          claim: { narrative: 'Public claim narrative.' },
          doctrine: { narrative: 'Institutional doctrine narrative.', knowledgeTier: 'not_a_tier' },
          verification: { narrative: 'Field verification narrative.' },
        },
      },
      fallback
    )

    expect(sanitized['truth:coastal-research-campus-incident']).toEqual(
      COMPETING_TRUTH_LAYERS_FIXTURE
    )
    expect(sanitized['truth:regional-oversight-commissioner']).toEqual(ACTOR_TRUTH_LAYER_FIXTURE)
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized['truth:invalid-confidence']?.claim.sourceConfidence).toBeUndefined()
    expect(sanitized['truth:invalid-confidence']?.claim.narrative).toBe('Public claim narrative.')
    expect(sanitized['truth:invalid-tier']?.doctrine.knowledgeTier).toBeUndefined()
    expect(sanitized['truth:invalid-tier']?.doctrine.narrative).toBe(
      'Institutional doctrine narrative.'
    )
    expect(Object.keys(sanitized).sort()).toEqual([
      'truth:coastal-research-campus-incident',
      'truth:invalid-confidence',
      'truth:invalid-tier',
      'truth:regional-oversight-commissioner',
    ])
  })

  it('round-trips fixture records with nested arrays byte-stable through save/load', () => {
    const state = createStartingState()
    state.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.truthLayerRecords).toEqual(state.truthLayerRecords)
    expect(
      loaded.truthLayerRecords?.[COMPETING_TRUTH_LAYERS_FIXTURE.id]?.competingLayers
    ).toEqual(COMPETING_TRUTH_LAYERS_FIXTURE.competingLayers)
    expect(loaded.truthLayerRecords?.[COMPETING_TRUTH_LAYERS_FIXTURE.id]?.claim).toEqual(
      COMPETING_TRUTH_LAYERS_FIXTURE.claim
    )
    expect(loaded.truthLayerRecords?.[ACTOR_TRUTH_LAYER_FIXTURE.id]?.verification).toEqual(
      ACTOR_TRUTH_LAYER_FIXTURE.verification
    )
  })

  it('hydrates persisted truth-layer records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        truthLayerRecords: {
          [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
          invalid: {
            id: 'truth:invalid',
            label: 'Foundation cover narrative review',
            subjectRef: 'event:test',
            subjectKind: 'event',
            claim: { narrative: 'Public claim narrative.' },
            doctrine: { narrative: 'Institutional doctrine narrative.' },
            verification: { narrative: 'Field verification narrative.' },
          },
        },
      },
      fallback
    )

    expect(hydrated.truthLayerRecords).toEqual({
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    })
  })
})

describe('truthLayerRecordRegistry weekly snapshots (SPE-1343 slice 3)', () => {
  it('defaults starting state to an empty weekly projection snapshot map', () => {
    expect(createStartingState().truthLayerWeeklyProjectionSnapshots).toEqual({})
  })

  it('round-trips weekly ops projection snapshots through save/load', () => {
    const state = createStartingState()
    state.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
    }
    state.truthLayerWeeklyProjectionSnapshots = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: {
        recordId: COMPETING_TRUTH_LAYERS_FIXTURE.id,
        week: 12,
        ops: projectTruthLayerOpsView(COMPETING_TRUTH_LAYERS_FIXTURE),
      },
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.truthLayerWeeklyProjectionSnapshots).toEqual(
      state.truthLayerWeeklyProjectionSnapshots
    )
    expect(
      loaded.truthLayerWeeklyProjectionSnapshots?.[COMPETING_TRUTH_LAYERS_FIXTURE.id]?.ops
        .mythInfrastructureActive
    ).toBe(true)
  })
})

describe('SPE-2264 institution-attributed truth-layer extension', () => {
  it('keeps agency and faction models independently inspectable for one subject', () => {
    const agency = baseRecord({
      id: 'truth:agency-model',
      subjectRef: 'event:harbor-flare',
      institutionalAttribution: 'agency',
      simulationAuthorityRef: 'truth:sim-authority',
      claim: {
        narrative: 'Agency model: industrial flare.',
        sourceConfidence: 'probable' as AuthoritySourceConfidence,
        knowledgeTier: 'observed' as KnowledgeTier,
      },
    })
    const faction = baseRecord({
      id: 'truth:faction-model',
      subjectRef: 'event:harbor-flare',
      institutionalAttribution: 'faction',
      simulationAuthorityRef: 'truth:sim-authority',
      claim: {
        narrative: 'Faction model: ritual omen.',
        sourceConfidence: 'rumor' as AuthoritySourceConfidence,
        knowledgeTier: 'suspected' as KnowledgeTier,
      },
    })
    const simulation = baseRecord({
      id: 'truth:sim-authority',
      subjectRef: 'event:harbor-flare',
      institutionalAttribution: 'simulation',
      claim: { narrative: 'Simulation: anomalous discharge at pier 7.' },
      verification: {
        narrative: 'Simulation verification sealed.',
        evidenceRef: 'log:sim-harbor',
        sourceConfidence: 'verified' as AuthoritySourceConfidence,
      },
    })

    expect(validateTruthLayerRecord(agency).valid).toBe(true)
    expect(validateTruthLayerRecord(faction).valid).toBe(true)
    expect(validateTruthLayerRecord(simulation).valid).toBe(true)

    const map = {
      [agency.id]: agency,
      [faction.id]: faction,
      [simulation.id]: simulation,
    }
    const models = listInstitutionAttributedModelsForSubject(map, 'event:harbor-flare')
    expect(models.map((r) => r.institutionalAttribution)).toEqual([
      'agency',
      'faction',
      'simulation',
    ])
    expect(agency.claim.narrative).not.toBe(faction.claim.narrative)

    const authority = resolveSimulationAuthorityForSubject(map, 'event:harbor-flare')
    expect(authority.ok).toBe(true)
    if (!authority.ok) return
    expect(authority.record?.id).toBe('truth:sim-authority')
  })

  it('rejects duplicate simulation authorities for one subject', () => {
    const a = baseRecord({
      id: 'truth:sim-a',
      subjectRef: 'site:dock',
      institutionalAttribution: 'simulation',
    })
    const b = baseRecord({
      id: 'truth:sim-b',
      subjectRef: 'site:dock',
      institutionalAttribution: 'simulation',
    })
    const result = resolveSimulationAuthorityForSubject(
      { [a.id]: a, [b.id]: b },
      'site:dock',
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('duplicate_simulation_authority')
  })

  it('hydrates legacy records without attribution and drops invalid attribution tokens', () => {
    const legacy = sanitizeTruthLayerRecords({
      'truth:legacy': {
        id: 'truth:legacy',
        label: 'Legacy record',
        subjectRef: 'event:legacy',
        subjectKind: 'event',
        claim: { narrative: 'Legacy claim.' },
        doctrine: { narrative: 'Legacy doctrine.' },
        verification: { narrative: 'Legacy verification.' },
      },
      'truth:bad-attr': {
        id: 'truth:bad-attr',
        label: 'Bad attribution',
        subjectRef: 'event:legacy',
        subjectKind: 'event',
        claim: { narrative: 'Claim.' },
        doctrine: { narrative: 'Doctrine.' },
        verification: { narrative: 'Verification.' },
        institutionalAttribution: 'not-a-real-attribution',
      },
    })

    expect(legacy['truth:legacy']?.institutionalAttribution).toBeUndefined()
    expect(legacy['truth:bad-attr']?.institutionalAttribution).toBeUndefined()
    expect(INSTITUTIONAL_ATTRIBUTIONS.every(isInstitutionalAttribution)).toBe(true)
  })

  it('does not leak simulation narrative through ordinary review projection of an agency model', () => {
    const agency = baseRecord({
      id: 'truth:agency-only',
      subjectRef: 'event:sealed',
      institutionalAttribution: 'agency',
      simulationAuthorityRef: 'truth:hidden-sim',
      claim: { narrative: 'Agency-facing claim only.' },
    })
    const hidden = baseRecord({
      id: 'truth:hidden-sim',
      subjectRef: 'event:sealed',
      institutionalAttribution: 'simulation',
      claim: { narrative: 'HIDDEN simulation truth must not appear in agency review.' },
      verification: {
        narrative: 'Hidden verification.',
        evidenceRef: 'log:hidden',
      },
    })

    const review = projectTruthLayerReviewView(agency)
    expect(review.claim.narrative).toBe('Agency-facing claim only.')
    expect(JSON.stringify(review)).not.toContain('HIDDEN simulation truth')
    expect(JSON.stringify(projectTruthLayerOpsView(agency))).not.toContain(
      'HIDDEN simulation truth',
    )
    expect(resolveSimulationAuthorityForSubject(
      { [agency.id]: agency, [hidden.id]: hidden },
      'event:sealed',
    ).ok).toBe(true)
  })
})
