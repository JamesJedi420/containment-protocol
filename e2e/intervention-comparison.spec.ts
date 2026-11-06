import { expect, test, type Browser, type Page } from '@playwright/test'
import type { GameState } from '../src/domain/models'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  openPrimaryNav,
} from './support/cpApp'

const archiveTitle = 'The Whispering Archive'

async function readSavedGame(page: Page): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).state.game,
    CP_GAME_STORAGE_KEY
  )
}

async function selectCase(page: Page, title: string) {
  await page.getByRole('button', { name: `Select ${title} for triage detail`, exact: true }).click()
  return page.getByRole('region', { name: `Case triage detail: ${title}`, exact: true })
}

async function runComparisonPath(browser: Browser, intervene: boolean) {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    locale: 'en-US',
    timezoneId: 'UTC',
  })
  const page = await context.newPage()
  const probe = attachPageErrorProbe(page)
  try {
    await clearCampaignStorage(page)
    await openPrimaryNav(page, 'Cases')
    const vampire = await selectCase(page, 'Vampire Nest in the Stockyards')
    await vampire.getByRole('button', { name: 'Assign Night Watch', exact: true }).click()
    const initial = await readSavedGame(page)
    const archive = await selectCase(page, archiveTitle)
    await expect(archive).toContainText('Stage 1')
    await expect(archive).toContainText('Assign one team')
    if (intervene)
      await archive.getByRole('button', { name: 'Assign Green Tape', exact: true }).click()

    await openPrimaryNav(page, 'Operations Desk')
    await advanceOperationalWeek(page)
    await page.reload()
    await advanceOperationalWeek(page)
    await page
      .getByRole('region', { name: 'Latest report' })
      .getByRole('link', { name: 'Week 2', exact: true })
      .click()
    const result = page
      .getByRole('region', { name: 'Case outcomes' })
      .locator('section')
      .filter({
        has: page.getByText(intervene ? 'Partial cases' : 'Unresolved cases', { exact: true }),
      })
      .locator(':scope > ul > li')
      .filter({ has: page.getByText(archiveTitle, { exact: true }) })
    await expect(result).toBeVisible()
    if (intervene) {
      await expect(result).not.toContainText('Case escalated to stage')
      await expect(result).not.toContainText('Spawned follow-up case')
    } else {
      await expect(result).toContainText('Case deadline expired before successful resolution.')
    }
    const visibleOutcome = await result.innerText()
    const beforeReload = await readSavedGame(page)
    const summarize = (game: GameState) => ({
      week: game.week,
      archive: { status: game.cases['case-002'].status, stage: game.cases['case-002'].stage },
      outbreakIds: Object.values(game.cases)
        .filter((value) => value.title === 'Campus Outbreak')
        .map((value) => value.id)
        .sort(),
      reportWeeks: game.reports.map((report) => report.week),
    })
    const outcome = summarize(beforeReload)
    await page.reload()
    await expect(result).toHaveText(visibleOutcome, { useInnerText: true })
    expect(summarize(await readSavedGame(page))).toEqual(outcome)
    expect(outcome.week).toBe(3)
    expect(new Set(outcome.outbreakIds).size).toBe(outcome.outbreakIds.length)
    if (intervene) {
      expect(outcome.archive).toEqual({ status: 'open', stage: 1 })
      expect(outcome.outbreakIds).toEqual([])
    } else {
      expect(outcome.archive.stage).toBeGreaterThan(1)
      expect(outcome.outbreakIds.length).toBeGreaterThan(0)
    }

    await openPrimaryNav(page, 'Cases')
    const nextChoice = await selectCase(page, archiveTitle)
    if (intervene) {
      await expect(nextChoice).toContainText('Assign one team')
      await expect(
        nextChoice.getByRole('button', { name: 'Assign Green Tape', exact: true })
      ).toBeEnabled()
    } else {
      await expect(nextChoice).toContainText('Requires 3 teams before launch.')
    }
    await test.info().attach(intervene ? 'intervention-next-choice' : 'inaction-next-choice', {
      body: await nextChoice.screenshot(),
      contentType: 'image/png',
    })
    expectNoPageErrors(probe)
    return {
      initial,
      outcome,
      visibleOutcome,
    }
  } finally {
    probe.dispose()
    await context.close()
  }
}

test('one player intervention causally changes later mission choices and replays through reload', async ({
  browser,
}) => {
  test.setTimeout(240_000)
  const intervention = await runComparisonPath(browser, true)
  const inaction = await runComparisonPath(browser, false)
  expect(inaction.initial).toEqual(intervention.initial)
  expect(inaction.outcome.archive.stage).toBeGreaterThan(intervention.outcome.archive.stage)
  expect(await runComparisonPath(browser, true)).toEqual(intervention)
  expect(await runComparisonPath(browser, false)).toEqual(inaction)
  await test.info().attach('controlled-intervention-comparison', {
    body: JSON.stringify({ intervention, inaction }, null, 2),
    contentType: 'application/json',
  })
})
