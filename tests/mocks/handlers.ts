import { http, HttpResponse } from 'msw'
import { API_PREFIX } from '../../src/shared/constants/index.js'
import { PRODUCT_CATEGORIES } from '../../src/shared/constants/index.js'

const BASE = `http://localhost${API_PREFIX}`

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({
      success: true,
      data: {
        user: {
          _id: 'mock-user-id',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          role: 'user',
          isActive: true,
          emailVerified: true,
        },
        accessToken: 'mock-access-token',
      },
    }),
  ),

  http.post(`${BASE}/auth/register`, () =>
    HttpResponse.json(
      { success: true, message: 'Registration successful. Please verify your email.' },
      { status: 201 },
    ),
  ),

  http.get(`${BASE}/auth/me`, () =>
    HttpResponse.json({
      success: true,
      data: {
        _id: 'mock-user-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        emailVerified: true,
      },
    }),
  ),

  // Products
  http.get(`${BASE}/products`, () =>
    HttpResponse.json({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false },
    }),
  ),

  http.get(`${BASE}/products/featured`, () => HttpResponse.json({ success: true, data: [] })),

  http.get(`${BASE}/products/:id`, ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        _id: params.id,
        title: 'Mock Product',
        price: 29.99,
        category: PRODUCT_CATEGORIES[0],
        stockQuantity: 10,
        images: [],
      },
    }),
  ),

  // Cart
  http.get(`${BASE}/cart`, () =>
    HttpResponse.json({
      success: true,
      data: {
        userId: 'mock-user-id',
        items: [],
        cartTotal: 0,
        grandTotal: 0,
        shippingCost: 0,
        taxAmount: 0,
        discountAmount: 0,
      },
    }),
  ),

  http.post(`${BASE}/cart/add`, () =>
    HttpResponse.json({ success: true, message: 'Item added to cart' }),
  ),
]
