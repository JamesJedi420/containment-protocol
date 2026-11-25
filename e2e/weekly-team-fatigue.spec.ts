import { expect, test } from '@playwright/test'
import { createRunExportPayload } from '../src/app/store/runTransfer'
import { createStartingState } from '../src/data/startingState'
import type { GameState } from '../src/domain/models'
import { createStarterCase } from '../src/domain/templates/startingCases'
import {
  advanceOperationalWeek,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

test('SPE-1354 keeps week-close fatigue separate from a changed current roster', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)

  // Seed staff fatigue in a quiet campaign. The game still produces both reports through week close.
  const game = createStartingState()
  const team = game.teams.t_nightwatch!
  const reserveCandidate = game.agents.a_rook!
  game.cases = {
    'case-quiet-relay': createStarterCase({ id: 'case-quiet-relay', templateId: 'ops-001' }),
  }
  for (const id of team.agentIds) game.agents[id]!.fatigue = 65
  reserveCandidate.fatigue = 100
  await page.getByText('Campaign import and export', { exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Run payload' })
    .fill(JSON.stringify(createRunExportPayload(game)))
  await page.getByRole('button', { name: 'Import Run', exact: true }).click()
  await expect(page.getByText('Run imported.', { exact: true })).toBeVisible()

  await advanceOperationalWeek(page)
  await advanceOperationalWeek(page)
  const saved: GameState = await page.evaluate(
    (storageKey) => JSON.parse(localStorage.getItem(storageKey)!).state.game,
    CP_GAME_STORAGE_KEY
  )
  const [first, second] = saved.reports.map((report) =>
    report.teamStatus.find((entry) => entry.teamId === team.id)
  )
  if (!first || !second) throw new Error('Expected two week-close fatigue records for Night Watch.')
  expect(first.avgFatigue).not.toBe(second.avgFatigue)
  expect(second.fatigueBand).toBe('critical')

  const cue = page.getByRole('region', { name: 'Week-close team fatigue' })
  const entry = cue.getByRole('listitem').filter({ hasText: team.name })
  const historical = entry.getByText(
    `Week 1: ${first.avgFatigue} → Week 2: ${second.avgFatigue} average fatigue · critical`
  )
  await expect(historical).toBeVisible()
  const currentRoster = entry.getByRole('link', { name: `Check current roster for ${team.name}` })
  await currentRoster.click()
  const roster = page.getByRole('region', { name: 'Squad roster' })
  const agentRow = roster.getByRole('listitem').filter({
    has: page.getByRole('link', { name: reserveCandidate.name, exact: true }),
  })
  const closedAverage = page.getByText(`Avg fatigue ${second.avgFatigue}`, { exact: true })
  await expect(closedAverage).toBeVisible()
  await agentRow.getByRole('button', { name: 'Send to reserve' }).click()
  await expect(agentRow).toHaveCount(0)
  await expect(closedAverage).toHaveCount(0)

  await openPrimaryNav(page, 'Operations Desk')
  await page.reload()
  await expect(historical).toBeVisible()
  await currentRoster.click()
  await expect(roster).toBeVisible()
  await expect(agentRow).toHaveCount(0)
})
