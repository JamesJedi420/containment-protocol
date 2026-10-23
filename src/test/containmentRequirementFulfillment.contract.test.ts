import { describe, expect, it } from 'vitest'
import {
  advanceContainmentRequirementWindow,
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
    const carried = advanceContainmentRequirementWindow(first.state, {
      windowId: 'window:w2', startWeek: 13, endWeek: 15,
    })!
    expect(carried.fulfilledWindowIds).toContain(WINDOW.windowId)
    expect(carried.lastFulfillmentInputRef).toBe('info:same')
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
    expect(attemptContainmentRequirementFulfillment(materialOpen, {
      fulfillmentRef: 'fulfill:under-quantity',
      inputClass: 'material', inputRef: 'mat:too-little',
      campaignWeek: 11, quantity: 1, inputAgeWeeks: 0,
    })?.reasonCodes).toContain('quantity_below_minimum')
    expect(attemptContainmentRequirementFulfillment(materialOpen, {
      fulfillmentRef: 'fulfill:stale',
      inputClass: 'material', inputRef: 'mat:old',
      campaignWeek: 11, quantity: 2, inputAgeWeeks: 2,
    })?.reasonCodes).toContain('freshness_exceeded')
    expect(attemptContainmentRequirementFulfillment(materialOpen, {
      fulfillmentRef: 'fulfill:valid-edge',
      inputClass: 'material', inputRef: 'mat:boundary',
      campaignWeek: 11, quantity: 2, inputAgeWeeks: 1,
    })?.outcome).toBe('accepted')
    // One complete accepted fulfillment settles a window. The zero limit
    // denies even the first contribution without fabricating hydrated counts.
    const zeroLimit = openContainmentRequirementWindow({
      definition: { ...MATERIAL_DEF, constraints: { repetitionMaxPerWindow: 0 } },
      currentWindow: WINDOW,
    })!
    expect(
      attemptContainmentRequirementFulfillment(zeroLimit, {
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
    // The earlier timestamp is an out-of-order duplicate for an already
    // settled window, not a new backward-dated fulfillment.
    const olderReplay = attemptContainmentRequirementFulfillment(first.state, {
      fulfillmentRef: 'fulfill:old-replay',
      inputClass: 'information',
      inputRef: 'info:older',
      campaignWeek: 10,
      quality: 0.9,
    })!
    expect(olderReplay.outcome).toBe('idempotent_noop')
    expect(olderReplay.state).toBe(first.state)
    expect(olderReplay.state.lastFulfillmentWeek).toBe(11)

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

  it('rejects malformed boolean flags and freezes default constraints', () => {
    expect(projectContainmentRequirementDefinition({
      ...INFO_DEF, constraints: { noveltyRequired: 'yes' },
    })).toBeUndefined()
    expect(projectContainmentRequirementDefinition({
      ...INFO_DEF, constraints: { noveltyRequired: 1 },
    })).toBeUndefined()
    expect(projectContainmentRequirementDefinition({
      ...INFO_DEF, allowsRecoveryAfterDeficiency: 1,
    })).toBeUndefined()
    const withoutConstraints = projectContainmentRequirementDefinition({
      ...INFO_DEF, constraints: undefined,
    })!
    expect(Object.isFrozen(withoutConstraints.constraints)).toBe(true)
    expect(withoutConstraints.constraints.noveltyRequired).toBe(false)
  })

  it('fails closed on contradictory hydration lifecycle or missing evidence', () => {
    const open = openContainmentRequirementWindow({ definition: INFO_DEF, currentWindow: WINDOW })!
    const first = attemptContainmentRequirementFulfillment(open, {
      fulfillmentRef: 'fulfill:1', inputClass: 'information', inputRef: 'info:first',
      campaignWeek: 11, quality: 0.9,
    })!
    expect(hydrateContainmentRequirementState({
      ...first.state, fulfilledWindowIds: [],
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...open, fulfilledWindowIds: [WINDOW.windowId],
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...first.state, lastFulfillmentInputRef: undefined,
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...open, lastFulfillmentRef: 'fulfill:partial',
    })).toBeUndefined()
    // A nonsettled packet never carries contribution counts. Accepting a
    // fabricated count could incorrectly exhaust a first fulfillment.
    expect(hydrateContainmentRequirementState({
      ...open, inputClassCountsInWindow: { information: 1 },
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...open, inputClassCountsInWindow: { information: 0 },
    })).toBeUndefined()
    const deficient = evaluateRequirementAgainstCampaignWeek(open, 13)!
    expect(hydrateContainmentRequirementState({
      ...deficient, inputClassCountsInWindow: { information: 1 },
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...first.state, inputClassCountsInWindow: {},
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...first.state, inputClassCountsInWindow: { material: 1 },
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...open, fulfilledWindowIds: [WINDOW.windowId, WINDOW.windowId],
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...open, activationIntentEmittedForWindowIds: ['w1', 'w1'],
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...open,
      lastFulfillmentRef: 'fulfill:orphan',
      lastFulfillmentWeek: 3,
      lastFulfillmentInputRef: 'info:orphan',
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState({
      ...first.state, lastFulfillmentWeek: WINDOW.startWeek - 1,
    })).toBeUndefined()
    expect(hydrateContainmentRequirementState(JSON.parse(JSON.stringify(first.state)))).toBeDefined()
  })

  it('rejects backdated deficiency recovery and accepts later authored recovery', () => {
    const open = openContainmentRequirementWindow({ definition: INFO_DEF, currentWindow: WINDOW })!
    const deficient = evaluateRequirementAgainstCampaignWeek(open, 13)!
    for (const week of [0, 10, 11, 12]) {
      expect(attemptContainmentRequirementFulfillment(deficient, {
        fulfillmentRef: 'fulfill:backdated', inputClass: 'information',
        inputRef: 'info:backdated', campaignWeek: week, quality: 0.8,
      })?.reasonCodes).toContain('outside_fulfillment_window')
    }
    expect(attemptContainmentRequirementFulfillment(deficient, {
      fulfillmentRef: 'fulfill:recovery', inputClass: 'information',
      inputRef: 'info:recovery', campaignWeek: 13, quality: 0.8,
    })?.outcome).toBe('accepted')
  })

  it('preserves cross-window fulfillment and intent history without replay', () => {
    const first = openContainmentRequirementWindow({ definition: MATERIAL_DEF, currentWindow: WINDOW })!
    const emitted = markSpe3041ActivationIntentEmitted(first, 11)
    const fulfilled = attemptContainmentRequirementFulfillment(emitted, {
      fulfillmentRef: 'fulfill:coolant', inputClass: 'material', inputRef: 'mat:first',
      campaignWeek: 11, quantity: 2, inputAgeWeeks: 0,
    })!
    expect(advanceContainmentRequirementWindow(first, {
      windowId: 'window:w2', startWeek: 13, endWeek: 14,
    })).toBeUndefined()
    expect(advanceContainmentRequirementWindow(fulfilled.state, WINDOW)).toBeUndefined()
    const next = advanceContainmentRequirementWindow(fulfilled.state, {
      windowId: 'window:w2', startWeek: 13, endWeek: 15,
    })!
    expect(next.state).toBe('pending')
    expect(next.fulfilledWindowIds).toContain(WINDOW.windowId)
    expect(next.activationIntentEmittedForWindowIds).toContain(WINDOW.windowId)
    expect(next.inputClassCountsInWindow).toEqual({})
    expect(projectSpe3041ActivationIntent(next, 11)).toBeUndefined()
    expect(projectSpe3041ActivationIntent(next, 12)).toBeUndefined()
    expect(projectSpe3041ActivationIntent(next, 13)).toBeDefined()
    expect(projectSpe3041ActivationIntent(next, 16)).toBeUndefined()
    const replay = hydrateContainmentRequirementState(JSON.parse(JSON.stringify(next)))!
    expect(replay.lastFulfillmentInputRef).toBe('mat:first')
    expect(advanceContainmentRequirementWindow(next, {
      windowId: WINDOW.windowId, startWeek: 16, endWeek: 17,
    })).toBeUndefined()
  })

  it('does not emit work activation before or after the canonical window', () => {
    const open = openContainmentRequirementWindow({ definition: MATERIAL_DEF, currentWindow: WINDOW })!
    expect(projectSpe3041ActivationIntent(open, undefined)).toBeUndefined()
    expect(projectSpe3041ActivationIntent(open, 9)).toBeUndefined()
    expect(projectSpe3041ActivationIntent(open, 13)).toBeUndefined()
    const early = evaluateRequirementAgainstCampaignWeek(open, 9)!
    expect(projectSpe3041ActivationIntent(early, 9)).toBeUndefined()
    expect(markSpe3041ActivationIntentEmitted(early, 9)).toBe(early)
    expect(projectSpe3041ActivationIntent(early, 10)).toBeDefined()
    const marked = markSpe3041ActivationIntentEmitted(early, 10)
    expect(projectSpe3041ActivationIntent(marked, 11)).toBeUndefined()
  })

  it('never advances or fulfills backward after a late recovery', () => {
    const open = openContainmentRequirementWindow({ definition: INFO_DEF, currentWindow: WINDOW })!
    const deficient = evaluateRequirementAgainstCampaignWeek(open, 13)!
    const recovered = attemptContainmentRequirementFulfillment(deficient, {
      fulfillmentRef: 'fulfill:late', inputClass: 'information',
      inputRef: 'info:late', campaignWeek: 20, quality: 0.9,
    })!
    expect(recovered.outcome).toBe('accepted')
    const missed2 = advanceContainmentRequirementWindow(recovered.state, {
      windowId: 'window:w2', startWeek: 13, endWeek: 15,
    })!
    expect(missed2.state).toBe('pending')
    expect(attemptContainmentRequirementFulfillment(missed2, {
      fulfillmentRef: 'fulfill:stale', inputClass: 'information',
      inputRef: 'info:stale', campaignWeek: 14, quality: 0.9,
    })?.reasonCodes).toContain('backdated_fulfillment')
    const deficient2 = evaluateRequirementAgainstCampaignWeek(missed2, 20)!
    expect(deficient2.state).toBe('deficient')
    const missed3 = advanceContainmentRequirementWindow(deficient2, {
      windowId: 'window:w3', startWeek: 16, endWeek: 18,
    })!
    expect(evaluateRequirementAgainstCampaignWeek(missed3, 20)?.state).toBe('deficient')
    const next = advanceContainmentRequirementWindow(
      evaluateRequirementAgainstCampaignWeek(missed3, 20)!, {
      windowId: 'window:future', startWeek: 21, endWeek: 24,
    })!
    expect(attemptContainmentRequirementFulfillment(next, {
      fulfillmentRef: 'fulfill:backdated', inputClass: 'information',
      inputRef: 'info:backdated', campaignWeek: 19, quality: 0.9,
    })?.reasonCodes).toContain('backdated_fulfillment')
    const accepted = attemptContainmentRequirementFulfillment(next, {
      fulfillmentRef: 'fulfill:new', inputClass: 'information',
      inputRef: 'info:new', campaignWeek: 21, quality: 0.9,
    })!
    expect(accepted.outcome).toBe('accepted')
    expect(accepted.state.lastFulfillmentWeek).toBe(21)
  })

  it('distinct subjects have distinct collision-safe activation keys', () => {
    const one = openContainmentRequirementWindow({ definition: MATERIAL_DEF, currentWindow: WINDOW })!
    const two = openContainmentRequirementWindow({
      definition: { ...MATERIAL_DEF, subjectRef: 'subject:other' }, currentWindow: WINDOW,
    })!
    const oneKey = projectSpe3041ActivationIntent(one, 11)!.idempotencyKey
    const twoKey = projectSpe3041ActivationIntent(two, 11)!.idempotencyKey
    expect(oneKey).not.toBe(twoKey)
    expect(JSON.parse(oneKey)).toEqual([
      'spe-3041', MATERIAL_DEF.subjectRef, MATERIAL_DEF.requirementId, WINDOW.windowId,
    ])
    const ambiguousA = openContainmentRequirementWindow({
      definition: { ...MATERIAL_DEF, requirementId: 'a:b', subjectRef: 'c' }, currentWindow: WINDOW,
    })!
    const ambiguousB = openContainmentRequirementWindow({
      definition: { ...MATERIAL_DEF, requirementId: 'b', subjectRef: 'a:c' }, currentWindow: WINDOW,
    })!
    expect(projectSpe3041ActivationIntent(ambiguousA, 11)!.idempotencyKey).not.toBe(
      projectSpe3041ActivationIntent(ambiguousB, 11)!.idempotencyKey
    )
  })

  it('refreshes active-window explanation and rejects zero-repeat constraints normally', () => {
    const open = openContainmentRequirementWindow({ definition: INFO_DEF, currentWindow: WINDOW })!
    const before = evaluateRequirementAgainstCampaignWeek(open, 9)!
    expect(before.reasonCodes).toContain('before_window')
    const active = evaluateRequirementAgainstCampaignWeek(before, 10)!
    expect(active.state).toBe('pending')
    expect(active.reasonCodes).not.toContain('before_window')
    const noRepeats = openContainmentRequirementWindow({
      definition: { ...MATERIAL_DEF, constraints: { repetitionMaxPerWindow: 0 } },
      currentWindow: WINDOW,
    })!
    expect(attemptContainmentRequirementFulfillment(noRepeats, {
      fulfillmentRef: 'fulfill:blocked', inputClass: 'material',
      inputRef: 'mat:any', campaignWeek: 11,
    })?.reasonCodes).toContain('repetition_max_exceeded')
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
    expect(projectSpe3041ActivationIntent(open, 11)).toBeUndefined()
  })

  it('emits a single SPE-3041 activation intent per window for work-producing requirements', () => {
    const open = openContainmentRequirementWindow({
      definition: MATERIAL_DEF,
      currentWindow: WINDOW,
    })!
    const intent1 = projectSpe3041ActivationIntent(open, 11)!
    expect(intent1.activationOwner).toBe('SPE-3041')
    expect(intent1.idempotencyKey).toContain(WINDOW.windowId)

    const marked = markSpe3041ActivationIntentEmitted(open, 11)
    expect(projectSpe3041ActivationIntent(marked, 11)).toBeUndefined()

    const markedAgain = markSpe3041ActivationIntentEmitted(marked, 11)
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
