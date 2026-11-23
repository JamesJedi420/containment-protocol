import { expect, test } from '@playwright/test'
import {
  advanceOperationalWeek,
  clearCampaignStorage,
  openFutureExpansionNav,
  openPrimaryNav,
} from './support/cpApp'

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

test('hires, assigns, moves, reloads, and unassigns staff using touch, controller, and keyboard', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = { pressed: -1 }
    Object.assign(window, { staffingPad: pad })
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          index: 0,
          connected: true,
          mapping: 'standard',
          buttons: Array.from({ length: 17 }, (_, i) => ({
            pressed: pad.pressed === i,
            value: Number(pad.pressed === i),
          })),
        },
      ],
    })
  })
  await clearCampaignStorage(page)
  await advanceOperationalWeek(page)
  await openPrimaryNav(page, 'Recruitment')
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('staff')
  const hire = page
    .getByRole('article', { name: 'Candidate board' })
    .getByRole('button', { name: 'Hire', exact: true })
    .and(page.locator(':enabled'))
    .first()
  await hire.tap()

  await openFutureExpansionNav(page, 'Agency')
  const staffing = page.getByRole('article', { name: 'Operational staffing' })
  const effective = staffing
    .locator('dt')
    .filter({ hasText: 'Effective operational capacity' })
    .locator('+ dd')
  const destination = staffing.getByRole('heading', { name: 'Operational post assignments' })
  const press = async (button: number) => {
    await page.evaluate(async (pressed) => {
      const pad = (window as unknown as { staffingPad: { pressed: number } }).staffingPad
      pad.pressed = -1
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
      pad.pressed = pressed
    }, button)
  }
  await expect(effective).toHaveText('0')
  await expect(staffing.getByRole('link', { name: 'Manage operational posts' })).toBeVisible()
  await expect(destination).not.toBeFocused()
  await press(2)
  await expect(destination).toBeFocused()
  await expect(page).toHaveURL(/agency#operational-staff-posts$/)
  const person = staffing.getByRole('group')
  const firstPost = person.getByRole('button', { name: /^Assign to .* post 1$/ })
  await press(15)
  await expect(firstPost).toBeFocused()
  await firstPost.tap()
  await expect(effective).toHaveText('1')
  await expect(person.getByRole('button', { name: /^Current post: .* post 1$/ })).toBeFocused()

  await press(15)
  await expect(person.getByRole('button', { name: /^Move to .* post 2$/ })).toBeFocused()
  await press(0)
  const current = person.getByRole('button', { name: /^Current post: .* post 2$/ })
  await expect(current).toBeVisible()
  await expect(staffing.getByRole('status')).toHaveText(/Post reassigned\./)
  await page.reload()
  await expect(current).toBeVisible()
  await expect(effective).toHaveText('1')
  const unassign = person.getByRole('button', { name: 'Unassign post' })
  await unassign.focus()
  await expect(unassign).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(person.getByText('Current post: Unassigned')).toBeVisible()
  await expect(effective).toHaveText('0')
  const fits = await staffing.evaluate((panel) => panel.scrollWidth <= panel.clientWidth)
  expect(fits).toBe(true)
})
