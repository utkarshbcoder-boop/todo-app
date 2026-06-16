import { test, expect } from '@playwright/test'

test.describe('Todo CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1')
  })

  test('creates a new todo via button click', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Buy groceries')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Buy groceries')).toBeVisible({ timeout: 10000 })
  })

  test('creates a new todo via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('n')
    await page.getByPlaceholder('What needs to be done?').fill('Walk the dog')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Walk the dog')).toBeVisible({ timeout: 10000 })
  })

  test('creates todo with category and priority', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Important meeting')
    await page.locator('#todo-category').selectOption('Work')
    await page.locator('#todo-priority').selectOption('High')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Important meeting')).toBeVisible({ timeout: 10000 })
  })

  test('creates todo with tags', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Tagged todo')
    await page.getByPlaceholder('Add tag...').fill('urgent')
    await page.getByPlaceholder('Add tag...').press('Enter')
    await expect(page.getByText('#urgent')).toBeVisible()
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Tagged todo')).toBeVisible({ timeout: 10000 })
  })

  test('creates todo with subtasks', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Multi-step task')
    await page.getByPlaceholder('Add subtask...').fill('Step one')
    await page.getByPlaceholder('Add subtask...').press('Enter')
    await page.getByPlaceholder('Add subtask...').fill('Step two')
    await page.getByPlaceholder('Add subtask...').press('Enter')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Multi-step task')).toBeVisible({ timeout: 10000 })
  })

  test('cancels todo creation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Should not exist')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByPlaceholder('What needs to be done?')).toHaveCount(0)
  })

  test('toggles todo completion', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Complete me')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Complete me')).toBeVisible({ timeout: 10000 })
    const checkbox = page.getByRole('checkbox', { name: 'Mark "Complete me" as complete' })
    await checkbox.click()
    await expect(page.getByText('Complete me')).toHaveCSS('text-decoration-line', 'line-through')
  })

  test('deletes a todo', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Delete me')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Delete me')).toBeVisible({ timeout: 10000 })
    await page.locator('button[title="Delete"]').click()
    await expect(page.getByRole('button', { name: /Select todo: Delete me/ })).not.toBeVisible({ timeout: 10000 })
  })

  test('edits a todo', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new todo' }).click()
    await page.getByPlaceholder('What needs to be done?').fill('Original text')
    await page.getByRole('button', { name: 'Add Todo' }).click()
    await expect(page.getByText('Original text')).toBeVisible({ timeout: 10000 })
    await page.locator('button[title="Edit"]').click()
    await page.getByPlaceholder('What needs to be done?').clear()
    await page.getByPlaceholder('What needs to be done?').fill('Updated text')
    await page.getByRole('button', { name: 'Update Todo', exact: true }).click()
    await expect(page.getByText('Updated text')).toBeVisible({ timeout: 10000 })
  })
})
