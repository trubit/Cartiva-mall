import React, { useEffect } from 'react'
import { Box, Typography, Card, CardContent, Button, Chip } from '@mui/material'
import {
  CheckCircle as HealthyIcon,
  Warning as DegradedIcon,
  Error as DownIcon,
  Refresh as TestIcon,
} from '@mui/icons-material'
import { useDeveloperStore } from '../../../store/useDeveloperStore.js'
import * as developerApi from '../../../services/developerApi.js'

export const IntegrationMarketplace: React.FC = () => {
  const { integrations, fetchIntegrations } = useDeveloperStore()

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const handleTestHealth = async (id: string) => {
    await developerApi.testIntegration(id)
    fetchIntegrations()
  }

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'HEALTHY':
        return <Chip icon={<HealthyIcon />} label="HEALTHY" color="success" size="small" />
      case 'DEGRADED':
        return <Chip icon={<DegradedIcon />} label="DEGRADED" color="warning" size="small" />
      case 'DOWN':
        return <Chip icon={<DownIcon />} label="DOWN" color="error" size="small" />
      default:
        return <Chip label="UNKNOWN" size="small" />
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Integration Marketplace & Provider Registry
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure third-party providers (Paystack, Brevo, Cloudinary, AI) with health monitoring.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        {integrations.map((item) => (
          <Card variant="outlined" key={item._id} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {item.name}
                </Typography>
                {getHealthBadge(item.healthStatus)}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textTransform: 'uppercase', mb: 1 }}
              >
                Category: {item.category} | Provider: {item.provider}
              </Typography>

              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Status: <strong>{item.status}</strong>
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<TestIcon />}
                  onClick={() => handleTestHealth(item._id)}
                >
                  Health Check
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}

export default IntegrationMarketplace
