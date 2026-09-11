import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaNewspaper,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaFileDownload,
  FaEnvelope,
  FaCheckCircle,
} from 'react-icons/fa'

export const PressPage: FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null)

  const categories = [
    'all',
    'Product Launch',
    'Ecosystem & Partnerships',
    'Engineering & Scale',
    'Security & IAM',
  ]

  const releases = [
    {
      id: 'pr-1',
      title: 'Cartiva Launches Autonomous Business Economy Engine with Real-Time Stabilization',
      date: 'August 22, 2026',
      category: 'Product Launch',
      summary:
        'Cartiva introduces an industry-first controlled microeconomic governor that analyzes velocity, inflation, dynamic pricing limits, and algorithmic seller liquidity.',
      readTime: '4 min read',
    },
    {
      id: 'pr-2',
      title: 'Cartiva Expands Cross-Platform Ecosystem with Scoped Partner APIs and Webhooks',
      date: 'July 14, 2026',
      category: 'Ecosystem & Partnerships',
      summary:
        'Third-party logistics partners, ERP integrators, and dropshipping networks can now integrate seamlessly with Cartiva via HMAC-SHA256 verified REST webhooks.',
      readTime: '3 min read',
    },
    {
      id: 'pr-3',
      title: 'Cartiva Milestone: 1 Million+ Concurrency Benchmark Passed with Sub-50ms Latency',
      date: 'June 29, 2026',
      category: 'Engineering & Scale',
      summary:
        'A comprehensive audit by independent cloud security and scalability auditors confirms zero packet loss, atomic stock locking, and sub-50ms response times.',
      readTime: '5 min read',
    },
    {
      id: 'pr-4',
      title: 'Cartiva Introduces Zero-Trust IAM RBAC Architecture & Escrow Payment Enclaves',
      date: 'May 18, 2026',
      category: 'Security & IAM',
      summary:
        'Eliminating traditional surface vulnerabilities, Cartiva deploys automated role-based permission validation and PCI-DSS Level 1 tokenized payment guards.',
      readTime: '4 min read',
    },
  ]

  const filteredReleases =
    activeCategory === 'all' ? releases : releases.filter((r) => r.category === activeCategory)

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {downloadNotice && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>Media Kit Request:</strong> {downloadNotice}
            </div>
            <button
              onClick={() => setDownloadNotice(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#166534',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(2, 132, 199, 0.25)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            <FaNewspaper /> Cartiva Newsroom & Media
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
            Official Press Releases & Announcements
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#e0f2fe',
              maxWidth: '780px',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Read the latest company updates, engineering breakthroughs, commercial partnership
            announcements, and executive news from Cartiva.
          </p>
        </div>

        {/* Media Kit & PR Inquiries Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '28px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                <FaFileDownload />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Official Media Kit
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>ZIP Package • 24.5 MB</span>
              </div>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
              Download high-resolution vector logos, product screenshots, executive leadership
              headshots, and brand guidelines.
            </p>
            <button
              onClick={() =>
                setDownloadNotice(
                  'Media Kit package requested. Media kit and branding guidelines can be downloaded or requested directly via press@cartiva.mall.',
                )
              }
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FaFileDownload /> Download Media Kit (.ZIP)
            </button>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '28px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                <FaEnvelope />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Media Inquiries
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>press@cartiva.com</span>
              </div>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
              For interview requests, analyst briefings, or journalist statements, contact our
              dedicated media relations desk.
            </p>
            <a
              href="mailto:press@cartiva.com"
              style={{
                background: '#0284c7',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FaEnvelope /> Contact PR Desk
            </a>
          </div>
        </div>

        {/* Releases Stream */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
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
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Recent Announcements
            </h2>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: activeCategory === cat ? '#0284c7' : '#f1f5f9',
                    color: activeCategory === cat ? '#ffffff' : '#475569',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {cat === 'all' ? 'All Stories' : cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {filteredReleases.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '28px',
                  background: '#fcfdfe',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        background: '#e0f2fe',
                        color: '#0284c7',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      {item.category}
                    </span>
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FaCalendarAlt /> {item.date}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                    {item.readTime}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 10px',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: '15px',
                    color: '#475569',
                    lineHeight: 1.7,
                    margin: '0 0 20px',
                  }}
                >
                  {item.summary}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#0284c7',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FaCheckCircle /> Verified Press Release
                  </span>
                  <Link
                    to="/about"
                    style={{
                      color: '#0284c7',
                      fontWeight: 700,
                      fontSize: '14px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Read Full Story <FaExternalLinkAlt style={{ fontSize: '11px' }} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PressPage
