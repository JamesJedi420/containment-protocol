import { describe, expect, it } from 'vitest'
import {
  CONTROL_ARTIFACT_ID,
  CONTROL_FACILITY_ID,
  authorizeFacilityAction,
  evaluateControlArtifactTransfer,
  evaluateCrewObedience,
  projectFacilityControlSurfaces,
} from '../domain/layeredFacilityControl'

describe('SPE-731 layered facility control', () => {
  it('keeps ownership distinct from command authority', () => {
    const surfaces = projectFacilityControlSurfaces({
      facilityId: CONTROL_FACILITY_ID,
      ownerId: 'actor:owner',
      commandAuthorityId: 'actor:commander',
      powerState: 'online',
      accessBand: 'operate',
    })
    expect(surfaces).toMatchObject({
      ownershipEqualsCommand: false,
      surfacesSeparated: true,
      ownerId: 'actor:owner',
      commandAuthorityId: 'actor:commander',
    })
  })

  it('obeys hierarchy or credential rather than title alone', () => {
    expect(
      evaluateCrewObedience({
        facilityId: CONTROL_FACILITY_ID,
        actorId: 'actor:named-director',
        actorTitle: 'Director',
        commandAuthorityId: 'actor:commander',
        holdsCredential: false,
        hierarchyRank: 1,
        requiredHierarchyRank: 3,
      })
    ).toMatchObject({
      obeysCommand: false,
      obedienceSource: 'none',
      titleAloneInsufficient: true,
    })

    expect(
      evaluateCrewObedience({
        facilityId: CONTROL_FACILITY_ID,
        actorId: 'actor:commander',
        actorTitle: 'Courier',
        commandAuthorityId: 'actor:commander',
        holdsCredential: true,
        hierarchyRank: 0,
        requiredHierarchyRank: 3,
      })
    ).toMatchObject({
      obeysCommand: true,
      obedienceSource: 'credential',
    })

    expect(
      evaluateCrewObedience({
        facilityId: CONTROL_FACILITY_ID,
        actorId: 'actor:shift-lead',
        actorTitle: 'Aide',
        commandAuthorityId: 'actor:commander',
        holdsCredential: false,
        hierarchyRank: 4,
        requiredHierarchyRank: 3,
      })
    ).toMatchObject({
      obeysCommand: true,
      obedienceSource: 'hierarchy',
    })
  })

  it('transfers command surfaces when a control artifact moves', () => {
    const transfer = evaluateControlArtifactTransfer({
      facilityId: CONTROL_FACILITY_ID,
      artifactId: CONTROL_ARTIFACT_ID,
      previousHolderId: 'actor:commander',
      newHolderId: 'actor:intruder',
      transferKind: 'stolen',
      priorCommandAuthorityId: 'actor:commander',
    })
    expect(transfer).toMatchObject({
      commandAuthorityId: 'actor:intruder',
      canSteer: true,
      canSeal: true,
      canAdmit: true,
      priorHolderRetainsCommand: false,
      transferKind: 'stolen',
    })
  })

  it('authorizes enter while denying higher-risk actions on the same surface', () => {
    const base = {
      facilityId: CONTROL_FACILITY_ID,
      actorId: 'actor:visitor',
      accessBand: 'enter' as const,
      powerState: 'online' as const,
      commandAuthorityId: 'actor:commander',
      competentForAction: true,
      informationReadIn: true,
    }

    expect(authorizeFacilityAction({ ...base, action: 'enter' })).toMatchObject({
      authorized: true,
      denialReason: 'none',
    })

    expect(authorizeFacilityAction({ ...base, action: 'operate' })).toMatchObject({
      authorized: false,
      denialReason: 'action_not_authorized',
    })

    expect(
      authorizeFacilityAction({
        ...base,
        actorId: 'actor:operator',
        accessBand: 'command',
        action: 'seal',
      })
    ).toMatchObject({
      authorized: false,
      denialReason: 'missing_command_authority',
    })

    expect(
      authorizeFacilityAction({
        ...base,
        actorId: 'actor:commander',
        accessBand: 'command',
        action: 'override',
        competentForAction: false,
      })
    ).toMatchObject({
      authorized: false,
      denialReason: 'competency_gap',
    })

    expect(
      authorizeFacilityAction({
        ...base,
        actorId: 'actor:commander',
        accessBand: 'command',
        action: 'override',
        informationReadIn: false,
      })
    ).toMatchObject({
      authorized: false,
      denialReason: 'information_gap',
    })

    expect(
      authorizeFacilityAction({
        ...base,
        actorId: 'actor:commander',
        accessBand: 'command',
        powerState: 'offline',
        action: 'operate',
      })
    ).toMatchObject({
      authorized: false,
      denialReason: 'power_unavailable',
    })
  })

  it('fails closed on malformed packets', () => {
    expect(projectFacilityControlSurfaces(null)).toBeUndefined()
    expect(evaluateCrewObedience(null)).toBeUndefined()
    expect(evaluateControlArtifactTransfer(null)).toBeUndefined()
    expect(authorizeFacilityAction(null)).toBeUndefined()
  })
})
