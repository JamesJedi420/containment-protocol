import { expect, test } from '@playwright/test'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  openPrimaryNav,
} from './support/cpApp'

test('normal partial missions retain their own stage consequences through reload', async ({
  page,
}) => {
  const probe = attachPageErrorProbe(page)
  try {
    await clearCampaignStorage(page)
    await openPrimaryNav(page, 'Cases')
    for (const [title, team] of [
      ['Vampire Nest in the Stockyards', 'Night Watch'],
      ['The Whispering Archive', 'Green Tape'],
    ]) {
      await page
        .getByRole('button', { name: `Select ${title} for triage detail`, exact: true })
        .click()
      const detail = page.getByRole('region', { name: `Case triage detail: ${title}`, exact: true })
      await detail.getByRole('button', { name: `Assign ${team}`, exact: true }).click()
    }
    await openPrimaryNav(page, 'Operations Desk')
    await advanceOperationalWeek(page)
    await page.reload()
    await advanceOperationalWeek(page)
    await page
      .getByRole('region', { name: 'Latest report' })
      .getByRole('link', { name: 'Week 2', exact: true })
      .click()
    const partials = page
      .getByRole('region', { name: 'Case outcomes' })
      .locator('section')
      .filter({ has: page.getByText('Partial cases', { exact: true }) })
    const vampire = partials
      .locator(':scope > ul > li')
      .filter({ hasText: 'Vampire Nest in the Stockyards' })
    const archive = partials
      .locator(':scope > ul > li')
      .filter({ hasText: 'The Whispering Archive' })
    await expect(vampire).toContainText('Case escalated to stage 2.')
    await expect(archive).toBeVisible()
    await expect(archive).not.toContainText('Case escalated to stage')
    await expect(vampire).not.toContainText('Spawned follow-up case')
    await expect(archive).not.toContainText('Spawned follow-up case')
    await test.info().attach('normal-partial-mission-consequences', {
      body: await partials.screenshot(),
      contentType: 'image/png',
    })
    await page.reload()
    await expect(vampire).toContainText('Case escalated to stage 2.')
    await expect(archive).not.toContainText('Case escalated to stage')
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).state.game,
      CP_GAME_STORAGE_KEY
    )
    expect(saved.cases['case-001']).toMatchObject({
      status: 'open',
      stage: 2,
      onPartial: { stageDelta: 1 },
    })
    expect(saved.cases['case-002']).toMatchObject({
      status: 'open',
      stage: 1,
      onPartial: { stageDelta: 0 },
    })
    // Both unresolved operations remain choices for the player after the report and reload.
    await openPrimaryNav(page, 'Cases')
    await page
      .getByRole('button', { name: 'Select The Whispering Archive for triage detail', exact: true })
      .click()
    const retry = page.getByRole('region', {
      name: 'Case triage detail: The Whispering Archive',
      exact: true,
    })
    await expect(retry).toContainText('Stage 1')
    await retry.getByRole('button', { name: 'Assign Green Tape', exact: true }).click()
    await page.reload()
    const retried = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).state.game.cases['case-002'],
      CP_GAME_STORAGE_KEY
    )
    expect(retried).toMatchObject({ status: 'in_progress', stage: 1, onPartial: { stageDelta: 0 } })
    expectNoPageErrors(probe)
  } finally {
    probe.dispose()
  }
})
