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
  test('startup and player-visible navigation', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await openPrimaryNav(page, 'Cases')
      await expect(page).toHaveURL(/\/cases/)
      await expect(page.getByRole('heading', { name: /Cases|Mission|Triage/i }).first()).toBeVisible()
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

  test('advance one operational week through player controls', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByText(/No reports yet/i),
      ).toBeVisible()

      await advanceOperationalWeek(page)

      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByRole('link', { name: /Week 1/i }),
      ).toBeVisible()
      await expect(page.getByTestId('topbar-metrics-row').getByText('Weeks').locator('..')).toContainText(
        '1',
      )
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

      const stored = await page.evaluate((key) => window.localStorage.getItem(key), CP_GAME_STORAGE_KEY)
      expect(stored, 'campaign persistence must write after advance').toBeTruthy()

      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/Week 2\s*\/\s*Active cap/i).first()).toBeVisible()
      await expect(
        page.getByRole('region', { name: 'Latest report' }).getByRole('link', { name: /Week 1/i }),
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
