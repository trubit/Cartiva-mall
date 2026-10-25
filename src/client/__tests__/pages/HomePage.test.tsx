import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../../pages/home/HomePage.js'

// Mock hooks to avoid unneeded network calls during unit test
vi.mock('../../hooks/useProducts.js', () => ({
  useFeaturedProducts: () => ({ data: [], isLoading: false }),
  useTrendingProducts: () => ({ data: [], isLoading: false }),
  useRecommendedProducts: () => ({ data: [], isLoading: false }),
  useProductSuggestions: () => ({ data: [] }),
}))

vi.mock('../../hooks/usePromotions.js', () => ({
  useActivePromotions: () => ({ data: [] }),
}))

vi.mock('../../hooks/useRecommendations.js', () => ({
  useHomeRecommendations: () => ({
    data: { bestSellers: [], newArrivals: [], personalizedForYou: [] },
    isLoading: false,
  }),
}))

vi.mock('../../hooks/useCart.js', () => ({
  useCart: () => ({
    addToCart: vi.fn(),
    displayItems: [],
    totals: { subtotal: 0, tax: 0, shipping: 0, grandTotal: 0, count: 0 },
    isLoading: false,
  }),
}))

vi.mock('../../store/authStore.js', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: false }),
}))

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('Cartival Mall — Premium Max-Level Landing Page Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Section 1 — Hero Section (Full-Bleed, High-Impact Visual)', () => {
    it('renders the full-bleed hero banner and authoritative headline', () => {
      renderHomePage()

      const heroBanner = document.querySelector('.hero-banner--fullbleed')
      expect(heroBanner).toBeTruthy()

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toContain('Good finds. Great choices.')
      expect(heading.textContent).toContain('Shopping made easy.')

      expect(
        screen.getByText(
          /Discover products you love, find what fits your needs, and place your order in a few simple steps/i,
        ),
      ).toBeTruthy()
    })

    it('renders primary "Explore the collection" CTA and secondary "Discover how it works" CTA', () => {
      renderHomePage()

      const exploreBtn = document.getElementById('hero-explore-collection-btn')
      expect(exploreBtn).toBeTruthy()
      expect(exploreBtn?.getAttribute('href')).toBe('/products')
      expect(exploreBtn?.textContent).toContain('Explore the collection')

      const discoverBtn = document.getElementById('hero-discover-works-btn')
      expect(discoverBtn).toBeTruthy()
      expect(discoverBtn?.getAttribute('href')).toBe('#how-it-works')
      expect(discoverBtn?.textContent).toContain('Discover how it works')
    })

    it('renders honest trust assurances on the hero without fabricated statistics', () => {
      renderHomePage()

      expect(screen.getByText(/Buyer Escrow Guarantee/i)).toBeTruthy()
      expect(screen.getByText(/100% Verified Sellers/i)).toBeTruthy()
      expect(screen.getByText(/Secure Encrypted Checkout/i)).toBeTruthy()
    })
  })

  describe('Section B — Editorial Shopping Introduction', () => {
    it('renders the editorial storytelling introduction and pillars', () => {
      renderHomePage()

      expect(screen.getByText('The Cartival Mall Standard')).toBeTruthy()
      expect(screen.getByText('Curated for quality. Delivered with care.')).toBeTruthy()
      expect(screen.getByText('Authentic Merchant Goods')).toBeTruthy()
      expect(screen.getByText('Transparent Multi-Currency Pricing')).toBeTruthy()
      expect(screen.getByText('Guaranteed Buyer Escrow')).toBeTruthy()
    })
  })

  describe('Section C — The Shopping Journey: How Shopping Works (5 Steps)', () => {
    it('renders the 5 sequential steps with clear step indicators and titles', () => {
      renderHomePage()

      const journeySection = document.getElementById('how-it-works')
      expect(journeySection).toBeTruthy()

      expect(screen.getByText('Discover')).toBeTruthy()
      expect(screen.getByText('Explore')).toBeTruthy()
      expect(screen.getByText('Add to Cart')).toBeTruthy()
      expect(screen.getByText('Place Your Order')).toBeTruthy()
      expect(screen.getByText('Track Your Order')).toBeTruthy()

      expect(screen.getByText('01')).toBeTruthy()
      expect(screen.getByText('02')).toBeTruthy()
      expect(screen.getByText('03')).toBeTruthy()
      expect(screen.getByText('04')).toBeTruthy()
      expect(screen.getByText('05')).toBeTruthy()
    })
  })

  describe('Section E — Brand Confidence & Customer Reassurance', () => {
    it('renders links to real existing policies and customer support', () => {
      renderHomePage()

      const shippingLink = screen.getByText('Shipping rates & guidelines').closest('a')
      expect(shippingLink?.getAttribute('href')).toBe('/shipping')

      const returnLink = screen.getByText('Return policy details').closest('a')
      expect(returnLink?.getAttribute('href')).toBe('/returns')

      const paymentLink = screen.getByText('Payment protection overview').closest('a')
      expect(paymentLink?.getAttribute('href')).toBe('/payment')

      const helpLink = screen.getByText('Help & support center').closest('a')
      expect(helpLink?.getAttribute('href')).toBe('/help')
    })
  })

  describe('Section F — Frequently Asked Questions (Accordion)', () => {
    it('renders interactive FAQ accordion with accessible aria attributes', () => {
      renderHomePage()

      const firstQuestionBtn = screen.getByRole('button', {
        name: /How do I find products on Cartival Mall\?/i,
      })
      expect(firstQuestionBtn).toBeTruthy()
      // First question is open by default
      expect(firstQuestionBtn.getAttribute('aria-expanded')).toBe('true')
      expect(
        screen.getByText(/You can use the search bar at the top of the page to search by keyword/i),
      ).toBeTruthy()

      // Click to collapse
      fireEvent.click(firstQuestionBtn)
      expect(firstQuestionBtn.getAttribute('aria-expanded')).toBe('false')

      // Click second question to expand
      const secondQuestionBtn = screen.getByRole('button', {
        name: /How does placing an order and payment work\?/i,
      })
      fireEvent.click(secondQuestionBtn)
      expect(secondQuestionBtn.getAttribute('aria-expanded')).toBe('true')
      expect(screen.getByText(/All purchases are backed by buyer escrow protection/i)).toBeTruthy()
    })
  })

  describe('Section G — Strong Final Shopping Invitation', () => {
    it('renders invitation to start shopping linked to /products', () => {
      renderHomePage()

      expect(screen.getByText('Your next great find starts here.')).toBeTruthy()
      expect(
        screen.getByText("Explore what's available and find something that works for you."),
      ).toBeTruthy()

      const startShoppingBtn = document.getElementById('final-start-shopping-btn')
      expect(startShoppingBtn).toBeTruthy()
      expect(startShoppingBtn?.getAttribute('href')).toBe('/products')
      expect(startShoppingBtn?.textContent).toContain('Start shopping')
    })
  })
})
