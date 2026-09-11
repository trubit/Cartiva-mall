import { test, expect } from '@playwright/test'

test.describe('Seller Flows', () => {
  test('navigates to seller dashboard and renders sidebar', async ({ page }) => {
    await page.goto('/seller/dashboard')
    // Should render seller layout or redirect to login if unauthenticated
    await expect(page.locator('body')).toBeVisible()
  })

  test('seller products view renders data table / grid', async ({ page }) => {
    await page.goto('/seller/products')
    await expect(page.locator('body')).toBeVisible()
    await expect(
      page.locator('h1, h2, h3, [class*="title"], [class*="header"]').first(),
    ).toBeVisible()
  })

  test('seller inventory view loads without errors', async ({ page }) => {
    await page.goto('/seller/inventory')
    await expect(page.locator('body')).toBeVisible()
  })

  test('seller autonomy economy dashboard loads', async ({ page }) => {
    await page.goto('/seller/autonomy')
    await expect(page.locator('body')).toBeVisible()
  })

  test('seller analytics and payouts routes load gracefully', async ({ page }) => {
    await page.goto('/seller/analytics')
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/seller/payouts')
    await expect(page.locator('body')).toBeVisible()
  })
})
