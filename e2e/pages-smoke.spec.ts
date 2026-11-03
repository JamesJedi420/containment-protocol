import { test, expect } from '@playwright/test'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  launchContractFromMissionBoard,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

test('Pages compiled assets, hash routes and campaign continuity', async ({ page }) => {
  const probe = attachPageErrorProbe(page)
  const failedRequests: string[] = []
  page.on('requestfailed', (request) => failedRequests.push(request.url()))
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`)
  })

  try {
    // Playwright supplies a fresh browser context; never clear a user's active save.
    const entry = await page.goto('./')
    expect(entry?.status()).toBe(200)
    await openFrontDesk(page)
    expect(
      await page
        .locator('script[src]')
        .evaluateAll((scripts) => scripts.map((script) => script.getAttribute('src')))
    ).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\/containment-protocol\/assets\/.+\.js$/)])
    )
    const icon = await page.locator('link[rel="icon"]').getAttribute('href')
    expect(icon).toBe('/containment-protocol/favicon.svg')
    expect((await page.request.get(new URL(icon!, page.url()).href)).status()).toBe(200)

    await openPrimaryNav(page, 'Agents')
    await expect(page).toHaveURL(/\/containment-protocol\/#\/agents/)
    await expect(page.getByRole('region', { name: 'Agent filters' })).toBeVisible()
    await openPrimaryNav(page, 'Cases')
    await expect(page).toHaveURL(/#\/cases/)
    await page.goBack()
    await expect(page.getByRole('region', { name: 'Agent filters' })).toBeVisible()
    await page.goForward()
    await expect(page.getByRole('region', { name: 'Contract board' })).toBeVisible()

    await page.goto('about:blank')
    const direct = await page.goto('./#/cases')
    expect(direct?.status()).toBe(200)
    await expect(page.getByRole('region', { name: 'Contract board' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('region', { name: 'Contract board' })).toBeVisible()
    await launchContractFromMissionBoard(page)
    await page.goto('./#/')
    await openFrontDesk(page)
    await advanceOperationalWeek(page)
    await page
      .getByRole('region', { name: 'Latest report' })
      .getByRole('link', { name: /Week 1/i })
      .click()
    await expect(page.getByRole('heading', { name: /Week 1/i }).first()).toBeVisible()
    expect(
      await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)
    ).toBeTruthy()
    await page.reload()
    await expect(page).toHaveURL(/#\/report\/1/)
    await expect(page.getByRole('heading', { name: /Week 1/i }).first()).toBeVisible()
    await page.goto('./#/')
    await expect(page.getByText(/Week 2\s*\/\s*Active cap/i).first()).toBeVisible()
    expectNoPageErrors(probe)
    expect(failedRequests).toEqual([])
  } finally {
    probe.dispose()
  }
})
