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
    await page.locator('button[type="submit"]').click()
    const errorEl = page.locator('.auth-error-msg, [role="alert"]').first()
    await expect(errorEl).toBeVisible({ timeout: 8000 })
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

test.describe('Forgot password & Reset password OTP flow', () => {
  test('renders email input on forgot-password page', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText(/send 6-digit code/i)
  })

  test('renders 6-digit OTP input and actions on reset-password page', async ({ page }) => {
    await page.goto('/reset-password?email=customer%40cartiva.com')

    // Confirm 6-digit OTP container and inputs render
    const otpContainer = page.locator('[data-testid="cartiva-otp-container"]')
    await expect(otpContainer).toBeVisible()

    for (let i = 0; i < 6; i++) {
      const digitInput = page.locator(`#otp-input-${i}`)
      await expect(digitInput).toBeVisible()
    }

    // Confirm expiration notice and action buttons
    await expect(page.locator('text=10 minutes')).toBeVisible()
    const verifyBtn = page.locator('#verify-otp-btn, button:has-text("Verify 6-Digit Code")')
    await expect(verifyBtn).toBeVisible()
    await expect(verifyBtn).toBeDisabled()

    // Type 6 digits and verify button enables
    for (let i = 0; i < 6; i++) {
      await page.locator(`#otp-input-${i}`).fill(String(i + 1))
    }
    await expect(verifyBtn).toBeEnabled()

    // Resend action is visible
    const resendSection = page.locator('button:has-text("Resend Code"), text=Resend available')
    await expect(resendSection.first()).toBeVisible()
  })
})

test.describe('Mobile Google OAuth redirect URL fragment resilience', () => {
  test('does not throw querySelector error or trip GlobalErrorBoundary when OAuth response fragment is in URL', async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Navigate with mobile Google OAuth redirect fragment containing state, iss, access_token, etc.
    const oauthFragment =
      '#state=%7B%22role%22%3A%22user%22%2C%22nonce%22%3A%221234abcd%22%7D&iss=https%3A%2F%2Faccounts.google.com&access_token=ya29.sample_token_mobile&token_type=Bearer&expires_in=3599&scope=openid+email+profile'

    await page.goto(`/login${oauthFragment}`)

    // Check that GlobalErrorBoundary does NOT catch an invalid querySelector error
    await expect(page.locator('text=Something unexpected occurred')).not.toBeVisible()

    // Check that the login form and Google button render cleanly
    await expect(page.locator('form')).toBeVisible()
    const googleBtn = page.locator('#google-auth-button, [data-testid="google-auth-btn"]')
    await expect(googleBtn).toBeVisible()

    // Verify no querySelector DOMException occurred
    const hasQuerySelectorError = consoleErrors.some(
      (err) => err.includes('querySelector') || err.includes('is not a valid selector'),
    )
    expect(hasQuerySelectorError).toBe(false)
  })
})
