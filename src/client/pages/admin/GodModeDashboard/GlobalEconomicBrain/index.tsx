import React from 'react'
import { Box, Card, CardContent, Typography, Chip, LinearProgress } from '@mui/material'
import {
  Sensors as BrainIcon,
  TrendingUp as GrowthIcon,
  Shield as SecurityIcon,
} from '@mui/icons-material'

interface Props {
  economicState: any
}

export const GlobalEconomicBrain: React.FC<Props> = ({ economicState }) => {
  if (!economicState) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="grey.500">
          Initializing Global Economic Consciousness Engine...
        </Typography>
        <LinearProgress sx={{ mt: 2, maxWidth: 400, mx: 'auto' }} />
      </Box>
    )
  }

  const {
    stabilityIndex = 50,
    growthTrajectory = 0,
    riskForecast = 'LOW',
    economicState: status = 'STABLE',
    metrics = {},
    systemStressLevel = 'LOW',
  } = economicState

  return (
    <Box>
      {/* Top Banner */}
      <Card
        className="ai-brain-pulse"
        sx={{ bgcolor: '#0f172a', color: 'white', mb: 3, borderRadius: 3 }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BrainIcon sx={{ fontSize: 40, color: '#818cf8' }} />
              <Box>
                <Typography variant="h5" className="gradient-text-ai" sx={{ fontWeight: 'bold' }}>
                  Global Economic Consciousness Engine
                </Typography>
                <Typography variant="body2" color="grey.400">
                  Real-time autonomous intelligence observing and balancing marketplace dynamics
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={`STATE: ${status}`}
                color={status === 'THRIVING' || status === 'STABLE' ? 'success' : 'error'}
                sx={{ fontWeight: 'bold' }}
              />
              <Chip
                label={`RISK: ${riskForecast}`}
                color={riskForecast === 'LOW' ? 'info' : 'warning'}
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 3,
              mt: 3,
            }}
          >
            <Box>
              <Typography variant="caption" color="grey.400">
                Stability Index
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: 'bold', color: stabilityIndex >= 70 ? '#10b981' : '#f59e0b' }}
              >
                {stabilityIndex}/100
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stabilityIndex}
                sx={{
                  mt: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#334155',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: stabilityIndex >= 70 ? '#10b981' : '#f59e0b',
                  },
                }}
              />
            </Box>

            <Box>
              <Typography variant="caption" color="grey.400">
                Growth Trajectory
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <GrowthIcon color={growthTrajectory >= 0 ? 'success' : 'error'} fontSize="large" />
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 'bold', color: growthTrajectory >= 0 ? '#10b981' : '#ef4444' }}
                >
                  {growthTrajectory > 0 ? `+${growthTrajectory}%` : `${growthTrajectory}%`}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="grey.400">
                System Stress Level
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <SecurityIcon
                  sx={{ fontSize: 36, color: systemStressLevel === 'LOW' ? '#10b981' : '#ef4444' }}
                />
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {systemStressLevel}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Sub-Metrics Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <Card
          className="economic-wave-card"
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 2,
            border: '1px solid #1e293b',
          }}
        >
          <CardContent>
            <Typography
              variant="caption"
              sx={{ color: '#94a3b8', fontWeight: 600, display: 'block' }}
            >
              Demand Flow
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffffff', mt: 1 }}>
              {metrics.demandFlow || 0}/100
            </Typography>
          </CardContent>
        </Card>

        <Card
          className="economic-wave-card"
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 2,
            border: '1px solid #1e293b',
          }}
        >
          <CardContent>
            <Typography
              variant="caption"
              sx={{ color: '#94a3b8', fontWeight: 600, display: 'block' }}
            >
              Seller Health
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffffff', mt: 1 }}>
              {metrics.sellerHealthScore || 0}/100
            </Typography>
          </CardContent>
        </Card>

        <Card
          className="economic-wave-card"
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 2,
            border: '1px solid #1e293b',
          }}
        >
          <CardContent>
            <Typography
              variant="caption"
              sx={{ color: '#94a3b8', fontWeight: 600, display: 'block' }}
            >
              Liquidity Score
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffffff', mt: 1 }}>
              {metrics.liquidityScore || 0}/100
            </Typography>
          </CardContent>
        </Card>

        <Card
          className="economic-wave-card"
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 2,
            border: '1px solid #1e293b',
          }}
        >
          <CardContent>
            <Typography
              variant="caption"
              sx={{ color: '#94a3b8', fontWeight: 600, display: 'block' }}
            >
              Fraud Risk Score
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                color: metrics.fraudRiskScore > 50 ? '#ef4444' : '#10b981',
                mt: 1,
              }}
            >
              {metrics.fraudRiskScore || 0}/100
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default GlobalEconomicBrain
