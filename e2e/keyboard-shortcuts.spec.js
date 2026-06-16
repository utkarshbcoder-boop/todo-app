import { test, expect } from '@playwright/test'

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1')
  })

  test('? opens shortcuts panel', async ({ page }) => {
    await page.keyboard.press('?')
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible()
  })

  test('Escape closes shortcuts panel', async ({ page }) => {
    await page.keyboard.press('?')
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Keyboard Shortcuts')).not.toBeVisible()
  })

  test('n opens add todo form', async ({ page }) => {
    await page.keyboard.press('n')
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible()
  })

  test('Escape closes add todo form', async ({ page }) => {
    await page.keyboard.press('n')
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByPlaceholder('What needs to be done?')).toHaveCount(0)
  })

  test('/ focuses search input', async ({ page }) => {
    await page.keyboard.press('/')
    const searchInput = page.locator('#search-input')
    await expect(searchInput).toBeFocused()
  })

  test('Ctrl+Z undoes last action', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Undo test')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Undo test')).toBeVisible({ timeout: 10000 })
    await page.keyboard.press('Control+z')
    await expect(page.getByText('Undo test')).not.toBeVisible({ timeout: 10000 })
  })

  test('? toggles shortcuts panel open and closed', async ({ page }) => {
    await page.keyboard.press('?')
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible()
    await page.keyboard.press('?')
    await expect(page.getByText('Keyboard Shortcuts')).not.toBeVisible()
  })
})
