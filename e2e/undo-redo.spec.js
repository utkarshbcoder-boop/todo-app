import { test, expect } from '@playwright/test'

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1')
  })

  test('undo button undoes last action', async ({ page }) => {
    await page.keyboard.press('n')
    await page.getByPlaceholder('What needs to be done?').fill('Undo test')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Undo test')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByText('Undo test')).not.toBeVisible({ timeout: 10000 })
  })

  test('redo redoes undone action', async ({ page }) => {
    await page.keyboard.press('n')
    await page.getByPlaceholder('What needs to be done?').fill('Redo test')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Redo test')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByText('Redo test')).not.toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: 'Redo', exact: true }).click()
    await expect(page.getByText('Redo test')).toBeVisible({ timeout: 10000 })
  })

  test('undo button is disabled with no history', async ({ page }) => {
    const undoButton = page.getByRole('button', { name: 'Undo', exact: true })
    await expect(undoButton).toBeDisabled()
  })

  test('redo button is disabled with no future', async ({ page }) => {
    const redoButton = page.getByRole('button', { name: 'Redo', exact: true })
    await expect(redoButton).toBeDisabled()
  })

  test('delete shows undo toast', async ({ page }) => {
    await page.keyboard.press('n')
    await page.getByPlaceholder('What needs to be done?').fill('Toast test')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Toast test')).toBeVisible({ timeout: 10000 })
    await page.locator('button[title="Delete"]').click()
    await expect(page.getByText(/deleted/i)).toBeVisible()
  })
})
