import React, { useEffect } from 'react'
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
} from '@mui/material'
import { PlayArrow as ReplayIcon, Delete as DiscardIcon } from '@mui/icons-material'
import { useEventSystemStore } from '../../../store/useEventSystemStore.js'
import * as eventApi from '../../../services/eventSystemApi.js'

export const DeadLetterManager: React.FC = () => {
  const { deadLetters, fetchDeadLetters } = useEventSystemStore()

  useEffect(() => {
    fetchDeadLetters()
  }, [])

  const handleReplayDLQ = async (id: string) => {
    await eventApi.replayDeadLetter(id)
    alert('Dead letter event replayed!')
    fetchDeadLetters()
  }

  const handleDiscardDLQ = async (id: string) => {
    await eventApi.discardDeadLetter(id)
    fetchDeadLetters()
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Dead Letter Queue (DLQ) Manager
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Inspect, replay, or discard failed domain events that exceeded retry thresholds.
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell>Event ID</TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell>Failure Reason</TableCell>
              <TableCell>Retries</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deadLetters.map((dlq) => (
              <TableRow key={dlq._id}>
                <TableCell>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                  >
                    {dlq.eventId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={dlq.eventType} color="error" variant="outlined" size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="error.main">
                    {dlq.reason}
                  </Typography>
                </TableCell>
                <TableCell>{dlq.retryCount}</TableCell>
                <TableCell>
                  <Chip
                    label={dlq.status}
                    color={dlq.status === 'PENDING' ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {dlq.status === 'PENDING' && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<ReplayIcon />}
                        onClick={() => handleReplayDLQ(dlq._id)}
                        sx={{ mr: 1 }}
                      >
                        Replay
                      </Button>
                      <IconButton
                        color="error"
                        onClick={() => handleDiscardDLQ(dlq._id)}
                        title="Discard Event"
                      >
                        <DiscardIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default DeadLetterManager
