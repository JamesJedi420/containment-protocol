import { test, expect } from '@playwright/test'
import { clearCampaignStorage, openFrontDesk, CP_GAME_STORAGE_KEY } from './support/cpApp'

test('Settings preserves the routed screen, selections, campaign and focus', async ({ page }) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  await page
    .getByRole('navigation', { name: 'Primary operations' })
    .getByRole('link', { name: 'Agents', exact: true })
    .click()
  const search = page.getByRole('textbox', { name: 'Search', exact: true })
  await search.fill('Ava')
  await page.getByRole('button', { name: /Ava Brooks/ }).click()
  const url = page.url()
  const campaign = await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)
  const settings = page.getByRole('button', { name: 'Settings', exact: true })
  await settings.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: 'Close settings' })
  await expect(close).toBeFocused()
  await page.getByRole('main').evaluate((main) => main.focus())
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  expect(
    await page.evaluate(
      () => document.activeElement === document.body || !!document.activeElement?.closest('dialog')
    )
  ).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(settings).toBeFocused()
  await expect(page).toHaveURL(url)
  await expect(search).toHaveValue('Ava')
  await expect(
    page.getByRole('heading', { level: 2, name: 'Ava Brooks', exact: true })
  ).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)).toBe(
    campaign
  )
  await page.keyboard.press('Space')
  await expect(dialog).toBeVisible()
  await close.click()
  await expect(settings).toBeFocused()
  await expect(page).toHaveURL(url)
})

test('Settings remains reachable by touch at a narrow viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  try {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    const settings = page.getByRole('button', { name: 'Settings', exact: true })
    expect(await page.evaluate(() => window.scrollX)).toBe(0)
    const box = await settings.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(320)
    await page.screenshot({ path: 'test-results/settings-header-mobile.png' })
    await settings.tap()
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
    await expect(dialog).toBeVisible()
    const modalBox = await dialog.boundingBox()
    expect(modalBox!.x).toBeGreaterThanOrEqual(0)
    expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(320)
    await page.screenshot({ path: 'test-results/settings-mobile.png' })
    await dialog.getByRole('button', { name: 'Close settings' }).tap()
    await expect(dialog).not.toBeVisible()
    await expect(settings).toBeVisible()
  } finally {
    await context.close()
  }
})

test('Settings fits the header at phone, tablet and desktop widths', async ({ page }) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  for (const width of [320, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 })
    await page.evaluate(() => window.scrollTo(0, 0))
    const settings = page.getByRole('button', { name: 'Settings', exact: true })
    const box = await settings.boundingBox()
    expect(box, `Settings at ${width}px`).not.toBeNull()
    expect(box!.x, `left edge at ${width}px`).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width, `right edge at ${width}px`).toBeLessThanOrEqual(width)
    if (width > 640) {
      const metrics = await page.getByTestId('topbar-center-zone').boundingBox()
      const actions = await page.getByTestId('topbar-right-actions').boundingBox()
      expect(
        metrics!.x + metrics!.width,
        `metrics must not cover actions at ${width}px`
      ).toBeLessThanOrEqual(actions!.x)
    }
    await settings.click()
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Close settings' }).click()
    await expect(settings).toBeFocused()
  }
  await page.screenshot({ path: 'test-results/settings-header-desktop.png' })
})
