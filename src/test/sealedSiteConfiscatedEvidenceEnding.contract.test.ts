import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_SCAR_IDS,
  listCampaignScarIds,
  projectCampaignScarDegradedState,
} from '../domain/campaignScarDegradedState'
import {
  listLivingButLostMoraleMemoryKinds,
  projectLivingButLostMoraleMemory,
} from '../domain/livingButLostMoraleMemoryCatalog'
import { projectPostLossAdaptationUnlock } from '../domain/postLossAdaptationUnlock'
import { projectAfterActionCauseChain } from '../domain/afterActionCauseChain'
import {
  SEALED_SITE_CONFISCATED_EVIDENCE_ENDING_KINDS,
  isSealedSiteConfiscatedEvidenceEndingKind,
  isSealedSiteConfiscatedEvidenceOutcomeKind,
  listSealedSiteConfiscatedEvidenceEndingKinds,
  projectSealedSiteConfiscatedEvidenceEnding,
  validateSealedSiteConfiscatedEvidenceEndingInput,
} from '../domain/sealedSiteConfiscatedEvidenceEnding'

describe('SPE-1051 sealed-site / confiscated-evidence ending (slice 6)', () => {
  it('exposes the authored ending kinds and survival_with_clarity_loss outcome', () => {
    expect(listSealedSiteConfiscatedEvidenceEndingKinds()).toEqual([
      'sealed_site',
      'confiscated_evidence',
    ])
    expect(SEALED_SITE_CONFISCATED_EVIDENCE_ENDING_KINDS).toEqual([
      'sealed_site',
      'confiscated_evidence',
    ])
    expect(isSealedSiteConfiscatedEvidenceEndingKind('sealed_site')).toBe(true)
    expect(isSealedSiteConfiscatedEvidenceEndingKind('confiscated_evidence')).toBe(true)
    expect(isSealedSiteConfiscatedEvidenceEndingKind('true_defeat')).toBe(false)
    expect(isSealedSiteConfiscatedEvidenceEndingKind('knowledgeClarityLoss')).toBe(false)
    expect(isSealedSiteConfiscatedEvidenceOutcomeKind('survival_with_clarity_loss')).toBe(true)
    expect(isSealedSiteConfiscatedEvidenceOutcomeKind('game_over')).toBe(false)
    expect(isSealedSiteConfiscatedEvidenceOutcomeKind('true_defeat')).toBe(false)
    expect(isSealedSiteConfiscatedEvidenceOutcomeKind('degraded_survivable')).toBe(false)
  })

  it('AC: sealed_site preserves survival while reducing knowledge recovery and institutional clarity', () => {
    const projection = projectSealedSiteConfiscatedEvidenceEnding({
      endingKind: 'sealed_site',
      siteId: 'black-site-alpha',
    })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.outcomeKind).toBe('survival_with_clarity_loss')
    expect(projection.endingKind).toBe('sealed_site')
    expect(projection.siteId).toBe('black-site-alpha')
    expect(projection.preservesSurvival).toBe(true)
    expect(projection.gameOver).toBe(false)
    expect(projection.trueDefeat).toBe(false)
    expect(projection.entityEliminated).toBe(false)
    expect(projection.knowledgeRecoveryReduced).toBe(true)
    expect(projection.institutionalClarityReduced).toBe(true)
    expect(projection.accessPermanentlyClosed).toBe(true)
    expect(projection.officialUnderstandingIsPartialRecord).toBe(true)
    expect(projection.siteStabilizedByIntervention).toBe(false)
    expect(projection.samplesTelemetryNotesConfiscated).toBe(false)
  })

  it('AC: confiscated_evidence preserves survival while reducing knowledge recovery and institutional clarity', () => {
    const projection = projectSealedSiteConfiscatedEvidenceEnding({
      endingKind: 'confiscated_evidence',
      siteId: 'outpost-7',
    })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.outcomeKind).toBe('survival_with_clarity_loss')
    expect(projection.endingKind).toBe('confiscated_evidence')
    expect(projection.siteId).toBe('outpost-7')
    expect(projection.preservesSurvival).toBe(true)
    expect(projection.gameOver).toBe(false)
    expect(projection.trueDefeat).toBe(false)
    expect(projection.entityEliminated).toBe(false)
    expect(projection.knowledgeRecoveryReduced).toBe(true)
    expect(projection.institutionalClarityReduced).toBe(true)
    expect(projection.accessPermanentlyClosed).toBe(false)
    expect(projection.officialUnderstandingIsPartialRecord).toBe(false)
    expect(projection.siteStabilizedByIntervention).toBe(true)
    expect(projection.samplesTelemetryNotesConfiscated).toBe(true)
  })

  it('projects without siteId when omitted (null site)', () => {
    const sealed = projectSealedSiteConfiscatedEvidenceEnding({ endingKind: 'sealed_site' })
    expect(sealed?.siteId).toBeNull()
    expect(sealed?.outcomeKind).toBe('survival_with_clarity_loss')
    expect(sealed?.knowledgeRecoveryReduced).toBe(true)

    const confiscated = projectSealedSiteConfiscatedEvidenceEnding({
      endingKind: 'confiscated_evidence',
    })
    expect(confiscated?.siteId).toBeNull()
    expect(confiscated?.samplesTelemetryNotesConfiscated).toBe(true)
  })

  it('fail-closes omit, null, undefined, unknown kind, and malformed inputs', () => {
    expect(projectSealedSiteConfiscatedEvidenceEnding(null)).toBeUndefined()
    expect(projectSealedSiteConfiscatedEvidenceEnding(undefined)).toBeUndefined()
    expect(projectSealedSiteConfiscatedEvidenceEnding({} as never)).toBeUndefined()
    expect(
      projectSealedSiteConfiscatedEvidenceEnding({
        endingKind: 'true_defeat' as 'sealed_site',
      })
    ).toBeUndefined()
    expect(
      projectSealedSiteConfiscatedEvidenceEnding({
        endingKind: 'knowledgeClarityLoss' as 'sealed_site',
      })
    ).toBeUndefined()
    expect(
      projectSealedSiteConfiscatedEvidenceEnding({
        endingKind: 'sealed_site',
        siteId: '',
      })
    ).toBeUndefined()
    expect(
      projectSealedSiteConfiscatedEvidenceEnding({
        endingKind: 'sealed_site',
        siteId: 42 as unknown as string,
      })
    ).toBeUndefined()
    expect(
      projectSealedSiteConfiscatedEvidenceEnding({
        endingKind: 'sealed_site',
        siteId: null as unknown as string,
      })
    ).toBeUndefined()
    expect(
      projectSealedSiteConfiscatedEvidenceEnding({
        endingKind: null as unknown as 'sealed_site',
      })
    ).toBeUndefined()
    expect(validateSealedSiteConfiscatedEvidenceEndingInput([])).toBe(false)
    expect(validateSealedSiteConfiscatedEvidenceEndingInput('sealed_site')).toBe(false)
    expect(
      validateSealedSiteConfiscatedEvidenceEndingInput({ endingKind: 'sealed_site' })
    ).toBe(true)
    expect(
      validateSealedSiteConfiscatedEvidenceEndingInput({
        endingKind: 'confiscated_evidence',
        siteId: 'site-a',
      })
    ).toBe(true)
  })

  it('is deterministic for identical ending inputs', () => {
    const input = { endingKind: 'sealed_site' as const, siteId: 'archive-vault' }
    const a = projectSealedSiteConfiscatedEvidenceEnding(input)
    const b = projectSealedSiteConfiscatedEvidenceEnding(input)
    expect(a).toEqual(b)
    expect(a).toEqual({
      outcomeKind: 'survival_with_clarity_loss',
      endingKind: 'sealed_site',
      siteId: 'archive-vault',
      preservesSurvival: true,
      gameOver: false,
      trueDefeat: false,
      entityEliminated: false,
      knowledgeRecoveryReduced: true,
      institutionalClarityReduced: true,
      accessPermanentlyClosed: true,
      officialUnderstandingIsPartialRecord: true,
      siteStabilizedByIntervention: false,
      samplesTelemetryNotesConfiscated: false,
    })

    const confiscatedInput = {
      endingKind: 'confiscated_evidence' as const,
      siteId: 'forward-lab',
    }
    const c = projectSealedSiteConfiscatedEvidenceEnding(confiscatedInput)
    const d = projectSealedSiteConfiscatedEvidenceEnding(confiscatedInput)
    expect(c).toEqual(d)
    expect(c).toEqual({
      outcomeKind: 'survival_with_clarity_loss',
      endingKind: 'confiscated_evidence',
      siteId: 'forward-lab',
      preservesSurvival: true,
      gameOver: false,
      trueDefeat: false,
      entityEliminated: false,
      knowledgeRecoveryReduced: true,
      institutionalClarityReduced: true,
      accessPermanentlyClosed: false,
      officialUnderstandingIsPartialRecord: false,
      siteStabilizedByIntervention: true,
      samplesTelemetryNotesConfiscated: true,
    })
  })

  it('does not erase or rewrite prior SPE-1051 scar, catalog, unlock, or cause-chain projections', () => {
    const scarProjection = projectCampaignScarDegradedState({
      siteDamage: 80,
      priorScarIds: ['site_abandonment_scar'],
      personnelTurnoverCount: 3,
    })
    expect(scarProjection?.firedScarIds).toContain('site_abandonment_scar')
    expect(scarProjection?.outcomeKind).toBe('degraded_survivable')
    // Slice-1 knowledgeClarityLoss remains a numeric scar effect — untouched.
    const siteAbandonmentScar = scarProjection?.activeScars.find(
      (scar) => scar.scarId === 'site_abandonment_scar'
    )
    expect(siteAbandonmentScar?.effects.knowledgeClarityLoss).toBeGreaterThan(0)

    const catalogProjection = projectLivingButLostMoraleMemory({
      effectKind: 'guilt',
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      priorEffectKinds: ['guilt'],
      relatedScarId: 'survivor_trauma_scar',
    })
    expect(catalogProjection?.firedEffectKinds).toEqual(['guilt'])
    expect(catalogProjection?.outcomeKind).toBe('persistent_after_loss')

    const unlock = projectPostLossAdaptationUnlock({
      priorScarIds: scarProjection?.firedScarIds ?? [],
      priorMoraleMemoryKinds: catalogProjection?.firedEffectKinds ?? [],
    })
    expect(unlock?.unlockId).toBe('stricter_access_rules')

    const afterAction = projectAfterActionCauseChain({
      terminalFailureId: 'strained_logistics_collapse',
      priorScarIds: scarProjection?.firedScarIds ?? [],
      priorMoraleMemoryKinds: catalogProjection?.firedEffectKinds ?? [],
    })
    expect(afterAction?.explainsBeyondTerminalResult).toBe(true)
    expect(afterAction?.hiddenDependencyIds.length).toBeGreaterThanOrEqual(1)

    const ending = projectSealedSiteConfiscatedEvidenceEnding({
      endingKind: 'sealed_site',
      siteId: 'abandoned-wing',
    })
    expect(ending?.outcomeKind).toBe('survival_with_clarity_loss')
    expect(ending?.knowledgeRecoveryReduced).toBe(true)

    // Re-project originals after ending — still intact (no shared mutation).
    const scarAgain = projectCampaignScarDegradedState({
      siteDamage: 80,
      priorScarIds: ['site_abandonment_scar'],
      personnelTurnoverCount: 3,
    })
    const catalogAgain = projectLivingButLostMoraleMemory({
      effectKind: 'guilt',
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      priorEffectKinds: ['guilt'],
      relatedScarId: 'survivor_trauma_scar',
    })
    const unlockAgain = projectPostLossAdaptationUnlock({
      priorScarIds: scarProjection?.firedScarIds ?? [],
      priorMoraleMemoryKinds: catalogProjection?.firedEffectKinds ?? [],
    })
    const afterActionAgain = projectAfterActionCauseChain({
      terminalFailureId: 'strained_logistics_collapse',
      priorScarIds: scarProjection?.firedScarIds ?? [],
      priorMoraleMemoryKinds: catalogProjection?.firedEffectKinds ?? [],
    })
    expect(scarAgain).toEqual(scarProjection)
    expect(catalogAgain).toEqual(catalogProjection)
    expect(unlockAgain).toEqual(unlock)
    expect(afterActionAgain).toEqual(afterAction)

    expect(listCampaignScarIds()).toEqual([...CAMPAIGN_SCAR_IDS])
    expect(listLivingButLostMoraleMemoryKinds()).toEqual([
      'guilt',
      'distrust',
      'refusal',
      'protective_custody',
    ])
  })
})
