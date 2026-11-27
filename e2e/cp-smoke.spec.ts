import { test, expect } from '@playwright/test'
import type { RunExportPayload } from '../src/app/store/runTransfer'
import {
  advanceOperationalWeek,
  assignFirstOpenTriageCase,
  attachPageErrorProbe,
  buyAgencyMaintenancePackage,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  launchContractFromMissionBoard,
  openContainmentSiteAndIncidentDesk,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

test.describe('SPE-3458 / SPE-3481 / SPE-3482 / SPE-3483 CP Chromium player smokes', () => {
  test('SPE-2711 restores Main Menu keyboard focus when Continue rejects a changed save', async ({
    page,
    context,
  }) => {
    await clearCampaignStorage(page)
    await advanceOperationalWeek(page)
    const originalSave = await page.evaluate(
      (key) => localStorage.getItem(key),
      CP_GAME_STORAGE_KEY
    )
    expect(originalSave).not.toBeNull()

    await page.getByRole('link', { name: 'Main Menu' }).click()
    const heading = page.getByRole('heading', { name: 'Main Menu' })
    const continueButton = page.getByRole('button', { name: 'Continue' })
    await expect(heading).toBeFocused()
    await expect(continueButton).toBeEnabled()

    const otherTab = await context.newPage()
    await otherTab.goto('/')
    await advanceOperationalWeek(otherTab)
    const changedSave = await otherTab.evaluate(
      (key) => localStorage.getItem(key),
      CP_GAME_STORAGE_KEY
    )
    expect(changedSave).not.toBeNull()
    expect(changedSave).not.toBe(originalSave)
    await otherTab.close()

    await page.keyboard.press('Tab')
    await expect(continueButton).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/main-menu$/)
    await expect(continueButton).toBeDisabled()
    await expect(page.getByText('A saved campaign could not be confirmed.')).toBeVisible()
    await expect(heading).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused()
    expect(await page.evaluate((key) => localStorage.getItem(key), CP_GAME_STORAGE_KEY)).toBe(
      changedSave
    )
  })

  test('SPE-1354 opens eligible first-campaign evidence and triage from Needs Attention', async ({
    page,
  }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    const dossier = page.getByRole('region', { name: 'First anomalous dossier' })
    const title = await dossier.getByRole('heading').innerText()
    await expect(dossier.getByText(/Intel confidence \d+%/)).toBeVisible()
    await expect(
      page.locator('details', { hasText: 'How the first week works' })
    ).not.toHaveAttribute('open')
    await dossier.getByRole('link', { name: 'Review dossier and triage' }).click()

    const triage = page.getByRole('region', { name: `Case triage detail: ${title}` })
    await expect(triage).toBeVisible()
    await triage.getByRole('button', { name: 'Defer', exact: true }).click()
    const clearDisposition = triage.getByRole('button', { name: 'Clear disposition' })
    await expect(clearDisposition).toBeVisible()
    await clearDisposition.click()
    await triage.getByRole('button', { name: 'Assign Night Watch', exact: true }).click()

    await openPrimaryNav(page, 'Operations Desk')
    await openFrontDesk(page)
    await expect(dossier).toBeVisible()
    const nextTitle = await dossier.getByRole('heading').innerText()
    expect(nextTitle).not.toBe(title)
    await dossier.getByRole('link', { name: 'Review dossier and triage' }).click()
    await expect(
      page.getByRole('region', { name: `Case triage detail: ${nextTitle}` })
    ).toBeVisible()
  })

  test('SPE-1354 preserves Week 1 planning with no eligible dossier after import and reload', async ({
    page,
  }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    const dossier = page.getByRole('region', { name: 'First anomalous dossier' })
    await expect(dossier).toBeVisible()

    await page.getByText('Campaign import and export', { exact: true }).click()
    const payload = page.getByRole('textbox', { name: 'Run payload' })
    await page.getByRole('button', { name: 'Export Run', exact: true }).click()
    const exported: RunExportPayload = JSON.parse(await payload.inputValue())
    expect(Object.keys(exported.game.cases).length).toBeGreaterThan(0)
    // The importer restores starter cases for an empty map. Resolved cases survive import
    // and are excluded by the ordinary dossier selector.
    const cases = Object.fromEntries(
      Object.entries(exported.game.cases).map(([id, entry]) => [
        id,
        { ...entry, status: 'resolved', assignedTeamIds: [] },
      ])
    )
    await payload.fill(JSON.stringify({ ...exported, game: { ...exported.game, cases } }))
    await page.getByRole('button', { name: 'Import Run', exact: true }).click()
    await expect(page.getByText('Run imported.', { exact: true })).toBeVisible()
    const imported: RunExportPayload = JSON.parse(await payload.inputValue())
    expect(Object.keys(imported.game.cases).sort()).toEqual(Object.keys(cases).sort())
    for (const entry of Object.values(imported.game.cases)) {
      expect(entry.status).toBe('resolved')
    }

    const guidance = page
      .getByRole('region', { name: 'Needs Attention' })
      .getByText(/No anomalous dossier is available/)
    await expect(guidance).toBeVisible()
    await expect(dossier).toHaveCount(0)
    await page.reload()
    await openFrontDesk(page)
    await expect(guidance).toBeVisible()
    await expect(dossier).toHaveCount(0)
    await expect(page.getByText('How the first week works', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Review routing', exact: true }).click()
    await expect(page).toHaveURL(/\/cases$/)
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('open')
    await expect(page.getByRole('region', { name: 'No matching cases' })).toBeVisible()
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

  test('SPE-1354 carries unresolved cases into the next week and through reload', async ({
    page,
  }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await advanceOperationalWeek(page)
    await advanceOperationalWeek(page)
    const report = page.getByRole('region', { name: 'Latest report' })
    await expect(report.getByRole('link', { name: 'Week 2', exact: true })).toBeVisible()
    const completedWeekTotals = report.getByText(/^Week 2 totals: \d+ resolved, /)
    const currentCasesHeading = report.getByRole('heading', { name: 'Current unresolved cases' })
    await expect(completedWeekTotals).toBeVisible()
    await expect(currentCasesHeading).toBeVisible()
    const carryover = report.getByRole('list', { name: 'Unresolved cases' })
    await expect(carryover.getByText(/^Since the previous report:/).first()).toBeVisible()
    const triage = carryover.getByRole('link', { name: /^Review triage: / }).first()
    await expect(triage).toBeVisible()
    const name = await triage.getAttribute('aria-label')
    expect(name).toBeTruthy()
    const title = name!.replace('Review triage: ', '')
    const summary = await carryover.innerText()

    await page.reload()
    await expect(completedWeekTotals).toBeVisible()
    await expect(currentCasesHeading).toBeVisible()
    await expect(carryover).toHaveText(summary, { useInnerText: true })
    await carryover.getByRole('link', { name: `Review triage: ${title}` }).click()
    await expect(page.getByRole('region', { name: `Case triage detail: ${title}` })).toBeVisible()
  })

  test('SPE-1354 carries a player-directed relationship change through week close and reload', async ({
    page,
  }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await page.getByText('Campaign import and export', { exact: true }).click()
    const payload = page.getByRole('textbox', { name: 'Run payload' })
    await page.getByRole('button', { name: 'Export Run', exact: true }).click()
    const exported: RunExportPayload = JSON.parse(await payload.inputValue())
    const [left, right] = Object.values(exported.game.agents).filter(
      (agent) => agent.status === 'active' && agent.assignment?.state !== 'assigned'
    )
    expect(left).toBeTruthy()
    expect(right).toBeTruthy()
    const agents = {
      ...exported.game.agents,
      [left!.id]: { ...left!, relationships: { ...left!.relationships, [right!.id]: -1 } },
      [right!.id]: { ...right!, relationships: { ...right!.relationships, [left!.id]: -0.5 } },
    }
    const fixture = JSON.stringify({ ...exported, game: { ...exported.game, agents } })
    const importFixture = async () => {
      await payload.fill(fixture)
      await page.getByRole('button', { name: 'Import Run', exact: true }).click()
      await expect(page.getByText('Run imported.', { exact: true })).toBeVisible()
    }
    await importFixture()
    await advanceOperationalWeek(page)
    const report = page.getByRole('region', { name: 'Latest report' })
    await expect(
      report.getByText('No qualifying staff relationship changes recorded for this week.')
    ).toBeVisible()

    await importFixture()
    await page
      .getByRole('navigation', { name: 'MVP systems' })
      .getByRole('link', { name: 'Training Division', exact: true })
      .click()
    await page.getByRole('button', { name: 'Show advanced panels' }).click()
    const reconciliation = page.getByRole('article').filter({
      has: page.getByRole('heading', { name: 'Relationship Reconciliation' }),
    })
    const pair = reconciliation.getByRole('listitem').filter({ hasText: left!.name }).filter({
      hasText: right!.name,
    })
    await pair.getByRole('button', { name: /^Reconcile/ }).click()
    await expect(pair.getByText('Reconciled this week.')).toBeVisible()
    await openPrimaryNav(page, 'Operations Desk')
    await openFrontDesk(page)
    await advanceOperationalWeek(page)
    const changes = report.getByRole('list', { name: 'Relationship changes' })
    await expect(changes.getByText(`${left!.name} toward ${right!.name}`)).toBeVisible()
    await expect(changes.getByText(`${right!.name} toward ${left!.name}`)).toBeVisible()
    await expect(changes.getByText(/^-1\.00 → .*reconciliation · Record evt-/)).toBeVisible()
    const summary = await changes.innerText()
    await page.reload()
    await expect(changes).toHaveText(summary, { useInnerText: true })
    await report.getByRole('link', { name: 'Review team chemistry' }).click()
    await expect(page.getByRole('heading', { name: 'Chemistry Inspector' })).toBeVisible()
  })

  test('SPE-1354 shows realized containment movement after week close and reload', async ({
    page,
  }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await advanceOperationalWeek(page)
    await advanceOperationalWeek(page)

    const report = page.getByRole('region', { name: 'Latest report' })
    await expect(report.getByRole('link', { name: 'Week 2', exact: true })).toBeVisible()
    await page.getByText('Campaign import and export', { exact: true }).click()
    await page.getByRole('button', { name: 'Export Run', exact: true }).click()
    const exported: RunExportPayload = JSON.parse(
      await page.getByRole('textbox', { name: 'Run payload' }).inputValue()
    )
    const update = exported.game.events.find(
      (event) => event.type === 'agency.containment_updated' && event.payload.week === 2
    )
    if (update?.type !== 'agency.containment_updated') throw new Error('Expected Week 2 update.')
    const { containmentRatingBefore: before, containmentRatingAfter: after } = update.payload
    expect(after).not.toBe(before)
    const digest = report.getByRole('region', { name: 'Containment rating' })
    await expect(digest.getByText(`${before}% → ${after}%`)).toBeVisible()
    await expect(digest.getByText(`Week-close agency update · Record ${update.id}`)).toBeVisible()
    const summary = await digest.innerText()

    await page.reload()
    await expect(digest).toHaveText(summary, { useInnerText: true })
    await digest.getByRole('link', { name: 'Review recruitment options' }).click()
    await expect(page).toHaveURL(/\/recruitment$/)
    await expect(
      page.getByRole('heading', { name: 'Recruitment', level: 2, exact: true })
    ).toBeVisible()
  })

  test('SPE-1354 separates week-close funding from current procurement funds after reload', async ({
    page,
  }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await advanceOperationalWeek(page)

    const report = page.getByRole('region', { name: 'Latest report' })
    await expect(report.getByRole('link', { name: 'Week 1', exact: true })).toBeVisible()
    await page.getByText('Campaign import and export', { exact: true }).click()
    await page.getByRole('button', { name: 'Export Run', exact: true }).click()
    const exported: RunExportPayload = JSON.parse(
      await page.getByRole('textbox', { name: 'Run payload' }).inputValue()
    )
    const update = exported.game.events.find(
      (event) => event.type === 'agency.containment_updated' && event.payload.week === 1
    )
    const funding = report.getByRole('region', { name: 'Week-close funding' })
    // The existing fundingSnapshotRoundTrip oracle uses this same starting-state close.
    if (update?.type !== 'agency.containment_updated') throw new Error('Expected Week 1 update.')
    expect(update.payload).toMatchObject({
      fundingBefore: 110,
      fundingAfter: 53,
      fundingDelta: -17,
    })
    const reference = funding.getByText(`Funding source · Record ${update.id}`)
    await expect(funding.getByText('110 → 53 funding', { exact: true })).toBeVisible()
    await expect(reference).toBeVisible()

    await page.reload()
    await expect(funding.getByText('110 → 53 funding', { exact: true })).toBeVisible()
    await expect(reference).toBeVisible()
    await funding.getByRole('link', { name: 'Check procurement affordability' }).click()
    await expect(page).toHaveURL(/\/markets-suppliers$/)
    const procurement = page.getByRole('region', { name: 'Procurement overview' })
    await expect(procurement.getByText('$57', { exact: true })).toBeVisible()
    const listings = page.getByRole('list', { name: 'Market listings' })
    await expect(listings.getByText(/^Buy: \$/).first()).toBeVisible()
  })

  test('SPE-1354 preserves a containment rating floored at zero after reload', async ({ page }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await page.getByText('Campaign import and export', { exact: true }).click()
    const payload = page.getByRole('textbox', { name: 'Run payload' })
    await page.getByRole('button', { name: 'Export Run', exact: true }).click()
    const exported: RunExportPayload = JSON.parse(await payload.inputValue())
    expect(exported.game.agency).toBeDefined()
    // Start one point above the floor. The ordinary close still produces the report and event.
    const game = {
      ...exported.game,
      containmentRating: 1,
      agency: { ...exported.game.agency!, containmentRating: 1 },
    }
    await payload.fill(JSON.stringify({ ...exported, game }))
    await page.getByRole('button', { name: 'Import Run', exact: true }).click()
    await expect(page.getByText('Run imported.', { exact: true })).toBeVisible()
    await advanceOperationalWeek(page)

    const report = page.getByRole('region', { name: 'Latest report' })
    await expect(report.getByRole('link', { name: 'Week 1', exact: true })).toBeVisible()
    const digest = report.getByRole('region', { name: 'Containment rating' })
    await expect(digest.getByText('1% → 0%', { exact: true })).toBeVisible()
    const summary = await digest.innerText()
    await page.reload()
    await expect(digest).toHaveText(summary, { useInnerText: true })
  })

  test('SPE-1354 carries completed staff training through week close and reload', async ({
    page,
  }) => {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await page
      .getByRole('navigation', { name: 'MVP systems' })
      .getByRole('link', { name: 'Training Division', exact: true })
      .click()
    const trainee = page
      .locator('#training-roster')
      .getByRole('listitem')
      .filter({
        has: page
          .getByRole('button', { name: 'Analysis Lab', exact: true })
          .and(page.locator(':enabled')),
      })
      .first()
    const staffRecord = trainee.getByRole('link').first()
    const agentName = await staffRecord.innerText()
    const agentHref = await staffRecord.getAttribute('href')
    await trainee.getByRole('button', { name: 'Analysis Lab', exact: true }).click()
    await expect(
      page.locator('#training-active-queue').getByText('Analysis Lab', { exact: true })
    ).toBeVisible()

    await openPrimaryNav(page, 'Operations Desk')
    await openFrontDesk(page)
    await advanceOperationalWeek(page)
    const report = page.getByRole('region', { name: 'Latest report' })
    await expect(report.getByRole('link', { name: 'Week 1', exact: true })).toBeVisible()
    await expect(
      report.getByText('No individual training completions recorded for this week.')
    ).toBeVisible()
    await advanceOperationalWeek(page)
    await expect(report.getByRole('link', { name: 'Week 2', exact: true })).toBeVisible()
    const completions = report.getByRole('list', { name: 'Staff training completions' })
    await expect(completions.getByText(`${agentName} completed Analysis Lab`)).toBeVisible()
    await expect(completions.getByText(/^Training record evt-/)).toBeVisible()
    const summary = await completions.innerText()

    await page.reload()
    await expect(completions).toHaveText(summary, { useInnerText: true })
    await completions
      .getByRole('link', { name: `Review ${agentName} before assigning duties` })
      .click()
    await expect(page).toHaveURL((url) => url.pathname === agentHref)
    await expect(page.getByRole('heading', { name: agentName, exact: true })).toBeVisible()

    await openPrimaryNav(page, 'Operations Desk')
    await expect(report.getByRole('link', { name: 'Week 2', exact: true })).toBeVisible()
    await advanceOperationalWeek(page)
    await expect(report.getByRole('link', { name: 'Week 3', exact: true })).toBeVisible()
    await expect(
      report.getByText('No individual training completions recorded for this week.')
    ).toBeVisible()
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
    // Hold the actual button because the board can reorder and names can repeat.
    const enabledHire = page
      .getByRole('button', { name: 'Hire', exact: true })
      .and(page.locator(':enabled'))
    const scout = await rows
      .filter({ has: enabledHire })
      .getByRole('button', { name: /^Scout \(\$/ })
      .first()
      .elementHandle()
    const candidateName = await scout.evaluate(
      (button) => button.closest('li')?.querySelector('p')?.innerText
    )
    if (!candidateName) throw new Error('Expected a candidate name in the Scout button row')
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

    await page.goForward()
    await expect(page).toHaveURL(/\/recruitment\?candidate=/)
    const hire = board.getByRole('button', { name: 'Hire', exact: true })
    await expect(hire).toBeEnabled()
    await hire.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/recruitment$/)
    await expect(rows).toHaveCount(initialCount - 1)
    await expect(board.getByRole('heading', { name: 'Candidate board' })).toBeFocused()

    await page.goBack()
    await expect(page).toHaveURL(/\/recruitment\?sort=name$/)
    await expect(rows).toHaveCount(initialCount - 1)
  })

  test('SPE-3130 / SPE-3137 restore recruitment filters and support keyboard and controller reset', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const pad = { pressed: -1 }
      Object.assign(window, { recruitmentPad: pad })
      Object.defineProperty(navigator, 'getGamepads', {
        value: () => [
          {
            index: 0,
            connected: true,
            mapping: 'standard',
            buttons: Array.from({ length: 17 }, (_, button) => ({
              pressed: button === pad.pressed,
              value: Number(button === pad.pressed),
            })),
          },
        ],
      })
    })
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

    await test.step('Traverse and activate recruitment controls using only gamepad input', async () => {
      const press = (button: number) =>
        page.evaluate(async (pressed) => {
          const pad = (window as unknown as { recruitmentPad: { pressed: number } }).recruitmentPad
          const pollFrames = () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
          await pollFrames()
          pad.pressed = pressed
          await pollFrames()
          pad.pressed = -1
        }, button)
      const previous = 14
      const next = 15
      const activate = 0
      const expiring = filters.getByRole('checkbox', { name: 'Expiring soon only' })
      const board = page.getByRole('article', { name: 'Candidate board' })
      const rows = board.getByRole('listitem')
      const expiryBadge = page.getByText('Expiring soon', { exact: true })

      const visibleCandidateIds = (candidateRows = rows) =>
        candidateRows.evaluateAll((items, storageKey) => {
          const saved = localStorage.getItem(storageKey)
          if (!saved) throw new Error('Expected a saved campaign')
          const { state } = JSON.parse(saved) as {
            state: { game: { candidates: { id: string; name: string }[] } }
          }
          return items.map((item) => {
            const name = item.querySelector('p')?.textContent?.trim()
            const matches = state.game.candidates.filter((candidate) => candidate.name === name)
            const [candidate] = matches
            if (!candidate || matches.length !== 1) {
              throw new Error(`Expected one saved candidate for ${name}`)
            }
            return candidate.id
          })
        }, CP_GAME_STORAGE_KEY)

      // Week two has a populated board and no candidates expiring within one week.
      await openPrimaryNav(page, 'Operations Desk')
      await advanceOperationalWeek(page)
      await openPrimaryNav(page, 'Recruitment')
      await expect(rows).toHaveCount(4)
      await expiring.click()
      await expect(expiring).toBeChecked()
      await expect(rows).toHaveCount(0)
      const emptyWeekIds = await visibleCandidateIds()
      expect(emptyWeekIds).toEqual([])
      await page.goto('/recruitment')
      await expect(filters.getByRole('status')).toHaveText('Saved filters restored')
      await expect(expiring).toBeChecked()
      await expect(board.getByText('No candidates match the current filters.')).toBeVisible()
      await expect.poll(() => visibleCandidateIds()).toEqual(emptyWeekIds)
      await reset.click()
      await expect(rows).toHaveCount(4)

      // The next week has two expiring candidates alongside later arrivals.
      await openPrimaryNav(page, 'Operations Desk')
      await advanceOperationalWeek(page)
      await openPrimaryNav(page, 'Recruitment')
      await expect(rows).toHaveCount(8)
      const initialCount = await rows.count()
      const expiringIds = await visibleCandidateIds(rows.filter({ has: expiryBadge }))
      expect(expiringIds).toEqual(['cand-707858473', 'cand-536550149'])
      const expiringCount = expiringIds.length

      // Re-enter the visited board using the shell's controller history actions.
      await press(4)
      await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible()
      await press(5)
      await expect(page.getByRole('main')).toBeFocused()
      await expect(expiring).not.toBeFocused()
      await press(next)
      await expect(expiring).toBeFocused()
      await expect(expiring).not.toBeChecked()
      await press(activate)
      await expect(expiring).toBeChecked()
      await expect(page).toHaveURL(/\/recruitment\?expiring=1$/)
      await expect(rows).toHaveCount(expiringCount)
      await expect.poll(() => visibleCandidateIds()).toEqual(expiringIds)
      await expect(expiring).toBeFocused()

      await press(next)
      await expect(reset).toBeFocused()
      await press(previous)
      await expect(expiring).toBeFocused()
      await press(activate)
      await expect(expiring).not.toBeChecked()
      await expect(rows).toHaveCount(initialCount)
      await press(activate)
      await expect(expiring).toBeChecked()

      // A fresh in-app visit uses the same live campaign and restores the exact filtered subset.
      await press(4)
      await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible()
      const staffingLink = page
        .getByRole('banner', { name: 'Shell status bar' })
        .getByRole('link', { name: /^Staffing:/ })
      await staffingLink.click()
      await expect(staffingLink).toBeFocused()
      await expect(filters.getByRole('status')).toHaveText('Saved filters restored')
      await expect(expiring).toBeChecked()
      await expect(rows).toHaveCount(expiringCount)
      await expect.poll(() => visibleCandidateIds()).toEqual(expiringIds)
      await press(next)
      await expect(expiring).toBeFocused()

      // A fresh URL visit restores the preference and applies it to the hydrated candidates.
      await page.goto('/recruitment')
      await expect(filters.getByRole('status')).toHaveText('Saved filters restored')
      await expect(expiring).toBeChecked()
      await expect(rows).toHaveCount(expiringCount)
      await expect.poll(() => visibleCandidateIds()).toEqual(expiringIds)
      await expect(rows.filter({ hasNot: expiryBadge })).toHaveCount(0)
      await press(next)
      await expect(expiring).toBeFocused()
      await press(next)
      await expect(reset).toBeFocused()
      await press(activate)
      await expect(reset).toBeFocused()
      await expect(expiring).not.toBeChecked()
      await expect(rows).toHaveCount(initialCount)
      await page.goto('/recruitment')
      await expect(rows).toHaveCount(initialCount)
      await expect(filters.getByRole('status')).toBeEmpty()

      // The results-area Reset disappears on success, so focus returns to the persistent Reset.
      await page.goto('/recruitment?q=no-such-candidate&category=agent&sort=name&expiring=1')
      const emptyReset = board.getByRole('button', { name: 'Reset filters' })
      await expect(emptyReset).toBeVisible()
      await press(next)
      await expect(expiring).toBeFocused()
      await press(next)
      await expect(reset).toBeFocused()
      await press(next)
      await expect(emptyReset).toBeFocused()
      await press(activate)
      await expect(reset).toBeFocused()
      await expect(emptyReset).toHaveCount(0)
      await expect(page).toHaveURL(/\/recruitment$/)
      await expect(category).toHaveValue('all')
      await expect(sort).toHaveValue('expiry')
      await expect(expiring).not.toBeChecked()
      await expect(filters.getByRole('textbox', { name: 'Search' })).toBeEmpty()
      await expect(rows).toHaveCount(initialCount)

      await page.getByRole('button', { name: 'Advance week', exact: true }).click()
      await expect(page.getByTestId('shell-week-status')).toBeFocused()
      await press(next)
      await expect(expiring).toBeFocused()
      await press(next)
      await expect(reset).toBeFocused()
      await press(activate)
      await expect(reset).toBeFocused()
    })
  })

  test.describe('Recruitment query on a narrow touch viewport', () => {
    test.use({ hasTouch: true, locale: 'fr-FR', viewport: { width: 390, height: 844 } })

    test('SPE-3137 keeps name order and makes empty results and reset accessible', async ({
      page,
    }) => {
      await clearCampaignStorage(page)
      await advanceOperationalWeek(page)
      await openPrimaryNav(page, 'Recruitment')

      const filters = page.getByRole('region', { name: 'Recruitment filters' })
      const board = page.getByRole('article', { name: 'Candidate board' })
      const rows = board.getByRole('listitem')
      const sort = filters.getByRole('combobox', { name: 'Sort' })
      await sort.selectOption('name')
      await expect(page).toHaveURL(/sort=name$/)
      const names = await rows.evaluateAll((items) =>
        items.map((item) => item.querySelector('p')?.textContent ?? '')
      )
      expect(names.length).toBeGreaterThan(1)
      expect(names).toEqual([...names].sort())
      expect(await board.ariaSnapshot()).toContain('listitem')

      const expiring = filters.getByRole('checkbox', { name: 'Expiring soon only' })
      await expiring.tap()
      await expect(expiring).toBeChecked()
      await expect(page).toHaveURL(/expiring=1/)
      const query = filters.getByRole('textbox', { name: 'Search' })
      await query.fill('aucun résultat')
      await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'aucun résultat')
      const count = filters.getByText(`Showing 0 of ${names.length}`)
      await expect(count).toHaveAttribute('aria-live', 'polite')
      await expect(board.getByText('No candidates match the current filters.')).toBeVisible()
      for (const region of [filters, board]) {
        const bounds = await region.boundingBox()
        expect(bounds?.x).toBeGreaterThanOrEqual(0)
        expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390)
        expect(await region.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true
        )
      }

      const reset = filters.getByRole('button', { name: 'Reset filters' })
      await expiring.focus()
      await page.keyboard.press('Tab')
      await expect(reset).toBeFocused()
      await reset.tap()
      await expect(query).toBeEmpty()
      await expect(sort).toHaveValue('expiry')
      await expect(expiring).not.toBeChecked()
      await expect(rows).toHaveCount(names.length)
    })
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

  test('hire an operative after week advance', async ({ page }) => {
    const probe = attachPageErrorProbe(page)
    try {
      await clearCampaignStorage(page)
      await openFrontDesk(page)
      await advanceOperationalWeek(page)

      await openPrimaryNav(page, 'Agents')
      const rosterTotal = page.getByText(/\d+\s*shown\s*\/\s*\d+\s*total/i)
      const agentsBefore = Number((await rosterTotal.innerText()).match(/\/\s*(\d+)\s*total/i)?.[1])

      await openPrimaryNav(page, 'Recruitment')
      await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('agent')
      await expect(page).toHaveURL(/\/recruitment\?category=agent$/)
      const board = page.getByRole('article', { name: 'Candidate board' })
      const hire = page
        .getByRole('button', { name: 'Hire', exact: true })
        .and(page.locator(':enabled'))
      const candidate = board.getByRole('listitem').filter({ has: hire }).first()
      const candidateName = await candidate.locator('p').first().innerText()
      await candidate.getByRole('button', { name: 'Hire', exact: true }).click()
      await expect(board.getByText(candidateName, { exact: true })).toHaveCount(0)

      await openPrimaryNav(page, 'Agents')
      await expect(rosterTotal).toHaveText(new RegExp(`/\\s*${agentsBefore + 1}\\s*total`, 'i'))
      await expect(
        page.getByRole('button').filter({ hasText: candidateName }).first()
      ).toBeVisible()
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
