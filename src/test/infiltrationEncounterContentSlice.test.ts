import { describe, expect, it } from 'vitest'
import { caseTemplateMap, caseTemplates } from '../domain/templates/caseTemplates'

/** SPE-2250 slice 1: batch-4 templates that gained full infiltration stack. */
export const INFILTRATION_CONTENT_SLICE_1_TEMPLATE_IDS = [
  'ops-005',
  'psi-001',
  'info-001',
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
