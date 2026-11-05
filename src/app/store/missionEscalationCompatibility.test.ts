import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from './gameStore'
import { assertMissionEscalationCompatibility } from './missionEscalationCompatibility'
import { createRunExportPayload, parseRunExport } from './runTransfer'
import { createGameSavePayload, loadGameSave } from './saveSystem'

describe('saved mission escalation compatibility', () => {
  it('loads omitted increments and no-follow-up rules without inventing consequences', () => {
    const original = createStartingState()
    const run = structuredClone(createRunExportPayload(original))
    run.game.cases['optional-mission'] = {
      ...run.game.cases['case-002'],
      id: 'optional-mission',
      onFail: {},
      onUnresolved: {},
    }
    const imported = parseRunExport(JSON.stringify(run))
    expect(imported.cases['optional-mission'].onUnresolved.stageDelta).toBe(0)
    expect(imported.cases['optional-mission'].onUnresolved.spawnCount).toEqual({ min: 0, max: 0 })
    expect(imported.cases['optional-mission'].onFail.spawnTemplateIds).toEqual([])
    expect(() => loadGameSave(JSON.stringify(createGameSavePayload(imported)))).not.toThrow()
  })
  it('rejects invalid explicit increments on active cases but preserves explicit zero', () => {
    for (const increment of [null, -1, 1.5]) {
      expect(() =>
        assertMissionEscalationCompatibility({
          cases: { a: { status: 'open', onUnresolved: { stageDelta: increment } } },
        })
      ).toThrow(/invalid escalation increment/)
    }
    expect(() =>
      assertMissionEscalationCompatibility({
        cases: {
          a: { status: 'in_progress', onUnresolved: { stageDelta: 0 } },
          b: { status: 'resolved' },
        },
      })
    ).not.toThrow()
  })

  it('rejects an incomplete run or save before replacing the current campaign', () => {
    const original = createStartingState()
    useGameStore.setState({ game: original })
    const run = structuredClone(createRunExportPayload(original))
    const save = structuredClone(createGameSavePayload(original))
    run.game.cases['case-002'].onUnresolved.stageDelta = -1
    save.state.cases['case-002'].onUnresolved.stageDelta = -1

    expect(() => parseRunExport(JSON.stringify(run))).toThrow(/invalid escalation increment/)
    expect(() => loadGameSave(JSON.stringify(save))).toThrow(/invalid escalation increment/)
    expect(() => useGameStore.getState().importRun(JSON.stringify(run))).toThrow(
      /invalid escalation increment/
    )
    expect(useGameStore.getState().game).toEqual(original)
  })

  it('round-trips an explicit zero and tolerates a resolved case without the rule', () => {
    const run = structuredClone(createRunExportPayload(createStartingState()))
    run.game.cases['case-001'].onUnresolved.stageDelta = 0
    run.game.cases['case-002'].status = 'resolved'
    delete run.game.cases['case-002'].onUnresolved.stageDelta
    const imported = parseRunExport(JSON.stringify(run))
    expect(imported.cases['case-001'].onUnresolved.stageDelta).toBe(0)
    expect(imported.cases['case-002'].status).toBe('resolved')
  })
})
