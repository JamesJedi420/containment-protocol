import { expect, test, type Browser, type Page } from '@playwright/test'
import type { GameState } from '../src/domain/models'
import { getFrontDeskHubView } from '../src/features/operations/frontDeskView'
import { CAMPAIGN_COMPARISON_TIMEOUT_MS, expectCampaignStateBudget } from './support/campaignBudget'
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

async function waitForFrontDeskObservation(page: Page, week: number) {
  await expect(
    page.getByRole('heading', { name: 'Operations Overview', exact: true })
  ).toBeVisible()
  await expect
    .poll(async () => {
      const game = await readSavedGame(page)
      const routes = getFrontDeskHubView(game).briefing.debug
      const last = game.runtimeState?.ui.debug.eventLog?.at(-1)
      return (
        game.week === week &&
        last?.week === week &&
        last.type === 'route.selected' &&
        last.contextId === 'frontdesk' &&
        (last.details?.directorRouteId ?? null) === (routes.directorMessageRouteId ?? null) &&
        JSON.stringify(last.details?.noticeRouteIds ?? []) ===
          JSON.stringify(routes.noticeRouteIds) &&
        JSON.stringify(last.details?.choiceIds ?? []) === JSON.stringify(routes.choiceIds)
      )
    })
    .toBe(true)
}

async function selectCase(page: Page, title: string) {
  await page.getByRole('button', { name: `Select ${title} for triage detail`, exact: true }).click()
  return page.getByRole('region', { name: `Case triage detail: ${title}`, exact: true })
}

async function inspectArchiveDossier(page: Page) {
  await openPrimaryNav(page, 'Cases')
  const detail = await selectCase(page, archiveTitle)
  const before = await readSavedGame(page)
  await detail.getByRole('link', { name: 'Open intel dossier', exact: true }).click()
  const dossier = page.getByRole('region', { name: 'Intel dossier', exact: true })
  await expect(dossier.getByRole('heading', { name: archiveTitle, exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Escalation pathways', exact: true })).toBeVisible()
  expect(await readSavedGame(page)).toEqual(before)
  await openPrimaryNav(page, 'Cases')
  await selectCase(page, archiveTitle)
  expect(await readSavedGame(page)).toEqual(before)
}

async function exerciseConcurrentOutbreaks(page: Page, outbreakIds: string[]) {
  expect(outbreakIds).toHaveLength(3)
  const before = await readSavedGame(page)
  const triage = page.getByRole('list', { name: 'Triage list', exact: true })
  for (const id of outbreakIds) {
    await expect(triage.getByTestId('case-title-link-' + id)).toHaveText('Campus Outbreak')
    expect(before.cases[id].assignedTeamIds).toEqual([])
  }
  for (const id of outbreakIds) {
    const row = triage
      .getByRole('listitem')
      .filter({ has: page.getByTestId('case-title-link-' + id) })
    await row.getByTestId('case-title-link-' + id).click()
    const available = page.getByRole('region', { name: 'Available team odds', exact: true })
    await expect(available).toBeVisible()
    await expect(available.getByRole('button', { name: /^Assign / })).toHaveCount(0)
    const plannerLink = available.getByRole('link', { name: 'Open incident planner', exact: true })
    await expect(plannerLink).toHaveAttribute('href', '/cases?case=' + id)
    await plannerLink.focus()
    await expect(plannerLink).toBeFocused()
    await plannerLink.press('Enter')
    const detail = page.getByRole('region', {
      name: 'Case triage detail: Campus Outbreak',
      exact: true,
    })
    await expect(detail).toBeVisible()
    await expect(detail).toContainText('Requires 3 teams before launch.')
    await expect(
      row.getByRole('button', { name: 'Select Campus Outbreak for triage detail', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')
  }
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Case triage detail: Campus Outbreak', exact: true })
  ).toBeVisible()
  await expect(
    triage
      .getByRole('listitem')
      .filter({ has: page.getByTestId('case-title-link-' + outbreakIds.at(-1)) })
      .getByRole('button', { name: 'Select Campus Outbreak for triage detail', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  const reloaded = await readSavedGame(page)
  expect(Object.keys(reloaded.cases).sort()).toEqual(Object.keys(before.cases).sort())
  for (const id of outbreakIds) expect(reloaded.cases[id]).toEqual(before.cases[id])
  expect(reloaded.teams).toEqual(before.teams)
  expect(reloaded.reports).toEqual(before.reports)
  for (const id of outbreakIds) {
    await expect(triage.getByTestId('case-title-link-' + id)).toHaveText('Campus Outbreak')
  }
}

async function runComparisonPath(browser: Browser, intervene: boolean, readIntel = false) {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    locale: 'en-US',
    timezoneId: 'UTC',
  })
  const page = await context.newPage()
  const probe = attachPageErrorProbe(page)
  try {
    await clearCampaignStorage(page)
    await waitForFrontDeskObservation(page, 1)
    await openPrimaryNav(page, 'Cases')
    const vampire = await selectCase(page, 'Vampire Nest in the Stockyards')
    await vampire.getByRole('button', { name: 'Assign Night Watch', exact: true }).click()
    const initial = await readSavedGame(page)
    const archive = await selectCase(page, archiveTitle)
    await expect(archive).toContainText('Stage 1')
    await expect(archive).toContainText('Assign one team')
    if (readIntel) await inspectArchiveDossier(page)
    if (intervene)
      await archive.getByRole('button', { name: 'Assign Green Tape', exact: true }).click()

    await openPrimaryNav(page, 'Operations Desk')
    await waitForFrontDeskObservation(page, 1)
    await advanceOperationalWeek(page)
    await waitForFrontDeskObservation(page, 2)
    if (readIntel) {
      await inspectArchiveDossier(page)
      await openPrimaryNav(page, 'Operations Desk')
      await waitForFrontDeskObservation(page, 2)
    }
    await page.reload()
    await waitForFrontDeskObservation(page, 2)
    await advanceOperationalWeek(page)
    await waitForFrontDeskObservation(page, 3)
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
    if (!intervene) await exerciseConcurrentOutbreaks(page, outcome.outbreakIds)
    expectNoPageErrors(probe)
    const savedGame = await readSavedGame(page)
    await expectCampaignStateBudget(
      intervene ? (readIntel ? 'intervention-read-intel' : 'intervention') : 'inaction',
      initial,
      savedGame
    )
    return {
      initial,
      outcome,
      visibleOutcome,
      savedGame,
    }
  } finally {
    probe.dispose()
    await context.close()
  }
}

test('one player intervention causally changes later mission choices and replays through reload', async ({
  browser,
}) => {
  test.setTimeout(CAMPAIGN_COMPARISON_TIMEOUT_MS)
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

test('reading available intel preserves campaign history and converges on the same later outcomes', async ({
  browser,
}) => {
  test.setTimeout(CAMPAIGN_COMPARISON_TIMEOUT_MS)
  const unread = await runComparisonPath(browser, true)
  const read = await runComparisonPath(browser, true, true)
  expect(read).toEqual(unread)
  expect(await runComparisonPath(browser, true)).toEqual(unread)
  expect(await runComparisonPath(browser, true, true)).toEqual(read)
  await test.info().attach('information-access-convergence', {
    body: JSON.stringify({ unread, read }, null, 2),
    contentType: 'application/json',
  })
})
