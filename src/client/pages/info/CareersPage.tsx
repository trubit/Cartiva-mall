import type { FC } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaHandsHelping,
  FaRocket,
  FaLaptopCode,
  FaBullhorn,
  FaCheckCircle,
  FaCertificate,
  FaAward,
  FaUsers,
  FaGift,
  FaArrowRight,
  FaHeart,
} from 'react-icons/fa'

export const CareersPage: FC = () => {
  const [activeTrack, setActiveTrack] = useState<string>('all')

  const tracks = [
    'all',
    'Engineering & Tech',
    'Community & Social',
    'Quality & Testing',
    'Content & Catalog',
  ]

  const volunteerPerks = [
    {
      title: 'Real-World Production Experience',
      desc: 'Work on high-scale distributed commerce systems, atomic transactions, and modern React/Node.js tech stacks.',
      icon: FaLaptopCode,
      color: '#3b82f6',
      bg: '#eff6ff',
    },
    {
      title: 'Official Recommendation & Certificate',
      desc: 'Earn a verified Letter of Recommendation, LinkedIn endorsement, and Certificate of Contribution from the Cartiva Founding Team.',
      icon: FaCertificate,
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      title: 'Priority for Future Paid & Full-Time Roles',
      desc: 'As Cartiva scales and opens full-time paid positions, active founding volunteers and early contributors are prioritized first.',
      icon: FaAward,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      title: 'Cartiva Wallet Credits & Perks',
      desc: 'Receive free Cartiva Balance rewards, platform shopping discounts, and early beta access to upcoming features.',
      icon: FaGift,
      color: '#d97706',
      bg: '#fef3c7',
    },
  ]

  const volunteerRoles = [
    {
      id: 'vol-1',
      title: 'Junior / Starter Full-Stack Contributor (React & Node.js)',
      track: 'Engineering & Tech',
      type: 'Volunteer / Part-Time (Flexible)',
      commitment: '5–10 hrs / week',
      icon: FaLaptopCode,
      desc: 'Help build and test new marketplace components, improve UI responsiveness, and contribute to open-source style e-commerce modules.',
      learnings: [
        'React 18 & TypeScript',
        'State Management (Zustand)',
        'RESTful APIs & Webhooks',
        'Git Collaboration',
      ],
    },
    {
      id: 'vol-2',
      title: 'Community Ambassador & Social Media Starter',
      track: 'Community & Social',
      type: 'Volunteer (Remote / Flexible)',
      commitment: '3–6 hrs / week',
      icon: FaBullhorn,
      desc: 'Engage with online shopping communities, manage social media announcements, showcase featured artisan products, and grow user reach.',
      learnings: [
        'Brand Storytelling',
        'Social Media Strategy',
        'User Community Growth',
        'Content Analytics',
      ],
    },
    {
      id: 'vol-3',
      title: 'Beta Tester & QA User Experience Volunteer',
      track: 'Quality & Testing',
      type: 'Volunteer / Remote',
      commitment: '2–5 hrs / week',
      icon: FaCheckCircle,
      desc: 'Test new shopping flows, verify checkout behaviors across diverse mobile devices, discover edge-case bugs, and provide UX feedback.',
      learnings: [
        'Quality Assurance Fundamentals',
        'Usability Testing',
        'Bug Reporting & Diagnostics',
        'Cross-Device QA',
      ],
    },
    {
      id: 'vol-4',
      title: 'Product Catalog & Vendor Onboarding Assistant',
      track: 'Content & Catalog',
      type: 'Volunteer / Remote',
      commitment: '4–8 hrs / week',
      icon: FaUsers,
      desc: 'Help review new merchant product listings, optimize product descriptions, categorize trending items, and support seller success.',
      learnings: [
        'E-Commerce Merchandising',
        'SEO & Product Optimization',
        'Vendor Relations',
        'Catalog Organization',
      ],
    },
  ]

  const filteredRoles =
    activeTrack === 'all' ? volunteerRoles : volunteerRoles.filter((r) => r.track === activeTrack)

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #1e293b 100%)',
            borderRadius: '24px',
            padding: '56px 40px',
            color: '#ffffff',
            marginBottom: '40px',
            boxShadow: '0 20px 25px -5px rgba(67, 56, 202, 0.25)',
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
            <FaHandsHelping /> Join as a Founding Volunteer & Early Starter
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
            We’re Just Getting Started — Build Cartiva with Us!
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#e0e7ff',
              maxWidth: '780px',
              lineHeight: 1.7,
              margin: '0 0 32px',
            }}
          >
            Cartiva is at its exciting early launch stage. We invite passionate beginners, aspiring
            developers, community champions, and creative volunteers to collaborate directly with
            our founding team, gain hands-on experience, and help shape the next big commerce
            platform.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="mailto:careers@cartiva.com?subject=Volunteer / Early Starter Application"
              style={{
                background: '#ffffff',
                color: '#4338ca',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FaHeart style={{ color: '#ef4444' }} /> Apply as a Volunteer
            </a>
            <Link
              to="/about"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              Learn About Our Mission
            </Link>
          </div>
        </div>

        {/* Why Volunteer With Us */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Why Join as an Early Contributor?
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              Gain meaningful real-world experience, build an impressive portfolio, and be
              recognized as a founding contributor.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            {volunteerPerks.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.title}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '28px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: p.bg,
                      color: p.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      marginBottom: '16px',
                    }}
                  >
                    <Icon />
                  </div>
                  <h3
                    style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 8px',
                    }}
                  >
                    {p.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                    {p.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Open Volunteer & Starter Roles */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            marginBottom: '48px',
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
                Open Starter & Volunteer Tracks ({filteredRoles.length})
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Choose a track that matches your learning goals and availability.
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tracks.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTrack(t)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: activeTrack === t ? '#4338ca' : '#f1f5f9',
                    color: activeTrack === t ? '#ffffff' : '#475569',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {t === 'all' ? 'All Opportunities' : t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {filteredRoles.map((role) => {
              const Icon = role.icon
              return (
                <div
                  key={role.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '20px',
                    background: '#fcfdfe',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                      maxWidth: '680px',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: '#eef2ff',
                        color: '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0,
                        marginTop: '4px',
                      }}
                    >
                      <Icon />
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '6px',
                        }}
                      >
                        <span
                          style={{
                            background: '#eef2ff',
                            color: '#4338ca',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '6px',
                          }}
                        >
                          {role.track}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                          {role.commitment}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: '#0f172a',
                          margin: '0 0 8px',
                        }}
                      >
                        {role.title}
                      </h3>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#475569',
                          margin: '0 0 14px',
                          lineHeight: 1.6,
                        }}
                      >
                        {role.desc}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {role.learnings.map((skill) => (
                          <span
                            key={skill}
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              fontSize: '12px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontWeight: 500,
                            }}
                          >
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <a
                    href={`mailto:careers@cartiva.com?subject=Volunteer Application: ${encodeURIComponent(role.title)}`}
                    style={{
                      background: '#4338ca',
                      color: '#ffffff',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '14px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexShrink: 0,
                    }}
                  >
                    Join This Track <FaArrowRight style={{ fontSize: '12px' }} />
                  </a>
                </div>
              )
            })}
          </div>
        </div>

        {/* Founding Philosophy Callout */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '24px',
            padding: '40px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#fbbf24',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              <FaRocket /> Early Stage Community Power
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
              Have a unique skill to contribute?
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
              Whether you’re into UI design, translation, copywriting, video editing, or merchant
              outreach, send us an open note!
            </p>
          </div>
          <a
            href="mailto:careers@cartiva.com?subject=Open Volunteer Inquiry"
            style={{
              background: '#4338ca',
              color: '#ffffff',
              padding: '14px 28px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '15px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Send an Open Note <FaArrowRight style={{ fontSize: '12px' }} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default CareersPage
