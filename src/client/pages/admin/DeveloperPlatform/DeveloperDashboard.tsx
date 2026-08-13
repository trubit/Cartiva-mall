import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import {
  Code as CodeIcon,
  VpnKey as KeyIcon,
  Webhook as WebhookIcon,
  Extension as IntegrationIcon,
  MenuBook as DocsIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { useDeveloperStore } from '../../../store/useDeveloperStore.js'
import ApiKeyManager from './ApiKeyManager.js'
import WebhookManager from './WebhookManager.js'
import IntegrationMarketplace from './IntegrationMarketplace.js'
import ApiDocsViewer from './ApiDocsViewer.js'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  // Do NOT render children while hidden — prevents focus being trapped in aria-hidden panel
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dev-tabpanel-${index}`}
      aria-labelledby={`dev-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export const DeveloperDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [openAppModal, setOpenAppModal] = useState(false)
  const [appName, setAppName] = useState('')
  const [appDesc, setAppDesc] = useState('')
  const [appEnv, setAppEnv] = useState('development')

  const { applications, fetchApplications, fetchAnalytics, analytics, loading } =
    useDeveloperStore()

  useEffect(() => {
    fetchApplications()
    fetchAnalytics()
  }, [])

  const handleCreateApp = async () => {
    if (!appName) return
    await useDeveloperStore.getState().fetchApplications()
    setOpenAppModal(false)
    setAppName('')
    setAppDesc('')
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
            Developer Platform & API Gateway
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage developer applications, API keys, webhooks, provider integrations, and analytics.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAppModal(true)}>
          New Application
        </Button>
      </Box>

      {/* Metrics Grid */}
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
              Active Applications
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {applications.length}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="grey.400">
              Today's Requests
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {analytics?.totalRequests || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="grey.400">
              Avg Latency
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {analytics?.avgLatencyMs || 0} ms
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: '#0f172a', color: 'white', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="overline" color="grey.400">
              Error Rate
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                color: analytics?.errorRate > 5 ? 'error.main' : 'success.main',
              }}
            >
              {analytics?.errorRate ? analytics.errorRate.toFixed(2) : 0}%
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)}>
          <Tab
            id="dev-tab-0"
            aria-controls="dev-tabpanel-0"
            icon={<CodeIcon />}
            iconPosition="start"
            label="Applications"
          />
          <Tab
            id="dev-tab-1"
            aria-controls="dev-tabpanel-1"
            icon={<KeyIcon />}
            iconPosition="start"
            label="API Keys"
          />
          <Tab
            id="dev-tab-2"
            aria-controls="dev-tabpanel-2"
            icon={<WebhookIcon />}
            iconPosition="start"
            label="Webhooks"
          />
          <Tab
            id="dev-tab-3"
            aria-controls="dev-tabpanel-3"
            icon={<IntegrationIcon />}
            iconPosition="start"
            label="Integrations"
          />
          <Tab
            id="dev-tab-4"
            aria-controls="dev-tabpanel-4"
            icon={<DocsIcon />}
            iconPosition="start"
            label="API Specs & Docs"
          />
        </Tabs>
      </Box>

      {/* Tab 0: Applications */}
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <CircularProgress />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {applications.map((app) => (
              <Card variant="outlined" key={app._id} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {app.name}
                    </Typography>
                    <Chip
                      label={app.environment}
                      color={app.environment === 'production' ? 'error' : 'info'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {app.description || 'No description provided.'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Rate Limit: {app.rateLimitRequestsPerMin} req/min
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </TabPanel>

      {/* Tab 1: API Keys */}
      <TabPanel value={tabValue} index={1}>
        <ApiKeyManager />
      </TabPanel>

      {/* Tab 2: Webhooks */}
      <TabPanel value={tabValue} index={2}>
        <WebhookManager />
      </TabPanel>

      {/* Tab 3: Integrations */}
      <TabPanel value={tabValue} index={3}>
        <IntegrationMarketplace />
      </TabPanel>

      {/* Tab 4: API Docs */}
      <TabPanel value={tabValue} index={4}>
        <ApiDocsViewer />
      </TabPanel>

      {/* Create Application Dialog */}
      {/* keepMounted={false} (default) + disablePortal={false} (default) ensures the dialog
           renders into document.body portal, not inside #root — preventing aria-hidden warnings */}
      <Dialog
        open={openAppModal}
        onClose={() => setOpenAppModal(false)}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
      >
        <DialogTitle>Create Developer Application</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Application Name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={appDesc}
              onChange={(e) => setAppDesc(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              select
              label="Environment"
              value={appEnv}
              onChange={(e) => setAppEnv(e.target.value)}
              fullWidth
            >
              <MenuItem value="development">Development</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAppModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateApp} disabled={!appName}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DeveloperDashboard
