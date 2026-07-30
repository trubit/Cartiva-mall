import { test, expect } from '@playwright/test'
import { PRODUCT_CATEGORIES } from '../../src/shared/constants/index.js'

test.describe('Products page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
  })

  test('page loads without errors', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/error/i)
  })

  test('renders a product listing area or empty state', async ({ page }) => {
    const content = page
      .locator('[class*="product-grid"], [class*="ProductGrid"], [class*="empty"], h2, p')
      .first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })

  test('shows a filter sidebar or filter button', async ({ page }) => {
    const filter = page
      .locator('[class*="filter"], [class*="Filter"], button:has-text("Filter"), aside')
      .first()
    await expect(filter).toBeVisible({ timeout: 8000 })
  })

  test('has a sort dropdown', async ({ page }) => {
    const sortEl = page.locator('select, [class*="sort"], [class*="Sort"]').first()
    await expect(sortEl).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Product search', () => {
  test('search input accepts text and navigates to search results', async ({ page }) => {
    await page.goto('/')
    const search = page.locator('input[type="search"], input[placeholder*="earch"]').first()
    await search.fill('headphones')
    await search.press('Enter')
    await expect(page).toHaveURL(/search|headphones/)
  })
})

test.describe('Category page', () => {
  const categoryName = PRODUCT_CATEGORIES[0]

  test('renders category hero banner', async ({ page }) => {
    await page.goto(`/category/${encodeURIComponent(categoryName)}`)
    const hero = page.locator('[class*="cat-hero"]').first()
    await expect(hero).toBeVisible({ timeout: 8000 })
  })

  test('displays the category name in the hero', async ({ page }) => {
    await page.goto(`/category/${encodeURIComponent(categoryName)}`)
    await expect(page.locator(`text=${categoryName}`).first()).toBeVisible({ timeout: 8000 })
  })

  test('shows "Browse" CTA link', async ({ page }) => {
    await page.goto(`/category/${encodeURIComponent(categoryName)}`)
    const cta = page.locator(`text=/Browse ${categoryName}/i, [class*="cat-hero__cta"]`).first()
    await expect(cta).toBeVisible({ timeout: 8000 })
  })

  test('shows 404-like message for invalid category', async ({ page }) => {
    await page.goto('/category/InvalidCategoryXYZ')
    const notFound = page.locator('text=/not found|invalid|browse all/i').first()
    await expect(notFound).toBeVisible({ timeout: 5000 })
  })
})
