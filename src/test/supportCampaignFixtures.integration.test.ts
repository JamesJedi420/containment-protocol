import { describe, expect, it } from 'vitest'
import { parseRunExport } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  createMaintenanceCampaignFixture,
  createSupportShortfallCampaignFixture,
  exportSupportCampaignFixture,
  MAINTENANCE_FIXTURE_ITEMS,
  SUPPORT_FIXTURE_CASE_IDS,
} from './helpers/supportCampaignFixtures'

describe('SPE-3352 supported institutional campaign fixtures', () => {
  it('imports maintenance inputs unchanged and resumes the delayed queue after reload', () => {
    const game = parseRunExport(exportSupportCampaignFixture(createMaintenanceCampaignFixture()))
    expect(game.damagedEquipmentQueue).toEqual(MAINTENANCE_FIXTURE_ITEMS)
    expect(game.agency?.maintenanceSpecialistsAvailable).toBe(2)
    for (const id of MAINTENANCE_FIXTURE_ITEMS) expect(game.inventory[id]).toBe(1)

    const first = advanceWeek(game)
    expect(first.gameOver).toBe(false)
    expect(first.damagedEquipmentQueue).toEqual(MAINTENANCE_FIXTURE_ITEMS.slice(2))
    const report = first.reports.find((entry) => entry.week === game.week)!
    const note = report.notes.find((entry) => entry.type === 'system.equipment_recovered')!
    expect(note.content).toBe(
      'Equipment maintenance recovered 2 item(s); 3 item(s) remain delayed.'
    )
    expect(note.metadata).toMatchObject({
      recoveredCount: 2,
      delayedCount: 3,
      maintenanceCapacity: 2,
    })

    const loaded = loadGameSave(serializeGameSave(first))
    expect(loaded.damagedEquipmentQueue).toEqual(first.damagedEquipmentQueue)
    expect(loaded.agency?.maintenanceSpecialistsAvailable).toBe(2)
    expect(
      loaded.reports
        .find((entry) => entry.week === report.week)
        ?.notes.find((entry) => entry.type === 'system.equipment_recovered')?.content
    ).toBe(note.content)
    const second = advanceWeek(loaded)
    expect(second.gameOver).toBe(false)
    expect(second.damagedEquipmentQueue).toEqual(MAINTENANCE_FIXTURE_ITEMS.slice(4))
  })

  it('imports ordinary support inputs and preserves the actual causal result in report history', () => {
    const fixture = createSupportShortfallCampaignFixture()
    const game = parseRunExport(exportSupportCampaignFixture(fixture))
    expect(game.config).toEqual(createStartingState().config)
    expect(game.agency?.supportAvailable).toBe(1)
    for (const id of SUPPORT_FIXTURE_CASE_IDS) {
      expect(game.cases[id]).toMatchObject({
        difficulty: fixture.cases[id].difficulty,
        weights: fixture.cases[id].weights,
        assignedTeamIds: fixture.cases[id].assignedTeamIds,
        status: 'in_progress',
        weeksRemaining: 1,
      })
    }

    const first = advanceWeek(game)
    expect(first.gameOver).toBe(false)
    expect(first.agency?.supportAvailable).toBe(0)
    const shortfallIds = SUPPORT_FIXTURE_CASE_IDS.filter((id) => first.cases[id].supportShortfall)
    expect(shortfallIds).toHaveLength(1)
    const report = first.reports.find((entry) => entry.week === game.week)!
    expect(report.notes.filter((entry) => entry.type === 'support.shortfall')).toHaveLength(1)
    const result = report.caseSnapshots?.[shortfallIds[0]].missionResult
    expect(result?.explanationNotes).toContain('Support shortfall: degraded to partial.')
    expect(result?.outcome).toBe('partial')

    const loaded = loadGameSave(serializeGameSave(first))
    expect(loaded.agency?.supportAvailable).toBe(0)
    const loadedReport = loaded.reports.find((entry) => entry.week === report.week)!
    expect(loadedReport.partialCases).toContain(shortfallIds[0])
    expect(loadedReport.notes.find((entry) => entry.type === 'support.shortfall')?.content).toBe(
      report.notes.find((entry) => entry.type === 'support.shortfall')?.content
    )
    expect(loadedReport.caseSnapshots?.[shortfallIds[0]].missionResult?.outcome).toBe(
      result?.outcome
    )
    expect(loadedReport.caseSnapshots?.[shortfallIds[0]].missionResult?.explanationNotes).toEqual(
      result?.explanationNotes
    )
    // The live shortfall flag is week-local and hydration deliberately clears it.
    // Historical explanation and outcome, rather than that flag, are the contract.
    expect(loaded.cases[shortfallIds[0]].supportShortfall).toBeUndefined()
    expect(advanceWeek(loaded).week).toBe(first.week + 1)
  })
})
