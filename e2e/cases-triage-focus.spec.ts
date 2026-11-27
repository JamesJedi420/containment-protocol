import { expect, test } from '@playwright/test'
import { clearCampaignStorage, openFrontDesk, openPrimaryNav } from './support/cpApp'

test('Cases returns keyboard focus to the queue when the inspected case disappears', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  await openPrimaryNav(page, 'Cases')

  const queue = page.getByRole('region', { name: 'Case triage queue' })
  const rows = queue.getByRole('list', { name: 'Triage list' })
  const inspect = rows.getByRole('button', { name: /for triage detail/ }).first()
  const selectedHref = await rows.getByRole('link').first().getAttribute('href')
  expect(selectedHref).toMatch(/^\/cases\/[^?]+/)
  const selectedCaseId = selectedHref!.split('?')[0].split('/').at(-1)!
  await inspect.press('Enter')

  const detail = queue.getByRole('region', { name: /Case triage detail/ })
  const defer = detail.getByRole('button', { name: 'Defer', exact: true })
  await defer.focus()
  await page.keyboard.down('Space')
  // Control only the queue refresh while the real Cases UI holds the keypress.
  await page.evaluate(async (caseId) => {
    const modulePath = '/src/app/store/gameStore.ts'
    const { useGameStore }: typeof import('../src/app/store/gameStore') = await import(modulePath)
    useGameStore.setState(({ game }) => {
      const cases = { ...game.cases }
      delete cases[caseId]
      return { game: { ...game, cases } }
    })
  }, selectedCaseId)
  await expect(detail).toHaveCount(0)
  await expect(queue).toBeFocused()
  await page.keyboard.up('Space')
  await expect(queue).toBeFocused()
  await expect(page).not.toHaveURL(/[?&]case=/)
  await page.keyboard.press('Tab')
  await expect(rows.getByRole('link').first()).toBeFocused()
})
