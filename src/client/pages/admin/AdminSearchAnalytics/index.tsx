import { useState, useEffect } from 'react'
import { FiSearch, FiRefreshCw, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi'
import api from '../../../services/api.js'
import './AdminSearchAnalytics.css'

interface AnalyticsItem {
  query: string
  count: number
  resultsCount: number
  lastSearchedAt: string
}

export default function AdminSearchAnalytics() {
  const [popular, setPopular] = useState<AnalyticsItem[]>([])
  const [zeroResults, setZeroResults] = useState<AnalyticsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reindexing, setReindexing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get<{
          data: { popular: AnalyticsItem[]; zeroResults: AnalyticsItem[] }
        }>('/search/analytics')
        if (res.data.data) {
          setPopular(res.data.data.popular)
          setZeroResults(res.data.data.zeroResults)
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false)
      }
    }
    void fetchAnalytics()
  }, [])

  const handleReindex = async () => {
    setReindexing(true)
    setMessage(null)
    try {
      const res = await api.post<{ message: string; data: { indexedCount: number } }>(
        '/search/admin/reindex',
      )
      setMessage(
        `Search index rebuilt successfully! Indexed ${res.data.data?.indexedCount ?? 0} products.`,
      )
    } catch {
      setMessage('Failed to rebuild search index. Please check server logs.')
    } finally {
      setReindexing(false)
    }
  }

  if (loading) {
    return (
      <div className="container section">
        <div className="skeleton" style={{ height: 350 }} />
      </div>
    )
  }

  return (
    <div className="asa-wrap">
      <div className="asa-header">
        <div>
          <h1 className="asa-title">
            <FiSearch size={24} /> Search Analytics & Index Management
          </h1>
          <p className="asa-sub">
            Track popular query terms, zero-result gaps, and control search indexing.
          </p>
        </div>
        <button onClick={handleReindex} disabled={reindexing} className="asa-reindex-btn">
          <FiRefreshCw size={16} className={reindexing ? 'asa-spin' : ''} />
          {reindexing ? 'Rebuilding Index...' : 'Rebuild Search Index'}
        </button>
      </div>

      {message && <div className="asa-message">{message}</div>}

      <div className="asa-grid">
        <div className="asa-card">
          <h2 className="asa-card-title">
            <FiTrendingUp size={18} /> Top Popular Searches
          </h2>
          {popular.length === 0 ? (
            <p className="asa-empty">No search analytics recorded yet.</p>
          ) : (
            <table className="asa-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Frequency</th>
                  <th>Results Count</th>
                </tr>
              </thead>
              <tbody>
                {popular.map((item) => (
                  <tr key={item.query}>
                    <td className="asa-query">{item.query}</td>
                    <td>{item.count}</td>
                    <td>{item.resultsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="asa-card">
          <h2 className="asa-card-title">
            <FiAlertTriangle size={18} /> Zero-Result Queries
          </h2>
          {zeroResults.length === 0 ? (
            <p className="asa-empty">No zero-result queries recorded.</p>
          ) : (
            <table className="asa-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Frequency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {zeroResults.map((item) => (
                  <tr key={item.query}>
                    <td className="asa-query">{item.query}</td>
                    <td>{item.count}</td>
                    <td>
                      <span className="asa-badge-gap">Product Gap</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
