import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  AGENCY_ESTABLISHMENT_BEAT_IDS,
  AGENCY_ESTABLISHMENT_HANDOFF_TOKEN,
  AGENCY_ESTABLISHMENT_ROLE_FRAMING_TOKEN,
  buildAgencyEstablishmentProjection,
} from '../domain/agencyEstablishmentProjection'

describe('agency establishment projection', () => {
  it('returns the canonical seven beats in order without mutating production state', () => {
    const game = createStartingState()
    const before = structuredClone(game)

    const projection = buildAgencyEstablishmentProjection(game)

    expect(projection.beats.map((beat) => beat.id)).toEqual(AGENCY_ESTABLISHMENT_BEAT_IDS)
    expect(projection.beats.map((beat) => beat.order)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(projection.commandIdentity.roleFramingToken).toBe(
      AGENCY_ESTABLISHMENT_ROLE_FRAMING_TOKEN
    )
    expect(projection.activation.nextStepToken).toBe(AGENCY_ESTABLISHMENT_HANDOFF_TOKEN)
    expect(game).toEqual(before)
    expect(Object.isFrozen(projection)).toBe(true)
    expect(Object.isFrozen(projection.beats)).toBe(true)
  })

  it('projects campaign identity and location from the canonical campaign ledger', () => {
    const game = createStartingState()
    game.campaignLedger = {
      ...game.campaignLedger,
      profile: {
        ...game.campaignLedger.profile,
        organizationName: 'Field Authority Seven',
        homeBaseId: 'test_home',
        homeBaseLabel: 'Test Command Annex',
        operationalRegionId: 'test_region',
        operationalRegionLabel: 'Test Region',
        majorHookSummary: 'A changed authoritative hook.',
        doctrineLabel: 'A changed authoritative doctrine.',
        toneScopeLabel: 'A changed tone anchor.',
      },
      activeRulesProfileId: 'baseline-standard',
      activeRulesProfileLabel: 'Baseline standard containment',
    }

    const projection = buildAgencyEstablishmentProjection(game)

    expect(projection.doctrine).toMatchObject({
      organizationName: 'Field Authority Seven',
      majorHookSummary: 'A changed authoritative hook.',
      doctrineLabel: 'A changed authoritative doctrine.',
    })
    expect(projection.facility).toMatchObject({
      homeBaseId: 'test_home',
      homeBaseLabel: 'Test Command Annex',
      operationalRegionId: 'test_region',
      operationalRegionLabel: 'Test Region',
    })
  })

  it('projects live agency, funding, staffing, logistics, and optional capacity state', () => {
    const game = createStartingState()
    game.funding = 37
    game.containmentRating = 55
    if (game.agency) {
      game.agency = {
        ...game.agency,
        funding: 37,
        containmentRating: 55,
        supportAvailable: 7,
        maintenanceSpecialistsAvailable: 4,
      }
    }

    const projection = buildAgencyEstablishmentProjection(game)

    expect(projection.operationalLedger.funding).toBe(37)
    expect(projection.operationalLedger.containmentRating).toBe(55)
    expect(projection.operationalLedger.activeCases).toBe(
      Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved').length
    )
    expect(projection.operationalLedger.totalStock).toBe(
      Object.values(game.inventory).reduce((sum, quantity) => sum + quantity, 0)
    )
    expect(projection.facility.supportAvailable).toBe(7)
    expect(projection.facility.maintenanceSpecialistsAvailable).toBe(4)
  })

  it('omits facility capacity facts that are not present instead of inventing values', () => {
    const game = createStartingState()
    if (game.agency) {
      delete game.agency.supportAvailable
      delete game.agency.maintenanceSpecialistsAvailable
    }

    const projection = buildAgencyEstablishmentProjection(game)

    expect(projection.facility.supportAvailable).toBeUndefined()
    expect(projection.facility.maintenanceSpecialistsAvailable).toBeUndefined()
  })

  it('selects the first dossier deterministically from ordinary unresolved case state', () => {
    const game = createStartingState()
    for (const currentCase of Object.values(game.cases)) {
      currentCase.stage = 1
      currentCase.deadlineRemaining = 6
    }
    game.cases['case-003']!.stage = 5
    game.cases['case-003']!.deadlineRemaining = 0

    const first = buildAgencyEstablishmentProjection(game)
    const second = buildAgencyEstablishmentProjection(structuredClone(game))

    expect(first.firstDossier?.caseId).toBe('case-003')
    expect(second.firstDossier).toEqual(first.firstDossier)
    expect(first.briefing.primaryDossierCaseId).toBe('case-003')
  })

  it('uses existing intel and routing explanations without leaking hidden case payload fields', () => {
    const game = createStartingState()
    for (const currentCase of Object.values(game.cases)) {
      currentCase.stage = 1
      currentCase.deadlineRemaining = 6
    }
    const selected = game.cases['case-003']!
    selected.stage = 5
    selected.deadlineRemaining = 0
    selected.hiddenState = 'hidden'
    selected.description = 'SECRET_INTERNAL_DESCRIPTION'
    selected.intelConfidence = 0.4
    selected.intelUncertainty = 0.6
    selected.intelLastUpdatedWeek = 1

    const projection = buildAgencyEstablishmentProjection(game)
    const serializedDossier = JSON.stringify(projection.firstDossier)

    expect(projection.firstDossier?.intel).toMatchObject({
      confidence: 0.4,
      uncertainty: 0.6,
    })
    expect(projection.firstDossier?.routingExplanation.summary.length).toBeGreaterThan(0)
    expect(serializedDossier).not.toContain('SECRET_INTERNAL_DESCRIPTION')
    expect(serializedDossier).not.toContain('"hiddenState"')
  })

  it('returns a null dossier when no unresolved case exists', () => {
    const game = createStartingState()
    for (const currentCase of Object.values(game.cases)) {
      currentCase.status = 'resolved'
    }

    const projection = buildAgencyEstablishmentProjection(game)

    expect(projection.firstDossier).toBeNull()
    expect(projection.briefing.primaryDossierCaseId).toBeNull()
    expect(projection.briefing.primaryRoutingExplanation).toBeNull()
    expect(projection.beats[5]?.payload).toBeNull()
  })
})
