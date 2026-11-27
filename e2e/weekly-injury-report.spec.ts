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
  await test.step('Import the controlled campaign through Operations Desk', async () => {
    await page.getByText('Campaign import and export', { exact: true }).press('Enter')
    const transfer = page.getByRole('region', { name: 'Run Transfer', exact: true })
    const payload = transfer.getByRole('textbox', { name: 'Run payload' })
    await payload.fill(JSON.stringify(createRunExportPayload(game)))
    await transfer.getByRole('button', { name: 'Import Run', exact: true }).press('Enter')
    await expect(transfer.getByRole('status')).toHaveText('Run imported.')
  })

  await test.step('Commit Night Watch through Cases with the keyboard', async () => {
    await openPrimaryNav(page, 'Cases')
    const select = page.getByRole('button', { name: `Select ${incident.title} for triage detail` })
    await select.press('Enter')
    const detail = page.getByRole('region', { name: `Case triage detail: ${incident.title}` })
    const assign = detail.getByRole('button', { name: 'Assign Night Watch', exact: true })
    await assign.press('Enter')
    await expect(detail.getByText('Remaining: 1 week', { exact: true })).toBeVisible()
  })

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
  await expect(page.getByText('Not eligible', { exact: true })).toBeVisible()
})
