import { expect, test } from '@playwright/test'
import type { RunExportPayload } from '../src/app/store/runTransfer'
import {
  advanceOperationalWeek,
  clearCampaignStorage,
  openFrontDesk,
  openPrimaryNav,
} from './support/cpApp'

test('SPE-1354 keeps recorded coaching assignments separate from current coverage', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await openFrontDesk(page)
  await page.getByText('Campaign import and export', { exact: true }).click()
  const payload = page.getByRole('textbox', { name: 'Run payload' })
  await page.getByRole('button', { name: 'Export Run', exact: true }).click()
  const exported: RunExportPayload = JSON.parse(await payload.inputValue())
  // Supply an eligible instructor. The player actions below produce all assignment events.
  exported.game.staff['weekly-coaching-instructor'] = {
    role: 'instructor',
    name: 'Morgan Reed',
    efficiency: 80,
    instructorSpecialty: 'investigation',
  }
  await payload.fill(JSON.stringify(exported))
  await page.getByRole('button', { name: 'Import Run', exact: true }).click()
  await expect(page.getByText('Run imported.', { exact: true })).toBeVisible()

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
  const agentName = await trainee.getByRole('link').first().innerText()
  await trainee.getByRole('button', { name: 'Analysis Lab', exact: true }).click()
  await page.getByRole('button', { name: 'Show advanced panels' }).click()
  const instructor = page.getByRole('listitem').filter({
    has: page.getByText('Morgan Reed', { exact: true }),
  })
  await instructor.getByRole('button', { name: `Assign to ${agentName}`, exact: true }).click()
  await expect(instructor.getByText(`Currently coaching ${agentName}.`)).toBeVisible()

  await openPrimaryNav(page, 'Operations Desk')
  await openFrontDesk(page)
  await advanceOperationalWeek(page)
  const digest = page.getByRole('region', { name: 'Coaching assignments' })
  await page.getByText('Campaign import and export', { exact: true }).click()
  await page.getByRole('button', { name: 'Export Run', exact: true }).click()
  const closed: RunExportPayload = JSON.parse(await payload.inputValue())
  const assignment = closed.game.events.find(
    (event) =>
      event.type === 'agent.instructor_assigned' &&
      event.payload.staffId === 'weekly-coaching-instructor'
  )
  if (assignment?.type !== 'agent.instructor_assigned') {
    throw new Error('Expected the recorded instructor assignment.')
  }
  expect(assignment.payload.agentName).toBe(agentName)
  const historicalAssignment = digest.getByText(`Morgan Reed was assigned to coach ${agentName}`)
  const reference = digest.getByText(`Coaching record ${assignment.id}`)
  await expect(historicalAssignment).toBeVisible()
  await expect(reference).toBeVisible()

  const checkAssignments = digest.getByRole('link', { name: 'Check current coaching assignments' })
  const assignments = page.getByRole('heading', { name: 'Instructor Assignments' })
  await checkAssignments.press('Enter')
  await expect(assignments).toBeFocused()
  const unassign = instructor.getByRole('button', { name: 'Unassign', exact: true })
  await page.keyboard.press('Tab')
  await expect(unassign).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(
    instructor.getByRole('button', { name: `Assign to ${agentName}`, exact: true })
  ).toBeVisible()

  await openPrimaryNav(page, 'Operations Desk')
  await page.reload()
  await expect(historicalAssignment).toBeVisible()
  await expect(reference).toBeVisible()
  await checkAssignments.press('Enter')
  await expect(assignments).toBeFocused()
  await expect(
    instructor.getByRole('button', { name: `Assign to ${agentName}`, exact: true })
  ).toBeVisible()

  await openPrimaryNav(page, 'Operations Desk')
  await advanceOperationalWeek(page)
  await expect(digest.getByText('No coaching assignments recorded for this week.')).toBeVisible()
})
