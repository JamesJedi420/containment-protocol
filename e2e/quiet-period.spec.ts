import { expect, test, type Browser, type Page } from '@playwright/test'
import { createRunExportPayload } from '../src/app/store/runTransfer'
import { createStartingState } from '../src/data/startingState'
import type { GameState } from '../src/domain/models'
import { createStarterCase } from '../src/domain/templates/startingCases'
import { CAMPAIGN_COMPARISON_TIMEOUT_MS, expectCampaignStateBudget } from './support/campaignBudget'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  openPrimaryNav,
} from './support/cpApp'

// Authored quiet start, not a claim that default-start incidents were resolved.
// Retain production rules, seed, roster, institutions and initial history.
const quietCaseId = 'case-quiet-relay'

function quietStartPayload() {
  const game = createStartingState()
  game.cases = {
    [quietCaseId]: createStarterCase({ id: quietCaseId, templateId: 'ops-001' }),
  }
  return JSON.stringify({
    ...createRunExportPayload(game),
    exportedAt: '2026-11-06T00:00:00.000Z',
  })
}

async function readSavedGame(page: Page): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).state.game,
    CP_GAME_STORAGE_KEY
  )
}

async function waitForDeskObservation(page: Page, week: number) {
  await expect
    .poll(async () => {
      const game = await readSavedGame(page)
      return game.runtimeState?.ui.debug.eventLog?.some(
        (event) =>
          event.type === 'route.selected' && event.contextId === 'frontdesk' && event.week === week
      )
    })
    .toBe(true)
}

function expectQuiet(game: GameState, week: number) {
  expect(game.week).toBe(week)
  expect(game.gameOver).toBe(false)
  expect(Object.keys(game.cases)).toEqual([quietCaseId])
  expect(game.cases[quietCaseId]).toMatchObject({
    status: 'open',
    stage: 1,
    deadlineRemaining: 4 - week,
    assignedTeamIds: [],
  })
  expect(game.reports).toHaveLength(week - 1)
  for (const report of game.reports) {
    expect(report.newCases).toEqual([])
    expect(report.progressedCases).toEqual([])
    expect(report.resolvedCases).toEqual([])
    expect(report.partialCases).toEqual([])
    expect(report.failedCases).toEqual([])
    expect(report.unresolvedTriggers).toEqual([])
    expect(report.spawnedCases).toEqual([])
  }
}

async function runQuietPath(browser: Browser, hire: boolean) {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    locale: 'en-US',
    timezoneId: 'UTC',
  })
  context.setDefaultTimeout(15_000)
  const page = await context.newPage()
  const probe = attachPageErrorProbe(page)
  try {
    await clearCampaignStorage(page)
    await openPrimaryNav(page, 'Operations Desk')
    await page.evaluate(async (raw) => {
      const modulePath = '/src/app/store/gameStore.ts'
      const { useGameStore }: typeof import('../src/app/store/gameStore') = await import(modulePath)
      useGameStore.getState().importRun(raw)
    }, quietStartPayload())
    await page.reload()
    await expect(page.getByText(/Week 1\s*\/\s*Active cap/i).first()).toBeVisible()
    await waitForDeskObservation(page, 1)
    const initial = await readSavedGame(page)
    expectQuiet(initial, 1)
    expect(initial.events).toEqual([])

    await advanceOperationalWeek(page)
    await waitForDeskObservation(page, 2)
    const firstWeek = await readSavedGame(page)
    expectQuiet(firstWeek, 2)
    expect(firstWeek.market.week).toBe(initial.market.week + 1)
    expect(firstWeek.candidates.length).toBeGreaterThan(0)
    if (hire) {
      await openPrimaryNav(page, 'Recruitment')
      await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('agent')
      const hireButton = page
        .getByRole('button', { name: 'Hire', exact: true })
        .and(page.locator(':enabled'))
        .first()
      await expect(hireButton).toBeVisible()
      await hireButton.click()
    }
    const afterDecision = await readSavedGame(page)
    const hiredIds = Object.keys(afterDecision.agents).filter((id) => !initial.agents[id])
    expect(hiredIds).toHaveLength(hire ? 1 : 0)
    await openPrimaryNav(page, 'Agents')
    for (const id of hiredIds)
      await expect(
        page.getByText(afterDecision.agents[id].name, { exact: true }).first()
      ).toBeVisible()
    await page.reload()
    const afterReload = await readSavedGame(page)
    for (const id of hiredIds) {
      expect(afterReload.agents[id]).toEqual(afterDecision.agents[id])
      await expect(
        page.getByText(afterReload.agents[id].name, { exact: true }).first()
      ).toBeVisible()
    }
    expect(afterReload.reports).toEqual(afterDecision.reports)

    await openPrimaryNav(page, 'Operations Desk')
    await advanceOperationalWeek(page)
    await waitForDeskObservation(page, 3)
    const secondWeek = await readSavedGame(page)
    expectQuiet(secondWeek, 3)
    expect(secondWeek.market.week).toBe(initial.market.week + 2)
    for (const id of hiredIds) expect(secondWeek.agents[id]).toBeDefined()
    await page
      .getByRole('region', { name: 'Latest report' })
      .getByRole('link', { name: 'Week 2', exact: true })
      .click()
    const outcomes = page.getByRole('region', { name: 'Case outcomes' })
    await expect(outcomes).toBeVisible()
    await expect(outcomes).toContainText('No unresolved cases were recorded.')
    const reportText = await outcomes.innerText()
    await page.reload()
    await expect(outcomes).toHaveText(reportText, { useInnerText: true })
    const final = await readSavedGame(page)
    expectQuiet(final, 3)
    expect(Object.keys(final.agents)).toHaveLength(
      Object.keys(initial.agents).length + (hire ? 1 : 0)
    )
    expect(final.reports).toEqual(secondWeek.reports)
    for (const id of hiredIds) expect(final.agents[id]).toEqual(secondWeek.agents[id])
    expectNoPageErrors(probe)
    await expectCampaignStateBudget(hire ? 'quiet-hire' : 'quiet-no-hire', initial, final)
    return { initial, firstWeek, final, hiredIds, reportText }
  } finally {
    probe.dispose()
    await context.close()
  }
}

test('a quiet campaign supports recruitment and independent weekly refresh without forced incidents', async ({
  browser,
}) => {
  test.setTimeout(CAMPAIGN_COMPARISON_TIMEOUT_MS)
  const hired = await runQuietPath(browser, true)
  const noHire = await runQuietPath(browser, false)
  expect(hired.initial).toEqual(noHire.initial)
  expect(hired.firstWeek).toEqual(noHire.firstWeek)
  expect(Object.keys(hired.final.agents).length).toBe(Object.keys(noHire.final.agents).length + 1)
  expect(await runQuietPath(browser, true)).toEqual(hired)
  expect(await runQuietPath(browser, false)).toEqual(noHire)
  await test.info().attach('quiet-period-hiring-comparison', {
    body: JSON.stringify({ hired, noHire }, null, 2),
    contentType: 'application/json',
  })
})
