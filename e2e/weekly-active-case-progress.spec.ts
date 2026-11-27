import { expect, test } from '@playwright/test'
import { createRunExportPayload } from '../src/app/store/runTransfer'
import { createStartingState } from '../src/data/startingState'
import {
  advanceOperationalWeek,
  clearCampaignStorage,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

test('SPE-1354 reports active operation progress across consecutive weeks', async ({ page }) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)

  // Keep the first incident active at both closes. Assignment and both reports are produced in play.
  const game = createStartingState()
  const incident = game.cases['case-001']!
  incident.durationWeeks = 3
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
  await expect(detail.getByText('Remaining: 3 weeks', { exact: true })).toBeVisible()

  await openPrimaryNav(page, 'Operations Desk')
  const report = page.getByRole('region', { name: 'Latest report' })
  const entry = report
    .getByRole('list', { name: 'Unresolved cases' })
    .getByRole('listitem')
    .filter({ hasText: incident.title })
  await advanceOperationalWeek(page)
  await expect(entry).toContainText('Earlier report comparison unavailable.')
  await expect(entry.getByText('Active · Current operation: 2 weeks remaining')).toBeVisible()
  await advanceOperationalWeek(page)
  const progress = entry.getByText(
    'Since the previous report: Operation time remaining 2 weeks → 1 week.'
  )
  const currentTimer = entry.getByText('Active · Current operation: 1 week remaining')
  await expect(progress).toBeVisible()
  await expect(currentTimer).toBeVisible()

  await page.reload()
  await expect(progress).toBeVisible()
  await expect(currentTimer).toBeVisible()
  await entry
    .getByRole('link', { name: `Review active operation: ${incident.title}` })
    .press('Enter')
  await expect(detail).toBeFocused()
  await expect(detail.getByText('Remaining: 1 week', { exact: true })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(detail.getByRole('link', { name: incident.title, exact: true })).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/cases/${incident.id}(?:\\?|$)`))
  await expect(page.getByRole('region', { name: 'Case dossier', exact: true })).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Navigation history' })
    .getByRole('button', { name: 'Back', exact: true })
    .press('Enter')
  await expect(detail).toBeVisible()
  await expect(page.getByRole('main')).toBeFocused()
})
