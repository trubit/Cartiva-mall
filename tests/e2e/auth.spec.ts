import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders the login form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible()
  })

  test('has an email input', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await expect(emailInput).toBeVisible()
  })

  test('has a password input', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await expect(passwordInput).toBeVisible()
  })

  test('shows validation errors on empty form submission', async ({ page }) => {
    await page.locator('button[type="submit"], form button').first().click()
    // Some validation feedback should appear (either native or custom)
    const hasError =
      (await page
        .locator('[class*="error"], [role="alert"], .invalid-feedback, [aria-invalid="true"]')
        .count()) > 0 || (await page.locator('input:invalid').count()) > 0
    expect(hasError).toBe(true)
  })

  test('has a link to the registration page', async ({ page }) => {
    const registerLink = page.locator('a[href*="register"]')
    await expect(registerLink).toBeVisible()
  })

  test('has a forgot password link', async ({ page }) => {
    const forgotLink = page.locator('a[href*="forgot"]')
    await expect(forgotLink).toBeVisible()
  })

  test('navigates to register page when link is clicked', async ({ page }) => {
    await page.locator('a[href*="register"]').first().click()
    await expect(page).toHaveURL(/register/)
  })
})

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('renders the registration form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible()
  })

  test('has an email input', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  })

  test('has a password input', async ({ page }) => {
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
  })

  test('has a link back to the login page', async ({ page }) => {
    const loginLink = page.locator('a[href*="login"]')
    await expect(loginLink).toBeVisible()
  })
})

test.describe('Forgot password page', () => {
  test('renders an email input', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  })
})
