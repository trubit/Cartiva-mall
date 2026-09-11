import React, { useEffect, useState } from 'react'
import { Box, Typography, Card, CardContent, Button, Chip, Divider } from '@mui/material'
import {
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as FailureIcon,
  Undo as CompensatedIcon,
  Timeline as EmptySagaIcon,
} from '@mui/icons-material'
import { useEventSystemStore } from '../../../store/useEventSystemStore.js'

export const SagaInspector: React.FC = () => {
  const { sagas, fetchSagas } = useEventSystemStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchSagas()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchSagas()
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Chip
            icon={<SuccessIcon />}
            label="COMPLETED"
            color="success"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        )
      case 'COMPENSATED':
        return (
          <Chip
            icon={<CompensatedIcon />}
            label="COMPENSATED"
            color="warning"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        )
      case 'FAILED':
        return (
          <Chip
            icon={<FailureIcon />}
            label="FAILED"
            color="error"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        )
      default:
        return <Chip label={status} color="info" size="small" sx={{ fontWeight: 700 }} />
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', mb: 0.5 }}>
            Saga Orchestrator Inspector
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Visualize distributed transactions, step-by-step progress, failure modes, and automated
            compensations.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{
            bgcolor: '#4338ca',
            color: '#ffffff',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: '8px',
            '&:hover': { bgcolor: '#3730a3' },
          }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Sagas'}
        </Button>
      </Box>

      {sagas.length === 0 ? (
        <Card
          sx={{
            borderRadius: 3,
            borderColor: '#1e293b',
            border: '1px solid #1e293b',
            bgcolor: '#0f172a',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
            py: 6,
            textAlign: 'center',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <EmptySagaIcon sx={{ fontSize: 44, color: '#64748b' }} />
            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
              No Sagas Currently in Flight
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#94a3b8', maxWidth: '480px', mb: 2 }}>
              Distributed transactions that coordinate payment, stock reservation, and dispatch will
              be visualized step-by-step here.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                borderColor: '#334155',
                color: '#ffffff',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '8px',
                '&:hover': { bgcolor: '#1e293b', borderColor: '#64748b' },
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Live Status'}
            </Button>
          </Box>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {sagas.map((saga) => (
            <Card
              key={saga._id || saga.sagaId}
              sx={{
                borderRadius: 3,
                borderColor: '#1e293b',
                border: '1px solid #1e293b',
                bgcolor: '#0f172a',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff' }}>
                      {saga.sagaName}{' '}
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>[{saga.sagaId}]</span>
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '12px' }}
                    >
                      Correlation ID: {saga.correlationId}
                    </Typography>
                  </Box>
                  {getStatusChip(saga.status)}
                </Box>

                <Divider sx={{ my: 2, borderColor: '#1e293b' }} />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: '#cbd5e1', mb: 1 }}
                    >
                      Executed Steps:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {saga.completedSteps.map((step: string, idx: number) => (
                        <Chip
                          key={step}
                          label={`${idx + 1}. ${step}`}
                          color="success"
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '12px' }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {saga.compensationsExecuted && saga.compensationsExecuted.length > 0 && (
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: '#fbbf24', mb: 1 }}
                      >
                        Compensations Executed:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {saga.compensationsExecuted.map((comp: string) => (
                          <Chip
                            key={comp}
                            label={`↩ ${comp}`}
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>

                {saga.failureReason && (
                  <Typography
                    variant="caption"
                    sx={{ color: '#ef4444', fontWeight: 600, mt: 2, display: 'block' }}
                  >
                    Failure Reason: {saga.failureReason}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default SagaInspector
