import { test, expect } from '@playwright/test'

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1')
  })

  test('toggles between light and dark mode', async ({ page }) => {
    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')
    const toggle = page.getByRole('button', { name: /Switch to/ })

    await toggle.click()
    const newClass = await html.getAttribute('class')
    expect(newClass).not.toBe(initialClass)
  })

  test('toggle button changes aria-label', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /Switch to/ })
    const initialLabel = await toggle.getAttribute('aria-label')
    await toggle.click()
    const newLabel = await toggle.getAttribute('aria-label')
    expect(newLabel).not.toBe(initialLabel)
  })
})
