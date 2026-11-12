import { test, expect } from '@playwright/test'
import { clearCampaignStorage, openFrontDesk, CP_GAME_STORAGE_KEY } from './support/cpApp'

test('router and shell history restore filters without replaying campaign actions', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  const history = page.getByRole('navigation', { name: 'Navigation history' })
  const back = history.getByRole('button', { name: 'Back', exact: true })
  const forward = history.getByRole('button', { name: 'Forward', exact: true })
  await expect(back).toBeDisabled()
  await page
    .getByRole('navigation', { name: 'Primary operations' })
    .getByRole('link', { name: 'Agents', exact: true })
    .click()
  const search = page.getByRole('textbox', { name: 'Search', exact: true })
  await search.fill('Ava')
  const filteredUrl = page.url()
  await page.getByRole('link', { name: 'Agency', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Agency', exact: true })).toBeVisible()
  const campaign = await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)
  await back.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(filteredUrl)
  await expect(search).toHaveValue('Ava')
  await expect(page.getByRole('main')).toBeFocused()
  await forward.click()
  await expect(page).toHaveURL(/\/agency$/)
  await page.goBack()
  await expect(page).toHaveURL(filteredUrl)
  await expect(forward).toBeEnabled()
  await page.getByRole('link', { name: 'Teams', exact: true }).click()
  await expect(page).toHaveURL(/\/teams$/)
  await expect(forward).toBeDisabled()
  expect(await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)).toBe(
    campaign
  )
  await page.reload()
  await expect(back).toBeDisabled()
  await expect(forward).toBeDisabled()
})

test('touch history controls remain visible at 320px and return focus', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    hasTouch: true,
  })
  const page = await context.newPage()
  try {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await page
      .getByRole('navigation', { name: 'Primary operations' })
      .getByRole('link', { name: 'Agents', exact: true })
      .tap()
    const history = page.getByRole('navigation', { name: 'Navigation history' })
    const back = history.getByRole('button', { name: 'Back', exact: true })
    await back.scrollIntoViewIfNeeded()
    const box = await back.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(320)
    await page.screenshot({ path: 'test-results/history-mobile.png' })
    await back.tap()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('main')).toBeFocused()
  } finally {
    await context.close()
  }
})
