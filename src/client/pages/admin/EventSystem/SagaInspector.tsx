import React, { useEffect } from 'react'
import { Box, Typography, Card, CardContent, Button, Chip, Divider } from '@mui/material'
import {
  PlayArrow as DemoIcon,
  CheckCircle as SuccessIcon,
  Error as FailureIcon,
  Undo as CompensatedIcon,
} from '@mui/icons-material'
import { useEventSystemStore } from '../../../store/useEventSystemStore.js'
import * as eventApi from '../../../services/eventSystemApi.js'

export const SagaInspector: React.FC = () => {
  const { sagas, fetchSagas } = useEventSystemStore()

  useEffect(() => {
    fetchSagas()
  }, [])

  const handleTriggerDemoSaga = async () => {
    await eventApi.triggerOrderSagaDemo()
    alert('OrderPaymentSaga demo triggered! Fetching updated sagas...')
    setTimeout(() => fetchSagas(), 1500)
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Chip icon={<SuccessIcon />} label="COMPLETED" color="success" size="small" />
      case 'COMPENSATED':
        return <Chip icon={<CompensatedIcon />} label="COMPENSATED" color="warning" size="small" />
      case 'FAILED':
        return <Chip icon={<FailureIcon />} label="FAILED" color="error" size="small" />
      default:
        return <Chip label={status} color="info" size="small" />
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Saga Orchestrator Inspector
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualize distributed transactions, step-by-step progress, failure modes, and automated
            compensations.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DemoIcon />}
          onClick={handleTriggerDemoSaga}
        >
          Trigger Demo Order Saga
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {sagas.map((saga) => (
          <Card variant="outlined" key={saga._id || saga.sagaId} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {saga.sagaName} [{saga.sagaId}]
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    Correlation ID: {saga.correlationId}
                  </Typography>
                </Box>
                {getStatusChip(saga.status)}
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
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
                      />
                    ))}
                  </Box>
                </Box>

                {saga.compensationsExecuted && saga.compensationsExecuted.length > 0 && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="warning.main"
                      sx={{ fontWeight: 'bold', mb: 1 }}
                    >
                      Compensations Executed:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {saga.compensationsExecuted.map((comp: string) => (
                        <Chip key={comp} label={`↩ ${comp}`} color="warning" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              {saga.failureReason && (
                <Typography variant="caption" color="error.main" sx={{ mt: 1.5, display: 'block' }}>
                  Failure Reason: {saga.failureReason}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}

export default SagaInspector
