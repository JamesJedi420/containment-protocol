import { test, expect } from '@playwright/test'
import {
  advanceOperationalWeek,
  assignFirstOpenTriageCase,
  attachPageErrorProbe,
  buyAgencyMaintenancePackage,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  hireFirstEnabledCandidate,
  launchContractFromMissionBoard,
  openContainmentSiteAndIncidentDesk,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

test.describe('SPE-3458 / SPE-3481 / SPE-3482 / SPE-3483 CP Chromium player smokes', () => {
  test('SPE-3768 opens first-campaign dossier triage from Needs Attention', async ({ page }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    const dossier = page.getByRole('region', { name: 'First anomalous dossier' })
    const title = await dossier.getByRole('heading').innerText()
    await dossier.getByRole('link', { name: 'Review dossier and triage' }).click()

    const triage = page.getByRole('region', { name: `Case triage detail: ${title}` })
    await expect(triage).toBeVisible()
    await triage.getByRole('button', { name: 'Defer', exact: true }).click()
    await expect(triage.getByRole('button', { name: 'Clear disposition' })).toBeVisible()
  })

  test('startup and player-visible navigation', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await openPrimaryNav(page, 'Cases')
      await expect(page).toHaveURL(/\/cases/)
      await expect(
        page.getByRole('heading', { name: /Cases|Mission|Triage/i }).first()
      ).toBeVisible()
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  // SPE-3348 — expand player-path smoke for primary Agents surface (shipped roster UI).
  test('primary Agents roster path loads without page errors', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await openPrimaryNav(page, 'Agents')
      await expect(page).toHaveURL(/\/agents/)
      await expect(page.getByRole('region', { name: 'Agent filters' })).toBeVisible()
      await expect(page.getByText(/shown\s*\/\s*\d+\s*total/i)).toBeVisible()
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('SPE-3057 opens the live candidate from a scouting notice', async ({ page }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await advanceOperationalWeek(page)
    await openPrimaryNav(page, 'Recruitment')
    await page.getByRole('combobox', { name: 'Sort', exact: true }).selectOption('name')
    await page.setViewportSize({ width: 390, height: 844 })

    const board = page.getByRole('article', { name: 'Candidate board' })
    const rows = board.getByRole('listitem')
    const initialCount = await rows.count()
    expect(initialCount).toBeGreaterThan(1)
    const scout = board.getByRole('button', { name: /^Scout \(\$/ }).first()
    const candidateName = await scout
      .locator('xpath=ancestor::li[1]')
      .locator('p')
      .first()
      .innerText()
    await scout.click()

    const notice = page.getByRole('link', {
      name: `View candidate: ${candidateName} scouting initiated`,
    })
    await notice.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/recruitment\?candidate=/)
    await expect(board.getByRole('heading', { name: 'Candidate board' })).toBeFocused()
    await expect(rows).toHaveCount(1)
    await expect(board.getByText(candidateName, { exact: true })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/recruitment\?sort=name$/)
    await expect(rows).toHaveCount(initialCount)
  })

  test('SPE-3130 restores recruitment filters on a fresh visit and resets them with the keyboard', async ({
    page,
  }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await openPrimaryNav(page, 'Recruitment')
    const filters = page.getByRole('region', { name: 'Recruitment filters' })
    const category = filters.getByRole('combobox', { name: 'Category' })
    const sort = filters.getByRole('combobox', { name: 'Sort' })
    await category.selectOption('agent')
    await sort.selectOption('name')
    await expect(page).toHaveURL(/\/recruitment\?category=agent&sort=name$/)

    await openPrimaryNav(page, 'Operations Desk')
    await page.setViewportSize({ width: 390, height: 844 })
    await openPrimaryNav(page, 'Recruitment')
    await expect(category).toHaveValue('agent')
    await expect(sort).toHaveValue('name')
    await page.reload()
    await expect(filters.getByRole('status')).toHaveText('Saved filters restored')
    await expect(category).toHaveValue('agent')
    await expect(sort).toHaveValue('name')

    const reset = filters.getByRole('button', { name: 'Reset filters' })
    await reset.focus()
    await page.keyboard.press('Enter')
    await page.reload()
    await expect(category).toHaveValue('all')
    await expect(sort).toHaveValue('expiry')
    await expect(filters.getByRole('status')).toBeEmpty()
  })

  test('advance one operational week through player controls', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByText(/No reports yet/i)
      ).toBeVisible()

      await advanceOperationalWeek(page)

      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByRole('link', { name: /Week 1/i })
      ).toBeVisible()
      await expect(
        page.getByTestId('topbar-metrics-row').getByText('Weeks').locator('..')
      ).toContainText('1')
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('save continuity across hard reload (localStorage persist)', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await advanceOperationalWeek(page)

      const stored = await page.evaluate(
        (key) => window.localStorage.getItem(key),
        CP_GAME_STORAGE_KEY
      )
      expect(stored, 'campaign persistence must write after advance').toBeTruthy()

      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/Week 2\s*\/\s*Active cap/i).first()).toBeVisible()
      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByRole('link', { name: /Week 1/i })
      ).toBeVisible()
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  // SPE-3481 — shipped player acceptance actions (not page-count coverage).
  test('launch mission-board contract opens a case with assignment', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await launchContractFromMissionBoard(page)
      await expect(page.getByRole('region', { name: 'Case triage queue' })).toBeVisible()
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  // SPE-3483 — manual Assign distinct from Mission Board Launch-with-recommended.
  test('manual assign from open triage increases Assigned queue', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await assignFirstOpenTriageCase(page)
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('hire a recruitment candidate after week advance', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await advanceOperationalWeek(page)
      await hireFirstEnabledCandidate(page)
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('agency maintenance package is a completable player action', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await buyAgencyMaintenancePackage(page)
      const maintenance = page.getByRole('article', { name: 'Facility maintenance' })
      const budget = maintenance.getByText(/Recovery budget:\s*\d+\s*hours\s*\/\s*\d+\s*parts/i)
      const packageDetails = maintenance.getByText(
        /Price:\s*\d+\s*funding\s*·\s*Available funding:\s*\d+/i
      )
      const purchasedBudget = await budget.innerText()
      const purchasedDetails = await packageDetails.innerText()
      await expect(
        maintenance.getByRole('button', { name: 'Buy maintenance package' })
      ).toBeDisabled()

      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(budget).toHaveText(purchasedBudget, { useInnerText: true })
      await expect(packageDetails).toHaveText(purchasedDetails, { useInnerText: true })
      await expect(
        maintenance.getByRole('button', { name: 'Buy maintenance package' })
      ).toBeDisabled()
      await expect(maintenance).toContainText('Insufficient funding for a maintenance package.')
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('containment site loads and routes to incident desk', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await openContainmentSiteAndIncidentDesk(page)
      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })
})
