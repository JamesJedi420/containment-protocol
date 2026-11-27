import { expect, test } from '@playwright/test'
import { createRunExportPayload } from '../src/app/store/runTransfer'
import { createStartingState } from '../src/data/startingState'
import {
  advanceOperationalWeek,
  clearCampaignStorage,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

test('SPE-1354 shows a week-close injury and links to current readiness after reload', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)

  // Control the outcome using the injury-recovery test setup. Play produces the injury and report.
  const game = createStartingState()
  const agent = game.agents.a_ava!
  agent.fatigue = 90
  const incident = game.cases['case-003']!
  incident.mode = 'threshold'
  incident.weights = { combat: 1, investigation: 0, utility: 0, social: 0 }
  incident.difficulty = { combat: 999, investigation: 0, utility: 0, social: 0 }
  incident.durationWeeks = 1
  incident.weeksRemaining = 1
  incident.stage = 3
  game.cases = { [incident.id]: incident }
  await page.getByText('Campaign import and export', { exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Run payload' })
    .fill(JSON.stringify(createRunExportPayload(game)))
  await page.getByRole('button', { name: 'Import Run', exact: true }).click()
  await expect(page.getByText('Run imported.', { exact: true })).toBeVisible()

  await openPrimaryNav(page, 'Cases')
  await page.getByRole('button', { name: `Select ${incident.title} for triage detail` }).click()
  const detail = page.getByRole('region', { name: `Case triage detail: ${incident.title}` })
  await detail.getByRole('button', { name: 'Assign Night Watch', exact: true }).click()
  await expect(detail.getByText('Remaining: 1 week', { exact: true })).toBeVisible()

  await openPrimaryNav(page, 'Operations Desk')
  await advanceOperationalWeek(page)
  const injuries = page.getByRole('region', { name: 'Staff injuries' })
  const injury = injuries.getByRole('listitem').filter({ hasText: `${agent.name} was injured` })
  await expect(injury).toContainText('Recorded severity: moderate')

  await page.reload()
  await expect(injury).toContainText('Recorded severity: moderate')
  await injury
    .getByRole('link', { name: `Check current readiness for ${agent.name}` })
    .press('Enter')
  await expect(page).toHaveURL(new RegExp(`/agents/${agent.id}$`))
  await expect(page.getByRole('heading', { name: agent.name })).toBeVisible()
  await expect(page.getByText('Readiness state', { exact: true })).toBeVisible()
})
