import { test, expect } from '@playwright/test'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  openFrontDesk,
} from './support/cpApp'

test.describe('SPE-3458 CP Chromium smoke', () => {
  test('startup and player-visible navigation', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await page.getByRole('navigation', { name: 'Primary operations' }).getByRole('link', {
        name: 'Cases',
      }).click()
      await expect(page).toHaveURL(/\/cases/)
      await expect(page.getByRole('heading', { name: /Cases|Mission|Triage/i }).first()).toBeVisible()
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('advance one operational week through player controls', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByText(/No reports yet/i),
      ).toBeVisible()

      await advanceOperationalWeek(page)

      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByRole('link', { name: /Week 1/i }),
      ).toBeVisible()
      await expect(page.getByTestId('topbar-metrics-row').getByText('Weeks').locator('..')).toContainText(
        '1',
      )
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('save continuity across hard reload (localStorage persist)', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await advanceOperationalWeek(page)

      const stored = await page.evaluate((key) => window.localStorage.getItem(key), CP_GAME_STORAGE_KEY)
      expect(stored, 'campaign persistence must write after advance').toBeTruthy()

      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/Week 2\s*\/\s*Active cap/i).first()).toBeVisible()
      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByRole('link', { name: /Week 1/i }),
      ).toBeVisible()
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })
})
