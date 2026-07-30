export interface ISellerAddress {
  country?: string
  state?: string
  city?: string
  street?: string
  postalCode?: string
}

export interface ISellerProfile {
  _id: string
  userId: string
  storeName: string
  storeLogo: string
  storeLogoPublicId?: string
  storeDescription: string
  storeAddress: ISellerAddress
  isVerified: boolean
  totalSales: number
  totalEarnings: number
  rating: number
  createdAt: string
  updatedAt: string
}

export interface IRevenueByDay {
  _id: string
  revenue: number
  orders: number
}

export interface ITopProduct {
  _id: string
  title: string
  image?: string
  totalSold: number
  totalRevenue: number
}

export interface ISellerRecentOrder {
  _id: string
  orderNumber: string
  orderStatus: string
  paymentStatus: string
  grandTotal: number
  createdAt: string
  userId?: {
    firstName: string
    lastName: string
    email: string
  }
}

export interface ISellerDashboard {
  stats: {
    totalRevenue: number
    totalOrders: number
    totalProducts: number
    activeProducts: number
    pendingOrders: number
    thisMonthRevenue: number
  }
  products: {
    active: number
    pending: number
    blocked: number
  }
  recentOrders: ISellerRecentOrder[]
  revenueByDay: IRevenueByDay[]
  orderStatusBreakdown: { _id: string; count: number }[]
  topProducts: ITopProduct[]
}

export interface ISellerAnalytics {
  revenueByDay: IRevenueByDay[]
  orderStatusBreakdown: { _id: string; count: number }[]
  topProducts: ITopProduct[]
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
}

export interface ISellerEarnings {
  totalRevenue: number
  netRevenue: number
  platformFeePercent: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  pendingBalance: number
  availableBalance: number
  revenueByMonth: { _id: string; revenue: number; orders: number }[]
}
