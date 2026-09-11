import { test, expect } from '@playwright/test'

test.describe('Phase 33 & 34: Orders & Payment E2E Suite', () => {
  test('should display orders page and handle empty or listing states', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle').catch(() => null)

    const title = page.locator('h1')
    await expect(title).toBeVisible()
  })

  test('should navigate to products page when browse products button is clicked', async ({
    page,
  }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle').catch(() => null)

    const browseBtn = page.getByRole('link', { name: /browse products/i })
    if (await browseBtn.isVisible()) {
      await browseBtn.click()
      await expect(page).toHaveURL(/\/products/)
    }
  })
})
