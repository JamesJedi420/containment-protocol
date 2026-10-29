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

export async function openPrimaryNav(page: Page, label: string): Promise<void> {
  await page.getByRole('navigation', { name: 'Primary operations' }).getByRole('link', {
    name: label,
  }).click()
}

export async function openFutureExpansionNav(page: Page, label: string): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Future expansion systems' })
    .getByRole('link', { name: label })
    .click()
}

/**
 * Launch the first available mission-board contract with its recommended team.
 * Covers shipped “open a case + assign” acceptance in one player control.
 */
export async function launchContractFromMissionBoard(page: Page): Promise<void> {
  await openPrimaryNav(page, 'Cases')
  await expect(page).toHaveURL(/\/cases/)
  const board = page.getByRole('region', { name: 'Contract board' })
  await expect(board.getByRole('heading', { name: /Mission board/i })).toBeVisible()
  const assignedTab = page.getByRole('tab', { name: /Assigned/i })
  const assignedBefore = Number(
    /\((\d+)\)/.exec((await assignedTab.textContent()) ?? '')?.[1] ?? '0',
  )
  const launch = board.getByRole('button', { name: /Launch with/i }).first()
  await expect(launch).toBeEnabled()
  await launch.click()
  // Launched contract enters the live triage queue as an assigned Contract case.
  await expect(page.getByRole('tab', { name: /Contracts \(\d+\)/i })).toBeVisible()
  await expect
    .poll(async () => {
      const text = (await assignedTab.textContent()) ?? ''
      return Number(/\((\d+)\)/.exec(text)?.[1] ?? '0')
    })
    .toBeGreaterThan(assignedBefore)
  await expect(
    page.getByRole('list', { name: 'Triage list' }).getByText('Contract', { exact: true }).first(),
  ).toBeVisible()
}

/**
 * Hire the first enabled recruitment candidate. Call after at least one week advance
 * so the weekly recruitment pool exists.
 */
export async function hireFirstEnabledCandidate(page: Page): Promise<void> {
  await openPrimaryNav(page, 'Recruitment')
  await expect(page).toHaveURL(/\/recruitment/)
  await expect(page.getByRole('heading', { name: 'Recruitment' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Recruitment filters' })).toBeVisible()

  const hireButtons = page.getByRole('button', { name: /^Hire$/i })
  await expect(hireButtons.first()).toBeVisible({ timeout: 15_000 })
  const count = await hireButtons.count()
  let hired = false
  for (let i = 0; i < count; i += 1) {
    const button = hireButtons.nth(i)
    if (await button.isEnabled()) {
      await button.click()
      hired = true
      break
    }
  }
  expect(hired, 'expected at least one hireable recruitment candidate after week advance').toBe(
    true,
  )
}

/** Agency command surface: buy one facility maintenance package when funded. */
export async function buyAgencyMaintenancePackage(page: Page): Promise<void> {
  await openFutureExpansionNav(page, 'Agency')
  await expect(page).toHaveURL(/\/agency/)
  await expect(page.getByRole('heading', { name: 'Agency Command' })).toBeVisible()
  const buy = page.getByRole('button', { name: 'Buy maintenance package' })
  await expect(buy).toBeEnabled()
  await buy.click()
  await expect(page.getByText(/Recovery budget:/i)).toBeVisible()
}

export function expectNoPageErrors(probe: PageErrorProbe): void {
  expect(
    probe.errors,
    `Unexpected browser errors:\n${probe.errors.join('\n')}`,
  ).toEqual([])
}
