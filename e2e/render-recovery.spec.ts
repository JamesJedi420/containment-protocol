import { test, expect } from '@playwright/test'
import {
  advanceOperationalWeek,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  openFrontDesk,
} from './support/cpApp'

const appModule = '**/src/app/App.tsx*'
const brokenApp =
  'export default function App() { throw new Error("SPE-2717 forced root render failure") }'

test('terminal render failure isolates recovery, preserves stored bytes and explicitly reloads normal startup', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  await advanceOperationalWeek(page)
  const stored = await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)
  const diagnostics: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.push(message.text())
  })
  await page.route(appModule, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: brokenApp })
  )
  await page.reload()
  await expect(page.getByRole('alert')).toHaveText('The application could not display this screen.')
  await expect(page.getByRole('banner')).toHaveCount(0)
  await expect(page.getByRole('navigation')).toHaveCount(0)
  const reload = page.getByRole('button', { name: 'Reload application' })
  await expect(reload).toBeFocused()
  await expect(page.getByRole('button')).toHaveCount(1)
  await expect
    .poll(() =>
      diagnostics.some((message) => message.includes('SPE-2717 forced root render failure'))
    )
    .toBe(true)
  expect(await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)).toBe(stored)
  await page.unroute(appModule)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible()
  await expect(page.getByText(/Week 2\s*\/\s*Active cap/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload application' })).toHaveCount(0)
})

test('recovery uses canonical controller activation without the application shell', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { pressed: -1 }
    Object.assign(window, { recoveryPad: state })
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
  await page.route(appModule, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: brokenApp })
  )
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Reload application' })).toBeFocused()
  await page.unroute(appModule)
  await page.evaluate(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    ;(window as unknown as { recoveryPad: { pressed: number } }).recoveryPad.pressed = 3
  })
  await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible()
})

test('persistent failure does not auto-reload and recovery remains touch usable with doubled text', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  let attempts = 0
  await page.route(appModule, (route) => {
    attempts += 1
    return route.fulfill({ contentType: 'application/javascript', body: brokenApp })
  })
  try {
    await page.goto('/')
    const reload = page.getByRole('button', { name: 'Reload application' })
    await expect(reload).toBeFocused()
    const initial = attempts
    const initialFont = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize)
    )
    await page.addStyleTag({ content: `:root { font-size: ${initialFont * 2}px; }` })
    expect(
      await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
    ).toBe(initialFont * 2)
    await reload.scrollIntoViewIfNeeded()
    const box = await reload.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(48)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(320)
    expect(
      await page.getByRole('main').evaluate((element) => element.scrollWidth <= element.clientWidth)
    ).toBe(true)
    expect(attempts).toBe(initial)
    await page.screenshot({ path: 'test-results/render-recovery-mobile.png' })
    await reload.tap()
    await expect.poll(() => attempts).toBe(initial + 1)
    await expect(reload).toBeFocused()
    expect(attempts).toBe(initial + 1)
  } finally {
    await context.close()
  }
})
