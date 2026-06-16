import { test, expect } from '@playwright/test'

test.describe('Bulk Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1')
    for (const name of ['Task one', 'Task two', 'Task three']) {
      await page.keyboard.press('n')
      await page.getByPlaceholder('What needs to be done?').fill(name)
      await page.getByRole('button', { name: 'Add Todo' }).click()
      await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })
    }
  })

  test('select all shows bulk actions toolbar', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Select all visible todos' }).click()
    await expect(page.getByText('3 selected')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Complete selected todos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete selected todos' })).toBeVisible()
  })

  test('clear selection hides toolbar', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Select all visible todos' }).click()
    await expect(page.getByText('3 selected')).toBeVisible()
    await page.getByRole('checkbox', { name: 'Select all visible todos' }).click()
    await expect(page.getByText('3 selected')).not.toBeVisible()
  })

  test('complete selected marks all as done', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Select all visible todos' }).click()
    await page.getByRole('button', { name: 'Complete selected todos' }).click()
    await expect(page.getByRole('checkbox', { name: 'Mark "Task one" as incomplete' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Mark "Task two" as incomplete' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Mark "Task three" as incomplete' })).toBeVisible()
  })

  test('delete selected removes all', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Select all visible todos' }).click()
    await page.getByRole('button', { name: 'Delete selected todos' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByText('Task one')).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Task two')).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Task three')).not.toBeVisible({ timeout: 10000 })
  })
})
