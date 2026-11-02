import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ScrollToTop from '../../components/common/ScrollToTop.js'

describe('ScrollToTop Mobile & OAuth Hash Anchor Protection', () => {
  const originalScrollTo = window.scrollTo
  const originalGetElementById = document.getElementById
  const originalQuerySelector = document.querySelector

  beforeEach(() => {
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    window.scrollTo = originalScrollTo
    document.getElementById = originalGetElementById
    document.querySelector = originalQuerySelector
    vi.restoreAllMocks()
  })

  it('scrolls window to top when no hash exists on route transition', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <ScrollToTop />
      </MemoryRouter>,
    )

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  })

  it('safely handles mobile Google OAuth redirect fragment without throwing DOMException or calling querySelector', () => {
    // Regression test for production bug:
    // "Failed to execute 'querySelector' on 'Document': '#state=...&iss=https://accounts.google.com&access_token=...' is not a valid selector."
    const querySelectorSpy = vi.spyOn(document, 'querySelector')
    const oauthFragment =
      '#state=%7B%22role%22%3A%22user%22%2C%22nonce%22%3A%22abcd1234%22%7D&iss=https%3A%2F%2Faccounts.google.com&access_token=ya29.a0AfH6SM...&token_type=Bearer&expires_in=3599&scope=email+profile'

    expect(() => {
      render(
        <MemoryRouter initialEntries={[`/login${oauthFragment}`]}>
          <ScrollToTop />
        </MemoryRouter>,
      )
    }).not.toThrow()

    // document.querySelector MUST NOT be invoked with the OAuth fragment
    expect(querySelectorSpy).not.toHaveBeenCalledWith(oauthFragment)

    // Window defaults to standard instant top scroll safely
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  })

  it('safely handles access_token-first fragment without crashing', () => {
    const oauthFragment = '#access_token=ya29.sample&token_type=Bearer&expires_in=3600'
    expect(() => {
      render(
        <MemoryRouter initialEntries={[`/login${oauthFragment}`]}>
          <ScrollToTop />
        </MemoryRouter>,
      )
    }).not.toThrow()

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  })

  it('scrolls smoothly to element when legitimate anchor ID is provided', () => {
    const mockScrollIntoView = vi.fn()
    const mockElement = document.createElement('div')
    mockElement.id = 'faq-section'
    mockElement.scrollIntoView = mockScrollIntoView

    vi.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'faq-section') return mockElement
      return null
    })

    render(
      <MemoryRouter initialEntries={['/help#faq-section']}>
        <ScrollToTop />
      </MemoryRouter>,
    )

    expect(document.getElementById).toHaveBeenCalledWith('faq-section')
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('falls back to window top scroll if target anchor element does not exist in DOM', () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null)

    render(
      <MemoryRouter initialEntries={['/help#non-existent-section']}>
        <ScrollToTop />
      </MemoryRouter>,
    )

    expect(document.getElementById).toHaveBeenCalledWith('non-existent-section')
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
  })
})
