import { test, expect } from '@playwright/test'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  expectNoPageErrors,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

/**
 * SPE-1080 — durable browser coverage for the shell accessibility contract.
 *
 * This spec asserts what the browser accessibility tree and focus model can prove:
 * keyboard bypass, a single `main` landmark, and a polite week-close announcement.
 * It is NOT a screen-reader pass — NVDA/VoiceOver rows S5–S6 in
 * `docs/accessibility-audit.md` stay open until a human runs them.
 */
test.describe('SPE-1080 keyboard bypass, landmarks, and week-close announcement', () => {
  test('skip link is the first tab stop and moves focus into the only main', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)

      const skipLink = page.getByRole('link', { name: 'Skip to main content' })
      await expect(skipLink).toHaveCount(1)

      await page.keyboard.press('Tab')
      await expect(skipLink).toBeFocused()

      // Off-screen-until-focused is only bypass-safe if it comes back on-screen.
      const box = await skipLink.boundingBox()
      expect(box, 'focused skip link must expose a layout box').not.toBeNull()
      if (!box) {
        throw new Error('focused skip link has no layout box')
      }
      expect(box.x, 'focused skip link must not stay off-screen').toBeGreaterThanOrEqual(0)
      expect(box.y, 'focused skip link must sit at the top of the viewport').toBeLessThan(80)

      await page.keyboard.press('Enter')

      const main = page.getByRole('main')
      await expect(main).toHaveCount(1)
      await expect(main).toHaveAttribute('id', 'main-content')
      await expect(main).toBeFocused()

      // Routed content lives inside the landmark; shell navigation must not.
      expect(
        await main.getByRole('region').count(),
        'expected routed regions nested inside main'
      ).toBeGreaterThan(4)
      expect(
        await main.getByRole('navigation', { name: 'Primary operations' }).count(),
        'primary navigation must stay outside main'
      ).toBe(0)

      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('advancing a week announces the close once and updates the same region in place', async ({
    page,
  }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await expect(page.getByTestId('shell-week-status')).toHaveCount(0)

      const initialStatus = page.getByRole('status').filter({ hasText: /^$/ }).first()
      await initialStatus.evaluate((node) => {
        node.setAttribute('data-live-probe', 'mounted')
      })
      await advanceOperationalWeek(page)

      const panel = page.getByTestId('shell-week-status')
      await expect(panel).toBeVisible()
      // The existing live region updates while the report panel receives focus.
      await expect(panel).toBeFocused()

      const status = panel.getByRole('status')
      await expect(status).toHaveAttribute('data-live-probe', 'mounted')
      await expect(status).toHaveAttribute('aria-live', 'polite')
      await expect(status).toHaveAttribute('aria-atomic', 'true')
      await expect(status).toContainText(/Week 1 closed/i)
      await expect(status).toContainText(/\d+ resolved, \d+ partial, \d+ failed/i)
      await expect(status).toContainText(/Week 2 started/i)

      const reportLink = panel.getByRole('link', { name: /Open week 1 report/i })
      await expect(reportLink).toHaveAttribute('href', '/report/1')

      const firstMessage = normalize(await status.textContent())

      // Identity probe: an in-place update reuses the live region, while a remount
      // would drop this attribute. Remounts are not reliably re-announced.
      await panel.evaluate((node) => {
        node.dataset.announcementProbe = 'kept'
      })

      // Audit row S6: wait without touching focus; the message must not change.
      await page.waitForTimeout(3_000)
      expect(normalize(await status.textContent())).toBe(firstMessage)
      await expect(panel).toHaveAttribute('data-announcement-probe', 'kept')

      await advanceOperationalWeek(page)
      await expect(status).toContainText(/Week 2 closed/i)
      await expect(panel).toHaveAttribute('data-announcement-probe', 'kept')
      await expect(panel.getByRole('link', { name: /Open week 2 report/i })).toHaveAttribute(
        'href',
        '/report/2'
      )

      // Audit row S13: the second close replaces the first, never concatenates both.
      expect(normalize(await status.textContent())).not.toContain('Week 1 closed')
      expect(normalize(await status.textContent())).toContain('Week 2 closed')

      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('agent dossier routes expose one main with a named dossier region', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await openPrimaryNav(page, 'Agents')
      await expect(page).toHaveURL(/\/agents$/)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(
        page.getByRole('main').getByRole('region', { name: 'Agent detail panel' })
      ).toHaveCount(1)

      const agentLink = page.locator('a[href^="/agents/"]').first()
      await expect(agentLink).toHaveCount(1)
      const href = await agentLink.getAttribute('href')
      expect(href, 'expected a roster link to an agent detail route').toMatch(/^\/agents\/[^/?#]+/)
      const agentPath = (href ?? '').split(/[?#]/)[0]
      const agentId = agentPath.split('/').filter(Boolean).pop()
      expect(agentId, `expected an agent id in ${href}`).toBeTruthy()

      // A11Y-04: the dossier was a second `main`; it must now be a nested region.
      for (const path of [agentPath, `/registry/${agentId}`]) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('main')).toHaveCount(1)
        const dossier = page.getByRole('main').getByRole('region', { name: 'Agent detail panel' })
        await expect(dossier).toHaveCount(1)
        await expect(dossier).toBeVisible()
      }

      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })

  test('advancing from the Front Desk control also announces the close', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)

      // The dashboard advances through the store directly rather than through the
      // shell button, so a click-scoped announcement guard would leave `/` silent.
      const frontDeskAdvance = page.getByRole('button', { name: /^advance week\s*→$/i })
      await expect(frontDeskAdvance).toBeVisible()
      await frontDeskAdvance.click()

      const panel = page.getByTestId('shell-week-status')
      await expect(panel).toBeVisible()
      await expect(panel).toBeFocused()
      await expect(panel.getByRole('status')).toContainText(/Week 1 closed/i)
      await expect(panel.getByRole('link', { name: /Open week 1 report/i })).toHaveAttribute(
        'href',
        '/report/1'
      )

      expectNoPageErrors(probe)
    } finally {
      probe.dispose()
    }
  })
})

function normalize(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}
