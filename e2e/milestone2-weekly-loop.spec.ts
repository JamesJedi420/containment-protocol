import { expect, test, type Browser, type Page } from '@playwright/test'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  expectNoPageErrors,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

// Fresh campaign, default seed 1337. These names identify the shipped starting
// scenario; the simulation's general outcome rules remain covered by Vitest.
const deferredIncident = 'The Whispering Archive'
const deployedContract = 'Oversight Lockdown Retainer'

async function openReport(page: Page, week: number): Promise<void> {
  await page
    .getByRole('region', { name: 'Latest report' })
    .getByRole('link', { name: `Week ${week}`, exact: true })
    .click()
  await expect(page.getByRole('region', { name: 'Case outcomes' })).toBeVisible()
}

function reportGroup(page: Page, title: string) {
  return page
    .getByRole('region', { name: 'Case outcomes' })
    .locator('section')
    .filter({ has: page.getByText(title, { exact: true }) })
}

async function runCampaign(browser: Browser) {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    locale: 'en-US',
    timezoneId: 'UTC',
  })
  const page = await context.newPage()
  const probe = attachPageErrorProbe(page)
  try {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await openPrimaryNav(page, 'Cases')

    const triage = page.getByRole('region', { name: 'Case triage queue' })
    const incident = triage.getByRole('listitem').filter({ hasText: deferredIncident })
    await expect(incident).toContainText('Incident')
    await incident
      .getByRole('button', { name: `Select ${deferredIncident} for triage detail` })
      .click()
    const detail = page.getByRole('region', { name: `Case triage detail: ${deferredIncident}` })
    await expect(detail).toContainText('Deadline: 1 week')
    await detail.getByRole('button', { name: 'Defer', exact: true }).click()
    await expect(detail.getByRole('button', { name: 'Defer', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(detail).toContainText('escalation may continue while deferred')

    const board = page.getByRole('region', { name: 'Contract board' })
    await board.getByRole('button', { name: new RegExp(`^${deployedContract}`) }).click()
    await expect(board.getByRole('heading', { name: deployedContract })).toBeVisible()
    await board.getByRole('button', { name: 'Launch with Night Watch' }).click()
    await expect(page.getByRole('tab', { name: /Assigned \(1\)/ })).toBeVisible()

    await openPrimaryNav(page, 'Operations Desk')
    await advanceOperationalWeek(page)
    await openReport(page, 1)
    const progressed = reportGroup(page, 'Progressed cases')
    await expect(progressed).toContainText(deployedContract)
    await expect(progressed).toContainText('Remaining 1 week')
    const unresolved = reportGroup(page, 'Unresolved cases')
    const deferredResult = unresolved
      .locator(':scope > ul > li')
      .filter({ hasText: deferredIncident })
    await expect(deferredResult).toContainText(
      'Case deadline expired before successful resolution.'
    )
    await expect(deferredResult).toContainText('Spawned follow-up case Campus Outbreak at stage 4.')

    await openPrimaryNav(page, 'Cases')
    await expect(page.getByRole('region', { name: 'Case triage queue' })).toContainText(
      'Campus Outbreak'
    )
    await openPrimaryNav(page, 'Operations Desk')
    await advanceOperationalWeek(page)
    await openReport(page, 2)
    const resolved = reportGroup(page, 'Resolved cases')
    const resolvedContract = resolved
      .locator(':scope > ul > li')
      .filter({ hasText: deployedContract })
    await expect(resolvedContract).toContainText('Resolved')
    await expect(resolvedContract).toContainText('Operation value')
    await expect(resolvedContract).toContainText('Funding +15, containment +6, reputation +7.')
    await expect(resolvedContract).toContainText('Detection confidence: 25%')
    await expect(resolvedContract).toContainText('Counter-detection: inactive')
    const outcome = await resolvedContract.innerText()

    await page.reload({ waitUntil: 'domcontentloaded' })
    const reloaded = reportGroup(page, 'Resolved cases')
      .locator(':scope > ul > li')
      .filter({ hasText: deployedContract })
    await expect(reloaded).toHaveText(outcome, { useInnerText: true })
    await openPrimaryNav(page, 'Operations Desk')
    await expect(page.getByText(/Week 3\s*\/\s*Active cap/i).first()).toBeVisible()
    expectNoPageErrors(probe)
    return outcome
  } finally {
    probe.dispose()
    await context.close()
  }
}

test('connected multi-week player path preserves and replays its visible outcome', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const firstOutcome = await test.step('Fresh campaign through Week 3 and report reload', () =>
    runCampaign(browser))
  const replayOutcome = await test.step('Replay in a second fresh browser context', () =>
    runCampaign(browser))
  await test.step('Compare visible resolved outcome across both campaigns', async () => {
    expect(replayOutcome).toBe(firstOutcome)
    await test.info().attach('visible-outcome-replay', {
      body: JSON.stringify({ seed: 1337, firstOutcome, replayOutcome }, null, 2),
      contentType: 'application/json',
    })
  })
})
