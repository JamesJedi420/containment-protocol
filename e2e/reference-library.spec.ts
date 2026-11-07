import { test, expect } from '@playwright/test'
import { clearCampaignStorage, openFrontDesk, CP_GAME_STORAGE_KEY } from './support/cpApp'

test('contextual reference preserves the agent workflow, canonical content and focus', async ({
  page,
}) => {
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
  const contextual = page.getByRole('button', { name: 'Specialization reference' })
  await contextual.click()
  const dialog = page.getByRole('dialog', { name: 'Reference library' })
  await expect(dialog.getByRole('heading', { name: 'Agent specializations' })).toBeFocused()
  await expect(dialog.getByText('Source: Public agent specialization catalogue')).toBeVisible()
  await page.keyboard.press('Alt+Shift+ArrowUp')
  await expect(dialog.getByRole('heading', { name: 'Team coverage roles' })).toBeFocused()
  await page.keyboard.press('Alt+Shift+ArrowDown')
  await expect(dialog.getByRole('heading', { name: 'Agent specializations' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Team coverage roles (related)' }).click()
  await expect(dialog.getByRole('heading', { name: 'Team coverage roles' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(contextual).toBeFocused()
  await expect(page).toHaveURL(url)
  await expect(search).toHaveValue('Ava')
  await expect(
    page.getByRole('heading', { level: 2, name: 'Ava Brooks', exact: true })
  ).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)).toBe(
    campaign
  )
  await page.keyboard.press('Alt+Shift+h')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('searchbox').fill('specialisations')
  await expect(dialog.getByRole('status')).toHaveText('1 reference entry')
  await dialog.getByRole('list', { name: 'Reference entries' }).getByRole('button').click()
  await dialog.getByRole('button', { name: 'Return to results' }).click()
  await expect(
    dialog.getByRole('button', { name: 'Agent specializations', exact: true })
  ).toBeFocused()
  await page.keyboard.press('Alt+Shift+x')
  await expect(dialog).not.toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)).toBe(
    campaign
  )
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => /reference/i.test(key)))
  ).toEqual([])
})

test('controller invocation, entry traversal and dismissal share the canonical action path', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { pressed: -1 }
    Object.assign(window, { referenceTestPad: state })
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          index: 0,
          connected: true,
          mapping: 'standard',
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
      const state = (window as unknown as { referenceTestPad: { pressed: number } })
        .referenceTestPad
      state.pressed = value
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }, button)
  }
  await page.getByRole('button', { name: 'Help', exact: true }).focus()
  await press(8)
  const dialog = page.getByRole('dialog', { name: 'Reference library' })
  await expect(dialog).toBeVisible()
  await press(-1)
  await dialog.getByRole('searchbox').focus()
  await press(13)
  await expect(dialog.getByRole('heading', { name: 'Controls and bindings' })).toBeFocused()
  await press(-1)
  await press(13)
  await expect(dialog.getByRole('heading', { name: 'Back and forward' })).toBeFocused()
  await press(-1)
  await press(12)
  await expect(dialog.getByRole('heading', { name: 'Controls and bindings' })).toBeFocused()
  await press(-1)
  await dialog.getByRole('searchbox').focus()
  await press(1)
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeFocused()
})

test('reference works at 320px with touch, doubled text and reduced motion', async ({
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
    await page.getByRole('button', { name: 'Help', exact: true }).tap()
    const initialFont = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize)
    )
    await page.addStyleTag({ content: `:root { font-size: ${initialFont * 2}px; }` })
    expect(
      await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
    ).toBe(initialFont * 2)
    const dialog = page.getByRole('dialog', { name: 'Reference library' })
    await dialog.getByRole('searchbox').fill('keyboard')
    const result = dialog.getByRole('button', { name: 'Controls and bindings', exact: true })
    await result.tap()
    const box = await result.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(48)
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true
    )
    const bounds = await dialog.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
    await page.screenshot({ path: 'test-results/reference-mobile.png' })
    await dialog.getByRole('button', { name: 'Close reference' }).tap()
    await expect(dialog).not.toBeVisible()
  } finally {
    await context.close()
  }
})
