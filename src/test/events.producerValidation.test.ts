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
  createCombatStimOverdriveExpiredDraft,
  createEquipmentInstanceMaterializedDraft,
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

function createFactoryDraft<TType extends (typeof OPERATION_EVENT_FACTORY_TYPES)[number]>(
  type: TType
): OperationEventDraft<TType> {
  const payload = minimalOperationEventPayloads[type]

  switch (type) {
    case 'assignment.team_assigned':
      return createAssignmentTeamAssignedDraft(payload)
    case 'assignment.team_unassigned':
      return createAssignmentTeamUnassignedDraft(payload)
    case 'agent.hired':
      return createAgentHiredDraft(payload)
    case 'agent.training_started':
      return createAgentTrainingStartedDraft(payload)
    case 'agent.training_completed':
      return createAgentTrainingCompletedDraft(payload)
    case 'agent.training_cancelled':
      return createAgentTrainingCancelledDraft(payload)
    case 'agent.relationship_changed':
      return createAgentRelationshipChangedDraft(payload)
    case 'agent.instructor_assigned':
      return createAgentInstructorAssignedDraft(payload)
    case 'agent.instructor_unassigned':
      return createAgentInstructorUnassignedDraft(payload)
    case 'agent.injured':
      return createAgentInjuredDraft(payload)
    case 'agent.killed':
      return createAgentKilledDraft(payload)
    case 'agent.betrayed':
      return createAgentBetrayedDraft(payload)
    case 'agent.resigned':
      return createAgentResignedDraft(payload)
    case 'agent.promoted':
      return createAgentPromotedDraft(payload)
    case 'recruitment.scouting_initiated':
      return createRecruitmentScoutingInitiatedDraft(payload)
    case 'recruitment.scouting_refined':
      return createRecruitmentScoutingRefinedDraft(payload)
    case 'recruitment.intel_confirmed':
      return createRecruitmentIntelConfirmedDraft(payload)
    case 'progression.xp_gained':
      return createProgressionXpGainedDraft(payload)
    case 'production.queue_started':
      return createProductionQueueStartedDraft(payload)
    case 'production.queue_completed':
      return createProductionQueueCompletedDraft(payload)
    case 'equipment.recovery_started':
      return createEquipmentRecoveryStartedDraft(payload)
    case 'equipment.recovery_completed':
      return createEquipmentRecoveryCompletedDraft(payload)
    case 'equipment.auto_scrap_policy_changed':
      return createEquipmentAutoScrapPolicyChangedDraft(payload)
    case 'equipment.auto_scrap_routed':
      return createEquipmentAutoScrapRoutedDraft(payload)
    case 'equipment.instance_materialized':
      return createEquipmentInstanceMaterializedDraft(payload)
    case 'equipment.combat_stim_activated':
      return createCombatStimActivatedDraft(payload)
    case 'equipment.combat_stim_overdrive_expired':
      return createCombatStimOverdriveExpiredDraft(payload)
    case 'market.shifted':
      return createMarketShiftedDraft(payload)
    case 'market.transaction_recorded':
      return createMarketTransactionRecordedDraft(payload)
    case 'faction.standing_changed':
      return createFactionStandingChangedDraft(payload)
    case 'faction.unlock_available':
      return createFactionUnlockAvailableDraft(payload)
    case 'agency.front_business.opened':
      return createAgencyFrontBusinessOpenedDraft(payload)
    case 'agency.front_business.resolved':
      return createAgencyFrontBusinessResolvedDraft(payload)
    case 'system.academy_upgraded':
      return createSystemAcademyUpgradedDraft(payload)
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
