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
  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  await page.goto(`${baseURL}/agency`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const diagnosticScreenshot = `qa-artifacts/spe-3136-${viewport.name}-page.png`
  await page.screenshot({ path: diagnosticScreenshot, fullPage: true })

  const bodyText = (await page.locator('body').innerText()).slice(0, 8000)
  const url = page.url()
  const title = await page.title()

  const panel = page.locator('article[aria-labelledby="operational-staffing-heading"]')
  const panelVisible = await panel.isVisible().catch(() => false)

  if (!panelVisible) {
    results.push({
      viewport,
      url,
      title,
      bodyText,
      pageErrors,
      panelVisible: false,
      diagnosticScreenshot,
    })
    await page.close()
    continue
  }

  const optionalText = async (text) =>
    panel.getByText(text, { exact: false }).textContent().catch(() => null)

  const texts = {
    heading: await panel.getByRole('heading', { name: 'Operational staffing' }).textContent(),
    headcount: await panel.getByText('Operational staff headcount').locator('..').textContent(),
    assigned: await panel.getByText('Assigned personnel').locator('..').textContent(),
    capacity: await panel.getByText('Effective operational capacity').locator('..').textContent(),
    unassigned: await optionalText('Unassigned staff are not contributing to operational capacity.'),
    invalid: await optionalText(
      'Invalid or conflicting post assignments do not contribute to operational capacity.'
    ),
    navigation: await optionalText(
      'Operational-post assignment navigation is currently unavailable.'
    ),
  }

  const supportStaffText = await page
    .getByText('Support Staff')
    .locator('..')
    .textContent()
    .catch(() => null)

  const interactiveCount = await panel
    .locator('a, button, input, select, textarea, [tabindex]')
    .count()

  const visual = await panel.evaluate((el) => {
    const panelRect = el.getBoundingClientRect()
    const descendants = [...el.querySelectorAll('*')]
      .map((node) => {
        const rect = node.getBoundingClientRect()
        const style = getComputedStyle(node)
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
          fontSize: style.fontSize,
          visibility: style.visibility,
          display: style.display,
        }
      })
      .filter((x) => x.width > 0 && x.height > 0 && x.visibility !== 'hidden' && x.display !== 'none')

    const outOfBounds = descendants.filter(
      (x) => x.left < panelRect.left - 1 || x.right > panelRect.right + 1
    )
    const horizontallyOverflowing = descendants.filter((x) => x.scrollWidth > x.clientWidth + 1)
    const tooSmallText = descendants.filter((x) => {
      if (!x.text) return false
      const px = Number.parseFloat(x.fontSize)
      return Number.isFinite(px) && px < 12
    })

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
      tooSmallText,
    }
  })

  const documentOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))

  const panelScreenshot = `qa-artifacts/spe-3136-${viewport.name}-panel.png`
  await panel.screenshot({ path: panelScreenshot })

  results.push({
    viewport,
    url,
    title,
    bodyText,
    panelVisible: true,
    texts,
    supportStaffText,
    interactiveCount,
    visual,
    documentOverflow,
    pageErrors,
    diagnosticScreenshot,
    panelScreenshot,
  })

  await page.close()
}

await browser.close()

const failures = []
for (const result of results) {
  const prefix = result.viewport.name
  if (!result.panelVisible) {
    failures.push(`${prefix}: operational staffing panel not visible; current URL ${result.url}`)
    if (result.pageErrors.length > 0)
      failures.push(`${prefix}: page errors: ${result.pageErrors.join(' | ')}`)
    continue
  }

  if (!result.texts.heading) failures.push(`${prefix}: operational staffing heading missing`)
  if (!result.texts.headcount?.includes('Operational staff headcount'))
    failures.push(`${prefix}: headcount metric missing`)
  if (!result.texts.assigned?.includes('Assigned personnel'))
    failures.push(`${prefix}: assigned metric missing`)
  if (!result.texts.capacity?.includes('Effective operational capacity'))
    failures.push(`${prefix}: effective capacity metric missing`)
  if (result.interactiveCount !== 0)
    failures.push(`${prefix}: staffing panel contains assignment/input controls`)
  if (result.visual.panel.scrollWidth > result.visual.panel.clientWidth + 1)
    failures.push(`${prefix}: staffing panel horizontally overflows`)
  if (result.visual.outOfBounds.length > 0)
    failures.push(`${prefix}: staffing descendants extend outside panel`)
  if (result.visual.horizontallyOverflowing.length > 0)
    failures.push(`${prefix}: staffing descendants horizontally overflow`)
  if (result.visual.tooSmallText.length > 0)
    failures.push(`${prefix}: staffing panel contains text below 12px`)
  if (result.documentOverflow.scrollWidth > result.documentOverflow.clientWidth + 1)
    failures.push(`${prefix}: page horizontally overflows viewport`)
  if (result.pageErrors.length > 0)
    failures.push(`${prefix}: page errors: ${result.pageErrors.join(' | ')}`)
}

const report = {
  branch: process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? 'unknown',
  sha: process.env.GITHUB_SHA ?? 'unknown',
  note:
    'Rendered actual /agency starting state. Diagnostic screenshots/body text are always captured, including when the staffing panel is absent.',
  results,
  failures,
  passed: failures.length === 0,
}

await fs.writeFile('qa-artifacts/report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

if (failures.length > 0) process.exitCode = 1
