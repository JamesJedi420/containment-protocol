import { expect, type Locator, type Page } from '@playwright/test'

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
  const weekLabel = page.getByText(/Week \d+\s*\/\s*Active cap/i).first()
  await expect(weekLabel).toBeVisible()
  const currentWeek = Number(/Week\s+(\d+)/i.exec((await weekLabel.textContent()) ?? '')?.[1])
  expect(
    Number.isFinite(currentWeek) && currentWeek > 0,
    'expected visible Week N / Active cap label before advance',
  ).toBe(true)
  await page.getByTestId('topbar-advance-button').click()
  await expect(
    page.getByText(new RegExp(`Week ${currentWeek + 1}\\s*/\\s*Active cap`, 'i')).first(),
  ).toBeVisible()
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
 * Requires a clean campaign (callers must `clearCampaignStorage` first) so Assigned starts at 0.
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
  expect(
    assignedBefore,
    'launchContractFromMissionBoard requires a clean campaign (Assigned === 0); clearCampaignStorage first',
  ).toBe(0)
  const launch = board.getByRole('button', { name: /Launch with/i }).first()
  await expect(launch).toBeEnabled()
  await launch.click()
  // Launched contract enters the live triage queue as an assigned Contract case.
  await expect(page.getByRole('tab', { name: /Contracts \(\d+\)/i })).toBeVisible()
  await expect
    .poll(async () => {
      const text = (await assignedTab.textContent()) ?? ''
      const match = /\((\d+)\)/.exec(text)
      if (!match) {
        throw new Error(`assigned tab label missing (N); got: ${JSON.stringify(text)}`)
      }
      return Number(match[1])
    })
    .toBeGreaterThan(0)
  await expect(
    page.getByRole('list', { name: 'Triage list' }).getByText('Contract', { exact: true }).first(),
  ).toBeVisible()
}

async function readAgentsRosterTotal(page: Page): Promise<number> {
  const totalLine = page.getByText(/\d+\s*shown\s*\/\s*\d+\s*total/i).first()
  await expect(totalLine).toBeVisible()
  const text = (await totalLine.textContent()) ?? ''
  const match = /(\d+)\s*shown\s*\/\s*(\d+)\s*total/i.exec(text)
  if (!match) {
    throw new Error(`Agents roster total missing; got: ${JSON.stringify(text)}`)
  }
  return Number(match[2])
}

async function readRecoveryBudget(
  maintenance: Locator,
): Promise<{ hours: number; parts: number }> {
  const budgetLine = maintenance.getByText(/Recovery budget:\s*\d+\s*hours\s*\/\s*\d+\s*parts/i)
  await expect(budgetLine).toBeVisible()
  const text = (await budgetLine.textContent()) ?? ''
  const match = /Recovery budget:\s*(\d+)\s*hours\s*\/\s*(\d+)\s*parts/i.exec(text)
  if (!match) {
    throw new Error(`Recovery budget hours/parts missing; got: ${JSON.stringify(text)}`)
  }
  return { hours: Number(match[1]), parts: Number(match[2]) }
}

/**
 * Hire the first enabled recruitment candidate. Call after at least one week advance
 * so the weekly recruitment pool exists. Asserts Agents roster total increases.
 */
export async function hireFirstEnabledCandidate(page: Page): Promise<void> {
  await openPrimaryNav(page, 'Agents')
  await expect(page).toHaveURL(/\/agents/)
  const agentsBefore = await readAgentsRosterTotal(page)

  await openPrimaryNav(page, 'Recruitment')
  await expect(page).toHaveURL(/\/recruitment/)
  await expect(page.getByRole('heading', { name: 'Recruitment' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Recruitment filters' })).toBeVisible()

  const hireButtons = page.getByRole('button', { name: /^Hire$/i })
  await expect(hireButtons.first()).toBeVisible({ timeout: 15_000 })
  const countBefore = await hireButtons.count()
  let hired = false
  for (let i = 0; i < countBefore; i += 1) {
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
  // Hired candidates leave the live board — count drop confirms the action mutated state.
  await expect
    .poll(async () => hireButtons.count())
    .toBeLessThan(countBefore)

  await openPrimaryNav(page, 'Agents')
  await expect(page).toHaveURL(/\/agents/)
  await expect
    .poll(async () => readAgentsRosterTotal(page))
    .toBeGreaterThan(agentsBefore)
}

/**
 * Agency command surface: buy one facility maintenance package when funded.
 * Requires a clean campaign with Available funding >= package Price (starting state is 110/100).
 * Do not advance week first — week close can reduce funding below the package price.
 * Asserts funding drops and Recovery budget hours/parts both increase.
 */
export async function buyAgencyMaintenancePackage(page: Page): Promise<void> {
  await openFutureExpansionNav(page, 'Agency')
  await expect(page).toHaveURL(/\/agency/)
  await expect(page.getByRole('heading', { name: 'Agency Command' })).toBeVisible()
  const maintenance = page.getByRole('article', { name: 'Facility maintenance' })
  const budgetBefore = await readRecoveryBudget(maintenance)
  const packageLine = maintenance.getByText(/Price:\s*\d+\s*funding\s*·\s*Available funding:\s*\d+/i)
  await expect(packageLine).toBeVisible()
  const packageText = (await packageLine.textContent()) ?? ''
  const price = Number(/Price:\s*(\d+)/i.exec(packageText)?.[1])
  const fundingBefore = Number(/Available funding:\s*(\d+)/i.exec(packageText)?.[1])
  expect(
    Number.isFinite(price) && Number.isFinite(fundingBefore) && fundingBefore >= price,
    `buyAgencyMaintenancePackage needs Available funding >= Price (funding=${fundingBefore}, price=${price}); use clearCampaignStorage on the funded starting campaign`,
  ).toBe(true)
  const buy = maintenance.getByRole('button', { name: 'Buy maintenance package' })
  await expect(buy).toBeEnabled()
  await buy.click()
  await expect
    .poll(async () => {
      const text = (await packageLine.textContent()) ?? ''
      const match = /Available funding:\s*(\d+)/i.exec(text)
      if (!match) {
        throw new Error(`Available funding text missing; got: ${JSON.stringify(text)}`)
      }
      return Number(match[1])
    })
    .toBeLessThan(fundingBefore)
  await expect
    .poll(async () => {
      const budget = await readRecoveryBudget(maintenance)
      return budget.hours
    })
    .toBeGreaterThan(budgetBefore.hours)
  await expect
    .poll(async () => {
      const budget = await readRecoveryBudget(maintenance)
      return budget.parts
    })
    .toBeGreaterThan(budgetBefore.parts)
}

/**
 * Open the live Containment Site route (`SystemBoundaryPage` placeholder) and hand off
 * into Cases via primary nav. `ContainmentSitePage.tsx` is not routed yet — smokes cover
 * the player-visible surface only.
 */
export async function openContainmentSiteAndIncidentDesk(page: Page): Promise<void> {
  await openFutureExpansionNav(page, 'Containment Site')
  await expect(page).toHaveURL(/\/containment-site/)
  await expect(page.getByRole('heading', { name: 'Containment Site', level: 2 })).toBeVisible()
  await expect(page.getByText('Active cases', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Shared-state integration' })).toBeVisible()
  await openPrimaryNav(page, 'Cases')
  await expect(page).toHaveURL(/\/cases/)
  await expect(page.getByRole('region', { name: 'Case triage queue' })).toBeVisible()
}

export function expectNoPageErrors(probe: PageErrorProbe): void {
  expect(
    probe.errors,
    `Unexpected browser errors:\n${probe.errors.join('\n')}`,
  ).toEqual([])
}
