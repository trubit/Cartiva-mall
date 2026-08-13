import api from './api.js'

export const forecastApi = {
  getSales: (params?: Record<string, unknown>) => api.get('/forecast/sales', { params }),
  getInventory: (params?: Record<string, unknown>) => api.get('/forecast/inventory', { params }),
  getCustomers: (params?: Record<string, unknown>) => api.get('/forecast/customers', { params }),
  getProducts: (params?: Record<string, unknown>) => api.get('/forecast/products', { params }),
  getVendors: (params?: Record<string, unknown>) => api.get('/forecast/vendors', { params }),
  getLogistics: (params?: Record<string, unknown>) => api.get('/forecast/logistics', { params }),
  getFinance: (params?: Record<string, unknown>) => api.get('/forecast/finance', { params }),
  getRecommendations: () => api.get('/forecast/recommendations'),
  runScenario: (data: unknown) => api.post('/forecast/scenario', data),
  getHistory: (params?: Record<string, unknown>) => api.get('/forecast/history', { params }),
}
