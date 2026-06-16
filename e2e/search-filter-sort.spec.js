import { test, expect } from '@playwright/test'

test.describe('Search, Filter & Sort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1')
    const todos = [
      { text: 'Buy milk', category: 'Personal', priority: 'Low' },
      { text: 'Write report', category: 'Work', priority: 'High' },
      { text: 'Call dentist', category: 'Health', priority: 'Medium' }
    ]
    for (const todo of todos) {
      await page.keyboard.press('n')
      await page.getByPlaceholder('What needs to be done?').fill(todo.text)
      await page.locator('#todo-category').selectOption(todo.category)
      await page.locator('#todo-priority').selectOption(todo.priority)
      await page.getByRole('button', { name: 'Add Todo' }).click()
      await expect(page.getByText(todo.text)).toBeVisible({ timeout: 10000 })
    }
  })

  test('search filters todos by text', async ({ page }) => {
    await page.getByPlaceholder('Search todos').fill('milk')
    await expect(page.getByText('Buy milk')).toBeVisible()
    await expect(page.getByText('Write report')).not.toBeVisible()
  })

  test('search is case insensitive', async ({ page }) => {
    await page.getByPlaceholder('Search todos').fill('MILK')
    await expect(page.getByText('Buy milk')).toBeVisible()
  })

  test('Active tab shows only incomplete todos', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Mark "Buy milk" as complete' }).click()
    await page.getByRole('tab', { name: 'Active' }).click()
    await expect(page.getByText('Buy milk')).not.toBeVisible()
    await expect(page.getByText('Write report')).toBeVisible()
  })

  test('Completed tab shows only completed todos', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Mark "Buy milk" as complete' }).click()
    await page.getByRole('tab', { name: 'Done' }).click()
    await expect(page.getByText('Buy milk')).toBeVisible()
    await expect(page.getByText('Write report')).not.toBeVisible()
  })

  test('All tab shows all todos', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Mark "Buy milk" as complete' }).click()
    await page.getByRole('tab', { name: 'Done' }).click()
    await expect(page.getByText('Write report')).not.toBeVisible()
    await page.getByRole('tab', { name: 'All' }).click()
    await expect(page.getByText('Buy milk')).toBeVisible()
    await expect(page.getByText('Write report')).toBeVisible()
  })

  test('category filter shows only matching todos', async ({ page }) => {
    await page.getByRole('button', { name: 'Work', exact: true }).click()
    await expect(page.getByText('Write report')).toBeVisible()
    await expect(page.getByText('Buy milk')).not.toBeVisible()
    await expect(page.getByText('Call dentist')).not.toBeVisible()
  })

  test('sort by priority arranges todos correctly', async ({ page }) => {
    await page.locator('#sort-select').selectOption('priority')
    const list = page.locator('[aria-label="Todo list"]')
    const count = await list.locator('> div').count()
    expect(count).toBe(3)
  })

  test('clear completed removes completed todos', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Mark "Buy milk" as complete' }).click()
    await page.getByRole('checkbox', { name: 'Mark "Write report" as complete' }).click()
    await page.getByRole('button', { name: /Clear \d+ completed/ }).click()
    await expect(page.getByText('Buy milk')).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Write report')).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Call dentist')).toBeVisible()
  })
})
