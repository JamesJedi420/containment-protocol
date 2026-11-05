import { expect, test } from '@playwright/test'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  expectNoPageErrors,
  openFrontDesk,
} from './support/cpApp'

const ingest = '**/*.betterstackdata.com/api/**/envelope/**'

test('enabled diagnostics preserve week advance and save reload without emitting errors', async ({
  page,
}) => {
  const probe = attachPageErrorProbe(page)
  let reports = 0
  await page.route(ingest, async (route) => {
    reports += 1
    await route.fulfill({ status: 200, body: '{}' })
  })
  await page.addInitScript(() => sessionStorage.setItem('cp.errorTracking.allowAutomated', 'true'))
  try {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await advanceOperationalWeek(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Week 2\s*\/\s*Active cap/i).first()).toBeVisible()
    expectNoPageErrors(probe)
    expect(reports).toBe(0)
  } finally {
    probe.dispose()
  }
})

test('blocked preference storage disables optional reporting without breaking startup', async ({
  page,
}) => {
  const requests: string[] = []
  await page.route(ingest, async (route) => {
    requests.push(route.request().url())
    await route.abort()
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    Object.defineProperty(window, 'sessionStorage', {
      get: () => {
        throw new DOMException('Blocked')
      },
    })
  })
  await page.goto('/e2e/fixtures/error-tracking.html')
  await expect(page.getByRole('button', { name: 'Verify React exception' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-error-tracking-configured', 'false')
  expect(requests).toEqual([])
})

test('an unavailable ingest service does not interrupt the game', async ({ page }) => {
  const request = page.waitForRequest(ingest, { timeout: 15_000 })
  const failed = page.waitForEvent('requestfailed', {
    predicate: (request) => request.url().includes('.betterstackdata.com/api/'),
    timeout: 15_000,
  })
  await page.route(ingest, (route) => route.abort())
  await page.addInitScript(() => sessionStorage.setItem('cp.errorTracking.allowAutomated', 'true'))
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible()
  await page.addScriptTag({
    content: `setTimeout(() => { throw new Error('Containment Protocol Better Stack verification') }, 0)\n//# sourceURL=http://127.0.0.1:5198/error-tracking-verification.js`,
  })
  await Promise.all([request, failed])
  await expect(page.getByRole('main')).toBeVisible()
})

test('ordinary automated gameplay does not send live telemetry', async ({ page }) => {
  let requests = 0
  await page.route(ingest, async (route) => {
    requests += 1
    await route.abort()
  })
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('main')).toBeVisible()
  expect(requests).toBe(0)
  // Exercise an error as well: an idle page alone cannot prove reporting is disabled.
  await page.goto('/e2e/fixtures/error-tracking.html')
  await expect(page.locator('html')).toHaveAttribute('data-error-tracking-configured', 'false')
  const thrown = page.waitForEvent('pageerror')
  await page.evaluate(() => document.dispatchEvent(new Event('verify-global-error')))
  await thrown
  expect(requests).toBe(0)
})

test('explicit verification captures React and global errors with minimal, tagged payloads', async ({
  page,
}) => {
  const envelopes: string[] = []
  await page.route(ingest, async (route) => {
    envelopes.push(route.request().postData() ?? '')
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.addInitScript(() => {
    sessionStorage.setItem('cp.errorTracking.allowAutomated', 'true')
  })
  await page.goto('/e2e/fixtures/error-tracking.html')
  await expect(page.locator('html')).toHaveAttribute('data-error-tracking-singleton', 'true')
  await page.getByRole('button', { name: 'Verify React exception' }).click()
  await expect.poll(() => envelopes.length).toBe(1)
  await page.evaluate(() => document.dispatchEvent(new Event('verify-global-error')))
  await expect.poll(() => envelopes.length).toBe(2)
  for (const body of envelopes) {
    const lines = body.trimEnd().split('\n')
    expect(lines.length, 'Expected one SDK envelope header, event item header and JSON event').toBe(
      3
    )
    expect(lines[1], 'Missing SDK item header').toBeTruthy()
    expect(lines[2], 'Missing SDK event body').toBeTruthy()
    const item = JSON.parse(lines[1]!) as { type: string }
    const event = JSON.parse(lines[2]!) as Record<string, unknown>
    expect(item.type).toBe('event')
    expect(event.environment).toBe('playwright')
    expect(event.release).toMatch(/^containment-protocol@(?:[0-9a-f]{40}|local)$/)
    expect(event).not.toHaveProperty('user')
    expect(event).not.toHaveProperty('request')
    expect(event).not.toHaveProperty('breadcrumbs')
    expect(event).not.toHaveProperty('extra')
    expect(event).not.toHaveProperty('contexts')
    expect(JSON.stringify(event.exception)).toContain(
      'Containment Protocol Better Stack verification'
    )
  }
})
