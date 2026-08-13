import api from './api.js'

export const analyticsApi = {
  getDashboard: (params?: Record<string, unknown>) => api.get('/analytics/dashboard', { params }),
  getSales: (params?: Record<string, unknown>) => api.get('/analytics/sales', { params }),
  getCustomers: (params?: Record<string, unknown>) => api.get('/analytics/customers', { params }),
  getVendors: (params?: Record<string, unknown>) => api.get('/analytics/vendors', { params }),
  getProducts: (params?: Record<string, unknown>) => api.get('/analytics/products', { params }),
  getInventory: () => api.get('/analytics/inventory'),
  getFinance: (params?: Record<string, unknown>) => api.get('/analytics/finance', { params }),
  getLogistics: (params?: Record<string, unknown>) => api.get('/analytics/logistics', { params }),

  createReport: (data: unknown) => api.post('/analytics/reports', data),
  listReports: (params?: Record<string, unknown>) => api.get('/analytics/reports', { params }),
  getReport: (id: string) => api.get(`/analytics/reports/${id}`),
  exportReport: (id: string, format: string) =>
    api.post(`/analytics/reports/${id}/export`, { format }, { responseType: 'blob' }),
}
