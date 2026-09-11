import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Snackbar,
} from '@mui/material'
import {
  Sensors as LiveIcon,
  Timeline as SagaIcon,
  ReportProblem as DlqIcon,
  Refresh as RefreshIcon,
  PlayArrow as ReplayIcon,
  Inbox as EmptyIcon,
} from '@mui/icons-material'
import { useEventSystemStore } from '../../../store/useEventSystemStore.js'
import * as eventApi from '../../../services/eventSystemApi.js'
import SagaInspector from './SagaInspector.js'
import DeadLetterManager from './DeadLetterManager.js'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`event-tabpanel-${index}`}
      aria-labelledby={`event-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export const EventMonitorDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)

  const {
    events,
    health,
    liveStream,
    socketConnected,
    fetchEvents,
    fetchHealth,
    connectLiveStream,
    disconnectLiveStream,
  } = useEventSystemStore()

  useEffect(() => {
    fetchEvents()
    fetchHealth()
    connectLiveStream()
    return () => {
      disconnectLiveStream()
    }
  }, [])

  const handleReplayEvent = async (id: string) => {
    try {
      await eventApi.replayEvent(id)
      setSnackbarMessage(`Replay trigger queued for event ${id}`)
      fetchEvents()
    } catch {
      setSnackbarMessage(`Failed to replay event ${id}`)
    }
  }

  const headerCellStyle = {
    color: '#94a3b8',
    fontWeight: 700,
    fontSize: '13px',
    borderBottom: '1px solid #334155',
    py: 1.5,
  }

  const displayedEvents = liveStream.length > 0 ? liveStream : events

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header Bar */}
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
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', mb: 0.5 }}
          >
            Real-Time Event Bus & Service Orchestration
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Domain events stream, Saga orchestrator inspector, Dead-Letter Queue management, and
            event replay.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<LiveIcon sx={{ color: socketConnected ? '#10b981 !important' : 'inherit' }} />}
            label={socketConnected ? 'LIVE STREAM CONNECTED' : 'STREAM OFFLINE'}
            color={socketConnected ? 'success' : 'default'}
            sx={{
              fontWeight: 700,
              fontSize: '12px',
              bgcolor: socketConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.1)',
              color: socketConnected ? '#10b981' : '#94a3b8',
              border: `1px solid ${socketConnected ? '#10b981' : '#334155'}`,
            }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchEvents()
              fetchHealth()
            }}
            sx={{
              borderColor: '#334155',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '8px',
              bgcolor: '#0f172a',
              '&:hover': { bgcolor: '#1e293b', borderColor: '#64748b' },
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Metrics Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        <Card
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 3,
            border: '1px solid #1e293b',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              Total Domain Events
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.5 }}>
              {health?.metrics?.totalEventsEmitted || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 3,
            border: '1px solid #1e293b',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              Processed Events
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.5 }}>
              {health?.metrics?.processedEventsCount || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 3,
            border: '1px solid #1e293b',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              Active Sagas
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.5 }}>
              {health?.metrics?.activeSagas || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 3,
            border: '1px solid #1e293b',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography
              variant="overline"
              sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              Pending Dead-Letters
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: (health?.metrics?.pendingDeadLetters || 0) > 0 ? '#ef4444' : '#10b981',
                mt: 0.5,
              }}
            >
              {health?.metrics?.pendingDeadLetters || 0}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Navigation Tabs */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: '#1e293b',
          bgcolor: '#0f172a',
          borderRadius: '12px 12px 0 0',
          px: 2,
          pt: 1,
          border: '1px solid #1e293b',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_e, v) => setTabValue(v)}
          sx={{
            '& .MuiTab-root': {
              color: '#94a3b8',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'none',
              '&.Mui-selected': {
                color: '#38bdf8',
              },
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#38bdf8',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab
            id="event-tab-0"
            aria-controls="event-tabpanel-0"
            icon={<LiveIcon />}
            iconPosition="start"
            label="Live Domain Event Stream"
          />
          <Tab
            id="event-tab-1"
            aria-controls="event-tabpanel-1"
            icon={<SagaIcon />}
            iconPosition="start"
            label="Saga Orchestrator Inspector"
          />
          <Tab
            id="event-tab-2"
            aria-controls="event-tabpanel-2"
            icon={<DlqIcon />}
            iconPosition="start"
            label="Dead Letter Queue (DLQ)"
          />
        </Tabs>
      </Box>

      {/* Tab 0: Event Explorer & Live Stream */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff' }}>
            Recent Domain Events ({liveStream.length > 0 ? 'Streaming Live' : 'Historical Catalog'})
          </Typography>
          <Chip
            label={`${displayedEvents.length} events recorded`}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
            }}
          />
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
                <TableCell sx={headerCellStyle}>Aggregate</TableCell>
                <TableCell sx={headerCellStyle}>Correlation ID</TableCell>
                <TableCell sx={headerCellStyle}>Timestamp</TableCell>
                <TableCell sx={headerCellStyle} align="right">
                  Replay
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedEvents.length === 0 ? (
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
                      <EmptyIcon sx={{ fontSize: 44, color: '#64748b' }} />
                      <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                        No Domain Events Recorded Yet
                      </Typography>
                      <Typography sx={{ fontSize: '13px', color: '#94a3b8', maxWidth: '480px' }}>
                        Domain events triggered during user checkout, order state transitions,
                        inventory mutations, and seller payouts will stream live here.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                displayedEvents.map((evt) => (
                  <TableRow
                    key={evt.eventId || evt._id}
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
                          color: '#38bdf8',
                          bgcolor: 'rgba(56, 189, 248, 0.1)',
                          px: 1,
                          py: 0.5,
                          borderRadius: '4px',
                          display: 'inline-block',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                        }}
                      >
                        {evt.eventId}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #1e293b' }}>
                      <Chip
                        label={evt.eventType}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '12px' }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #1e293b' }}>
                      <Typography
                        variant="body2"
                        sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '13px' }}
                      >
                        {evt.aggregateType}{' '}
                        <span style={{ color: '#94a3b8' }}>({evt.aggregateId})</span>
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #1e293b' }}>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '12px' }}
                      >
                        {evt.correlationId}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        color: '#cbd5e1',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderBottom: '1px solid #1e293b',
                      }}
                    >
                      {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'Just now'}
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: '1px solid #1e293b' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ReplayIcon />}
                        onClick={() => handleReplayEvent(evt.eventId)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: '8px',
                          borderColor: '#334155',
                          color: '#ffffff',
                          '&:hover': {
                            bgcolor: '#1e293b',
                            borderColor: '#38bdf8',
                            color: '#38bdf8',
                          },
                        }}
                      >
                        Replay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 1: Saga Inspector */}
      <TabPanel value={tabValue} index={1}>
        <SagaInspector />
      </TabPanel>

      {/* Tab 2: Dead Letter Manager */}
      <TabPanel value={tabValue} index={2}>
        <DeadLetterManager />
      </TabPanel>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
      />
    </Box>
  )
}

export default EventMonitorDashboard
