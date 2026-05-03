import { describe, expect, it } from 'vitest'
import {
  createCrossRoleActionProcedure,
  resolveCrossRoleAction,
} from '../domain/crossRoleActionProcedure'

function createValidScanProcedure() {
  const result = createCrossRoleActionProcedure({
    id: 'procedure.scan.perimeter',
    actionId: 'scan',
    lanes: [
      {
        laneId: 'forward-recon',
        allowedRoles: ['field_recon', 'hunter'],
        minAgents: 1,
      },
      {
        laneId: 'analysis-support',
        allowedRoles: ['investigator', 'tech'],
        minAgents: 1,
      },
    ],
    prerequisiteTags: ['sensor:portable', 'intel:target-profile'],
  })

  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error('Expected valid scan procedure.')
  }

  return result.procedure
}

describe('cross-role action procedure contract', () => {
  it('accepts a valid scan procedure definition', () => {
    const result = createCrossRoleActionProcedure({
      id: ' procedure.scan.perimeter ',
      actionId: 'scan',
      lanes: [
        {
          laneId: ' forward-recon ',
          allowedRoles: ['field_recon', 'hunter', 'field_recon'],
          minAgents: 1,
        },
        {
          laneId: 'analysis-support',
          allowedRoles: ['investigator', 'tech'],
          minAgents: 1,
        },
      ],
      prerequisiteTags: ['sensor:portable', ' intel:target-profile ', 'sensor:portable'],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected valid scan definition.')
    }

    expect(result.procedure.id).toBe('procedure.scan.perimeter')
    expect(result.procedure.lanes[0].laneId).toBe('forward-recon')
    expect(result.procedure.lanes[0].allowedRoles).toEqual(['field_recon', 'hunter'])
    expect(result.procedure.prerequisiteTags).toEqual(['sensor:portable', 'intel:target-profile'])
  })

  it('returns typed validation failure for invalid definition', () => {
    const result = createCrossRoleActionProcedure({
      id: 'scan.invalid',
      actionId: 'scan',
      lanes: [
        {
          laneId: 'forward-recon',
          allowedRoles: ['field_recon'],
          minAgents: 1,
        },
      ],
      prerequisiteTags: ['sensor:portable'],
    })

    expect(result).toEqual({
      ok: false,
      error: 'invalid_lanes',
    })
  })

  it('returns unmet prerequisite as typed failure', () => {
    const procedure = createValidScanProcedure()
    const result = resolveCrossRoleAction({
      procedure,
      laneAssignments: [
        { laneId: 'forward-recon', agentRoles: ['field_recon'] },
        { laneId: 'analysis-support', agentRoles: ['tech'] },
      ],
      availablePrerequisiteTags: ['sensor:portable'],
    })

    expect(result).toEqual({
      ok: false,
      error: 'unmet_prerequisite',
      detail: 'intel:target-profile',
    })
  })

  it('resolves successful scan and keeps typed success shape', () => {
    const procedure = createValidScanProcedure()
    const result = resolveCrossRoleAction({
      procedure,
      laneAssignments: [
        { laneId: 'forward-recon', agentRoles: ['hunter'] },
        { laneId: 'analysis-support', agentRoles: ['investigator'] },
      ],
      availablePrerequisiteTags: ['sensor:portable', 'intel:target-profile'],
    })

    expect(result).toEqual({
      ok: true,
      outcome: {
        actionId: 'scan',
        participatingLaneIds: ['forward-recon', 'analysis-support'],
        matchedPrerequisiteTags: ['sensor:portable', 'intel:target-profile'],
      },
    })
  })

  it('returns typed role mismatch failure when lane assignment violates allowed roles', () => {
    const procedure = createValidScanProcedure()
    const result = resolveCrossRoleAction({
      procedure,
      laneAssignments: [
        { laneId: 'forward-recon', agentRoles: ['field_recon'] },
        { laneId: 'analysis-support', agentRoles: ['medic'] },
      ],
      availablePrerequisiteTags: ['sensor:portable', 'intel:target-profile'],
    })

    expect(result).toEqual({
      ok: false,
      error: 'lane_role_mismatch',
      detail: 'analysis-support',
    })
  })
})
