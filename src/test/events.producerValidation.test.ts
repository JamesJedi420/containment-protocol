import { describe, expect, it } from 'vitest'
import {
  createAgencyFrontBusinessOpenedDraft,
  createAgencyFrontBusinessResolvedDraft,
  createAgentBetrayedDraft,
  createAgentHiredDraft,
  createAgentInjuredDraft,
  createAgentInstructorAssignedDraft,
  createAgentInstructorUnassignedDraft,
  createAgentKilledDraft,
  createAgentPromotedDraft,
  createAgentRelationshipChangedDraft,
  createAgentResignedDraft,
  createAgentTrainingCancelledDraft,
  createAgentTrainingCompletedDraft,
  createAgentTrainingStartedDraft,
  createAssignmentTeamAssignedDraft,
  createAssignmentTeamUnassignedDraft,
  createFactionStandingChangedDraft,
  createFactionUnlockAvailableDraft,
  createEquipmentAutoScrapPolicyChangedDraft,
  createEquipmentAutoScrapRoutedDraft,
  createCombatStimActivatedDraft,
  createCombatStimDisposedDraft,
  createCombatStimReaggregatedDraft,
  createCombatStimOverdriveExpiredDraft,
  createEquipmentInstanceMaterializedDraft,
  createEquipmentInstanceDestroyedDraft,
  createEquipmentInstanceReaggregatedDraft,
  createEquipmentInstanceConditionRepairedDraft,
  createContainmentClassDeficiencyRecordedDraft,
  createContainmentClassInspectedDraft,
  createContainmentClassStabilizedDraft,
  createEquipmentInstanceStationMutatedDraft,
  createContainmentBarrierIntegrityChangedDraft,
  createEquipmentRecoveryCompletedDraft,
  createEquipmentRecoveryStartedDraft,
  createMarketShiftedDraft,
  createMarketTransactionRecordedDraft,
  createProductionQueueCompletedDraft,
  createProductionQueueStartedDraft,
  createProgressionXpGainedDraft,
  createRecruitmentIntelConfirmedDraft,
  createRecruitmentScoutingInitiatedDraft,
  createRecruitmentScoutingRefinedDraft,
  createSystemAcademyUpgradedDraft,
  OPERATION_EVENT_FACTORY_TYPES,
  type OperationEventDraft,
} from '../domain/events/eventBus'
import { validateOperationEventPayload } from '../domain/events/eventValidation'
import { EVENT_TYPE_TO_SOURCE_SYSTEM } from '../domain/events/types'
import { minimalOperationEventPayloads } from './fixtures/minimalOperationEventPayloads'

type FactoryType = (typeof OPERATION_EVENT_FACTORY_TYPES)[number]
type FactoryDraft = { [TType in FactoryType]: OperationEventDraft<TType> }[FactoryType]

function createFactoryDraft(type: FactoryType): FactoryDraft {
  switch (type) {
    case 'assignment.team_assigned':
      return createAssignmentTeamAssignedDraft(
        minimalOperationEventPayloads['assignment.team_assigned']
      )
    case 'assignment.team_unassigned':
      return createAssignmentTeamUnassignedDraft(
        minimalOperationEventPayloads['assignment.team_unassigned']
      )
    case 'agent.hired':
      return createAgentHiredDraft(minimalOperationEventPayloads['agent.hired'])
    case 'agent.training_started':
      return createAgentTrainingStartedDraft(
        minimalOperationEventPayloads['agent.training_started']
      )
    case 'agent.training_completed':
      return createAgentTrainingCompletedDraft(
        minimalOperationEventPayloads['agent.training_completed']
      )
    case 'agent.training_cancelled':
      return createAgentTrainingCancelledDraft(
        minimalOperationEventPayloads['agent.training_cancelled']
      )
    case 'agent.relationship_changed':
      return createAgentRelationshipChangedDraft(
        minimalOperationEventPayloads['agent.relationship_changed']
      )
    case 'agent.instructor_assigned':
      return createAgentInstructorAssignedDraft(
        minimalOperationEventPayloads['agent.instructor_assigned']
      )
    case 'agent.instructor_unassigned':
      return createAgentInstructorUnassignedDraft(
        minimalOperationEventPayloads['agent.instructor_unassigned']
      )
    case 'agent.injured':
      return createAgentInjuredDraft(minimalOperationEventPayloads['agent.injured'])
    case 'agent.killed':
      return createAgentKilledDraft(minimalOperationEventPayloads['agent.killed'])
    case 'agent.betrayed':
      return createAgentBetrayedDraft(minimalOperationEventPayloads['agent.betrayed'])
    case 'agent.resigned':
      return createAgentResignedDraft(minimalOperationEventPayloads['agent.resigned'])
    case 'agent.promoted':
      return createAgentPromotedDraft(minimalOperationEventPayloads['agent.promoted'])
    case 'recruitment.scouting_initiated':
      return createRecruitmentScoutingInitiatedDraft(
        minimalOperationEventPayloads['recruitment.scouting_initiated']
      )
    case 'recruitment.scouting_refined':
      return createRecruitmentScoutingRefinedDraft(
        minimalOperationEventPayloads['recruitment.scouting_refined']
      )
    case 'recruitment.intel_confirmed':
      return createRecruitmentIntelConfirmedDraft(
        minimalOperationEventPayloads['recruitment.intel_confirmed']
      )
    case 'progression.xp_gained':
      return createProgressionXpGainedDraft(minimalOperationEventPayloads['progression.xp_gained'])
    case 'production.queue_started':
      return createProductionQueueStartedDraft(
        minimalOperationEventPayloads['production.queue_started']
      )
    case 'production.queue_completed':
      return createProductionQueueCompletedDraft(
        minimalOperationEventPayloads['production.queue_completed']
      )
    case 'equipment.recovery_started':
      return createEquipmentRecoveryStartedDraft(
        minimalOperationEventPayloads['equipment.recovery_started']
      )
    case 'equipment.recovery_completed':
      return createEquipmentRecoveryCompletedDraft(
        minimalOperationEventPayloads['equipment.recovery_completed']
      )
    case 'equipment.auto_scrap_policy_changed':
      return createEquipmentAutoScrapPolicyChangedDraft(
        minimalOperationEventPayloads['equipment.auto_scrap_policy_changed']
      )
    case 'equipment.auto_scrap_routed':
      return createEquipmentAutoScrapRoutedDraft(
        minimalOperationEventPayloads['equipment.auto_scrap_routed']
      )
    case 'equipment.instance_materialized':
      return createEquipmentInstanceMaterializedDraft(
        minimalOperationEventPayloads['equipment.instance_materialized']
      )
    case 'equipment.instance_destroyed':
      return createEquipmentInstanceDestroyedDraft(
        minimalOperationEventPayloads['equipment.instance_destroyed']
      )
    case 'equipment.instance_reaggregated':
      return createEquipmentInstanceReaggregatedDraft(
        minimalOperationEventPayloads['equipment.instance_reaggregated']
      )
    case 'equipment.instance_condition_repaired':
      return createEquipmentInstanceConditionRepairedDraft(
        minimalOperationEventPayloads['equipment.instance_condition_repaired']
      )
    case 'equipment.containment_class_deficiency_recorded':
      return createContainmentClassDeficiencyRecordedDraft(
        minimalOperationEventPayloads['equipment.containment_class_deficiency_recorded']
      )
    case 'equipment.containment_class_inspected':
      return createContainmentClassInspectedDraft(
        minimalOperationEventPayloads['equipment.containment_class_inspected']
      )
    case 'equipment.containment_class_stabilized':
      return createContainmentClassStabilizedDraft(
        minimalOperationEventPayloads['equipment.containment_class_stabilized']
      )
    case 'equipment.instance_station_mutated':
      return createEquipmentInstanceStationMutatedDraft(
        minimalOperationEventPayloads['equipment.instance_station_mutated']
      )
    case 'equipment.containment_barrier_integrity_changed':
      return createContainmentBarrierIntegrityChangedDraft(
        minimalOperationEventPayloads['equipment.containment_barrier_integrity_changed']
      )
    case 'equipment.combat_stim_activated':
      return createCombatStimActivatedDraft(
        minimalOperationEventPayloads['equipment.combat_stim_activated']
      )
    case 'equipment.combat_stim_overdrive_expired':
      return createCombatStimOverdriveExpiredDraft(
        minimalOperationEventPayloads['equipment.combat_stim_overdrive_expired']
      )
    case 'equipment.combat_stim_disposed':
      return createCombatStimDisposedDraft(
        minimalOperationEventPayloads['equipment.combat_stim_disposed']
      )
    case 'equipment.combat_stim_reaggregated':
      return createCombatStimReaggregatedDraft(
        minimalOperationEventPayloads['equipment.combat_stim_reaggregated']
      )
    case 'market.shifted':
      return createMarketShiftedDraft(minimalOperationEventPayloads['market.shifted'])
    case 'market.transaction_recorded':
      return createMarketTransactionRecordedDraft(
        minimalOperationEventPayloads['market.transaction_recorded']
      )
    case 'faction.standing_changed':
      return createFactionStandingChangedDraft(
        minimalOperationEventPayloads['faction.standing_changed']
      )
    case 'faction.unlock_available':
      return createFactionUnlockAvailableDraft(
        minimalOperationEventPayloads['faction.unlock_available']
      )
    case 'agency.front_business.opened':
      return createAgencyFrontBusinessOpenedDraft(
        minimalOperationEventPayloads['agency.front_business.opened']
      )
    case 'agency.front_business.resolved':
      return createAgencyFrontBusinessResolvedDraft(
        minimalOperationEventPayloads['agency.front_business.resolved']
      )
    case 'system.academy_upgraded':
      return createSystemAcademyUpgradedDraft(
        minimalOperationEventPayloads['system.academy_upgraded']
      )
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled factory type: ${_exhaustive}`)
    }
  }
}

describe('operation event producer drafts validate against schemas', () => {
  it.each([...OPERATION_EVENT_FACTORY_TYPES])(
    'factory draft for %s passes validateOperationEventPayload',
    (type) => {
      const draft = createFactoryDraft(type)
      expect(draft.type).toBe(type)
      const validation = validateOperationEventPayload(type, draft.payload)
      expect(validation.success, validation.error).toBe(true)
      expect(draft.sourceSystem).toBe(EVENT_TYPE_TO_SOURCE_SYSTEM[type])
    }
  )

  it('accepts case.escalated payloads with neighborhoodPressureAuditTag', () => {
    const validation = validateOperationEventPayload(
      'case.escalated',
      minimalOperationEventPayloads['case.escalated']
    )
    expect(validation.success).toBe(true)
  })

  it('accepts production.queue_started payloads with inputMaterials', () => {
    const validation = validateOperationEventPayload(
      'production.queue_started',
      minimalOperationEventPayloads['production.queue_started']
    )
    expect(validation.success).toBe(true)
    expect(
      minimalOperationEventPayloads['production.queue_started'].inputMaterials.length
    ).toBeGreaterThan(0)
  })

  it('accepts system.equipment_recovered strict payloads', () => {
    const validation = validateOperationEventPayload(
      'system.equipment_recovered',
      minimalOperationEventPayloads['system.equipment_recovered']
    )
    expect(validation.success).toBe(true)
  })

  it('accepts case.aggregate_battle strict payloads', () => {
    const validation = validateOperationEventPayload(
      'case.aggregate_battle',
      minimalOperationEventPayloads['case.aggregate_battle']
    )
    expect(validation.success).toBe(true)
  })

  it('accepts staff.coping payloads', () => {
    expect(
      validateOperationEventPayload(
        'staff.coping.applied',
        minimalOperationEventPayloads['staff.coping.applied']
      ).success
    ).toBe(true)
    expect(
      validateOperationEventPayload(
        'staff.coping.misconduct',
        minimalOperationEventPayloads['staff.coping.misconduct']
      ).success
    ).toBe(true)
  })

  it('accepts agency.front_business payloads', () => {
    expect(
      validateOperationEventPayload(
        'agency.front_business.opened',
        minimalOperationEventPayloads['agency.front_business.opened']
      ).success
    ).toBe(true)
    expect(
      validateOperationEventPayload(
        'agency.front_business.resolved',
        minimalOperationEventPayloads['agency.front_business.resolved']
      ).success
    ).toBe(true)
  })
})
