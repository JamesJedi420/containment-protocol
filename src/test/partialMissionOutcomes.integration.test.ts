import { describe, expect, it } from 'vitest'
import { createGameSavePayload, loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { createSeededRng } from '../domain/math'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { computeRequiredResolutionProfile } from '../domain/sim/scoring'
import { instantiateFromTemplate } from '../domain/sim/spawn'
import { buildCaseTemplateCatalog, caseTemplateMap } from '../domain/templates/caseTemplates'
import { createSupportShortfallCampaignFixture } from './helpers/supportCampaignFixtures'

function assignStarterMissions() {
  return assignTeam(
    assignTeam(createStartingState(), 'case-001', 't_nightwatch'),
    'case-002',
    't_greentape'
  )
}

describe('mission-specific partial resolution', () => {
  it('does not report escalation when a positive partial rule is already at stage five', () => {
    const state = createSupportShortfallCampaignFixture()
    state.cases['case-002'].stage = 5
    state.cases['case-002'].onPartial = { stageDelta: 2 }
    const resolved = advanceWeek(state)
    const result = resolved.reports[0].caseSnapshots?.['case-002']?.missionResult
    expect(result?.outcome).toBe('partial')
    expect(resolved.cases['case-002'].stage).toBe(5)
    expect(result?.spawnedConsequences).not.toContainEqual(
      expect.objectContaining({ type: 'stage_escalation' })
    )
  })

  it('does not apply the partial rule when the same nest is fully resolved', () => {
    const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const resolved = advanceWeek(advanceWeek(assigned))
    expect(resolved.reports.find((row) => row.week === 2)?.resolvedCases).toContain('case-001')
    expect(resolved.cases['case-001']).toMatchObject({ status: 'resolved', stage: 1 })
  })

  it('preserves different authored partial consequences through normal play and save/load', () => {
    const assigned = assignStarterMissions()
    const firstWeek = advanceWeek(assigned)
    const restored = loadGameSave(serializeGameSave(firstWeek))
    expect(restored.cases['case-001'].onPartial).toEqual({ stageDelta: 1 })
    expect(restored.cases['case-002'].onPartial).toEqual({ stageDelta: 0 })

    const resolved = advanceWeek(restored)
    const report = resolved.reports.find((row) => row.week === 2)!
    expect(report.partialCases).toEqual(expect.arrayContaining(['case-001', 'case-002']))
    expect(resolved.cases['case-001']).toMatchObject({ status: 'open', stage: 2 })
    expect(resolved.cases['case-002']).toMatchObject({ status: 'open', stage: 1 })
    expect(
      computeRequiredResolutionProfile(resolved.cases['case-001'], resolved.config).fieldPower
    ).toBeGreaterThan(
      computeRequiredResolutionProfile(assigned.cases['case-001'], assigned.config).fieldPower
    )
    expect(computeRequiredResolutionProfile(resolved.cases['case-002'], resolved.config)).toEqual(
      computeRequiredResolutionProfile(assigned.cases['case-002'], assigned.config)
    )
    const vampireResult = report.caseSnapshots?.['case-001']?.missionResult
    const archiveResult = report.caseSnapshots?.['case-002']?.missionResult
    expect(vampireResult?.spawnedConsequences).toContainEqual(
      expect.objectContaining({ type: 'stage_escalation', stage: 2 })
    )
    expect(archiveResult?.spawnedConsequences).not.toContainEqual(
      expect.objectContaining({ type: 'stage_escalation' })
    )
    for (const result of [vampireResult, archiveResult]) {
      expect(result?.spawnedConsequences).not.toContainEqual(
        expect.objectContaining({ type: 'follow_up_case' })
      )
    }
    const saved = loadGameSave(serializeGameSave(resolved))
    expect(saved.cases['case-001'].stage).toBe(2)
    expect(saved.cases['case-002'].stage).toBe(1)
    expect(
      saved.reports.find((row) => row.week === 2)?.caseSnapshots?.['case-002']?.missionResult
    ).toMatchObject({ outcome: 'partial', spawnedConsequences: archiveResult?.spawnedConsequences })
  })

  it('treats legacy omission as stable instead of borrowing a current starter rule', () => {
    const payload = structuredClone(createGameSavePayload(assignStarterMissions()))
    delete payload.state.cases['case-001'].onPartial
    delete payload.state.cases['case-002'].onPartial
    const restored = loadGameSave(JSON.stringify(payload))
    const resolved = advanceWeek(advanceWeek(restored))
    expect(resolved.reports.find((row) => row.week === 2)?.partialCases).toEqual(
      expect.arrayContaining(['case-001', 'case-002'])
    )
    expect(resolved.cases['case-001'].stage).toBe(1)
    expect(resolved.cases['case-002'].stage).toBe(1)
  })

  it.each([null, {}, { stageDelta: -1 }, { stageDelta: 1.5 }, { stageDelta: '2' }])(
    'normalizes malformed saved partial rules safely: %j',
    (rule) => {
      const payload = JSON.parse(serializeGameSave(createStartingState()))
      payload.state.cases['case-001'].onPartial = rule
      expect(loadGameSave(JSON.stringify(payload)).cases['case-001'].onPartial).toEqual({
        stageDelta: 0,
      })
    }
  )

  it('copies an authored rule into generated cases without sharing mutable template state', () => {
    const template = { ...caseTemplateMap.combat_vampire_nest, onPartial: { stageDelta: 2 } }
    const generated = instantiateFromTemplate(template, createSeededRng(1337).next)
    expect(generated.onPartial).toEqual({ stageDelta: 2 })
    template.onPartial.stageDelta = 0
    expect(generated.onPartial?.stageDelta).toBe(2)
    const state = createStartingState()
    state.cases[generated.id] = generated
    expect(loadGameSave(serializeGameSave(state)).cases[generated.id].onPartial).toEqual({
      stageDelta: 2,
    })
  })

  it('rejects malformed authored partial increments in the existing catalog validator', () => {
    expect(() =>
      buildCaseTemplateCatalog([
        {
          ...caseTemplateMap.combat_vampire_nest,
          onFail: {},
          onUnresolved: {},
          onPartial: { stageDelta: -1 },
        },
      ])
    ).toThrow(/invalid onPartial stageDelta/)
  })
})
