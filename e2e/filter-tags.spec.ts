import { test, expect } from '@playwright/test'
import { clearCampaignStorage, openFrontDesk, advanceOperationalWeek } from './support/cpApp'

test('operational and knowledge facets keep URL filtering and native keyboard activation', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  await advanceOperationalWeek(page)
  await page.goto('/cases')
  const caseModes = page.getByRole('group', { name: 'Mode', exact: true })
  await caseModes.getByRole('button', { name: 'Threshold' }).click()
  await expect(caseModes.getByRole('button', { name: 'Threshold' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(page).toHaveURL(/mode=threshold/)
  await expect(page.getByRole('tab', { name: /^Assigned/ })).toBeVisible()
  await caseModes.getByRole('button', { name: 'All modes' }).click()
  await expect(page).not.toHaveURL(/mode=/)
  await page.goto('/intel?mode=threshold')
  const modes = page.getByRole('group', { name: 'Mode', exact: true })
  await expect(modes.getByRole('button', { name: 'Threshold' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await modes.getByRole('button', { name: 'All modes' }).focus()
  await page.keyboard.press('Tab')
  await expect(modes.getByRole('button', { name: 'Threshold' })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Space')
  await expect(page).toHaveURL(/mode=probability/)
  await page.reload()
  await expect(modes.getByRole('button', { name: 'Probability' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(page.getByRole('navigation').first()).toBeVisible()
  await expect(modes.getByRole('tab')).toHaveCount(0)
})

test('filter tags wrap long labels in reading order at 320px and doubled text with touch targets', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  try {
    await page.goto('/intel')
    const modes = page.getByRole('group', { name: 'Mode', exact: true })
    await expect(modes).toBeVisible()
    const font = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize)
    )
    await page.addStyleTag({ content: `:root { font-size: ${font * 2}px; }` })
    expect(
      await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
    ).toBe(font * 2)
    // Constructed localization expansion, without changing canonical application copy.
    await modes
      .getByRole('button')
      .nth(2)
      .evaluate((button) => {
        button.textContent =
          'Wahrscheinlichkeitsbasierte Einsatzbewertung mit unvollständigen Informationen'
      })
    expect((await modes.boundingBox())!.width).toBeGreaterThanOrEqual(190)
    const boxes = await modes.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect()
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          overflow: button.scrollWidth > button.clientWidth,
        }
      })
    )
    expect(new Set(boxes.map((box) => box.y)).size).toBeGreaterThan(1)
    for (const [index, box] of boxes.entries()) {
      expect(box.height).toBeGreaterThanOrEqual(48)
      expect(box.width).toBeGreaterThanOrEqual(48)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(320)
      expect(box.overflow).toBe(false)
      if (index) expect(box.y >= boxes[index - 1].y).toBe(true)
    }
    await modes.getByRole('button').nth(2).tap()
    await expect(page).toHaveURL(/mode=probability/)
    await modes.scrollIntoViewIfNeeded()
    await modes.screenshot({ path: 'test-results/filter-tags-mobile.png' })
  } finally {
    await context.close()
  }
})

test('standard controller traverses visible filter order and activates only the focused group', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { pressed: -1 }
    Object.assign(window, { filterPad: state })
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
  await page.goto('/intel')
  const buttons = page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button')
  await buttons.first().focus()
  const press = async (button: number) => {
    await page.evaluate(async (pressed) => {
      const state = (window as unknown as { filterPad: { pressed: number } }).filterPad
      state.pressed = -1
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
      state.pressed = pressed
    }, button)
  }
  await press(15)
  await expect(buttons.nth(1)).toBeFocused()
  await press(15)
  await expect(buttons.nth(2)).toBeFocused()
  await press(0)
  await expect(page).toHaveURL(/mode=probability/)
  await press(14)
  await expect(buttons.nth(1)).toBeFocused()
})
