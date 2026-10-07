import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
await fs.mkdir('qa-artifacts', { recursive: true })

const browser = await chromium.launch({ headless: true })
const results = []

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  await page.goto(`${baseURL}/agency`, { waitUntil: 'networkidle' })

  await page.evaluate(async () => {
    const [{ useGameStore }, { createStartingState }] = await Promise.all([
      import('/src/app/store/gameStore.ts'),
      import('/src/data/startingState.ts'),
    ])
    const game = createStartingState()
    game.staff = {
      assigned: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:2' },
      conflictA: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' },
      conflictB: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' },
      mismatch: { specialty: 'logistics', operationalPostId: 'staff-post:intel:2' },
      unassigned: { specialty: 'fabrication' },
    }
    game.supportStaff = {
      admin: 2,
      logistics: 3,
      medical: 4,
      intel: 5,
      total: 14,
      pressure: 0,
    }
    useGameStore.setState({ game })
  })

  const panel = page.getByRole('article', { name: 'Operational staffing' })
  await panel.waitFor({ state: 'visible' })

  const texts = {
    heading: await panel.getByRole('heading', { name: 'Operational staffing' }).textContent(),
    headcount: await panel.getByText('Operational staff headcount').locator('..').textContent(),
    assigned: await panel.getByText('Assigned personnel').locator('..').textContent(),
    capacity: await panel.getByText('Effective operational capacity').locator('..').textContent(),
    unassigned: await panel.getByText('Unassigned staff are not contributing to operational capacity.', { exact: false }).textContent(),
    invalid: await panel.getByText('Invalid or conflicting post assignments do not contribute to operational capacity.', { exact: false }).textContent(),
    navigation: await panel.getByText('Operational-post assignment navigation is currently unavailable.', { exact: false }).textContent(),
  }

  const supportStaffText = await page.getByText('Support Staff').locator('..').textContent().catch(() => null)
  const interactiveCount = await panel.locator('a, button, input, select, textarea, [tabindex]').count()

  const layout = await panel.evaluate((el) => {
    const panelRect = el.getBoundingClientRect()
    const descendants = [...el.querySelectorAll('*')]
      .map((node) => {
        const rect = node.getBoundingClientRect()
        return {
          tag: node.tagName,
          text: (node.textContent ?? '').trim().slice(0, 120),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
        }
      })
      .filter((x) => x.width > 0 && x.height > 0)

    const outOfBounds = descendants.filter(
      (x) => x.left < panelRect.left - 1 || x.right > panelRect.right + 1
    )
    const horizontallyOverflowing = descendants.filter((x) => x.scrollWidth > x.clientWidth + 1)

    return {
      panel: {
        left: panelRect.left,
        right: panelRect.right,
        top: panelRect.top,
        bottom: panelRect.bottom,
        width: panelRect.width,
        height: panelRect.height,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      },
      outOfBounds,
      horizontallyOverflowing,
    }
  })

  const documentOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))

  const screenshot = `qa-artifacts/spe-3136-${viewport.name}.png`
  await page.screenshot({ path: screenshot, fullPage: true })

  results.push({
    viewport,
    texts,
    supportStaffText,
    interactiveCount,
    layout,
    documentOverflow,
    consoleErrors,
    screenshot,
  })

  await page.close()
}

await browser.close()

const failures = []
for (const result of results) {
  const prefix = result.viewport.name
  if (!result.texts.heading) failures.push(`${prefix}: operational staffing heading missing`)
  if (!result.texts.headcount?.includes('Operational staff headcount')) failures.push(`${prefix}: headcount metric missing`)
  if (!result.texts.assigned?.includes('Assigned personnel')) failures.push(`${prefix}: assigned metric missing`)
  if (!result.texts.capacity?.includes('Effective operational capacity')) failures.push(`${prefix}: effective capacity metric missing`)
  if (!result.texts.unassigned) failures.push(`${prefix}: unassigned warning missing`)
  if (!result.texts.invalid) failures.push(`${prefix}: invalid-assignment warning missing`)
  if (!result.texts.navigation) failures.push(`${prefix}: unavailable-navigation copy missing`)
  if (!result.supportStaffText?.includes('Total: 14')) failures.push(`${prefix}: separate Support Staff metrics missing`)
  if (result.interactiveCount !== 0) failures.push(`${prefix}: staffing panel contains assignment/input controls`)
  if (result.layout.panel.scrollWidth > result.layout.panel.clientWidth + 1) failures.push(`${prefix}: staffing panel horizontally overflows`)
  if (result.layout.outOfBounds.length > 0) failures.push(`${prefix}: staffing descendants extend outside panel`)
  if (result.layout.horizontallyOverflowing.length > 0) failures.push(`${prefix}: staffing descendants horizontally overflow`)
  if (result.documentOverflow.scrollWidth > result.documentOverflow.clientWidth + 1) failures.push(`${prefix}: page horizontally overflows viewport`)
  if (result.consoleErrors.length > 0) failures.push(`${prefix}: console/page errors: ${result.consoleErrors.join(' | ')}`)
}

const report = {
  branch: process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? 'unknown',
  sha: process.env.GITHUB_SHA ?? 'unknown',
  results,
  failures,
  passed: failures.length === 0,
}

await fs.writeFile('qa-artifacts/report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

if (failures.length > 0) process.exitCode = 1
