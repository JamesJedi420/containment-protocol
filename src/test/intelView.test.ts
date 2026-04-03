import { describe, expect, it } from 'vitest'
import { caseTemplateMap } from '../domain/templates/caseTemplates'
import {
  getAllIntelViews,
  getIntelRequiredTagOptions,
  getTemplateIntelView,
} from '../features/intel/intelView'

describe('intel view contract', () => {
  it('derives raid-conversion rules and spawn graph links from template data', () => {
    const intel = getTemplateIntelView('mixed_eclipse_ritual', caseTemplateMap)

    expect(intel).toBeDefined()
    expect(intel?.isRaidCapable).toBe(true)
    expect(intel?.pressureSignals).toContain('Raid conversion at Stage 2')
    expect(intel?.failTargets.map((entry) => entry.templateId)).toEqual(
      expect.arrayContaining(['followup_blackout', 'followup_targeted_abductions'])
    )
    expect(intel?.unresolvedTargets.map((entry) => entry.templateId)).toEqual(
      expect.arrayContaining(['followup_blackout', 'followup_targeted_abductions'])
    )
  })

  it('keeps every surfaced template id resolvable against the active catalog', () => {
    const views = getAllIntelViews(caseTemplateMap)
    const catalogIds = Object.keys(caseTemplateMap)

    expect(views).toHaveLength(catalogIds.length)
    expect(new Set(views.map((view) => view.template.templateId)).size).toBe(catalogIds.length)

    for (const view of views) {
      expect(caseTemplateMap[view.template.templateId]).toBeDefined()

      for (const target of [
        ...view.failTargets,
        ...view.unresolvedTargets,
        ...view.incomingSignals,
      ]) {
        expect(caseTemplateMap[target.templateId]).toBeDefined()
      }
    }
  })

  it('derives required-tag options from the same visible intel views used by the browser', () => {
    const views = getAllIntelViews(caseTemplateMap)
    const tagOptions = getIntelRequiredTagOptions(views)

    expect(tagOptions).toEqual(expect.arrayContaining(['occultist', 'tech', 'negotiator']))
  })
})
