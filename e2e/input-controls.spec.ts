import { test, expect } from '@playwright/test'
import { clearCampaignStorage, openFrontDesk, CP_GAME_STORAGE_KEY } from './support/cpApp'

test('invalid saved controls and denied writes retain usable native controls with visible feedback', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'containment-protocol-input-preferences',
      JSON.stringify({ version: 999, overrides: { 'settings.open': [] } })
    )
  )
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  await page.keyboard.press('Alt+Shift+s')
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('status')).toContainText('incompatible')
  await page.evaluate(() => {
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'containment-protocol-input-preferences')
        throw new DOMException('Storage denied', 'QuotaExceededError')
      write.call(this, key, value)
    }
  })
  await dialog.getByRole('button', { name: 'Clear open settings keyboard', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('session only')
  await dialog.getByRole('button', { name: 'Close settings' }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('session only')
})

test('touch Controls editor fits 320px and keeps native reset and dismissal reachable', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  try {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await page.getByRole('button', { name: 'Settings', exact: true }).tap()
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
    const change = dialog.getByRole('button', {
      name: 'Change open settings keyboard',
      exact: true,
    })
    await change.scrollIntoViewIfNeeded()
    const box = await change.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(48)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(320)
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true
    )
    await page.screenshot({ path: 'test-results/controls-mobile.png' })
    await change.tap()
    await dialog.getByRole('button', { name: 'Cancel capture' }).tap()
    await dialog.getByRole('button', { name: 'Reset all controls to defaults' }).tap()
    await expect(dialog.getByRole('status')).toHaveText('Controls saved on this device.')
    await dialog.getByRole('button', { name: 'Close settings' }).tap()
    await expect(dialog).not.toBeVisible()
  } finally {
    await context.close()
  }
})

test('shared shortcuts remap, conflict, clear, persist and reset without changing the campaign', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  const campaign = await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)
  await page.keyboard.press('Alt+Shift+s')
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Change open settings keyboard', exact: true }).click()
  await page.keyboard.press('Alt+Shift+ArrowLeft')
  await expect(dialog.getByRole('status')).toContainText('Already assigned to Go back')
  await page.keyboard.press('Alt+Shift+q')
  await expect(dialog.getByRole('status')).toHaveText('Controls saved on this device.')
  await page.keyboard.press('Alt+Shift+x')
  await expect(dialog).not.toBeVisible()
  await page.keyboard.press('Alt+Shift+s')
  await expect(dialog).not.toBeVisible()
  await page.keyboard.press('Alt+Shift+q')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close settings' }).click()
  expect(await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)).toBe(
    campaign
  )
  await page.reload()
  await openFrontDesk(page)
  // Reload runs campaign hydration independently of input preferences.
  const hydratedCampaign = await page.evaluate(
    (key) => localStorage.getItem(key),
    CP_GAME_STORAGE_KEY
  )
  await page.keyboard.press('Alt+Shift+q')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Clear open settings keyboard', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Alt+Shift+q')
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await dialog.getByRole('button', { name: 'Reset all controls to defaults' }).click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Alt+Shift+s')
  await expect(dialog).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)).toBe(
    hydratedCampaign
  )
})

test('navigation shortcuts respect modal barriers, text editing and composition', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  await page
    .getByRole('navigation', { name: 'Primary operations' })
    .getByRole('link', { name: 'Agents', exact: true })
    .click()
  const agents = page.url()
  const search = page.getByRole('textbox', { name: 'Search', exact: true })
  await search.fill('Ava')
  await page.keyboard.press('Alt+Shift+ArrowLeft')
  await expect(page).toHaveURL(/agents/)
  await page.getByRole('button', { name: 'Settings', exact: true }).focus()
  const dispatchBack = (isComposing: boolean) =>
    page.evaluate((composing) => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        code: 'ArrowLeft',
        altKey: true,
        shiftKey: true,
        isComposing: composing,
        bubbles: true,
        cancelable: true,
      })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }, isComposing)
  expect(await dispatchBack(true)).toBe(false)
  await expect(page).toHaveURL(/agents/)
  await page.keyboard.press('Alt+Shift+s')
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
  await page.keyboard.press('Alt+Shift+ArrowLeft')
  await expect(page).toHaveURL(/agents/)
  await dialog.getByRole('button', { name: 'Change go back keyboard', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('status')).toHaveText('Capture canceled.')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Alt+Shift+ArrowLeft')
  await expect(page).not.toHaveURL(/agents/)
  await expect(page.getByRole('main')).toBeFocused()
  await page.keyboard.press('Alt+Shift+ArrowRight')
  await expect(page).toHaveURL(/agents/)
  expect(page.url().startsWith(agents)).toBe(true)
  await expect(
    page
      .getByRole('navigation', { name: 'Navigation history' })
      .getByRole('button', { name: 'Back', exact: true })
  ).toBeEnabled()
  expect(await dispatchBack(false)).toBe(true)
  await expect(page).not.toHaveURL(/agents/)
})

test('standard controller edges use the same actions and remapping; unsupported devices do not fire', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { pressed: -1, mapping: 'standard' }
    Object.assign(window, { inputTestPad: state })
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          index: 0,
          connected: true,
          mapping: state.mapping,
          buttons: Array.from({ length: 17 }, (_, index) => ({
            pressed: state.pressed === index,
            value: state.pressed === index ? 1 : 0,
          })),
        },
      ],
    })
  })
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  const press = async (button: number) => {
    await page.evaluate(async (value) => {
      const state = (window as unknown as { inputTestPad: { pressed: number } }).inputTestPad
      state.pressed = value
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }, button)
  }
  await press(9)
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(dialog).toBeVisible()
  await press(-1)
  await dialog
    .getByRole('button', { name: 'Change dismiss dialog controller', exact: true })
    .click()
  await press(10)
  await expect(dialog.getByRole('status')).toHaveText('Controls saved on this device.')
  await expect(dialog).toBeVisible()
  await press(-1)
  await press(10)
  await expect(dialog).not.toBeVisible()
  await press(-1)
  await page.evaluate(() => {
    ;(window as unknown as { inputTestPad: { mapping: string } }).inputTestPad.mapping = ''
  })
  await press(9)
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(dialog).toBeVisible()
  await page.evaluate(() => {
    ;(window as unknown as { inputTestPad: { mapping: string } }).inputTestPad.mapping = 'standard'
  })
  await press(-1)
  await dialog.getByRole('button', { name: 'Change go back controller', exact: true }).click()
  await press(2)
  await expect(dialog.getByRole('status')).toHaveText('Controls saved on this device.')
  await press(-1)
  await dialog.getByRole('button', { name: 'Close settings' }).click()
  await page
    .getByRole('navigation', { name: 'Primary operations' })
    .getByRole('link', { name: 'Agents', exact: true })
    .click()
  await expect(page).toHaveURL(/agents/)
  await page.getByTestId('topbar-advance-button').focus()
  await press(2)
  await expect(page).not.toHaveURL(/agents/)
  await expect(page.getByRole('main')).toBeFocused()
  await expect(page.getByText(/Week 1\s*\/\s*Active cap/i).first()).toBeVisible()
})
