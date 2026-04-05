import { describe, expect, it } from 'vitest'
import { caseTemplateMap } from '../data/caseTemplates'
import { CASE_LORE_STUBS } from '../data/copy'
import { createStartingState } from '../data/startingState'
import {
  assertKnownAuthoredAbilities,
  getAuthoredAbilityValidationIssues,
  resolveAbilityEffect,
} from '../domain/abilities'
import { computeTeamScore } from '../domain/sim/scoring'
import {
  caseTemplates,
  agentClassTables,
  createStarterAgent,
  createStarterCase,
  getCaseTemplateCatalogErrors,
  starterCaseSeeds,
  starterCases,
  starterRoster,
  starterRosterBlueprints,
  starterTeams,
} from '../domain/templates'

describe('starter content contracts', () => {
  it('builds starter agents from class tables with merged role tags and explicit overrides', () => {
    const agent = createStarterAgent({
      id: 'agent-test',
      name: 'Test Specialist',
      role: 'tech',
      tags: ['field-kit', 'analyst'],
      fatigue: 12,
    })

    expect(agent.baseStats).toEqual(agentClassTables.tech.baseStats)
    expect(agent.tags).toEqual(['tech', 'analyst', 'field-kit'])
    expect(agent.fatigue).toBe(12)
    expect(agent.status).toBe('active')
  })

  it('falls back to class defaults when starter agent overrides are malformed', () => {
    const agent = createStarterAgent({
      id: 'agent-test',
      name: 'Broken Specialist',
      role: 'medic',
      baseStats: { combat: 11, investigation: 22, utility: 33, social: 44 },
      fatigue: Number.NaN,
      status: 'mystery' as never,
      tags: [],
    })

    expect(agent.baseStats).toEqual({ combat: 11, investigation: 22, utility: 33, social: 44 })
    expect(agent.fatigue).toBe(0)
    expect(agent.status).toBe('active')
  })

  it('keeps class-table tag arrays isolated from returned starter agents', () => {
    const agent = createStarterAgent({
      id: 'agent-test',
      name: 'Cloned Specialist',
      role: 'tech',
      tags: ['analyst'],
    })

    agent.tags.push('field-kit')

    expect(agent.tags).toEqual(['tech', 'analyst', 'field-kit'])
    expect(agentClassTables.tech.tags).toEqual(['tech', 'analyst'])
  })

  it('materializes the starter roster and teams with aligned memberships', () => {
    expect(starterRosterBlueprints).toHaveLength(8)
    expect(Object.keys(starterRoster)).toEqual([
      'a_ava',
      'a_kellan',
      'a_mina',
      'a_rook',
      'a_sato',
      'a_juno',
      'a_eli',
      'a_casey',
    ])

    expect(starterRoster['a_ava']).toMatchObject({
      name: 'Ava Brooks',
      role: 'hunter',
      fatigue: 10,
    })
    expect(starterRoster['a_ava'].relationships).toMatchObject({ a_kellan: 2, a_mina: 1 })

    expect(starterTeams['t_nightwatch']).toMatchObject({
      name: 'Night Watch',
      agentIds: ['a_ava', 'a_kellan', 'a_mina', 'a_rook'],
      tags: ['van'],
    })
    expect(starterTeams['t_greentape']).toMatchObject({
      name: 'Green Tape',
      agentIds: ['a_sato', 'a_juno', 'a_eli', 'a_casey'],
      tags: ['lab-kit'],
    })
  })

  it('keeps seeded passive support abilities present, passive, and registry-backed', () => {
    expect(starterRoster['a_juno'].abilities).toEqual([
      expect.objectContaining({ id: 'ward-hum', type: 'passive' }),
    ])
    expect(starterRoster['a_eli'].abilities).toEqual([
      expect.objectContaining({ id: 'civil-calibration', type: 'passive' }),
    ])
    expect(starterRoster['a_casey'].abilities).toEqual([
      expect.objectContaining({ id: 'triage-rhythm', type: 'passive' }),
    ])

    for (const ability of [
      ...(starterRoster['a_juno'].abilities ?? []),
      ...(starterRoster['a_eli'].abilities ?? []),
      ...(starterRoster['a_casey'].abilities ?? []),
    ]) {
      expect(Object.keys(ability.effect)).not.toHaveLength(0)
    }

    const issues = getAuthoredAbilityValidationIssues(
      starterRosterBlueprints.map(({ id, name, abilities }) => ({
        ownerId: id,
        ownerName: name,
        abilities,
      }))
    )

    expect(issues).toEqual([])
  })

  it('reports authored ability validation issues for unknown ability ids', () => {
    const issues = getAuthoredAbilityValidationIssues([
      {
        ownerId: 'agent-test',
        ownerName: 'Test Agent',
        abilities: [
          {
            id: 'unknown-support-hum',
            label: 'Unknown Support Hum',
            type: 'passive',
            effect: { presence: 1 },
          },
        ],
      },
    ])

    expect(issues).toEqual([
      {
        ownerId: 'agent-test',
        ownerName: 'Test Agent',
        abilityId: 'unknown-support-hum',
      },
    ])
  })

  it('throws for unknown authored ability ids when strict validation is requested', () => {
    expect(() =>
      assertKnownAuthoredAbilities(
        [
          {
            ownerId: 'agent-test',
            ownerName: 'Test Agent',
            abilities: [
              {
                id: 'unknown-support-hum',
                label: 'Unknown Support Hum',
                type: 'passive',
                effect: { presence: 1 },
              },
            ],
          },
        ],
        'starter roster abilities'
      )
    ).toThrow('Unknown starter roster abilities: agent-test (Test Agent): unknown-support-hum')
  })

  it('resolves seeded passive support abilities safely in evaluation context', () => {
    const eli = starterRoster['a_eli']
    const eliEffect = resolveAbilityEffect(eli.abilities![0], {
      agent: eli,
      phase: 'evaluation',
    })

    expect(eliEffect.activeInMvp).toBe(true)
    expect(eliEffect.type).toBe('passive')
    expect(eliEffect.modifiers).toMatchObject({ presence: 3 })

    const casey = starterRoster['a_casey']
    const caseyEvaluationEffect = resolveAbilityEffect(casey.abilities![0], {
      agent: casey,
      phase: 'evaluation',
      caseData: {
        ...createStartingState().cases['case-001'],
        tags: ['medical', 'support'],
        requiredTags: [],
        preferredTags: [],
      },
    })
    const caseyRecoveryEffect = resolveAbilityEffect(casey.abilities![0], {
      agent: casey,
      phase: 'recovery',
    })

    expect(caseyEvaluationEffect.activeInMvp).toBe(true)
    expect(caseyEvaluationEffect.type).toBe('passive')
    expect(caseyEvaluationEffect.modifiers.presence ?? 0).toBeGreaterThan(0)
    expect(caseyEvaluationEffect.modifiers.resilience ?? 0).toBeGreaterThan(0)
    expect(caseyEvaluationEffect.stressImpactMultiplier).toBeLessThan(1)
    expect(caseyRecoveryEffect.moraleRecoveryDelta).toBeGreaterThan(0)
  })

  it('lets seeded passive support abilities improve support-heavy team scoring', () => {
    const supportCase = {
      ...createStartingState().cases['case-001'],
      preferredTags: [],
      requiredTags: [],
      requiredRoles: [],
      tags: ['support', 'negotiation'],
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 35 },
      weights: { combat: 0, investigation: 0, utility: 0, social: 1 },
    }
    const eliBaseline = {
      ...starterRoster['a_eli'],
      abilities: [],
    }

    const baseline = computeTeamScore([eliBaseline], supportCase)
    const buffed = computeTeamScore([starterRoster['a_eli']], supportCase)

    expect(buffed.agentPerformance[0].support).toBeGreaterThan(baseline.agentPerformance[0].support)
    expect(buffed.score).toBeGreaterThan(baseline.score)
  })

  it('builds seeded starting cases from templates while preserving starter-specific overrides', () => {
    expect(starterCaseSeeds.map((seed) => seed.id)).toEqual(['case-001', 'case-002', 'case-003'])

    expect(starterCases['case-001']).toMatchObject({
      templateId: 'combat_vampire_nest',
      title: caseTemplateMap['combat_vampire_nest'].title,
      deadlineRemaining: caseTemplateMap['combat_vampire_nest'].deadlineWeeks,
      requiredTags: [],
      preferredTags: ['silver', 'holy'],
    })

    expect(starterCases['case-002']).toMatchObject({
      templateId: 'puzzle_whispering_archive',
      title: caseTemplateMap['puzzle_whispering_archive'].title,
      preferredTags: ['scholar', 'tech', 'medium'],
    })

    expect(starterCases['case-003']).toMatchObject({
      templateId: 'mixed_eclipse_ritual',
      title: caseTemplateMap['mixed_eclipse_ritual'].title,
      requiredRoles: ['containment', 'technical'],
      requiredTags: ['occultist'],
    })
  })

  it('normalizes malformed starter case overrides while keeping template data intact', () => {
    const caseInstance = createStarterCase({
      id: 'case-test',
      templateId: 'mixed_eclipse_ritual',
      stage: 99,
      status: 'mystery' as never,
      deadlineRemaining: Number.NaN,
      assignedTeamIds: ['t_nightwatch', 't_nightwatch'],
    })

    expect(caseInstance.stage).toBe(5)
    expect(caseInstance.status).toBe('open')
    expect(caseInstance.deadlineRemaining).toBe(
      caseTemplateMap['mixed_eclipse_ritual'].deadlineWeeks
    )
    expect(caseInstance.assignedTeamIds).toEqual(['t_nightwatch'])
    expect(caseInstance.requiredRoles).toEqual(['containment', 'technical'])
    expect(caseInstance.requiredTags).toEqual(['occultist'])
  })

  it('keeps template arrays isolated and throws for unknown starter cases', () => {
    const caseInstance = createStarterCase({
      id: 'case-test',
      templateId: 'combat_vampire_nest',
      assignedTeamIds: ['t_nightwatch'],
    })

    caseInstance.tags.push('mutated')
    caseInstance.requiredRoles?.push('support')
    caseInstance.requiredTags.push('mutated')
    caseInstance.preferredTags.push('mutated')
    caseInstance.onFail.spawnTemplateIds.push('mutated')

    expect(caseInstance.tags).toContain('mutated')
    expect(caseTemplateMap['combat_vampire_nest'].tags).not.toContain('mutated')
    expect(caseTemplateMap['combat_vampire_nest'].requiredRoles ?? []).not.toContain('support')
    expect(caseTemplateMap['combat_vampire_nest'].requiredTags ?? []).not.toContain('mutated')
    expect(caseTemplateMap['combat_vampire_nest'].preferredTags ?? []).not.toContain('mutated')
    expect(caseTemplateMap['combat_vampire_nest'].onFail.spawnTemplateIds).not.toContain('mutated')

    expect(() =>
      createStarterCase({
        id: 'missing-case',
        templateId: 'missing-template',
      })
    ).toThrow('Unknown starter case template: missing-template')
  })

  it('creates fresh starting states without sharing mutable nested references', () => {
    const stateA = createStartingState()
    const stateB = createStartingState()

    stateA.teams['t_nightwatch'].assignedCaseId = 'case-001'
    stateA.cases['case-001'].assignedTeamIds.push('t_nightwatch')
    stateA.cases['case-001'].onFail.spawnTemplateIds.push('combat_vampire_nest')

    expect(stateB.teams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(stateB.cases['case-001'].assignedTeamIds).toEqual([])
    expect(stateB.cases['case-001'].onFail.spawnTemplateIds).toEqual(['followup_missing_persons'])
    expect(stateB.templates).toEqual(caseTemplateMap)
  })

  it('keeps case template spawn references resolvable in the template map', () => {
    const referencedTemplateIds = caseTemplates.flatMap((template) => [
      ...template.onFail.spawnTemplateIds,
      ...template.onUnresolved.spawnTemplateIds,
    ])

    for (const templateId of referencedTemplateIds) {
      expect(caseTemplateMap[templateId]).toBeDefined()
    }
  })

  it('keeps the authored case template catalog internally valid', () => {
    expect(getCaseTemplateCatalogErrors(caseTemplates)).toEqual([])
  })

  it('keeps authored template ids and raid conversion hooks structurally consistent', () => {
    const templateIds = caseTemplates.map((template) => template.templateId)
    const uniqueTemplateIds = new Set(templateIds)

    expect(uniqueTemplateIds.size).toBe(templateIds.length)

    for (const template of caseTemplates) {
      expect(template.title).not.toEqual('')
      expect(template.description).not.toEqual('')
      expect(template.durationWeeks).toBeGreaterThan(0)
      expect(template.deadlineWeeks).toBeGreaterThan(0)

      if (template.raid) {
        expect(template.raid.minTeams).toBeLessThanOrEqual(template.raid.maxTeams)
        expect(template.raid.minTeams).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('keeps roster relationships and team memberships internally consistent', () => {
    const rosterIds = new Set(Object.keys(starterRoster))

    for (const agent of Object.values(starterRoster)) {
      for (const relationshipId of Object.keys(agent.relationships)) {
        expect(rosterIds.has(relationshipId)).toBe(true)
      }
    }

    for (const team of Object.values(starterTeams)) {
      for (const agentId of team.agentIds) {
        expect(rosterIds.has(agentId)).toBe(true)
      }
    }
  })

  it('ensures required template tags and role coverage are satisfiable by at least one starter team', () => {
    const teamCapabilitySets = Object.values(starterTeams).map((team) => {
      const teamTags = team.tags.map((tag) => tag.toLowerCase())
      const agentTags = team.agentIds
        .flatMap((agentId) => starterRoster[agentId]?.tags ?? [])
        .map((tag) => tag.toLowerCase())
      const roleCoverage = [
        ...new Set(team.agentIds.map((agentId) => starterRoster[agentId]?.role)),
      ]
        .filter((role): role is NonNullable<typeof role> => Boolean(role))
        .map((role) =>
          role === 'hunter'
            ? 'tactical'
            : role === 'occultist' || role === 'medium'
              ? 'containment'
              : role === 'investigator'
                ? 'investigator'
                : role === 'tech'
                  ? 'technical'
                  : 'support'
        )

      return new Set([...teamTags, ...agentTags, ...roleCoverage])
    })

    for (const template of caseTemplates) {
      const requiredRoles = (template.requiredRoles ?? []).map((role) => role.toLowerCase())
      const requiredTags = (template.requiredTags ?? []).map((tag) => tag.toLowerCase())

      if (requiredRoles.length === 0 && requiredTags.length === 0) {
        continue
      }

      const satisfiable = teamCapabilitySets.some(
        (capabilities) =>
          requiredRoles.every((requiredRole) => capabilities.has(requiredRole)) &&
          requiredTags.every((requiredTag) => capabilities.has(requiredTag))
      )

      expect(satisfiable).toBe(true)
    }
  })

  it('enforces exactly one tier tag on every authored template', () => {
    for (const template of caseTemplates) {
      const tierTags = template.tags.filter((tag) => /^tier-[1-3]$/i.test(tag))
      expect(tierTags).toHaveLength(1)
    }
  })

  it('keeps required-tag concentration within guardrail limits', () => {
    const frequency = new Map<string, number>()

    for (const template of caseTemplates) {
      for (const tag of template.requiredTags ?? []) {
        const normalized = tag.toLowerCase()
        frequency.set(normalized, (frequency.get(normalized) ?? 0) + 1)
      }
    }

    const maxRequiredTagFrequency = Math.max(0, ...frequency.values())
    expect(maxRequiredTagFrequency).toBeLessThanOrEqual(8)
  })

  it('keeps required-role concentration within guardrail limits', () => {
    const frequency = new Map<string, number>()

    for (const template of caseTemplates) {
      for (const role of template.requiredRoles ?? []) {
        const normalized = role.toLowerCase()
        frequency.set(normalized, (frequency.get(normalized) ?? 0) + 1)
      }
    }

    const maxRequiredRoleFrequency = Math.max(0, ...frequency.values())
    expect(maxRequiredRoleFrequency).toBeLessThanOrEqual(6)
  })

  it('keeps direct raid-001 ingress templates below concentration cap', () => {
    const directRaidIngressTemplates = caseTemplates.filter((template) => {
      const referencesRaidFromFail = template.onFail.spawnTemplateIds.includes('raid-001')
      const referencesRaidFromUnresolved =
        template.onUnresolved.spawnTemplateIds.includes('raid-001')

      return referencesRaidFromFail || referencesRaidFromUnresolved
    })

    expect(directRaidIngressTemplates.length).toBeLessThanOrEqual(10)
  })

  it('maintains at least one authored psionic-occult bridge template', () => {
    const hasPsionicOccultBridge = caseTemplates.some((template) => {
      const tags = new Set(template.tags.map((tag) => tag.toLowerCase()))
      return tags.has('psionic') && tags.has('occult')
    })

    expect(hasPsionicOccultBridge).toBe(true)
  })

  it('keeps lore stubs defined for every authored case template id', () => {
    const missingLoreStubIds = caseTemplates
      .map((template) => template.templateId)
      .filter((templateId) => {
        const loreStub = CASE_LORE_STUBS[templateId]
        return typeof loreStub !== 'string' || loreStub.trim().length === 0
      })

    expect(missingLoreStubIds).toEqual([])
  })

  it('keeps lore stubs free of orphan template ids', () => {
    const authoredTemplateIds = new Set(caseTemplates.map((template) => template.templateId))
    const orphanLoreStubIds = Object.keys(CASE_LORE_STUBS).filter(
      (templateId) => !authoredTemplateIds.has(templateId)
    )

    expect(orphanLoreStubIds).toEqual([])
  })

  it('keeps medic-required case coverage above single-point dependency', () => {
    const medicRequiredTemplates = caseTemplates.filter((template) =>
      (template.requiredTags ?? []).some((tag) => tag.toLowerCase() === 'medic')
    )

    expect(medicRequiredTemplates.length).toBeGreaterThanOrEqual(2)
  })
})
