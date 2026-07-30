import { Outlet } from 'react-router-dom'
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar/index.js'
import { useDashboardSummary, useUnreadCount } from '../../../hooks/useDashboard.js'
import { useSocket } from '../../../hooks/useSocket.js'
import { useAuthStore } from '../../../store/authStore.js'

export default function DashboardLayout() {
  const { data } = useDashboardSummary()
  // Read userId from the auth store directly — available immediately on mount
  // without waiting for the dashboard API response to arrive.
  const userId = useAuthStore((s) => s.user?._id)

  // Keeps unread count hydrated in the store and polls every 60s
  useUnreadCount()

  // Real-time push: invalidates caches on notification:new and order:updated events
  useSocket(userId)

  return (
    <div className="dashboard-layout">
      <DashboardSidebar user={data?.user} />
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  )
}
