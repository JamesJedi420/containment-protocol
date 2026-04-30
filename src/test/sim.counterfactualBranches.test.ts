import { describe, expect, it } from 'vitest'
import {
  deriveCounterfactualBranchFromRemoval,
  projectOntologyAwareCounterfactualBranchReview,
  projectCounterfactualBranchReviewSummary,
  projectCounterfactualBranchWorldRemap,
  type CounterfactualBranchAuthoringInput,
} from '../domain/counterfactualBranches'
import { deriveRealityStatePacket } from '../domain/realityModel'

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

  it('uses ontology-aware review to distinguish actual branch consequence from perceived branch consequence', () => {
    const input = makeAuthoringInput()
    input.optionAudit!.options = [
      {
        optionId: 'alt-civilian-evac',
        label: 'Civilian evacuation corridor',
        availability: 'available',
        summary: 'Perception suggested the corridor remained open.',
        reviewSurfaces: ['responsibility', 'doctrine'],
      },
    ]

    const review = projectOntologyAwareCounterfactualBranchReview({
      branch: deriveCounterfactualBranchFromRemoval(input),
      consequenceReality: deriveRealityStatePacket({
        packetId: 'reality:rivergate-counterfactual-window',
        subjectId: 'branch:rivergate-window',
        label: 'Rivergate Counterfactual Window',
        actualState: 'evacuation corridor already sealed',
        perceivedState: 'evacuation corridor still open',
        believedState: 'evacuation corridor still open',
        existenceMode: 'partially_instantiated',
        ruleDomain: 'presence',
        deviationFamily: 'false_continuity',
        confidence: 0.67,
        evidence: 'false_reading',
      }),
    })

    expect(review).not.toBeNull()
    expect(review?.actualConsequenceState).toBe('evacuation corridor already sealed')
    expect(review?.perceivedConsequenceState).toBe('evacuation corridor still open')
    expect(review?.observationStatus).toBe('false_reading')
    expect(review?.optionReviews).toEqual([
      {
        optionId: 'alt-civilian-evac',
        label: 'Civilian evacuation corridor',
        perceivedAvailability: 'available',
        actualAvailability: 'falsely_perceived',
        reviewReason: 'perceived branch condition diverged from actual branch consequence',
      },
    ])
    expect(review?.ontologyConfidence).toBe('low')
  })

  it('changes option classification when symbolic rule activation changes actual validity', () => {
    const input = makeAuthoringInput()
    input.optionAudit!.options = [
      {
        optionId: 'named_passage_valid',
        label: 'Named threshold passage',
        availability: 'blocked',
        summary: 'Baseline review assumed the threshold stayed sealed.',
        reviewSurfaces: ['responsibility', 'retraining'],
      },
      {
        optionId: 'forced_entry_valid',
        label: 'Forced breach route',
        availability: 'available',
        summary: 'Responders believed a forced breach remained viable.',
        reviewSurfaces: ['responsibility', 'doctrine'],
      },
    ]

    const review = projectOntologyAwareCounterfactualBranchReview({
      branch: deriveCounterfactualBranchFromRemoval(input),
      consequenceReality: deriveRealityStatePacket({
        packetId: 'reality:named-threshold-branch',
        subjectId: 'threshold:named-threshold',
        label: 'Named Threshold Branch',
        actualState: 'threshold yields only to true-name invocation',
        perceivedState: 'threshold behaves like a sealed barrier',
        believedState: 'forced breach remains viable',
        existenceMode: 'partially_instantiated',
        ruleDomain: 'presence',
        deviationFamily: 'symbolic_override',
        confidence: 0.86,
        evidence: 'contradicted',
        ruleFamilyProfile: {
          familyType: 'symbolic_threshold',
          triggerConditions: ['true_name_spoken'],
          validityConditions: ['threshold_mark_unbroken'],
          activationStatus: 'active',
          overrideScope: 'site',
          allowedOutcomes: ['named_passage_valid'],
          invalidatedOutcomes: ['forced_entry_valid'],
          confidence: 0.86,
        },
        scopeProfile: {
          anchorScope: 'site',
          anchorId: 'site:rivergate-threshold',
          propagationBehavior: 'contained',
          overriddenScopes: ['site'],
          confidence: 0.86,
        },
      }),
      evaluationFamilyType: 'symbolic_threshold',
      evaluationScope: 'site',
    })

    expect(review?.actualOptionCounts).toEqual({
      available: 1,
      blocked: 1,
      unknown: 0,
      falsely_perceived: 0,
    })
    expect(review?.optionReviews).toEqual([
      {
        optionId: 'forced_entry_valid',
        label: 'Forced breach route',
        perceivedAvailability: 'available',
        actualAvailability: 'blocked',
        reviewReason:
          'invalidated by active declared rule family',
      },
      {
        optionId: 'named_passage_valid',
        label: 'Named threshold passage',
        perceivedAvailability: 'blocked',
        actualAvailability: 'available',
        reviewReason:
          'enabled by active declared rule family',
      },
    ])
  })

  it('keeps ontology-aware review non-omniscient when scope or perception only partially resolves validity', () => {
    const input = makeAuthoringInput()
    input.optionAudit!.options = [
      {
        optionId: 'district-relay',
        label: 'District relay handoff',
        availability: 'available',
        summary: 'Reviewers believed the district relay remained in play.',
        reviewSurfaces: ['responsibility', 'doctrine'],
      },
    ]

    const review = projectOntologyAwareCounterfactualBranchReview({
      branch: deriveCounterfactualBranchFromRemoval(input),
      consequenceReality: deriveRealityStatePacket({
        packetId: 'reality:district-relay-review',
        subjectId: 'district:relay-review',
        label: 'District Relay Review',
        actualState: 'site override may not have propagated to district relay',
        perceivedState: 'district relay remains viable',
        believedState: 'district relay remains viable',
        existenceMode: 'partially_instantiated',
        ruleDomain: 'presence',
        deviationFamily: 'symbolic_override',
        confidence: 0.62,
        evidence: 'clear',
        ruleFamilyProfile: {
          familyType: 'patron_mediated',
          triggerConditions: ['offering_accepted'],
          validityConditions: ['site_bond_intact'],
          activationStatus: 'uncertain',
          overrideScope: 'site',
          allowedOutcomes: ['district-relay'],
          confidence: 0.62,
        },
        scopeProfile: {
          anchorScope: 'site',
          anchorId: 'site:rivergate-sanctum',
          propagationBehavior: 'contained',
          confidence: 0.62,
        },
      }),
      evaluationFamilyType: 'patron_mediated',
      evaluationScope: 'district',
    })

    expect(review?.actualOptionCounts).toEqual({
      available: 0,
      blocked: 0,
      unknown: 1,
      falsely_perceived: 0,
    })
    expect(review?.optionReviews).toEqual([
      {
        optionId: 'district-relay',
        label: 'District relay handoff',
        perceivedAvailability: 'available',
        actualAvailability: 'unknown',
        reviewReason: 'actual branch consequence remained ontology-uncertain; baseline truth remained preserved at district scope',
      },
    ])
    expect(review?.certaintyNote).toContain('does not assert omniscient rewind truth')
    expect(review?.ontologyConfidence).toBe('low')
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
    expect(
      projectOntologyAwareCounterfactualBranchReview({
        branch: secondBranch,
        consequenceReality: deriveRealityStatePacket({
          packetId: 'reality:repeatable-counterfactual-review',
          subjectId: 'branch:repeatable-review',
          label: 'Repeatable Review',
          actualState: 'relay sealed under review',
          perceivedState: 'relay sealed under review',
          believedState: 'relay sealed under review',
          existenceMode: 'physical',
          ruleDomain: 'presence',
          confidence: 0.91,
          evidence: 'clear',
        }),
      })
    ).toEqual(
      projectOntologyAwareCounterfactualBranchReview({
        branch: firstBranch,
        consequenceReality: deriveRealityStatePacket({
          packetId: 'reality:repeatable-counterfactual-review',
          subjectId: 'branch:repeatable-review',
          label: 'Repeatable Review',
          actualState: 'relay sealed under review',
          perceivedState: 'relay sealed under review',
          believedState: 'relay sealed under review',
          existenceMode: 'physical',
          ruleDomain: 'presence',
          confidence: 0.91,
          evidence: 'clear',
        }),
      })
    )
  })
})
