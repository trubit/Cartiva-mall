import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material'
import {
  Visibility as ObserveIcon,
  Psychology as SimulateIcon,
  Gavel as DecideIcon,
  PlayArrow as ExecuteIcon,
  AutoAwesome as EvolveIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material'

interface Props {
  decisions: any[]
  history: any[]
  onObserve: () => void
  onSimulate: () => void
  onDecide: () => void
  onExecute: () => void
  onEvolve: () => void
  loading: boolean
}

export const SystemCivilizationView: React.FC<Props> = ({
  decisions,
  history,
  onObserve,
  onSimulate,
  onDecide,
  onExecute,
  onEvolve,
  loading,
}) => {
  return (
    <Box sx={{ mt: 3 }}>
      {/* Civilization Control Action Bar */}
      <Card sx={{ bgcolor: '#0f172a', color: 'white', mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Autonomous Civilization Control Loop
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="info"
              startIcon={<ObserveIcon />}
              onClick={onObserve}
              disabled={loading}
            >
              1. Observe State
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SimulateIcon />}
              onClick={onSimulate}
              disabled={loading}
            >
              2. Simulate Scenarios
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<DecideIcon />}
              onClick={onDecide}
              disabled={loading}
            >
              3. Decide Actions
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ExecuteIcon />}
              onClick={onExecute}
              disabled={loading}
            >
              4. Execute Decisions
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<EvolveIcon />}
              onClick={onEvolve}
              disabled={loading}
            >
              5. Evolve Civilization
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 3 }}>
        {/* Global Decision Timeline */}
        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Global Decision Timeline
            </Typography>
            {decisions.length === 0 ? (
              <Typography color="grey.500">
                No autonomous decisions recorded yet in this cycle.
              </Typography>
            ) : (
              <List>
                {decisions.map((dec, i) => (
                  <React.Fragment key={dec._id || i}>
                    <ListItem className="decision-flow-item" alignItems="flex-start">
                      <ListItemIcon sx={{ color: '#818cf8', minWidth: 36 }}>
                        <SuccessIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 'bold', color: 'white' }}
                            >
                              {dec.type} → {dec.target}
                            </Typography>
                            <Chip
                              label={dec.impact}
                              size="small"
                              color={
                                dec.impact === 'CRITICAL' || dec.impact === 'HIGH'
                                  ? 'error'
                                  : 'default'
                              }
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="grey.400" sx={{ mt: 0.5 }}>
                            {dec.reason}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {i < decisions.length - 1 && <Divider sx={{ borderColor: '#1e293b', my: 1 }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Real-time Civilization State Map */}
        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Civilization State History
            </Typography>
            {history.length === 0 ? (
              <Typography color="grey.500">No history snapshots recorded.</Typography>
            ) : (
              <List>
                {history.slice(0, 5).map((snap, idx) => (
                  <ListItem key={snap.snapshotId || idx} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {snap.economicState} (Index: {snap.stabilityIndex})
                          </Typography>
                          <Typography variant="caption" color="grey.500">
                            {new Date(snap.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="grey.400">
                          Orders 24h: {snap.metrics?.totalOrders24h || 0} | Stress:{' '}
                          {snap.systemStressLevel}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default SystemCivilizationView
