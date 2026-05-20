import { describe, expect, it } from 'vitest'
import { caseTemplateMap, caseTemplates } from '../domain/templates/caseTemplates'

/** SPE-2250 slice 1: batch-4 templates that gained full infiltration stack. */
export const INFILTRATION_CONTENT_SLICE_1_TEMPLATE_IDS = [
  'ops-005',
  'psi-001',
  'info-001',
] as const

/** SPE-2250 slice 2: remaining batch-4 trigger-only templates. */
export const INFILTRATION_CONTENT_SLICE_2_TEMPLATE_IDS = [
  'bio-forensics-001',
  'occult-001',
  'occult-002',
  'occult-004',
  'occult-005',
  'occult-007',
  'psi-004',
  'psi-006',
  'followup_psi_aftermath',
] as const

export const INFILTRATION_CONTENT_BATCH_FOUR_TEMPLATE_IDS = [
  ...INFILTRATION_CONTENT_SLICE_1_TEMPLATE_IDS,
  ...INFILTRATION_CONTENT_SLICE_2_TEMPLATE_IDS,
] as const

describe('infiltration encounter content slice 1', () => {
  it.each(INFILTRATION_CONTENT_SLICE_1_TEMPLATE_IDS)(
    'catalog template %s declares probe plan, cover profile, and leave-behind',
    (templateId) => {
      const template = caseTemplateMap[templateId]

      expect(template?.infiltrationProbePlan?.defaultAction).toBeTruthy()
      expect(template?.infiltrationCoverProfile?.claimedRole).toBeTruthy()
      expect(template?.stealthLeaveBehindId?.trim()).toBeTruthy()
      expect(template?.concealmentTriggers?.length).toBeGreaterThan(0)
    }
  )

  it('extends probe-plan catalog count beyond batch 1–3 baseline', () => {
    const probePlanIds = caseTemplates
      .filter((template) => template.infiltrationProbePlan)
      .map((template) => template.templateId)

    expect(probePlanIds.length).toBeGreaterThanOrEqual(24)
    for (const templateId of INFILTRATION_CONTENT_SLICE_1_TEMPLATE_IDS) {
      expect(probePlanIds).toContain(templateId)
    }
  })
})

describe('infiltration encounter content slice 2', () => {
  it.each(INFILTRATION_CONTENT_SLICE_2_TEMPLATE_IDS)(
    'catalog template %s declares probe plan, cover profile, and leave-behind',
    (templateId) => {
      const template = caseTemplateMap[templateId]

      expect(template?.infiltrationProbePlan?.defaultAction).toBeTruthy()
      expect(template?.infiltrationCoverProfile?.claimedRole).toBeTruthy()
      expect(template?.stealthLeaveBehindId?.trim()).toBeTruthy()
      expect(template?.concealmentTriggers?.length).toBeGreaterThan(0)
    }
  )

  it('completes batch-4 infiltration stack on all twelve migrated templates', () => {
    for (const templateId of INFILTRATION_CONTENT_BATCH_FOUR_TEMPLATE_IDS) {
      const template = caseTemplateMap[templateId]
      expect(template?.infiltrationProbePlan?.defaultAction).toBeTruthy()
      expect(template?.infiltrationCoverProfile?.claimedRole).toBeTruthy()
      expect(template?.stealthLeaveBehindId?.trim()).toBeTruthy()
    }
  })

  it('extends probe-plan catalog count to full batch-4 follow-through', () => {
    const probePlanIds = caseTemplates
      .filter((template) => template.infiltrationProbePlan)
      .map((template) => template.templateId)

    expect(probePlanIds.length).toBeGreaterThanOrEqual(33)
    for (const templateId of INFILTRATION_CONTENT_SLICE_2_TEMPLATE_IDS) {
      expect(probePlanIds).toContain(templateId)
    }
  })
})
