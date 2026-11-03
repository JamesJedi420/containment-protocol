import { expect, test, type Page } from '@playwright/test'
import {
  createMaintenanceCampaignFixture,
  createSupportShortfallCampaignFixture,
  exportSupportCampaignFixture,
} from '../src/test/helpers/supportCampaignFixtures'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  expectNoPageErrors,
  openPrimaryNav,
} from './support/cpApp'

// Scenario setup uses the production import command, not state.setState or
// manufactured results. Subsequent week advances and reports use player controls.
async function importCampaign(page: Page, payload: string) {
  await clearCampaignStorage(page)
  await page.evaluate(async (raw) => {
    const modulePath = '/src/app/store/gameStore.ts'
    const { useGameStore }: typeof import('../src/app/store/gameStore') = await import(modulePath)
    useGameStore.getState().importRun(raw)
  }, payload)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Week 1\s*\/\s*Active cap/i).first()).toBeVisible()
}

async function openReport(page: Page, week: number) {
  await page
    .getByRole('region', { name: 'Latest report' })
    .getByRole('link', { name: `Week ${week}`, exact: true })
    .click()
  const notes = page.getByRole('region', { name: 'Weekly notes' })
  await expect(notes).toBeVisible()
  return notes
}

test('maintenance explains delayed recovery and continues its queue after reload', async ({
  page,
}) => {
  const probe = attachPageErrorProbe(page)
  try {
    await importCampaign(page, exportSupportCampaignFixture(createMaintenanceCampaignFixture()))
    await advanceOperationalWeek(page)
    const notes = await openReport(page, 1)
    const explanation = 'Equipment maintenance recovered 2 item(s); 3 item(s) remain delayed.'
    await expect(notes).toContainText(explanation)
    await test.info().attach('maintenance-first-week', {
      body: await notes.innerText(),
      contentType: 'text/plain',
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    const reloadedNotes = page.getByRole('region', { name: 'Weekly notes' })
    await expect(reloadedNotes.getByText(explanation, { exact: true })).toBeVisible()
    await test.info().attach('maintenance-after-reload', {
      body: await reloadedNotes.screenshot(),
      contentType: 'image/png',
    })
    await openPrimaryNav(page, 'Operations Desk')
    await advanceOperationalWeek(page)
    await expect(await openReport(page, 2)).toContainText(
      'Equipment maintenance recovered 2 item(s); 1 item(s) remain delayed.'
    )
    expectNoPageErrors(probe)
  } finally {
    probe.dispose()
  }
})

test('support shortage explains a partial result and preserves its explanation after reload', async ({
  page,
}) => {
  const probe = attachPageErrorProbe(page)
  try {
    await importCampaign(
      page,
      exportSupportCampaignFixture(createSupportShortfallCampaignFixture())
    )
    await advanceOperationalWeek(page)
    const notes = await openReport(page, 1)
    const shortfall = notes.getByText(/support shortfall/i)
    await expect(shortfall).toHaveCount(1)
    const explanation = await shortfall.innerText()
    const partialGroup = page
      .getByRole('region', { name: 'Case outcomes' })
      .locator('section')
      .filter({ has: page.getByText('Partial cases', { exact: true }) })
    const causalReason = 'Support shortfall: degraded to partial.'
    await expect(partialGroup).toContainText(causalReason)
    await expect(partialGroup.getByText(causalReason, { exact: true })).toBeVisible()
    const reasons = await partialGroup.locator('li li').allTextContents()
    await test.info().attach('support-shortfall-first-week', {
      body: JSON.stringify({ explanation, reasons }, null, 2),
      contentType: 'application/json',
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('region', { name: 'Weekly notes' })).toContainText(explanation)
    await expect(partialGroup).toContainText(causalReason)
    expect(await partialGroup.locator('li li').allTextContents()).toEqual(reasons)
    await test.info().attach('support-explanation-after-reload', {
      body: await partialGroup.screenshot(),
      contentType: 'image/png',
    })
    await openPrimaryNav(page, 'Operations Desk')
    await expect(page.getByText(/Week 2\s*\/\s*Active cap/i).first()).toBeVisible()
    expectNoPageErrors(probe)
  } finally {
    probe.dispose()
  }
})
