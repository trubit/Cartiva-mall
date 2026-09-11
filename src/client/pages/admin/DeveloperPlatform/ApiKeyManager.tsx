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
  Alert,
  Snackbar,
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RotateIcon,
  Delete as RevokeIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material'
import { useDeveloperStore } from '../../../store/useDeveloperStore.js'
import * as developerApi from '../../../services/developerApi.js'

export const ApiKeyManager: React.FC = () => {
  const { apiKeys, fetchApiKeys } = useDeveloperStore()
  const [openModal, setOpenModal] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [rawKeyGenerated, setRawKeyGenerated] = useState<string | null>(null)
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const handleCreateKey = async () => {
    if (!keyName) return
    const res = await developerApi.createApiKey({
      name: keyName,
      scopes: ['read:products', 'write:orders'],
    })
    if (res.data?.rawSecretKey) {
      setRawKeyGenerated(res.data.rawSecretKey)
    }
    fetchApiKeys()
  }

  const handleRotate = async (id: string) => {
    const res = await developerApi.rotateApiKey(id)
    if (res.data?.rawSecretKey) {
      setRawKeyGenerated(res.data.rawSecretKey)
      setSnackbarMessage('Key rotated successfully. Copy new secret!')
    }
    fetchApiKeys()
  }

  const handleRevoke = async (id: string) => {
    await developerApi.revokeApiKey(id)
    setSnackbarMessage('API key revoked.')
    fetchApiKeys()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSnackbarMessage('Secret key copied to clipboard!')
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          API Key Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={(e) => {
            e.currentTarget.blur()
            setOpenModal(true)
          }}
        >
          Generate New API Key
        </Button>
      </Box>

      {rawKeyGenerated && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={() => copyToClipboard(rawKeyGenerated)}
            >
              <CopyIcon />
            </IconButton>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Save your Secret API Key now!
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mt: 0.5 }}
          >
            {rawKeyGenerated}
          </Typography>
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: '#f1f5f9',
                '& .MuiTableCell-head': { fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' },
              }}
            >
              <TableCell>Name / Prefix</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Scopes</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Used</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key._id}>
                <TableCell>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {key.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {key.keyPrefix}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={key.environment}
                    color={key.environment === 'production' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {key.scopes.map((s: string) => (
                    <Chip key={s} label={s} size="small" sx={{ mr: 0.5, my: 0.2 }} />
                  ))}
                </TableCell>
                <TableCell>
                  <Chip
                    label={key.status}
                    color={key.status === 'active' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                </TableCell>
                <TableCell align="right">
                  {key.status === 'active' && (
                    <>
                      <IconButton
                        color="primary"
                        onClick={() => handleRotate(key._id)}
                        title="Rotate Key"
                      >
                        <RotateIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleRevoke(key._id)}
                        title="Revoke Key"
                      >
                        <RevokeIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Generate Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Generate New API Key</DialogTitle>
        <DialogContent>
          <TextField
            label="Key Name"
            placeholder="e.g. Mobile App Key"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleCreateKey()
              setOpenModal(false)
            }}
            disabled={!keyName}
          >
            Generate
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

export default ApiKeyManager
