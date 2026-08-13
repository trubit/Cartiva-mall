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
} from '@mui/material'
import {
  Sensors as LiveIcon,
  Timeline as SagaIcon,
  ReportProblem as DlqIcon,
  Refresh as RefreshIcon,
  PlayArrow as ReplayIcon,
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export const EventMonitorDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)

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
    await eventApi.replayEvent(id)
    alert(`Replay trigger queued for event ${id}`)
    fetchEvents()
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
            Real-Time Event Bus & Service Orchestration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Domain events stream, Saga orchestrator inspector, Dead-Letter Queue management, and
            event replay.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<LiveIcon />}
            label={socketConnected ? 'LIVE STREAM CONNECTED' : 'STREAM OFFLINE'}
            color={socketConnected ? 'success' : 'default'}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchEvents()
              fetchHealth()
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
          gap: 3,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="grey.400">
              Total Domain Events
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {health?.metrics?.totalEventsEmitted || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="grey.400">
              Processed Events
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {health?.metrics?.processedEventsCount || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="grey.400">
              Active Sagas
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {health?.metrics?.activeSagas || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="grey.400">
              Pending Dead-Letters
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                color: health?.metrics?.pendingDeadLetters > 0 ? 'error.main' : 'white',
              }}
            >
              {health?.metrics?.pendingDeadLetters || 0}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)}>
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
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Recent Domain Events ({liveStream.length > 0 ? 'Streaming Live' : 'Historical Catalog'})
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell>Event ID</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>Aggregate</TableCell>
                <TableCell>Correlation ID</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell align="right">Replay</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(liveStream.length > 0 ? liveStream : events).map((evt) => (
                <TableRow key={evt.eventId || evt._id}>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                    >
                      {evt.eventId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={evt.eventType} color="primary" size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {evt.aggregateType} ({evt.aggregateId})
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                    >
                      {evt.correlationId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'Just now'}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ReplayIcon />}
                      onClick={() => handleReplayEvent(evt.eventId)}
                    >
                      Replay
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
    </Box>
  )
}

export default EventMonitorDashboard
