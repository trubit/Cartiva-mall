import type { FC } from 'react'
import { useState } from 'react'
import {
  FaChartPie,
  FaFileDownload,
  FaBuilding,
  FaHandshake,
  FaArrowUp,
  FaCalendarAlt,
  FaFilePdf,
  FaEnvelope,
} from 'react-icons/fa'

export const InvestorsPage: FC = () => {
  const [docNotice, setDocNotice] = useState<string | null>(null)
  const financialHighlights = [
    { label: 'Gross Merchandise Volume (GMV)', value: '$840M', change: '+44% YoY', positive: true },
    { label: 'Annual Active Buyers', value: '4.2M', change: '+32% YoY', positive: true },
    { label: 'Merchant Take Rate Efficiency', value: '8.4%', change: '+120 bps', positive: true },
    { label: 'Adjusted Free Cash Flow', value: '$92M', change: '+58% YoY', positive: true },
  ]

  const filings = [
    {
      type: '10-Q',
      title: 'Quarterly Report for Period Ended June 30, 2026',
      filedDate: 'Aug 04, 2026',
      size: '2.8 MB',
    },
    {
      type: '8-K',
      title: 'Current Report: Autonomous Economy Layer Deployment',
      filedDate: 'Jul 21, 2026',
      size: '1.1 MB',
    },
    {
      type: '10-Q',
      title: 'Quarterly Report for Period Ended March 31, 2026',
      filedDate: 'May 06, 2026',
      size: '2.6 MB',
    },
    {
      type: '10-K',
      title: 'Annual Report for Fiscal Year Ended December 31, 2025',
      filedDate: 'Feb 26, 2026',
      size: '6.4 MB',
    },
  ]

  const governanceDocs = [
    { title: 'Corporate Governance Guidelines', updated: '2026 Edition' },
    { title: 'Audit & Risk Committee Charter', updated: '2026 Edition' },
    { title: 'Code of Business Conduct & Ethics', updated: '2026 Edition' },
    { title: 'Executive Compensation & Human Capital Charter', updated: '2026 Edition' },
  ]

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {docNotice && (
          <div
            style={{
              background: '#fefce8',
              border: '1px solid #fef08a',
              color: '#854d0e',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>Investor Document:</strong> {docNotice}
            </div>
            <button
              onClick={() => setDocNotice(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#854d0e',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #1e293b 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(180, 83, 9, 0.25)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(254, 243, 199, 0.2)',
              border: '1px solid rgba(254, 243, 199, 0.4)',
              color: '#fef3c7',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            <FaChartPie /> Investor Relations
          </div>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 800,
              margin: '0 0 16px',
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Financial Disclosures & Governance
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#fef3c7',
              maxWidth: '780px',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Transparent financial performance, quarterly shareholder reports, regulatory SEC
            filings, and corporate governance charters for Cartiva, Inc.
          </p>
        </div>

        {/* Financial Highlights Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '44px',
          }}
        >
          {financialHighlights.map((fh) => (
            <div
              key={fh.label}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div
                style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}
              >
                {fh.label}
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.1,
                  marginBottom: '6px',
                }}
              >
                {fh.value}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#059669',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: '#ecfdf5',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                <FaArrowUp style={{ fontSize: '11px' }} /> {fh.change}
              </div>
            </div>
          ))}
        </div>

        {/* SEC Filings & Documents Section */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div>
              <h2
                style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}
              >
                SEC Filings & Shareholder Reports
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Official quarterly 10-Q, annual 10-K, and current 8-K regulatory filings.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {filings.map((f) => (
              <div
                key={f.title}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  background: '#fcfdfe',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      background: '#fef3c7',
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px',
                    }}
                  >
                    {f.type}
                  </div>
                  <div>
                    <h4
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#0f172a',
                        margin: '0 0 4px',
                      }}
                    >
                      {f.title}
                    </h4>
                    <div
                      style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}
                    >
                      <span>
                        <FaCalendarAlt style={{ marginRight: '4px' }} /> Filed: {f.filedDate}
                      </span>
                      <span>•</span>
                      <span>{f.size}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setDocNotice(
                      `Document [${f.title}] requested. Investor disclosures are distributed via our transfer agent and SEC EDGAR portal.`,
                    )
                  }
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FaFilePdf style={{ color: '#dc2626' }} /> Download PDF
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Corporate Governance & Investor Contact */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                <FaBuilding />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Corporate Governance
              </h3>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {governanceDocs.map((gd) => (
                <div
                  key={gd.title}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                    {gd.title}
                  </span>
                  <button
                    onClick={() =>
                      setDocNotice(
                        `Charter document [${gd.title}] requested. Corporate governance charters are archived at ir.cartiva.mall.`,
                      )
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b45309',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    <FaFileDownload /> PDF
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  <FaHandshake />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Investor Contact
                </h3>
              </div>
              <p
                style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, margin: '0 0 16px' }}
              >
                Institutional investors, equity research analysts, and shareholders may direct
                inquiries to our Investor Relations team:
              </p>
              <div
                style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: '#334155',
                }}
              >
                <div>
                  <strong>Email:</strong> ir@cartiva.com
                </div>
                <div style={{ marginTop: '4px' }}>
                  <strong>Headquarters:</strong> Cartiva Global Holdings Inc., New York, NY
                </div>
              </div>
            </div>

            <a
              href="mailto:ir@cartiva.com"
              style={{
                marginTop: '24px',
                background: '#b45309',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <FaEnvelope style={{ marginRight: '8px' }} /> Email Investor Relations
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvestorsPage
