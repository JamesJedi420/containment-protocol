import { test, expect } from '@playwright/test'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  openFrontDesk,
} from './support/cpApp'

test.describe('SPE-3458 harness isolation and failure surfacing', () => {
  test('clears campaign storage between contexts (no cross-test bleed)', async ({ browser }) => {
    const first = await browser.newContext()
    const firstPage = await first.newPage()
    await clearCampaignStorage(firstPage)
    await openFrontDesk(firstPage)
    await advanceOperationalWeek(firstPage)
    const firstStored = await firstPage.evaluate(
      (key) => window.localStorage.getItem(key),
      CP_GAME_STORAGE_KEY,
    )
    expect(firstStored).toBeTruthy()
    await first.close()

    const second = await browser.newContext()
    const secondPage = await second.newPage()
    await clearCampaignStorage(secondPage)
    const probe = attachPageErrorProbe(secondPage)
    try {
      await openFrontDesk(secondPage)
      await expect(secondPage.getByText(/Week 1\s*\/\s*Active cap/i).first()).toBeVisible()
      await expect(
        secondPage.getByRole('region', { name: 'Latest report' }).getByText(/No reports yet/i),
      ).toBeVisible()
      const secondStored = await secondPage.evaluate(
        (key) => window.localStorage.getItem(key),
        CP_GAME_STORAGE_KEY,
      )
      // Fresh context + clearCampaignStorage must not restore week-2 campaign bytes.
      if (secondStored) {
        expect(secondStored).not.toEqual(firstStored)
      }
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
      await second.close()
    }
  })

  test('surfaces page errors instead of concealing them', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => {
        queueMicrotask(() => {
          throw new Error('SPE-3458-harness-probe-intentional-error')
        })
      })
      await expect
        .poll(() => probe.errors.some((entry) => entry.includes('SPE-3458-harness-probe-intentional-error')))
        .toBe(true)
    } finally {
      probe.dispose()
    }
  })
})
