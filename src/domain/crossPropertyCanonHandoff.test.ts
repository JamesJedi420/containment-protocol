import { describe, expect, it } from 'vitest'
import {
  attemptEstablishedPromotion,
  FIXTURE_CANON_RULE,
  FIXTURE_DISPUTED,
  FIXTURE_ESTABLISHED_FACT,
  FIXTURE_FICTIONALIZED_SOURCE_SEPARATION,
  FIXTURE_RESEARCH_WITHOUT_ADMISSION,
  FIXTURE_SAME_NAME_DIFFERENT_ENTITIES,
  FIXTURE_SUPERSESSION,
  FIXTURE_UNRESOLVED_NEGATIVE_SPACE,
  handGovernedReferencesToIntegrityBoundary,
  projectHandoffToHistoricalContinuity,
  projectHandoffToNonCampaignTransport,
  projectInstitutionalInterpretation,
  validateCrossPropertyCanonHandoff,
} from './crossPropertyCanonHandoff'

describe('SPE-3282 cross-property canon handoff', () => {
  it('promotes one established Dead Air fact with source, authority, chronology, and metadata', () => {
    const result = validateCrossPropertyCanonHandoff(FIXTURE_ESTABLISHED_FACT, {
      buildRelease: true,
      releaseLabel: 'blackwood',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.dispositions['rec.established.1']).toBe('promote_established')
    expect(result.packet.records[0]?.source.namedElementRegistryId).toBe('REG-001')
    expect(result.packet.records[0]?.entity?.sharedEntityId).toBe('su.entity.1')
    expect(result.packet.records[0]?.entity?.sharedEntityId).not.toBe('REG-001')
    expect(result.release?.orderedMemberRecordIds).toEqual(['rec.established.1'])
    expect(result.release?.releaseId).toContain('su.release.blackwood')
  })

  it('fails established promotion for unresolved and negative-space while keeping packet representable', () => {
    const packetResult = validateCrossPropertyCanonHandoff(FIXTURE_UNRESOLVED_NEGATIVE_SPACE)
    expect(packetResult.ok).toBe(true)
    if (!packetResult.ok) return
    expect(packetResult.dispositions['rec.unresolved.1']).toBe('retain_unresolved')
    expect(packetResult.dispositions['rec.negative.1']).toBe('retain_unresolved')

    const unresolved = attemptEstablishedPromotion(
      FIXTURE_UNRESOLVED_NEGATIVE_SPACE.records[0]!,
    )
    expect(unresolved.ok).toBe(false)
    expect(unresolved.diagnostics[0]?.code).toBe('unresolved_cannot_promote_established')

    const negative = attemptEstablishedPromotion(
      FIXTURE_UNRESOLVED_NEGATIVE_SPACE.records[1]!,
    )
    expect(negative.ok).toBe(false)
    expect(negative.diagnostics[0]?.code).toBe('negative_space_cannot_promote_established')
    expect(FIXTURE_UNRESOLVED_NEGATIVE_SPACE.records[1]?.relations?.[0]?.kind).toBe(
      'not_established_as_trigger',
    )
  })

  it('preserves disputed state rather than collapsing to a single authoritative claim', () => {
    const result = validateCrossPropertyCanonHandoff(FIXTURE_DISPUTED)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.dispositions['rec.disputed.1']).toBe('retain_disputed')
    const attempt = attemptEstablishedPromotion(FIXTURE_DISPUTED.records[0]!)
    expect(attempt.ok).toBe(false)
    expect(attempt.diagnostics[0]?.code).toBe('disputed_cannot_promote_established')
  })

  it('preserves prior promoted record and links rename supersession deterministically', () => {
    const result = validateCrossPropertyCanonHandoff(FIXTURE_SUPERSESSION, {
      buildRelease: true,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.dispositions['rec.replacement.1']).toBe('supersede_prior')
    expect(result.packet.retainedPriorRecords?.[0]?.recordId).toBe('rec.prior.1')
    expect(result.packet.retainedPriorRecords?.[0]?.entity?.sharedEntityId).toBe(
      result.packet.records[0]?.entity?.sharedEntityId,
    )
    expect(result.packet.records[0]?.source.renameAuditRef).toBe('REN-001')
  })

  it('consumes accepted packet via SPE-3175 non-campaign transport seam', () => {
    const result = validateCrossPropertyCanonHandoff(FIXTURE_ESTABLISHED_FACT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const transport = projectHandoffToNonCampaignTransport(result.packet)
    expect(transport.transportOwner).toBe('SPE-3175')
    expect(transport.campaignGameStateOwned).toBe(false)
    expect(transport.recordIds).toEqual(['rec.established.1'])
  })

  it('projects historical item toward SPE-2099/SPE-1032 retaining authority and uncertainty', () => {
    const projection = projectHandoffToHistoricalContinuity(
      FIXTURE_UNRESOLVED_NEGATIVE_SPACE.records[0]!,
    )
    expect(projection.projectionOwner).toBe('SPE-2099')
    expect(projection.claimStatus).toBe('unresolved')
    expect(projection.uncertaintyPreserved).toBe(true)
    expect(projection.sourceAuthority).toBe('DA-CASE-002')
  })

  it('allows institutional interpretation to differ without mutating promoted canon', () => {
    const record = FIXTURE_ESTABLISHED_FACT.records[0]!
    const interpretation = projectInstitutionalInterpretation(
      record,
      'Public brochure claims Blackwood is a civic landmark only.',
    )
    expect(interpretation.differsFromPromotedCanon).toBe(true)
    expect(interpretation.promotedRecordId).toBe(record.recordId)
    expect(record.summary).toContain('Blackwood Academy exists')
  })

  it('references SPE-2263 canon-rule path for a genuinely reusable rule', () => {
    const result = validateCrossPropertyCanonHandoff(FIXTURE_CANON_RULE, {
      buildRelease: true,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.records[0]?.canonRuleTokenRef).toBe(
      'spe-2263:token.mirror-bleed',
    )
    expect(result.packet.records[0]?.permittedUseClasses).toContain('canon_rule_token')
  })

  it('hands governed references to SPE-3139 integrity boundary', () => {
    const handed = handGovernedReferencesToIntegrityBoundary(
      FIXTURE_ESTABLISHED_FACT.records[0]!,
    )
    expect(handed.integrityOwner).toBe('SPE-3139')
    expect(handed.refs).toEqual(['REG-001', 'src:da:001'])
  })

  it('rejects research/workflow artifacts without Dead Air canon admission', () => {
    const result = validateCrossPropertyCanonHandoff(FIXTURE_RESEARCH_WITHOUT_ADMISSION)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'research_artifact_lacks_canon_admission')).toBe(
      true,
    )
  })

  it('keeps same-name entities as distinct shared identities', () => {
    const result = validateCrossPropertyCanonHandoff(FIXTURE_SAME_NAME_DIFFERENT_ENTITIES, {
      buildRelease: true,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const ids = result.packet.records.map((r) => r.entity?.sharedEntityId)
    expect(ids).toEqual(['su.entity.10', 'su.entity.11'])
    expect(result.packet.records[0]?.entity?.naming.approvedName).toBe(
      result.packet.records[1]?.entity?.naming.approvedName,
    )
  })

  it('separates fictional shared identity from real/source provenance identity', () => {
    const result = validateCrossPropertyCanonHandoff(
      FIXTURE_FICTIONALIZED_SOURCE_SEPARATION,
      { buildRelease: true },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const entity = result.packet.records[0]?.entity
    expect(entity?.sharedEntityId).toBe('su.entity.20')
    expect(entity?.sourceProvenanceEntityId).toBe('su.entity.source.20')
    expect(result.packet.records[0]?.relations?.map((r) => r.kind).sort()).toEqual([
      'not_alias_of',
      'source_basis_of',
    ])
  })

  it('produces byte-stable diagnostics and release membership on repeated validation', () => {
    const first = validateCrossPropertyCanonHandoff(FIXTURE_ESTABLISHED_FACT, {
      buildRelease: true,
      releaseLabel: 'stable',
    })
    const second = validateCrossPropertyCanonHandoff(FIXTURE_ESTABLISHED_FACT, {
      buildRelease: true,
      releaseLabel: 'stable',
    })
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('fails release construction when no established members exist', () => {
    const result = validateCrossPropertyCanonHandoff(FIXTURE_DISPUTED, {
      buildRelease: true,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'missing_release_member')).toBe(true)
  })
})
