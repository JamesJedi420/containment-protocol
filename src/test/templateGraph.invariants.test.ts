import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { caseTemplateMap } from '../data/caseTemplates'
import { starterCaseSeeds } from '../domain/templates'
import { instantiateFromTemplate } from '../domain/sim/spawn'
import { getCaseAssignmentInsights } from '../features/cases/caseInsights'

function collectStarterLinkedTemplateIds(maxDepth = 2) {
  const seen = new Set<string>()
  let frontier = new Set(starterCaseSeeds.map((seed) => seed.templateId))

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const nextFrontier = new Set<string>()

    for (const templateId of frontier) {
      if (seen.has(templateId)) {
        continue
      }

      seen.add(templateId)
      const template = caseTemplateMap[templateId]
      if (!template) {
        continue
      }

      for (const linkedId of [
        ...template.onFail.spawnTemplateIds,
        ...template.onUnresolved.spawnTemplateIds,
      ]) {
        if (!seen.has(linkedId)) {
          nextFrontier.add(linkedId)
        }
      }
    }

    frontier = nextFrontier
  }

  return [...seen].sort((left, right) => left.localeCompare(right))
}

describe('template graph invariants', () => {
  it('starter-linked templates resolve to known template ids', () => {
    const linkedTemplateIds = collectStarterLinkedTemplateIds(2)

    expect(linkedTemplateIds.length).toBeGreaterThan(0)
    for (const templateId of linkedTemplateIds) {
      expect(caseTemplateMap[templateId]).toBeDefined()
    }
  })

  it('starter-linked templates are not universally blocked by required roles/tags', () => {
    const baseState = createStartingState()
    const linkedTemplateIds = collectStarterLinkedTemplateIds(2)

    for (const templateId of linkedTemplateIds) {
      const template = caseTemplateMap[templateId]
      if (!template) {
        continue
      }

      const instantiated = {
        ...instantiateFromTemplate(template, () => 0.5, new Set(Object.keys(baseState.cases))),
        id: `probe-${template.templateId}`,
        assignedTeamIds: [],
        status: 'open' as const,
      }

      const state = {
        ...baseState,
        cases: {
          [instantiated.id]: instantiated,
        },
      }
      const insights = getCaseAssignmentInsights(instantiated, state)

      const blockedByHardGatesOnly =
        insights.availableTeams.length === 0 &&
        insights.blockedTeams.length > 0 &&
        insights.blockedTeams.every(
          (entry) =>
            entry.reason === 'missing-required-roles' || entry.reason === 'missing-required-tags'
        )

      expect(
        blockedByHardGatesOnly,
        `Template ${templateId} is hard-gated for all starter teams by required roles/tags.`
      ).toBe(false)
    }
  })
})
