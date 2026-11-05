import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from './gameStore'
import { assertMissionEscalationCompatibility } from './missionEscalationCompatibility'
import { createRunExportPayload, parseRunExport } from './runTransfer'
import { createGameSavePayload, loadGameSave } from './saveSystem'

describe('saved mission escalation compatibility', () => {
  it('rejects missing or invalid increments on active cases but preserves explicit zero', () => {
    for (const increment of [undefined, null, -1, 1.5]) {
      expect(() =>
        assertMissionEscalationCompatibility({
          cases: { a: { status: 'open', onUnresolved: { stageDelta: increment } } },
        })
      ).toThrow(/incomplete escalation rule/)
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
    delete run.game.cases['case-002'].onUnresolved.stageDelta
    delete save.state.cases['case-002'].onUnresolved.stageDelta

    expect(() => parseRunExport(JSON.stringify(run))).toThrow(/incomplete escalation rule/)
    expect(() => loadGameSave(JSON.stringify(save))).toThrow(/incomplete escalation rule/)
    expect(() => useGameStore.getState().importRun(JSON.stringify(run))).toThrow(
      /incomplete escalation rule/
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
