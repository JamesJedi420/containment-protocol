import { describe, expect, it } from 'vitest'
import {
  attemptContainmentRequirementFulfillment,
  evaluateRequirementAgainstCampaignWeek,
  hydrateContainmentRequirementState,
  markSpe3041ActivationIntentEmitted,
  openContainmentRequirementWindow,
  projectContainmentRequirementDefinition,
  projectDutyConsumptionFromRequirement,
  projectExplainableRequirementStatus,
  projectSpe3041ActivationIntent,
} from '../domain/containmentRequirementFulfillment'

const INFO_DEF = {
  requirementId: 'req:briefing-dossier',
  subjectRef: 'subject:anomaly-a',
  requirementClass: 'information_input' as const,
  acceptableInputClasses: ['information' as const],
  prohibitedInputClasses: ['material' as const],
  constraints: {
    qualityMin: 0.5,
    noveltyRequired: true,
  },
  deficiencySeverity: 'major' as const,
  deficiencyConsequenceRef: 'consequence:intel-gap',
  createsWork: false,
  allowsRecoveryAfterDeficiency: true,
}

const MATERIAL_DEF = {
  requirementId: 'req:coolant-service',
  subjectRef: 'subject:entity-b',
  requirementClass: 'material_service' as const,
  acceptableInputClasses: ['material' as const, 'service' as const],
  constraints: {
    quantityMin: 2,
    freshnessMaxAgeWeeks: 1,
    repetitionMaxPerWindow: 1,
  },
  deficiencySeverity: 'critical' as const,
  deficiencyConsequenceRef: 'consequence:thermal-risk',
  createsWork: true,
  allowsRecoveryAfterDeficiency: false,
}

const WINDOW = { windowId: 'window:w1', startWeek: 10, endWeek: 12 }

describe('SPE-3181 recurring containment requirement fulfillment', () => {
  it('supports information and material/service requirement families on one contract', () => {
    const info = projectContainmentRequirementDefinition(INFO_DEF)
    const material = projectContainmentRequirementDefinition(MATERIAL_DEF)
    expect(info?.requirementClass).toBe('information_input')
    expect(material?.requirementClass).toBe('material_service')
    expect(info?.createsWork).toBe(false)
    expect(material?.createsWork).toBe(true)
  })

  it('accepts fulfillment inside the window and rejects outside', () => {
    const open = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!
    const inside = attemptContainmentRequirementFulfillment(open, {
      fulfillmentRef: 'fulfill:1',
      inputClass: 'information',
      inputRef: 'info:dossier-v1',
      campaignWeek: 11,
      quality: 0.8,
    })
    expect(inside?.outcome).toBe('accepted')
    expect(inside?.state.state).toBe('satisfied')

    const open2 = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!
    const outside = attemptContainmentRequirementFulfillment(open2, {
      fulfillmentRef: 'fulfill:2',
      inputClass: 'information',
      inputRef: 'info:dossier-v2',
      campaignWeek: 14,
      quality: 0.8,
    })
    expect(outside?.outcome).toBe('rejected')
    expect(outside?.reasonCodes).toContain('outside_fulfillment_window')
  })

  it('rejects prohibited or low-quality inputs and novelty/repetition violations', () => {
    const open = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!
    expect(
      attemptContainmentRequirementFulfillment(open, {
        fulfillmentRef: 'fulfill:bad-class',
        inputClass: 'material',
        inputRef: 'mat:x',
        campaignWeek: 11,
      })?.reasonCodes
    ).toContain('prohibited_input_class')

    expect(
      attemptContainmentRequirementFulfillment(open, {
        fulfillmentRef: 'fulfill:low-q',
        inputClass: 'information',
        inputRef: 'info:weak',
        campaignWeek: 11,
        quality: 0.2,
      })?.reasonCodes
    ).toContain('quality_below_minimum')

    const first = attemptContainmentRequirementFulfillment(open, {
      fulfillmentRef: 'fulfill:a',
      inputClass: 'information',
      inputRef: 'info:same',
      campaignWeek: 11,
      quality: 0.9,
    })!
    const nextWindow = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: { windowId: 'window:w2', startWeek: 13, endWeek: 15 },
    })!
    const carried = hydrateContainmentRequirementState({
      ...nextWindow,
      lastFulfillmentInputRef: first.state.lastFulfillmentInputRef,
      fulfilledWindowIds: first.state.fulfilledWindowIds,
    })!
    expect(
      attemptContainmentRequirementFulfillment(carried, {
        fulfillmentRef: 'fulfill:b',
        inputClass: 'information',
        inputRef: 'info:same',
        campaignWeek: 14,
        quality: 0.9,
      })?.reasonCodes
    ).toContain('novelty_required')

    const materialOpen = openContainmentRequirementWindow({
      definition: MATERIAL_DEF,
      currentWindow: WINDOW,
    })!
    const m1 = attemptContainmentRequirementFulfillment(materialOpen, {
      fulfillmentRef: 'fulfill:coolant-1',
      inputClass: 'material',
      inputRef: 'mat:coolant-a',
      campaignWeek: 11,
      quantity: 2,
      inputAgeWeeks: 0,
    })!
    expect(m1.outcome).toBe('accepted')
    // New window with repetition already counted for same class would need prior counts;
    // verify repetition gate on a pending state with pre-seeded counts.
    const seeded = hydrateContainmentRequirementState({
      ...materialOpen,
      inputClassCountsInWindow: { material: 1 },
    })!
    expect(
      attemptContainmentRequirementFulfillment(seeded, {
        fulfillmentRef: 'fulfill:coolant-2',
        inputClass: 'material',
        inputRef: 'mat:coolant-b',
        campaignWeek: 11,
        quantity: 2,
        inputAgeWeeks: 0,
      })?.reasonCodes
    ).toContain('repetition_max_exceeded')
  })

  it('transitions missed windows to deficiency and allows authored recovery', () => {
    const open = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!
    const deficient = evaluateRequirementAgainstCampaignWeek(open, 13)!
    expect(deficient.state).toBe('deficient')
    expect(deficient.reasonCodes).toContain('missed_window')

    const recovered = attemptContainmentRequirementFulfillment(deficient, {
      fulfillmentRef: 'fulfill:late',
      inputClass: 'information',
      inputRef: 'info:recovery',
      campaignWeek: 14,
      quality: 0.7,
    })
    expect(recovered?.outcome).toBe('accepted')
    expect(recovered?.state.state).toBe('satisfied')
    expect(recovered?.reasonCodes).toContain('recovered_from_deficiency')

    const materialOpen = openContainmentRequirementWindow({
      definition: MATERIAL_DEF,
      currentWindow: WINDOW,
    })!
    const materialDeficient = evaluateRequirementAgainstCampaignWeek(materialOpen, 20)!
    expect(materialDeficient.state).toBe('deficient')
    expect(
      attemptContainmentRequirementFulfillment(materialDeficient, {
        fulfillmentRef: 'fulfill:too-late',
        inputClass: 'material',
        inputRef: 'mat:x',
        campaignWeek: 11,
        quantity: 2,
        inputAgeWeeks: 0,
      })?.reasonCodes
    ).toContain('deficient_no_recovery')
  })

  it('keeps same-window fulfillment idempotent across repeat and save/load', () => {
    const open = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!
    const first = attemptContainmentRequirementFulfillment(open, {
      fulfillmentRef: 'fulfill:1',
      inputClass: 'information',
      inputRef: 'info:a',
      campaignWeek: 11,
      quality: 0.8,
    })!
    const second = attemptContainmentRequirementFulfillment(first.state, {
      fulfillmentRef: 'fulfill:2',
      inputClass: 'information',
      inputRef: 'info:b',
      campaignWeek: 11,
      quality: 0.9,
    })!
    expect(second.outcome).toBe('idempotent_noop')

    const roundTrip = hydrateContainmentRequirementState(
      JSON.parse(JSON.stringify(first.state))
    )!
    expect(roundTrip.state).toBe('satisfied')
    expect(
      attemptContainmentRequirementFulfillment(roundTrip, {
        fulfillmentRef: 'fulfill:3',
        inputClass: 'information',
        inputRef: 'info:c',
        campaignWeek: 11,
        quality: 0.9,
      })?.outcome
    ).toBe('idempotent_noop')

    const pendingRt = hydrateContainmentRequirementState(
      JSON.parse(JSON.stringify(open))
    )!
    expect(pendingRt.state).toBe('pending')

    const deficient = evaluateRequirementAgainstCampaignWeek(open, 99)!
    const deficientRt = hydrateContainmentRequirementState(
      JSON.parse(JSON.stringify(deficient))
    )!
    expect(deficientRt.state).toBe('deficient')
  })

  it('fails closed on malformed definitions and unknown refs', () => {
    expect(projectContainmentRequirementDefinition(null)).toBeUndefined()
    expect(
      projectContainmentRequirementDefinition({
        ...INFO_DEF,
        requirementId: '',
      })
    ).toBeUndefined()
    expect(
      hydrateContainmentRequirementState({
        definition: INFO_DEF,
        currentWindow: { windowId: 'w', startWeek: 5, endWeek: 1 },
        state: 'pending',
      })
    ).toBeUndefined()
    expect(attemptContainmentRequirementFulfillment(openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!, { fulfillmentRef: 'x' })).toBeUndefined()
  })

  it('does not emit SPE-3041 intents for passive requirements', () => {
    const open = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!
    expect(projectSpe3041ActivationIntent(open)).toBeUndefined()
  })

  it('emits a single SPE-3041 activation intent per window for work-producing requirements', () => {
    const open = openContainmentRequirementWindow({
      definition: MATERIAL_DEF,
      currentWindow: WINDOW,
    })!
    const intent1 = projectSpe3041ActivationIntent(open)!
    expect(intent1.activationOwner).toBe('SPE-3041')
    expect(intent1.idempotencyKey).toContain(WINDOW.windowId)

    const marked = markSpe3041ActivationIntentEmitted(open)
    expect(projectSpe3041ActivationIntent(marked)).toBeUndefined()

    const markedAgain = markSpe3041ActivationIntentEmitted(marked)
    expect(markedAgain.activationIntentEmittedForWindowIds).toEqual(
      marked.activationIntentEmittedForWindowIds
    )
  })

  it('projects SPE-1135 duty consumption without becoming requirement authority', () => {
    const open = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!
    const duty = projectDutyConsumptionFromRequirement(open)
    expect(duty.dutyOwner).toBe('SPE-1135')
    expect(duty.requirementRemainsAuthority).toBe(true)
    expect(duty.fulfillmentOutcome).toBe('pending')

    const satisfied = attemptContainmentRequirementFulfillment(open, {
      fulfillmentRef: 'fulfill:1',
      inputClass: 'information',
      inputRef: 'info:a',
      campaignWeek: 11,
      quality: 0.8,
    })!
    expect(projectDutyConsumptionFromRequirement(satisfied.state).fulfillmentOutcome).toBe(
      'satisfied'
    )
  })

  it('exposes explainable status for planning surfaces', () => {
    const open = openContainmentRequirementWindow({
      definition: INFO_DEF,
      currentWindow: WINDOW,
    })!
    const status = projectExplainableRequirementStatus(open)
    expect(status).toMatchObject({
      requirementId: INFO_DEF.requirementId,
      windowId: WINDOW.windowId,
      state: 'pending',
      createsWork: false,
    })
  })
})
