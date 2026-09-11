import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Snackbar,
} from '@mui/material'
import { Add as AddIcon, Send as TestIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useDeveloperStore } from '../../../store/useDeveloperStore.js'
import * as developerApi from '../../../services/developerApi.js'

export const WebhookManager: React.FC = () => {
  const { webhooks, fetchWebhooks } = useDeveloperStore()
  const [openModal, setOpenModal] = useState(false)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'order.created',
    'payment.completed',
  ])

  const availableEvents = [
    'order.created',
    'order.paid',
    'order.shipped',
    'payment.completed',
    'payment.failed',
    'product.created',
    'inventory.low',
    'vendor.approved',
  ]

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const handleCreateWebhook = async () => {
    if (!url || selectedEvents.length === 0) return
    await developerApi.createWebhook({ url, events: selectedEvents, description })
    setOpenModal(false)
    setUrl('')
    fetchWebhooks()
  }

  const handleTestWebhook = async (id: string) => {
    try {
      await developerApi.testWebhook(id)
      setSnackbarMessage('Test webhook payload queued for dispatch!')
    } catch {
      setSnackbarMessage('Failed to queue test webhook payload')
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    await developerApi.deleteWebhook(id)
    fetchWebhooks()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Webhook Subscriptions
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={(e) => {
            e.currentTarget.blur()
            setOpenModal(true)
          }}
        >
          Create Webhook Subscription
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: '#f1f5f9',
                '& .MuiTableCell-head': { fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' },
              }}
            >
              <TableCell>Endpoint URL</TableCell>
              <TableCell>Subscribed Events</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Failures</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {webhooks.map((sub) => (
              <TableRow key={sub._id}>
                <TableCell>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                  >
                    {sub.url}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {sub.description || 'No description'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {sub.events.map((e: string) => (
                    <Chip
                      key={e}
                      label={e}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 0.5, my: 0.2 }}
                    />
                  ))}
                </TableCell>
                <TableCell>
                  <Chip
                    label={sub.status}
                    color={sub.status === 'active' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{sub.failureCount}</TableCell>
                <TableCell align="right">
                  <IconButton
                    color="info"
                    onClick={() => handleTestWebhook(sub._id)}
                    title="Send Test Payload"
                  >
                    <TestIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteWebhook(sub._id)}
                    title="Delete Webhook"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Webhook Subscription</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Webhook Endpoint URL"
              placeholder="https://example.com/api/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
            />

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Select Events to Subscribe:
            </Typography>
            <FormGroup row>
              {availableEvents.map((evt) => (
                <FormControlLabel
                  key={evt}
                  control={
                    <Checkbox
                      checked={selectedEvents.includes(evt)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedEvents([...selectedEvents, evt])
                        else setSelectedEvents(selectedEvents.filter((item) => item !== evt))
                      }}
                    />
                  }
                  label={evt}
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateWebhook}
            disabled={!url || selectedEvents.length === 0}
          >
            Subscribe
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
      />
    </Box>
  )
}

export default WebhookManager
