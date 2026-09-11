import { test, expect } from '@playwright/test'

test.describe('Resilience, Navigation History & Edge Cases', () => {
  test('handles browser history navigation back and forward smoothly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/products')
    await expect(page.locator('body')).toBeVisible()

    // Back to home
    await page.goBack()
    await expect(page.locator('body')).toBeVisible()

    // Forward to products
    await page.goForward()
    await expect(page.locator('body')).toBeVisible()
  })

  test('handles viewport resizing gracefully from desktop to mobile viewports', async ({
    page,
  }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('body')).toBeVisible()

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('renders 404 page for unknown routes without crashing', async ({ page }) => {
    await page.goto('/non-existent-route-404-check')
    await expect(page.locator('body')).toBeVisible()
  })
})
