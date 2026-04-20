import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildGovernanceTransferSummary,
  processGovernanceTransfersForWeek,
  type GovernanceAuthorityState,
  type GovernanceClaimant,
  type GovernanceParticipant,
  type GovernanceState,
  type GovernanceSuccessionContract,
  type GovernanceTransfer,
} from '../domain/governanceTransfers'
import { advanceWeek } from '../domain/sim/advanceWeek'

function makeParticipant(
  role: GovernanceParticipant['role'],
  overrides: Partial<GovernanceParticipant> = {}
): GovernanceParticipant {
  return {
    id: overrides.id ?? `${role}-id`,
    name: overrides.name ?? `${role} participant`,
    role,
    present: overrides.present ?? true,
    captive: overrides.captive,
    accepts: overrides.accepts,
  }
}

function makeClaimant(
  priority: number,
  basis: GovernanceClaimant['basis'],
  overrides: Partial<GovernanceClaimant> = {}
): GovernanceClaimant {
  return {
    id: overrides.id ?? `claimant-${priority}`,
    name: overrides.name ?? `Claimant ${priority}`,
    priority,
    basis,
    present: overrides.present ?? true,
    accepts: overrides.accepts ?? true,
    captive: overrides.captive,
  }
}

function makeAuthority(
  overrides: Partial<GovernanceAuthorityState> = {}
): GovernanceAuthorityState {
  return {
    id: overrides.id ?? 'authority-directorate',
    label: overrides.label ?? 'Directorate Mandate',
    class: overrides.class ?? 'sovereign_authority',
    holderId: overrides.holderId ?? 'holder-1',
    holderName: overrides.holderName ?? 'Director Hale',
    holderStatus: overrides.holderStatus ?? 'active',
    inheritedPowerTier: overrides.inheritedPowerTier,
    transferredAuthority: overrides.transferredAuthority ?? 100,
    recognizedLegitimacy: overrides.recognizedLegitimacy ?? 100,
    practicalControl: overrides.practicalControl ?? 100,
    contested: overrides.contested ?? false,
    unstable: overrides.unstable ?? false,
    lastTransferId: overrides.lastTransferId,
  }
}

function makeTransfer(overrides: Partial<GovernanceTransfer> = {}): GovernanceTransfer {
  return {
    id: overrides.id ?? 'transfer-1',
    authorityId: overrides.authorityId ?? 'authority-directorate',
    authorityLabel: overrides.authorityLabel ?? 'Directorate Mandate',
    authorityClass: overrides.authorityClass ?? 'sovereign_authority',
    transferPath: overrides.transferPath,
    state: overrides.state ?? 'pending',
    batchId: overrides.batchId,
    batchLabel: overrides.batchLabel,
    participants:
      overrides.participants ?? [
        makeParticipant('holder'),
        makeParticipant('witness'),
        makeParticipant('custodian'),
      ],
    claimants:
      overrides.claimants ?? [makeClaimant(1, ['ceremony'], { id: 'successor-1', name: 'Marshal Ives' })],
    inheritedPowerTier: overrides.inheritedPowerTier,
    requiresLatentLineage: overrides.requiresLatentLineage,
    minimumLatentLineageTier: overrides.minimumLatentLineageTier,
    allowsInvestiture: overrides.allowsInvestiture,
    requiredLocation: overrides.requiredLocation,
    requiredParticipantRoles: overrides.requiredParticipantRoles,
    actualLocation: overrides.actualLocation ?? 'command dais',
    requiredInstruments: overrides.requiredInstruments,
    presentInstruments: overrides.presentInstruments ?? ['command-seal'],
    requiredSetupFlags: overrides.requiredSetupFlags,
    presentSetupFlags: overrides.presentSetupFlags ?? ['rite-prepared', 'authentication-cleared'],
    voluntaryHolderRequired: overrides.voluntaryHolderRequired,
    allowCoerciveCompletion: overrides.allowCoerciveCompletion,
    coercive: overrides.coercive,
    violentExtraction: overrides.violentExtraction,
    sourceContractId: overrides.sourceContractId,
    blockers: overrides.blockers,
    selectedSuccessorId: overrides.selectedSuccessorId,
    selectedSuccessorName: overrides.selectedSuccessorName,
    outcome: overrides.outcome,
    lastProcessedWeek: overrides.lastProcessedWeek,
  }
}

function makeContract(overrides: Partial<GovernanceSuccessionContract> = {}): GovernanceSuccessionContract {
  return {
    id: overrides.id ?? 'contract-1',
    authorityId: overrides.authorityId ?? 'authority-charter',
    authorityLabel: overrides.authorityLabel ?? 'North Charter',
    authorityClass: overrides.authorityClass ?? 'charter_holdings',
    status: overrides.status ?? 'armed',
    trigger: overrides.trigger ?? {
      type: 'holder_status',
      holderStatuses: ['deceased'],
    },
    participants: overrides.participants ?? [makeParticipant('custodian')],
    claimants:
      overrides.claimants ??
      [
        makeClaimant(1, ['sealed_instrument'], {
          id: 'designated-heir',
          name: 'Archivist Vale',
          accepts: false,
        }),
        makeClaimant(2, ['sealed_instrument'], {
          id: 'alternate-heir',
          name: 'Registrar Kade',
        }),
      ],
    inheritedPowerTier: overrides.inheritedPowerTier,
    requiresLatentLineage: overrides.requiresLatentLineage,
    minimumLatentLineageTier: overrides.minimumLatentLineageTier,
    allowsInvestiture: overrides.allowsInvestiture,
    batchId: overrides.batchId,
    batchLabel: overrides.batchLabel,
    requiredLocation: overrides.requiredLocation,
    requiredParticipantRoles: overrides.requiredParticipantRoles,
    actualLocation: overrides.actualLocation ?? 'records chamber',
    requiredInstruments: overrides.requiredInstruments,
    presentInstruments: overrides.presentInstruments ?? ['sealed-charter'],
    requiredSetupFlags: overrides.requiredSetupFlags,
    presentSetupFlags: overrides.presentSetupFlags ?? ['authentication-cleared'],
    voluntaryHolderRequired: overrides.voluntaryHolderRequired,
    allowCoerciveCompletion: overrides.allowCoerciveCompletion,
    coercive: overrides.coercive,
    lastTransferId: overrides.lastTransferId,
  }
}

function makeGovernanceState(overrides: Partial<GovernanceState> = {}): GovernanceState {
  return {
    authorities: overrides.authorities ?? [makeAuthority()],
    transfers: overrides.transfers ?? [],
    contracts: overrides.contracts ?? [],
    history: overrides.history ?? [],
  }
}

describe('governanceTransfers', () => {
  it('blocks sovereign ceremony until named participants, setting, and seal validate', () => {
    const governance = makeGovernanceState({
      transfers: [
        makeTransfer({
          participants: [
            makeParticipant('holder'),
            makeParticipant('witness', { present: false }),
            makeParticipant('custodian'),
          ],
          actualLocation: 'field annex',
        }),
      ],
    })

    const result = processGovernanceTransfersForWeek(governance, 4)
    const transfer = result.governance?.transfers[0]
    const summary = buildGovernanceTransferSummary(result.governance)

    expect(transfer?.state).toBe('blocked')
    expect(transfer?.blockers).toContain('Missing witness participant.')
    expect(transfer?.blockers).toContain('Requires command dais.')
    expect(summary.activeTransfers[0]?.blockerLabel).toContain('Missing witness participant.')
  })

  it('allows lighter site custody transfer under lighter rules than sovereign authority', () => {
    const governance = makeGovernanceState({
      authorities: [
        makeAuthority(),
        makeAuthority({
          id: 'authority-site',
          label: 'South Site Custody',
          class: 'site_custody',
          holderName: 'Custodian Renn',
        }),
      ],
      transfers: [
        makeTransfer({
          id: 'transfer-sovereign',
          batchId: 'batch-lighter',
          batchLabel: 'Linked handoff',
          participants: [makeParticipant('holder')],
          presentInstruments: [],
        }),
        makeTransfer({
          id: 'transfer-site',
          authorityId: 'authority-site',
          authorityLabel: 'South Site Custody',
          authorityClass: 'site_custody',
          batchId: 'batch-lighter',
          batchLabel: 'Linked handoff',
          participants: [],
          claimants: [makeClaimant(1, ['sealed_instrument'], { id: 'site-heir', name: 'Custodian Vale' })],
          actualLocation: undefined,
          presentInstruments: ['site-keys'],
          presentSetupFlags: [],
        }),
      ],
    })

    const result = processGovernanceTransfersForWeek(governance, 4)
    const sovereign = result.governance?.transfers.find((transfer) => transfer.id === 'transfer-sovereign')
    const site = result.governance?.transfers.find((transfer) => transfer.id === 'transfer-site')

    expect(sovereign?.state).toBe('blocked')
    expect(site?.state).toBe('completed')
    expect(site?.outcome?.type).toBe('authority_transferred')
  })

  it('triggers deferred contracts and falls through to failover when the designated successor declines', () => {
    const game = createStartingState()
    game.governance = makeGovernanceState({
      authorities: [
        makeAuthority({
          id: 'authority-charter',
          label: 'North Charter',
          class: 'charter_holdings',
          holderName: 'Keeper Thorne',
          holderStatus: 'deceased',
          transferredAuthority: 100,
          recognizedLegitimacy: 88,
          practicalControl: 82,
        }),
      ],
      contracts: [makeContract()],
    })

    const advanced = advanceWeek(game)
    const transfer = advanced.governance?.transfers[0]
    const contract = advanced.governance?.contracts[0]
    const governanceEvent = advanced.events.find((event) => event.type === 'governance.transfer_processed')
    const governanceNote = advanced.reports.at(-1)?.notes.find((note) =>
      note.content.includes('North Charter')
    )

    expect(transfer?.outcome?.type).toBe('failover_selected')
    expect(transfer?.selectedSuccessorName).toBe('Registrar Kade')
    expect(contract?.status).toBe('completed')
    expect(governanceEvent?.payload.successorName).toBe('Registrar Kade')
    expect(governanceNote?.content).toMatch(/failover successor registrar kade recognized/i)
  })

  it('splits irregular succession into a partial claim instead of instant full legitimacy', () => {
    const governance = makeGovernanceState({
      authorities: [
        makeAuthority({
          holderStatus: 'missing',
          transferredAuthority: 0,
          recognizedLegitimacy: 0,
          practicalControl: 0,
        }),
      ],
      transfers: [
        makeTransfer({
          participants: [makeParticipant('custodian')],
          claimants: [
            makeClaimant(1, ['prophecy', 'delayed_authentication'], {
              id: 'oracle-heir',
              name: 'Oracle Sen',
            }),
          ],
          actualLocation: 'outer archive',
          presentInstruments: [],
          presentSetupFlags: [],
        }),
      ],
    })

    const result = processGovernanceTransfersForWeek(governance, 6)
    const transfer = result.governance?.transfers[0]
    const authority = result.governance?.authorities[0]

    expect(transfer?.state).toBe('contested')
    expect(transfer?.outcome?.type).toBe('partial_claim')
    expect(transfer?.outcome?.transferredAuthority).toBe(40)
    expect((transfer?.outcome?.recognizedLegitimacy ?? 0) < 70).toBe(true)
    expect((transfer?.outcome?.practicalControl ?? 0) > 0).toBe(true)
    expect(authority?.contested).toBe(true)
  })

  it('marks captive coercive transfer as contested instead of clean', () => {
    const governance = makeGovernanceState({
      transfers: [
        makeTransfer({
          participants: [
            makeParticipant('holder', { captive: true }),
            makeParticipant('witness'),
            makeParticipant('custodian'),
          ],
          coercive: true,
        }),
      ],
    })

    const result = processGovernanceTransfersForWeek(governance, 5)
    const transfer = result.governance?.transfers[0]

    expect(transfer?.state).toBe('contested')
    expect(transfer?.outcome?.type).toBe('contested_completion')
    expect(transfer?.outcome?.transferredAuthority).toBe(100)
    expect((transfer?.outcome?.practicalControl ?? 0) > (transfer?.outcome?.recognizedLegitimacy ?? 0)).toBe(true)
  })

  it('handles batched ceremonies with mixed validity under one event context', () => {
    const governance = makeGovernanceState({
      authorities: [
        makeAuthority(),
        makeAuthority({
          id: 'authority-site',
          label: 'South Site Custody',
          class: 'site_custody',
        }),
      ],
      transfers: [
        makeTransfer({
          id: 'transfer-batch-blocked',
          batchId: 'batch-night-watch',
          batchLabel: 'Night Watch Rite',
          participants: [
            makeParticipant('holder'),
            makeParticipant('witness', { present: false }),
            makeParticipant('custodian'),
          ],
        }),
        makeTransfer({
          id: 'transfer-batch-clean',
          authorityId: 'authority-site',
          authorityLabel: 'South Site Custody',
          authorityClass: 'site_custody',
          batchId: 'batch-night-watch',
          batchLabel: 'Night Watch Rite',
          participants: [],
          claimants: [
            makeClaimant(1, ['sealed_instrument'], {
              id: 'site-successor',
              name: 'Custodian Vale',
            }),
          ],
          actualLocation: undefined,
          presentInstruments: ['site-keys'],
          presentSetupFlags: [],
        }),
      ],
    })

    const result = processGovernanceTransfersForWeek(governance, 7)
    const blocked = result.governance?.transfers.find((transfer) => transfer.id === 'transfer-batch-blocked')
    const completed = result.governance?.transfers.find((transfer) => transfer.id === 'transfer-batch-clean')
    const summary = buildGovernanceTransferSummary(result.governance)

    expect(blocked?.state).toBe('blocked')
    expect(completed?.state).toBe('completed')
    expect(blocked?.batchId).toBe(completed?.batchId)
    expect(result.eventDrafts).toHaveLength(1)
    expect(summary.latestBatch?.label).toBe('Night Watch Rite')
    expect(summary.activeTransfers[0]?.batchLabel).toBe('Night Watch Rite')
  })

  it('blocks violent extraction until defeat, vessel, and method validate', () => {
    const governance = makeGovernanceState({
      transfers: [
        makeTransfer({
          id: 'transfer-violent-blocked',
          transferPath: 'violent_extraction',
          claimants: [
            makeClaimant(1, ['ceremony'], {
              id: 'extractor-1',
              name: 'Warden Skell',
            }),
          ],
          violentExtraction: {
            sourceActorId: 'entity-archon',
            sourceActorName: 'The Glass Archon',
            sourceDefeated: false,
            extractionMethod: 'improvised siphon',
            requiredMethod: 'ritual siphon',
            extractorEligible: false,
            vesselPrepared: false,
          },
        }),
      ],
    })

    const result = processGovernanceTransfersForWeek(governance, 8)
    const transfer = result.governance?.transfers[0]

    expect(transfer?.state).toBe('blocked')
    expect(transfer?.blockers).toContain('Source actor has not been defeated.')
    expect(transfer?.blockers).toContain('Extractor is not eligible to bear the inheritance.')
    expect(transfer?.blockers).toContain('Transfer vessel is not prepared.')
    expect(transfer?.blockers).toContain('Requires ritual siphon.')
  })

  it('records new inherited power when a lineage-qualified agency successor takes authority', () => {
    const game = createStartingState()
    const agent = game.agents[Object.keys(game.agents)[0]]!

    game.agents[agent.id] = {
      ...agent,
      inheritedPower: {
        latentLineageTier: 'ascendant',
        realizedTier: 'none',
      },
    }
    game.governance = makeGovernanceState({
      transfers: [
        makeTransfer({
          id: 'transfer-lineage-gain',
          transferPath: 'inheritance',
          claimants: [
            makeClaimant(1, ['sealed_instrument'], {
              id: agent.id,
              name: agent.name,
            }),
          ],
        }),
      ],
    })

    const advanced = advanceWeek(game)
    const updatedAgent = advanced.agents[agent.id]
    const transfer = advanced.governance?.transfers[0]
    const governanceEvent = advanced.events.find((event) => event.type === 'governance.transfer_processed')

    expect(updatedAgent?.inheritedPower?.realizedTier).toBe('ascendant')
    expect(updatedAgent?.inheritedPower?.lastOutcome).toBe('new_gain')
    expect(transfer?.outcome?.inheritedPower?.type).toBe('new_gain')
    expect(governanceEvent?.payload.inheritedPowerOutcome).toBe('new_gain')
    expect(governanceEvent?.payload.inheritedPowerNextTier).toBe('ascendant')
  })

  it('records no inherited gain when the successor does not meet the lineage threshold', () => {
    const game = createStartingState()
    const agent = game.agents[Object.keys(game.agents)[0]]!

    game.agents[agent.id] = {
      ...agent,
      inheritedPower: {
        latentLineageTier: 'trace',
        realizedTier: 'none',
      },
    }
    game.governance = makeGovernanceState({
      authorities: [
        makeAuthority({
          id: 'authority-charter',
          label: 'South Charter',
          class: 'charter_holdings',
          holderName: 'Custodian Pell',
        }),
      ],
      transfers: [
        makeTransfer({
          id: 'transfer-lineage-blocked',
          authorityId: 'authority-charter',
          authorityLabel: 'South Charter',
          authorityClass: 'charter_holdings',
          transferPath: 'inheritance',
          claimants: [
            makeClaimant(1, ['sealed_instrument'], {
              id: agent.id,
              name: agent.name,
            }),
          ],
          actualLocation: 'records chamber',
          presentInstruments: ['sealed-charter'],
          presentSetupFlags: ['authentication-cleared'],
        }),
      ],
    })

    const advanced = advanceWeek(game)
    const updatedAgent = advanced.agents[agent.id]
    const transfer = advanced.governance?.transfers[0]

    expect(updatedAgent?.inheritedPower?.realizedTier).toBe('none')
    expect(updatedAgent?.inheritedPower?.lastOutcome).toBe('no_gain')
    expect(transfer?.outcome?.inheritedPower?.type).toBe('no_gain')
    expect(transfer?.outcome?.inheritedPower?.reason).toMatch(/below required Vested/i)
  })

  it('upgrades existing inherited power through validated violent extraction', () => {
    const game = createStartingState()
    const agent = game.agents[Object.keys(game.agents)[0]]!

    game.agents[agent.id] = {
      ...agent,
      inheritedPower: {
        latentLineageTier: 'trace',
        realizedTier: 'vested',
      },
    }
    game.governance = makeGovernanceState({
      transfers: [
        makeTransfer({
          id: 'transfer-violent-upgrade',
          transferPath: 'violent_extraction',
          claimants: [
            makeClaimant(1, ['ceremony'], {
              id: agent.id,
              name: agent.name,
            }),
          ],
          violentExtraction: {
            sourceActorId: 'entity-archon',
            sourceActorName: 'The Glass Archon',
            sourceDefeated: true,
            extractionMethod: 'ritual siphon',
            requiredMethod: 'ritual siphon',
            extractorEligible: true,
            vesselPrepared: true,
          },
        }),
      ],
    })

    const advanced = advanceWeek(game)
    const updatedAgent = advanced.agents[agent.id]
    const transfer = advanced.governance?.transfers[0]
    const governanceNote = advanced.reports.at(-1)?.notes.find((note) =>
      note.content.includes('The Glass Archon')
    )

    expect(updatedAgent?.inheritedPower?.realizedTier).toBe('ascendant')
    expect(updatedAgent?.inheritedPower?.lastOutcome).toBe('upgrade_existing')
    expect(transfer?.outcome?.inheritedPower?.type).toBe('upgrade_existing')
    expect(transfer?.outcome?.sourceActorName).toBe('The Glass Archon')
    expect(governanceNote?.content).toMatch(/violent extraction/i)
  })
})
