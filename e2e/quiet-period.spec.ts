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

async function runQuietPath(browser: Browser, baseURL: string, hire: boolean) {
  const context = await browser.newContext({
    baseURL,
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
    const latestReport = page.getByRole('region', { name: 'Latest report' })
    await expect(latestReport.getByRole('link', { name: 'Week 2', exact: true })).toBeVisible()
    const hiring = latestReport.getByRole('region', { name: 'Field-agent hiring' })
    const hireEvents = secondWeek.events
      .filter((event) => event.type === 'agent.hired')
      .filter((event) => event.payload.week === 2 && event.payload.recruitCategory === 'agent')
    expect(hireEvents.map((event) => event.payload.agentId)).toEqual(hiredIds)
    const hireRecord = hireEvents[0]
    const checkHiring = async () => {
      if (hireRecord) {
        const { agentId, agentName } = hireRecord.payload
        const rows = hiring.getByRole('list', { name: 'Field-agent hires' }).getByRole('listitem')
        await expect(rows).toHaveCount(1)
        await expect(rows.first()).toContainText(`${agentName} joined the field roster`)
        await expect(rows.first()).toContainText(`Hire record ${hireRecord.id}`)
        await expect(
          hiring.getByRole('link', { name: `Review ${agentName} in Roster` })
        ).toHaveAttribute('href', `/agents/${encodeURIComponent(agentId)}`)
      } else {
        await expect(hiring).toContainText('No field-agent hires recorded for this week.')
        await expect(hiring.getByRole('link')).toHaveCount(0)
      }
      await expect(hiring).not.toContainText('history is incomplete')
    }
    await checkHiring()
    await page.reload()
    await checkHiring()
    const containmentEvent = secondWeek.events.find(
      (event) => event.type === 'agency.containment_updated' && event.payload.week === 2
    )
    if (containmentEvent?.type !== 'agency.containment_updated') {
      throw new Error('Expected the Week 2 agency update.')
    }
    const containmentReference = `Week-close agency update · Record ${containmentEvent.id}`
    const containment = latestReport.getByRole('region', { name: 'Containment rating' })
    await expect(containment.getByText(containmentReference, { exact: true })).toBeVisible()
    const { fundingBefore, fundingAfter } = containmentEvent.payload
    const funding = latestReport.getByRole('region', { name: 'Week-close funding' })
    await expect(funding.getByText(`${fundingBefore} → ${fundingAfter} funding`)).toBeVisible()
    await expect(
      funding.getByText(`Funding source · Record ${containmentEvent.id}`, { exact: true })
    ).toBeVisible()
    const otherLatestReportText = await latestReport.evaluate((report, reference) => {
      const copy = report.cloneNode(true) as HTMLElement
      copy.querySelector('[aria-label="Field-agent hiring"]')?.remove()
      // Both choices have their funding outcome checked against their own agency update above.
      copy.querySelector('[aria-label="Week-close funding"]')?.remove()
      // The hire advances the shared event sequence. Its effect on this reference is verified above.
      return copy.textContent?.replace(reference, 'Week-close agency update')
    }, containmentReference)
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

    const currentCasesLink = outcomes.getByRole('link', { name: 'Check current cases' })
    await currentCasesLink.press('Enter')
    await expect(page).toHaveURL(/\/cases$/)
    const queue = page.getByRole('region', { name: 'Case triage queue' })
    await expect(
      queue.getByRole('link', { name: final.cases[quietCaseId].title, exact: true })
    ).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/\/report\/2$/)
    await expect(outcomes).toContainText('No unresolved cases were recorded.')

    if (hireRecord) {
      const { agentId, agentName } = hireRecord.payload
      await openPrimaryNav(page, 'Operations Desk')
      const rosterLink = hiring.getByRole('link', { name: `Review ${agentName} in Roster` })
      const agentPath = `/agents/${encodeURIComponent(agentId)}`
      await rosterLink.press('Enter')
      await expect(page).toHaveURL(agentPath)
      await expect(page.getByRole('heading', { name: agentName, exact: true })).toBeVisible()
      const snapshot = page.getByRole('heading', { name: 'Operational snapshot' })
      await expect(snapshot).toBeFocused()

      await page.goBack()
      await expect(rosterLink).toBeVisible()
      const main = page.getByRole('main')
      await expect(main).toBeFocused()
      await page.goForward()
      await expect(page).toHaveURL(agentPath)
      await expect(snapshot).toBeVisible()
      await expect(main).toBeFocused()
    }
    expectNoPageErrors(probe)
    await expectCampaignStateBudget(hire ? 'quiet-hire' : 'quiet-no-hire', initial, final)
    return {
      initial,
      firstWeek,
      final,
      hiredIds,
      reportText,
      otherLatestReportText,
      fundingAtClose: { before: fundingBefore, after: fundingAfter },
    }
  } finally {
    probe.dispose()
    await context.close()
  }
}

test('a quiet campaign supports recruitment and independent weekly refresh without forced incidents', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(CAMPAIGN_COMPARISON_TIMEOUT_MS)
  if (!baseURL) throw new Error('The quiet campaign requires the configured app URL.')
  const hired = await runQuietPath(browser, baseURL, true)
  const noHire = await runQuietPath(browser, baseURL, false)
  expect(hired.initial).toEqual(noHire.initial)
  expect(hired.firstWeek).toEqual(noHire.firstWeek)
  expect(hired.reportText).toBe(noHire.reportText)
  expect(hired.otherLatestReportText).toBe(noHire.otherLatestReportText)
  expect(hired.fundingAtClose.before).toBeLessThan(noHire.fundingAtClose.before)
  expect(Object.keys(hired.final.agents).length).toBe(Object.keys(noHire.final.agents).length + 1)
  expect(await runQuietPath(browser, baseURL, true)).toEqual(hired)
  expect(await runQuietPath(browser, baseURL, false)).toEqual(noHire)
  await test.info().attach('quiet-period-hiring-comparison', {
    body: JSON.stringify({ hired, noHire }, null, 2),
    contentType: 'application/json',
  })
})
