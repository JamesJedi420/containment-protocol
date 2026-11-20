import { expect, test, type Page } from '@playwright/test'
import type { GameState } from '../src/domain/models'
import { CAMPAIGN_COMPARISON_TIMEOUT_MS } from './support/campaignBudget'
import {
  attachPageErrorProbe,
  clearCampaignStorage,
  CP_GAME_STORAGE_KEY,
  expectNoPageErrors,
  openPrimaryNav,
} from './support/cpApp'

// Read observations only. All campaign changes below use normal player controls.
async function snapshot(page: Page) {
  return page.evaluate((key) => {
    const saved: { state: { game: GameState } } = JSON.parse(localStorage.getItem(key)!)
    const game = saved.state.game
    const ava = game.agents.a_ava
    const stim = Object.values(game.equipmentInstances ?? {}).find(
      (instance) => instance.definitionId === 'combat_stims'
    )
    return {
      week: game.week,
      gameOver: game.gameOver,
      openCases: Object.values(game.cases).filter((mission) => mission.status !== 'resolved')
        .length,
      activeCap: game.config.maxActiveCases,
      energy: ava.energyBudget,
      overdrive: ava.overdrive,
      fatigue: ava.fatigueChannels,
      instanceId: stim?.instanceId,
      doses: stim?.payload?.remaining,
    }
  }, CP_GAME_STORAGE_KEY)
}

async function openCase(page: Page, title: string) {
  await openPrimaryNav(page, 'Cases')
  const queue = page.getByRole('list', { name: 'Triage list' })
  await expect(queue).toBeVisible()
  await queue.getByRole('link', { name: title, exact: true }).first().click()
  await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible()
}

async function assign(page: Page, title: string, team: string) {
  await openCase(page, title)
  await page.getByRole('button', { name: `Assign ${team}`, exact: true }).click()
}

async function openMvpNav(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'MVP systems' })
    .getByRole('link', { name, exact: true })
    .click()
}

async function createSquad(page: Page, name: string, seedAgent: string) {
  await openMvpNav(page, 'Teams')
  await page.getByLabel('New squad name', { exact: true }).fill(name)
  await page.locator('#team-seed-agent').selectOption(seedAgent)
  await page.getByRole('button', { name: 'Create squad', exact: true }).click()
  await expect(page.getByRole('link', { name: `Response Unit ${name}`, exact: true })).toBeVisible()
}

test('normal campaign spends a Combat Stim and clears both recovery ticks across reloads', async ({
  page,
}) => {
  test.setTimeout(CAMPAIGN_COMPARISON_TIMEOUT_MS)
  page.setDefaultTimeout(15_000)
  const probe = attachPageErrorProbe(page)
  const observations: Awaited<ReturnType<typeof snapshot>>[] = []
  const advance = async () => {
    const before = await snapshot(page)
    await page.getByTestId('topbar-advance-button').click()
    await expect.poll(async () => (await snapshot(page)).week).toBe(before.week + 1)
    const after = await snapshot(page)
    expect(after.gameOver, `campaign must remain live at week ${after.week}`).toBe(false)
    expect(after.openCases).toBeLessThanOrEqual(after.activeCap)
    observations.push(after)
    return after
  }
  const reload = async () => {
    const before = await snapshot(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('topbar-advance-button')).toBeVisible()
    expect(await snapshot(page)).toEqual(before)
  }
  try {
    await clearCampaignStorage(page)
    await page.getByRole('button', { name: 'Forgiving', exact: true }).click()
    await page.getByLabel('Active Cap', { exact: true }).fill('50')
    // The existing squad builder lets the opening roster cover all three incidents.
    // Leaving one opening incident unattended caused the earlier capacity halt.
    await createSquad(page, 'Stockyard Response', 'a_mina')
    await openMvpNav(page, 'Fabrication')
    await page.getByRole('button', { name: 'Queue Combat Stim Batch', exact: true }).click()
    await assign(page, 'Vampire Nest in the Stockyards', 'Stockyard Response')
    await assign(page, 'The Whispering Archive', 'Green Tape')
    await assign(page, 'Eclipse Ritual at the Riverfront', 'Night Watch')
    await advance() // Week 2: fabrication completes; first deployed energy debit.
    await openMvpNav(page, 'Equipment')
    await page
      .getByRole('button', { name: /^Track one Combat Stims copy from Fabricated batch/ })
      .click()
    await page.getByRole('button', { name: 'Confirm tracking', exact: true }).click()
    await expect.poll(async () => (await snapshot(page)).doses).toBe(2)
    await advance() // Week 3: the two short operations finish.
    await assign(page, 'Vampire Nest in the Stockyards', 'Stockyard Response')
    await assign(page, 'The Whispering Archive', 'Green Tape')
    const depleted = await advance() // Week 4: Eclipse finishes; Ava is idle and depleted.
    expect(depleted.energy?.reserveBand).toBe('depleted')
    expect(depleted.openCases).toBe(3)
    const instanceId = depleted.instanceId!
    await openMvpNav(page, 'Equipment')
    await page
      .getByRole('button', {
        name: `Equip Combat Stims instance ${instanceId} to Ava Brooks Utility 1`,
        exact: true,
      })
      .click()
    await assign(page, 'Eclipse Ritual at the Riverfront', 'Night Watch')
    await advance() // Week 5.
    await assign(page, 'The Whispering Archive', 'Green Tape')
    await advance() // Week 6: the unassigned nest's deadline continues.
    await advance() // Week 7: its authored consequence creates the eligible raid.
    await createSquad(page, 'Juno Relief', 'a_juno')
    await createSquad(page, 'Eli Relief', 'a_eli')
    await assign(page, 'The Whispering Archive', 'Eli Relief')
    await openCase(page, 'Vampire Nest in the Stockyards')
    await page.getByRole('link', { name: 'Open incident planner', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Launch major incident', exact: true })
    ).toBeVisible()
    for (const team of ['Green Tape', 'Juno Relief', 'Night Watch']) {
      await page.getByRole('button', { name: team, exact: true }).click()
    }
    await page.getByRole('button', { name: 'Medical Supplies (6/2)', exact: true }).click()
    await page.getByRole('button', { name: 'Launch major incident', exact: true }).click()
    await openMvpNav(page, 'Equipment')
    await page.getByRole('button', { name: 'Review emergency dose', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm dose', exact: true }).click()
    await expect.poll(async () => (await snapshot(page)).doses).toBe(1)
    expect((await snapshot(page)).overdrive).toMatchObject({ active: true, recoveryDebt: 2 })
    await reload()
    const expired = await advance() // Week 8: expiry is separate from recovery debt.
    expect(expired.overdrive).toMatchObject({ active: false, recoveryDebt: 2 })
    await reload()
    await assign(page, 'Missing Persons Spike', 'Stockyard Response')
    const first = await advance() // Week 9.
    expect(first.overdrive).toMatchObject({ active: false, recoveryDebt: 1 })
    expect(first.fatigue!.mentalExhaustion).toBe(expired.fatigue!.mentalExhaustion + 6)
    expect(first.fatigue!.combatStress).toBe(expired.fatigue!.combatStress + 2)
    await reload()
    await openMvpNav(page, 'Equipment')
    await expect(page.getByText('Combat Stim recovery debt: 1', { exact: true })).toBeVisible()
    await assign(page, 'The Whispering Archive', 'Eli Relief')
    const second = await advance() // Week 10, still live and below capacity.
    expect(second.overdrive).toBeUndefined()
    expect(second.doses).toBe(1)
    expect(second.fatigue!.mentalExhaustion).toBe(first.fatigue!.mentalExhaustion + 6)
    expect(second.fatigue!.combatStress).toBe(first.fatigue!.combatStress + 2)
    await reload()
    await openMvpNav(page, 'Equipment')
    await expect(page.getByText('Combat Stim recovery debt: 1', { exact: true })).toHaveCount(0)
    await expect(page.getByTestId('topbar-advance-button')).toBeEnabled()
    expectNoPageErrors(probe)
    await test.info().attach('normal-combat-stim-recovery', {
      body: JSON.stringify(observations, null, 2),
      contentType: 'application/json',
    })
  } finally {
    probe.dispose()
  }
})
