import { describe, expect, it } from 'vitest'
import {
  deriveCounterfactualBranchFromRemoval,
  projectCounterfactualBranchReviewSummary,
  projectCounterfactualBranchWorldRemap,
  type CounterfactualBranchAuthoringInput,
} from '../domain/counterfactualBranches'

function makeAuthoringInput(): CounterfactualBranchAuthoringInput {
  return {
    removedActor: {
      actorId: 'a_eli',
      actorName: 'Eli Grant',
      stabilizingRole: 'civic negotiator',
      locationId: 'district:rivergate',
      locationLabel: 'Rivergate Civic Corridors',
    },
    trigger: {
      timelineId: 'wishverse-rivergate',
      condition: 'removed_before_response',
      conditionLabel: 'Removed before response handoff',
    },
    civicConsequences: [
      {
        kind: 'curfew_pressure',
        zoneId: 'zone:civic-corridors',
        zoneLabel: 'Civic Corridors',
        summary: 'Curfew pressure remaps the civic corridors into checkpointed movement lanes.',
        severity: 'high',
      },
      {
        kind: 'hostile_dominance',
        zoneId: 'zone:shadow-network',
        zoneLabel: 'Shadow Network',
        summary: 'Hostile dominance takes the shadow network once local mediation disappears.',
        severity: 'high',
      },
      {
        kind: 'route_loss',
        zoneId: 'zone:industrial-perimeter',
        zoneLabel: 'Industrial Perimeter',
        summary: 'Industrial routes collapse after escort continuity fails.',
        severity: 'medium',
      },
      {
        kind: 'institutional_degradation',
        zoneId: 'zone:agency-command',
        zoneLabel: 'Agency Command',
        summary: 'Institutional trust degrades into fragmented command and delayed authorizations.',
        severity: 'high',
      },
      {
        kind: 'resistance_pocket_emergence',
        zoneId: 'zone:mutual-aid-cells',
        zoneLabel: 'Mutual Aid Cells',
        summary: 'Mutual-aid cells harden into resistance pockets to preserve civilian support.',
        severity: 'medium',
      },
    ],
    supportContinuity: {
      failedSupportIds: ['dispatch', 'witness-shelter', 'medical-relay'],
      failureSignals: ['support.dispatch_lost', 'support.relief_chain_failed'],
      summary: 'Dispatch, shelter routing, and medical relay continuity all fail in the branch.',
    },
    unsyncedResponder: {
      responderId: 'a_ava',
      responderName: 'Ava Brooks',
      responderRole: 'hunter',
      arrivalMode: 'arrives_capable_unsynced',
      buyIn: 'absent',
      summary: 'Ava reaches the district fully capable but without local trust or mission buy-in.',
    },
    invertedFamiliarActors: [
      {
        actorId: 'a_casey',
        actorName: 'Casey Holt',
        familiarRole: 'field medic',
        hostileRole: 'curfew_broker',
        summary: 'Casey now brokers rationed treatment through curfew checkpoints.',
      },
    ],
    optionAudit: {
      decisionMomentId: 'rivergate-failure-window',
      decisionMomentLabel: 'Rivergate failure window',
      options: [
        {
          optionId: 'alt-civilian-evac',
          label: 'Civilian evacuation corridor',
          availability: 'available',
          summary: 'A local civilian corridor remained open long enough for a partial evacuation.',
          reviewSurfaces: ['responsibility', 'doctrine'],
        },
        {
          optionId: 'alt-medical-relay',
          label: 'Medical relay fallback',
          availability: 'blocked',
          summary: 'The fallback medical relay could not be reactivated once escort continuity failed.',
          reviewSurfaces: ['responsibility', 'retraining'],
          blockerReason: 'Escort continuity collapsed before the relay handoff could occur.',
        },
        {
          optionId: 'alt-basement-egress',
          label: 'Basement egress route',
          availability: 'unknown',
          summary: 'Review cannot confirm whether the basement route was still traversable.',
          reviewSurfaces: ['doctrine'],
          uncertaintyReason: 'Sensor coverage failed before route confirmation.',
        },
        {
          optionId: 'alt-safehouse-rumor',
          label: 'Rumored safehouse pickup',
          availability: 'falsely_perceived',
          summary: 'A rumored safehouse pickup looked viable but was never real in this branch review.',
          reviewSurfaces: ['retraining', 'doctrine'],
          falsePerceptionSource: 'Witness traffic repeated a stale coordination rumor as live support.',
        },
      ],
    },
  }
}

describe('counterfactualBranches', () => {
  it('derives a deterministic actor-removal branch identity and packet', () => {
    const branch = deriveCounterfactualBranchFromRemoval(makeAuthoringInput())

    expect(branch.identity).toEqual({
      branchId:
        'counterfactual:wishverse-rivergate:district-rivergate:a-eli:removed-before-response',
      branchKey: 'a_eli:removed_before_response:district:rivergate',
      timelineId: 'wishverse-rivergate',
      removedActorId: 'a_eli',
      branchCondition: 'removed_before_response',
    })
    expect(branch.removedActor.actorName).toBe('Eli Grant')
    expect(branch.trigger.conditionLabel).toBe('Removed before response handoff')
    expect(branch.civicConsequences.map((consequence) => consequence.kind)).toEqual([
      'curfew_pressure',
      'hostile_dominance',
      'institutional_degradation',
      'resistance_pocket_emergence',
      'route_loss',
    ])
  })

  it('captures civic spread, support continuity failure, unsynced arrival, and ally inversion', () => {
    const branch = deriveCounterfactualBranchFromRemoval(makeAuthoringInput())

    expect(branch.supportContinuity.status).toBe('failed')
    expect(branch.supportContinuity.failureSignals).toEqual([
      'support.dispatch_lost',
      'support.relief_chain_failed',
    ])
    expect(branch.unsyncedResponder).toMatchObject({
      responderId: 'a_ava',
      arrivalMode: 'arrives_capable_unsynced',
      buyIn: 'absent',
    })
    expect(branch.invertedFamiliarActors).toEqual([
      {
        actorId: 'a_casey',
        actorName: 'Casey Holt',
        familiarRole: 'field medic',
        hostileRole: 'curfew_broker',
        summary: 'Casey now brokers rationed treatment through curfew checkpoints.',
      },
    ])
    expect(branch.optionAudit?.counts).toEqual({
      available: 1,
      blocked: 1,
      unknown: 1,
      falsely_perceived: 1,
    })
  })

  it('projects a narrow world-remap surface from the branch without touching map-core ownership', () => {
    const worldRemap = projectCounterfactualBranchWorldRemap(
      deriveCounterfactualBranchFromRemoval(makeAuthoringInput())
    )
    const zonesById = new Map(worldRemap.worldZones.map((zone) => [zone.id, zone]))

    expect(worldRemap.supportContinuityStatus).toBe('failed')
    expect(zonesById.get('zone:civic-corridors')?.status).toBe('curfew_zone')
    expect(zonesById.get('zone:shadow-network')?.status).toBe('hostile_territory')
    expect(zonesById.get('zone:industrial-perimeter')?.routeAccess).toBe('severed')
    expect(zonesById.get('zone:agency-command')?.status).toBe('abandoned_hub')
    expect(zonesById.get('zone:mutual-aid-cells')?.status).toBe('resistance_pocket')
    expect(worldRemap.actionableSignals).toContain(
      'Support continuity has failed after Eli Grant was removed.'
    )
    expect(worldRemap.actionableSignals).toContain(
      'Ava Brooks arrives capable but without local buy-in.'
    )
    expect(worldRemap.actionableSignals).toContain(
      'Casey Holt has inverted into a hostile curfew broker role.'
    )
  })

  it('keeps blocked, unknown, and falsely perceived alternatives distinct in branch review output', () => {
    const review = projectCounterfactualBranchReviewSummary(
      deriveCounterfactualBranchFromRemoval(makeAuthoringInput())
    )

    expect(review).not.toBeNull()
    expect(review?.availableAlternatives).toEqual(['Civilian evacuation corridor'])
    expect(review?.blockedAlternatives).toEqual(['Medical relay fallback'])
    expect(review?.unknownAlternatives).toEqual(['Basement egress route'])
    expect(review?.falselyPerceivedAlternatives).toEqual(['Rumored safehouse pickup'])
  })

  it('produces responsibility-sensitive review signals without claiming omniscient rewind truth', () => {
    const review = projectCounterfactualBranchReviewSummary(
      deriveCounterfactualBranchFromRemoval(makeAuthoringInput())
    )

    expect(review?.certaintyNote).toContain('does not assert omniscient rewind truth')
    expect(review?.responsibilitySignals).toContain(
      'Civilian evacuation corridor remained available at Rivergate failure window.'
    )
    expect(review?.responsibilitySignals).toContain(
      'Medical relay fallback was blocked: Escort continuity collapsed before the relay handoff could occur.'
    )
    expect(review?.retrainingSignals).toContain(
      'Rumored safehouse pickup was falsely perceived as viable: Witness traffic repeated a stale coordination rumor as live support.'
    )
    expect(review?.doctrineSignals).toContain(
      'Basement egress route remained unknown at review time: Sensor coverage failed before route confirmation.'
    )
  })

  it('remains repeatable for identical authored inputs', () => {
    const firstInput = makeAuthoringInput()
    const secondInput = makeAuthoringInput()
    const firstBranch = deriveCounterfactualBranchFromRemoval(firstInput)
    const secondBranch = deriveCounterfactualBranchFromRemoval(secondInput)

    expect(secondBranch).toEqual(firstBranch)
    expect(projectCounterfactualBranchWorldRemap(secondBranch)).toEqual(
      projectCounterfactualBranchWorldRemap(firstBranch)
    )
    expect(projectCounterfactualBranchReviewSummary(secondBranch)).toEqual(
      projectCounterfactualBranchReviewSummary(firstBranch)
    )
  })
})
