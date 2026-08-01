import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'
import MainLayout from '../layouts/MainLayout.js'
import NavbarLayout from '../layouts/NavbarLayout.js'
import LoadingSpinner from '../components/ui/LoadingSpinner.js'

// Auth pages
const LoginPage = lazy(() => import('../pages/auth/Login/index.js'))
const RegisterPage = lazy(() => import('../pages/auth/Register/index.js'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPassword/index.js'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPassword/index.js'))
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmail/index.js'))

// App pages
const HomePage = lazy(() => import('../pages/home/HomePage.js'))
const ProductsPage = lazy(() => import('../pages/products/ProductsPage.js'))
const ProductPage = lazy(() => import('../pages/products/ProductPage.js'))
const SearchResults = lazy(() => import('../pages/products/SearchResults.js'))
const CategoryPage = lazy(() => import('../pages/products/CategoryPage.js'))
const DealsPage = lazy(() => import('../pages/products/DealsPage.js'))
const CartPage = lazy(() => import('../pages/cart/CartPage.js'))
const CheckoutPage = lazy(() => import('../pages/checkout/CheckoutPage.js'))
const OrdersPage = lazy(() => import('../pages/orders/OrdersPage.js'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.js'))

// Payment pages
const PaymentPage = lazy(() => import('../pages/payment/PaymentPage/index.js'))
const PaymentComplete = lazy(() => import('../pages/payment/PaymentComplete/index.js'))
const PaymentSuccess = lazy(() => import('../pages/payment/PaymentSuccess/index.js'))
const PaymentFailed = lazy(() => import('../pages/payment/PaymentFailed/index.js'))
const PaystackCallback = lazy(() => import('../pages/payment/PaystackCallback/index.js'))

// Profile pages (nested layout)
const ProfileLayout = lazy(() => import('../pages/profile/ProfileLayout/index.js'))
const ProfilePage = lazy(() => import('../pages/profile/Profile/index.js'))
const EditProfile = lazy(() => import('../pages/profile/EditProfile/index.js'))
const AddressBook = lazy(() => import('../pages/profile/AddressBook/index.js'))
const SettingsPage = lazy(() => import('../pages/profile/Settings/index.js'))

// Order detail pages
const OrderDetails = lazy(() => import('../pages/orders/OrderDetails/index.js'))
const TrackOrder = lazy(() => import('../pages/orders/TrackOrder/index.js'))
const ReturnOrder = lazy(() => import('../pages/orders/ReturnOrder/index.js'))

// Seller pages
const SellerLayout = lazy(() => import('../pages/seller/SellerLayout/index.js'))
const SellerDashboard = lazy(() => import('../pages/seller/SellerDashboard/index.js'))
const SellerProducts = lazy(() => import('../pages/seller/SellerProducts.js'))
const SellerProductCreate = lazy(() => import('../pages/seller/SellerProductCreate.js'))
const SellerProductEdit = lazy(() => import('../pages/seller/SellerProductEdit.js'))
const SellerOrders = lazy(() => import('../pages/seller/SellerOrders/index.js'))
const SellerAnalytics = lazy(() => import('../pages/seller/SellerAnalytics/index.js'))
const SellerSettings = lazy(() => import('../pages/seller/SellerSettings/index.js'))
const SellerPayouts = lazy(() => import('../pages/seller/SellerPayouts/index.js'))
const SellerInventory = lazy(() => import('../pages/seller/SellerInventory.js'))

// Dashboard pages
const DashboardLayout = lazy(() => import('../pages/dashboard/DashboardLayout/index.js'))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage/index.js'))
const WishlistPage = lazy(() => import('../pages/dashboard/WishlistPage/index.js'))
const NotificationsPage = lazy(() => import('../pages/dashboard/NotificationsPage/index.js'))
const PaymentHistoryPage = lazy(() => import('../pages/dashboard/PaymentHistoryPage/index.js'))
const RecentlyViewedPage = lazy(() => import('../pages/dashboard/RecentlyViewedPage/index.js'))
const AccountSettingsPage = lazy(() => import('../pages/dashboard/AccountSettingsPage/index.js'))
const SecurityPage = lazy(() => import('../pages/dashboard/SecurityPage/index.js'))

// Admin pages
const AdminLayout = lazy(() => import('../pages/admin/AdminLayout/index.js'))
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard/index.js'))
const AdminUsers = lazy(() => import('../pages/admin/AdminUsers/index.js'))
const AdminSellers = lazy(() => import('../pages/admin/AdminSellers/index.js'))
const AdminProducts = lazy(() => import('../pages/admin/AdminProducts/index.js'))
const AdminOrders = lazy(() => import('../pages/admin/AdminOrders/index.js'))
const AdminInventory = lazy(() => import('../pages/admin/AdminInventory/index.js'))
const AdminPromotions = lazy(() => import('../pages/admin/AdminPromotions/index.js'))
const AdminAnalytics = lazy(() => import('../pages/admin/AdminAnalytics/index.js'))
const AdminReports = lazy(() => import('../pages/admin/AdminReports/index.js'))
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings/index.js'))
const AdminShipping = lazy(() => import('../pages/admin/AdminShipping/index.js'))
const AdminReturns = lazy(() => import('../pages/admin/AdminReturns/index.js'))
const AdminVendors = lazy(() => import('../pages/admin/AdminVendors/index.js'))
const AdminVendorApproval = lazy(() => import('../pages/admin/AdminVendorApproval/index.js'))

// Phase 17-21 pages
const ShipmentTracking = lazy(() => import('../pages/dashboard/ShipmentTracking/index.js'))
const ReturnsPage = lazy(() => import('../pages/dashboard/ReturnsPage/index.js'))
const MessagingPage = lazy(() => import('../pages/messaging/MessagingPage/index.js'))

// Phase 21 vendor pages
const VendorRegistration = lazy(() => import('../pages/seller/VendorRegistration/index.js'))
const VendorOnboarding = lazy(() => import('../pages/seller/VendorOnboarding/index.js'))
const VendorVerification = lazy(() => import('../pages/seller/VendorVerification/index.js'))
const StorefrontBuilder = lazy(() => import('../pages/seller/StorefrontBuilder/index.js'))
const CommissionDashboard = lazy(() => import('../pages/seller/CommissionDashboard/index.js'))
const PayoutDashboard = lazy(() => import('../pages/seller/PayoutDashboard/index.js'))
const DocumentManager = lazy(() => import('../pages/seller/DocumentManager/index.js'))

const SuspenseWrap = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullscreen />}>{children}</Suspense>
)

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

const SellerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'seller' && user?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

export default function AppRouter() {
  return (
    <SuspenseWrap>
      <Routes>
        {/* Main layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route
            path="/checkout"
            element={
              <PrivateRoute>
                <CheckoutPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <OrdersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <PrivateRoute>
                <OrderDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/:id/track"
            element={
              <PrivateRoute>
                <TrackOrder />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/:id/return"
            element={
              <PrivateRoute>
                <ReturnOrder />
              </PrivateRoute>
            }
          />

          {/* Payment — PrivateRoute except /payment/complete which handles Stripe redirect */}
          <Route
            path="/payment/:orderId"
            element={
              <PrivateRoute>
                <PaymentPage />
              </PrivateRoute>
            }
          />
          <Route path="/payment/complete" element={<PaymentComplete />} />
          <Route
            path="/payment/success"
            element={
              <PrivateRoute>
                <PaymentSuccess />
              </PrivateRoute>
            }
          />
          <Route
            path="/payment/failed"
            element={
              <PrivateRoute>
                <PaymentFailed />
              </PrivateRoute>
            }
          />
          <Route
            path="/payment/paystack-callback"
            element={
              <PrivateRoute>
                <PaystackCallback />
              </PrivateRoute>
            }
          />

          {/* Seller dashboard — nested layout */}
          <Route
            path="/seller"
            element={
              <SellerRoute>
                <SellerLayout />
              </SellerRoute>
            }
          >
            <Route index element={<SellerDashboard />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/create" element={<SellerProductCreate />} />
            <Route path="products/edit/:id" element={<SellerProductEdit />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="analytics" element={<SellerAnalytics />} />
            <Route path="payouts" element={<SellerPayouts />} />
            <Route path="inventory" element={<SellerInventory />} />
            <Route path="settings" element={<SellerSettings />} />
            <Route path="verification" element={<VendorVerification />} />
            <Route path="storefront" element={<StorefrontBuilder />} />
            <Route path="commissions" element={<CommissionDashboard />} />
            <Route path="vendor-payouts" element={<PayoutDashboard />} />
            <Route path="documents" element={<DocumentManager />} />
          </Route>

          {/* Vendor registration/onboarding — full screen, PrivateRoute not SellerRoute */}
          <Route
            path="/seller/register"
            element={
              <PrivateRoute>
                <VendorRegistration />
              </PrivateRoute>
            }
          />
          <Route
            path="/seller/onboarding"
            element={
              <PrivateRoute>
                <VendorOnboarding />
              </PrivateRoute>
            }
          />

          {/* Admin dashboard */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="sellers" element={<AdminSellers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="shipping" element={<AdminShipping />} />
            <Route path="returns" element={<AdminReturns />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="vendor-approvals" element={<AdminVendorApproval />} />
          </Route>

          {/* Profile — nested layout with sidebar, inside MainLayout for navbar */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfileLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<ProfilePage />} />
            <Route path="edit" element={<EditProfile />} />
            <Route path="address" element={<AddressBook />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* User Dashboard — navbar only, no footer */}
        <Route element={<NavbarLayout />}>
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="payments" element={<PaymentHistoryPage />} />
            <Route path="recently-viewed" element={<RecentlyViewedPage />} />
            <Route path="account" element={<AccountSettingsPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="shipments" element={<ShipmentTracking />} />
            <Route path="returns" element={<ReturnsPage />} />
          </Route>

          {/* Messaging */}
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <MessagingPage />
              </PrivateRoute>
            }
          />
        </Route>

        {/* Auth — full screen */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestRoute>
              <ForgotPasswordPage />
            </GuestRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SuspenseWrap>
  )
}
