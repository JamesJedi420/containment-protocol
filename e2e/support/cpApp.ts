import { expect, type Page } from '@playwright/test'

/** Zustand persist key for campaign state (gameStore). */
export const CP_GAME_STORAGE_KEY = 'containment-protocol-game-state'

export type PageErrorProbe = {
  readonly errors: string[]
  dispose: () => void
}

/**
 * Fail-closed page-error collector. Callers assert `errors` is empty after flows.
 */
export function attachPageErrorProbe(page: Page): PageErrorProbe {
  const errors: string[] = []
  const onPageError = (error: Error) => {
    errors.push(error.message)
  }
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  }
  page.on('pageerror', onPageError)
  page.on('console', onConsole)
  return {
    errors,
    dispose: () => {
      page.off('pageerror', onPageError)
      page.off('console', onConsole)
    },
  }
}

/**
 * Wipe campaign persistence and remount so each test starts from a clean store.
 * Do not use addInitScript — it would also clear storage on intentional reloads.
 */
export async function clearCampaignStorage(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate((key: string) => {
    window.localStorage.removeItem(key)
  }, CP_GAME_STORAGE_KEY)
  await page.reload({ waitUntil: 'domcontentloaded' })
}

export async function openFrontDesk(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible()
  await expect(page.getByText(/Week 1\s*\/\s*Active cap/i).first()).toBeVisible()
}

export async function advanceOperationalWeek(page: Page): Promise<void> {
  await page.getByTestId('topbar-advance-button').click()
  await expect(page.getByText(/Week 2\s*\/\s*Active cap/i).first()).toBeVisible()
}

export function expectNoPageErrors(probe: PageErrorProbe): void {
  expect(
    probe.errors,
    `Unexpected browser errors:\n${probe.errors.join('\n')}`,
  ).toEqual([])
}
