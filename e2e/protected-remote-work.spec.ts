import { test, expect } from '@playwright/test'
import {
  attachPageErrorProbe,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  openFrontDesk,
  openFutureExpansionNav,
} from './support/cpApp'

test('Agency runs the authored observation, holds on disconnection, and replays the saved outcome', async ({
  page,
}, testInfo) => {
  const probe = attachPageErrorProbe(page)
  try {
    await clearCampaignStorage(page)
    await openFrontDesk(page)
    await openFutureExpansionNav(page, 'Agency')
    const panel = page.getByRole('article', { name: 'Protected remote work' })
    await panel
      .getByRole('radio', { name: /— qualified, available/ })
      .first()
      .check()
    await panel.getByRole('button', { name: 'Request sample observation' }).click()
    await panel.getByRole('button', { name: 'Brief operator and authorize observation' }).click()
    const begin = panel.getByRole('button', { name: 'Begin sample observation' })
    await begin.focus()
    await page.keyboard.press('Enter')
    await expect(panel.getByRole('button', { name: 'Complete sample observation' })).toBeVisible()
    await panel.getByRole('button', { name: 'Disconnect observation station' }).click()
    await expect(panel.getByRole('status')).toContainText('held')
    await page.reload()
    await expect(panel.getByRole('button', { name: 'Reconnect observation station' })).toBeVisible()
    await panel.getByRole('button', { name: 'Resume sample observation' }).click()
    await expect(panel.getByRole('status')).toContainText('connection lost')
    await panel.getByRole('button', { name: 'Reconnect observation station' }).click()
    await panel.getByRole('button', { name: 'Resume sample observation' }).click()
    await panel.getByRole('button', { name: 'Complete sample observation' }).click()
    await expect(panel.getByRole('status')).toContainText('completed')
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).state.game,
      CP_GAME_STORAGE_KEY
    )
    const work = Object.values(saved.facilityProtectedRemoteWorkCells)[0] as Record<string, unknown>
    expect(work.stage).toBe('completed')
    expect(work.operatorNodeId).toBe('room:med_bay')
    expect(work.targetZoneRef).toBe('room:containment_cell')
    expect(work.exposureCleared).toBe(false)
    await page.reload()
    await expect(panel).toBeVisible()
    await expect(
      panel.getByText('Sealed sample observation — completed', { exact: true })
    ).toBeVisible()
    const reloaded = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).state.game.facilityProtectedRemoteWorkCells,
      CP_GAME_STORAGE_KEY
    )
    expect(reloaded).toEqual(saved.facilityProtectedRemoteWorkCells)
    await expect(panel.getByRole('button', { name: 'Begin sample observation' })).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Complete sample observation' })).toHaveCount(0)
    await page.setViewportSize({ width: 320, height: 800 })
    const bounds = await panel.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }))
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client)
    await panel.screenshot({
      path: testInfo.outputPath('protected-observation-complete.png'),
    })
    expectNoPageErrors(probe)
  } finally {
    probe.dispose()
  }
})

test('choosing an unqualified real operator blocks execution and permits a safe abort', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  await openFutureExpansionNav(page, 'Agency')
  const panel = page.getByRole('article', { name: 'Protected remote work' })
  await panel
    .getByRole('radio', { name: /— unqualified, available/ })
    .first()
    .check()
  await panel.getByRole('button', { name: 'Request sample observation' }).click()
  await panel.getByRole('button', { name: 'Brief operator and authorize observation' }).click()
  await expect(panel.getByRole('status')).toContainText('operator unqualified')
  await expect(panel.getByRole('button', { name: 'Begin sample observation' })).toHaveCount(0)
  await panel.getByRole('button', { name: 'Abort sample observation' }).click()
  await expect(panel.getByRole('status')).toContainText('aborted')
  const works = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).state.game.facilityProtectedRemoteWorkCells,
    CP_GAME_STORAGE_KEY
  )
  expect(Object.values(works)).toEqual([
    expect.objectContaining({
      stage: 'aborted',
      procedureEffectsOccurred: false,
      exposureCleared: false,
    }),
  ])
})
