import { test, expect } from '@playwright/test'

test.describe('Cart page (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cart')
  })

  test('renders the cart page without crashing', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/error/i)
  })

  test('shows an empty cart or login prompt', async ({ page }) => {
    const content = page
      .locator('[class*="empty"], text=/empty/i, text=/login/i, text=/sign in/i, [class*="cart"]')
      .first()
    await expect(content).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Cart icon in navbar', () => {
  test('cart icon is visible in navigation', async ({ page }) => {
    await page.goto('/')
    const cartIcon = page
      .locator('[class*="cart"], a[href*="cart"], [aria-label*="cart"], [aria-label*="Cart"]')
      .first()
    await expect(cartIcon).toBeVisible()
  })

  test('clicking cart icon navigates to /cart', async ({ page }) => {
    await page.goto('/')
    await page
      .locator('[class*="cart-icon"], a[href="/cart"], [aria-label*="cart"]')
      .first()
      .click()
    await expect(page).toHaveURL(/\/cart/)
  })
})

test.describe('Guest cart — add to cart flow', () => {
  test('product card Add to Cart button is visible on products page', async ({ page }) => {
    await page.goto('/products')
    // Wait for products to load or empty state
    await page.waitForSelector('[class*="product-card"], [class*="empty"]', { timeout: 10000 })

    const addBtn = page.locator('button:has-text("Add to Cart"), [class*="add-btn"]').first()
    // Only assert if products are present
    const hasProducts = await page.locator('[class*="product-card"]').count()
    if (hasProducts > 0) {
      await expect(addBtn).toBeVisible()
    }
  })
})
