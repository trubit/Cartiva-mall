import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Snackbar,
} from '@mui/material'
import {
  PlayArrow as ReplayIcon,
  Delete as DiscardIcon,
  CheckCircle as CleanIcon,
} from '@mui/icons-material'
import { useEventSystemStore } from '../../../store/useEventSystemStore.js'
import * as eventApi from '../../../services/eventSystemApi.js'

export const DeadLetterManager: React.FC = () => {
  const { deadLetters, fetchDeadLetters } = useEventSystemStore()
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchDeadLetters()
  }, [])

  const handleReplayDLQ = async (id: string) => {
    try {
      await eventApi.replayDeadLetter(id)
      setSnackbarMessage('Dead letter event replayed successfully!')
      fetchDeadLetters()
    } catch {
      setSnackbarMessage('Failed to replay dead letter event')
    }
  }

  const handleDiscardDLQ = async (id: string) => {
    await eventApi.discardDeadLetter(id)
    fetchDeadLetters()
  }

  const headerCellStyle = {
    color: '#94a3b8',
    fontWeight: 700,
    fontSize: '13px',
    borderBottom: '1px solid #334155',
    py: 1.5,
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', mb: 0.5 }}>
          Dead Letter Queue (DLQ) Manager
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Inspect, replay, or discard failed domain events that exceeded retry thresholds across
          asynchronous queues.
        </Typography>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: '16px',
          borderColor: '#1e293b',
          border: '1px solid #1e293b',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          bgcolor: '#0f172a',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1e293b' }}>
              <TableCell sx={headerCellStyle}>Event ID</TableCell>
              <TableCell sx={headerCellStyle}>Event Type</TableCell>
              <TableCell sx={headerCellStyle}>Failure Reason</TableCell>
              <TableCell sx={headerCellStyle}>Retries</TableCell>
              <TableCell sx={headerCellStyle}>Status</TableCell>
              <TableCell sx={headerCellStyle} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deadLetters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, borderBottom: 'none' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <CleanIcon sx={{ fontSize: 44, color: '#10b981' }} />
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                      Dead Letter Queue is Empty
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: '#94a3b8', maxWidth: '480px' }}>
                      All domain events, sagas, and background BullMQ workers are currently
                      processing successfully with zero dead-lettered payloads.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              deadLetters.map((dlq) => (
                <TableRow
                  key={dlq._id}
                  sx={{
                    '&:hover': { bgcolor: '#1e293b' },
                    transition: 'background-color 0.15s ease',
                    borderBottom: '1px solid #1e293b',
                  }}
                >
                  <TableCell sx={{ borderBottom: '1px solid #1e293b' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#ef4444',
                        bgcolor: 'rgba(239, 68, 68, 0.1)',
                        px: 1,
                        py: 0.5,
                        borderRadius: '4px',
                        display: 'inline-block',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      {dlq.eventId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #1e293b' }}>
                    <Chip
                      label={dlq.eventType}
                      color="error"
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '12px' }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #1e293b' }}>
                    <Typography
                      variant="body2"
                      sx={{ color: '#f87171', fontWeight: 600, fontSize: '13px' }}
                    >
                      {dlq.reason}
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{ color: '#ffffff', fontWeight: 700, borderBottom: '1px solid #1e293b' }}
                  >
                    {dlq.retryCount}
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #1e293b' }}>
                    <Chip
                      label={dlq.status}
                      color={dlq.status === 'PENDING' ? 'warning' : 'default'}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '11px' }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: '1px solid #1e293b' }}>
                    {dlq.status === 'PENDING' && (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<ReplayIcon />}
                          onClick={() => handleReplayDLQ(dlq._id)}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                        >
                          Replay
                        </Button>
                        <IconButton
                          color="error"
                          onClick={() => handleDiscardDLQ(dlq._id)}
                          title="Discard Event"
                          size="small"
                        >
                          <DiscardIcon />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
      />
    </Box>
  )
}

export default DeadLetterManager
