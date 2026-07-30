import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page loads without errors', async ({ page }) => {
    await expect(page).not.toHaveURL(/error/i)
    await expect(page.locator('body')).toBeVisible()
  })

  test('displays the main navigation bar', async ({ page }) => {
    const nav = page.locator('nav, header, [class*="navbar"], [class*="amz-nav"]').first()
    await expect(nav).toBeVisible()
  })

  test('shows the site name or logo in the header', async ({ page }) => {
    const header = page.locator('header, [class*="amz-nav"]').first()
    await expect(header).toBeVisible()
    // Logo text or image should appear in the nav
    const logoEl = header.locator('text=Cartiva, img[alt*="Cartiva"], a[href="/"]').first()
    await expect(logoEl).toBeVisible()
  })

  test('contains a search input', async ({ page }) => {
    const search = page.locator('input[type="search"], input[placeholder*="earch"]').first()
    await expect(search).toBeVisible()
  })

  test('displays a hero/banner section', async ({ page }) => {
    const hero = page
      .locator('[class*="hero"], [class*="banner"], section:first-of-type, main > div:first-child')
      .first()
    await expect(hero).toBeVisible()
  })

  test('displays category navigation chips or links', async ({ page }) => {
    // Wait for page content to load
    await page.waitForSelector('[class*="category"], [class*="chip"], a[href*="category"]', {
      timeout: 10000,
    })
    const categories = page.locator('[class*="category"], [class*="chip"], a[href*="category"]')
    await expect(categories.first()).toBeVisible()
  })

  test('renders footer', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const footer = page.locator('footer, [class*="footer"]').first()
    await expect(footer).toBeVisible()
  })
})
